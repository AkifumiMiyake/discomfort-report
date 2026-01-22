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

export default async function handler(req: any, res: any) {
  if (req.method !== 'PATCH') {
    res.status(405).json({ message: 'Method Not Allowed' })
    return
  }

  try {
    const { url, key } = getSupabaseConfig()
    const reportId = String(req.query?.id ?? '').trim()
    if (!reportId) {
      res.status(400).json({ message: 'Invalid report id' })
      return
    }

    const currentRes = await supabaseFetch(
      url,
      key,
      `reports?select=reference_count&id=eq.${reportId}`,
      { method: 'GET' }
    )
    if (!currentRes.ok) {
      throw new Error('Failed to fetch report.')
    }
    const currentData = (await currentRes.json()) as Array<{
      reference_count: number
    }>
    if (!currentData.length) {
      res.status(404).json({ message: 'Not Found' })
      return
    }

    const nextCount = (currentData[0]?.reference_count ?? 0) + 1
    const updateRes = await supabaseFetch(
      url,
      key,
      `reports?id=eq.${reportId}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ reference_count: nextCount })
      }
    )
    if (!updateRes.ok) {
      throw new Error('Failed to update report.')
    }
    const updated = await updateRes.json()
    res.status(200).json(updated?.[0] ?? { ok: true })
  } catch (error) {
    res.status(500).json({ message: 'Failed to update reference' })
  }
}
