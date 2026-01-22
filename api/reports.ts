import crypto from 'crypto'

const LIMITS = {
  contentMax: 2000,
  nameMax: 30,
  periodMax: 30,
  sameContentWindowMs: 5 * 60 * 1000,
  rateWindows: [
    { windowMs: 60 * 1000, limit: 3 },
    { windowMs: 10 * 60 * 1000, limit: 10 }
  ]
}

const NG_WORDS = [
  '死ね',
  '殺す',
  'fuck',
  'porn',
  'sex',
  '暴力'
]

const normalizeText = (value: string) =>
  value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()

const getClientIp = (req: any) => {
  const forwarded = req.headers['x-forwarded-for']
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded
  const fromHeader = raw ? String(raw).split(',')[0].trim() : ''
  const socketIp = req.socket?.remoteAddress ?? ''
  const ip = fromHeader || socketIp
  return ip.replace('::ffff:', '')
}

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase env is missing.')
  }
  return { url, key }
}

const supabaseFetch = async (
  url: string,
  key: string,
  path: string,
  init: RequestInit = {}
) => {
  const headers = new Headers(init.headers)
  headers.set('apikey', key)
  headers.set('Authorization', `Bearer ${key}`)
  headers.set('Content-Type', 'application/json')
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers })
}

const getCountFromResponse = (response: Response) => {
  const range = response.headers.get('content-range')
  if (!range) return 0
  const total = range.split('/')[1]
  const parsed = total ? Number(total) : 0
  return Number.isNaN(parsed) ? 0 : parsed
}

const hasNgWord = (value: string) => {
  const normalized = normalizeText(value)
  return NG_WORDS.some((word) => normalized.includes(normalizeText(word)))
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method Not Allowed' })
    return
  }

  try {
    const { url, key } = getSupabaseConfig()
    const ip = getClientIp(req) || 'unknown'
    const name = typeof req.body?.name === 'string' ? req.body.name : ''
    const period = typeof req.body?.period === 'string' ? req.body.period : ''
    const content = typeof req.body?.content === 'string' ? req.body.content : ''

    const trimmedName = name.trim()
    const trimmedPeriod = period.trim()
    const trimmedContent = content.trim()

    if (
      trimmedContent.length === 0 ||
      trimmedContent.length > LIMITS.contentMax ||
      trimmedName.length > LIMITS.nameMax ||
      trimmedPeriod.length > LIMITS.periodMax
    ) {
      res.status(400).json({ message: '投稿内容を確認してください' })
      return
    }

    if (hasNgWord(trimmedContent) || (trimmedName && hasNgWord(trimmedName))) {
      res.status(400).json({ message: '投稿内容を確認してください' })
      return
    }

    const normalizedContent = normalizeText(trimmedContent)
    const contentHash = crypto
      .createHash('sha256')
      .update(normalizedContent)
      .digest('hex')

    const now = Date.now()
    const sameSince = new Date(now - LIMITS.sameContentWindowMs).toISOString()
    const sameContentRes = await supabaseFetch(
      url,
      key,
      `reports?select=id&content_hash=eq.${contentHash}&created_at=gte.${sameSince}`,
      { method: 'GET', headers: { Prefer: 'count=exact' } }
    )
    if (!sameContentRes.ok) {
      throw new Error('Failed to check duplicates.')
    }
    if (getCountFromResponse(sameContentRes) > 0) {
      res.status(429).json({ message: '投稿をしばらくお待ちください' })
      return
    }

    for (const window of LIMITS.rateWindows) {
      const since = new Date(now - window.windowMs).toISOString()
      const rateRes = await supabaseFetch(
        url,
        key,
        `rate_limits?select=id&ip=eq.${encodeURIComponent(ip)}&created_at=gte.${since}`,
        { method: 'GET', headers: { Prefer: 'count=exact' } }
      )
      if (!rateRes.ok) {
        throw new Error('Failed to check rate limit.')
      }
      if (getCountFromResponse(rateRes) >= window.limit) {
        res.status(429).json({ message: '投稿をしばらくお待ちください' })
        return
      }
    }

    const insertRateRes = await supabaseFetch(url, key, 'rate_limits', {
      method: 'POST',
      body: JSON.stringify([{ ip }])
    })
    if (!insertRateRes.ok) {
      throw new Error('Failed to update rate limit.')
    }

    const insertReportRes = await supabaseFetch(url, key, 'reports', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([
        {
          name: trimmedName || null,
          period: trimmedPeriod,
          content: trimmedContent,
          content_hash: contentHash
        }
      ])
    })
    if (!insertReportRes.ok) {
      throw new Error('Failed to insert report.')
    }

    const payload = await insertReportRes.json()
    res.status(200).json(payload?.[0] ?? { ok: true })
  } catch (error) {
    res.status(500).json({ message: '投稿内容を確認してください' })
  }
}
