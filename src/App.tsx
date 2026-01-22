import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent
} from 'react'
import './App.css'

type Report = {
  id: string
  name?: string
  period: string
  content: string
  referenceCount: number
  createdAt: string
}

const PERIOD_OPTIONS = ['覚えていない', '子どもの頃', '数年前', '最近']
const RESUME_DELAY_MS = 3000

const STORAGE_KEYS = {
  referencedPrefix: 'ref:'
}

const loadReferenced = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()
  const result = new Set<string>()
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_KEYS.referencedPrefix)) {
      const id = key.slice(STORAGE_KEYS.referencedPrefix.length)
      if (id) result.add(id)
    }
  }
  return result
}

const sortByNewest = (reports: Report[]) =>
  [...reports].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

const pickDisplayReports = (reports: Report[]) => {
  const sorted = sortByNewest(reports)
  const latest = sorted.slice(0, 5)
  const pool = sorted.slice(5)
  const shuffled = [...pool]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const random = shuffled.slice(0, 15)
  return [...latest, ...random]
}

const mapApiReport = (report: any): Report => ({
  id: String(report.id),
  name: report.name ?? undefined,
  period: report.period ?? '',
  content: report.content ?? '',
  referenceCount:
    typeof report.reference_count === 'number'
      ? report.reference_count
      : Number(report.reference_count ?? 0),
  createdAt: report.created_at ?? new Date().toISOString()
})

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

function App() {
  const [allReports, setAllReports] = useState<Report[]>([])
  const [displayReports, setDisplayReports] = useState<Report[]>([])
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    period: PERIOD_OPTIONS[0],
    content: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [loadError, setLoadError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [referenceOverrides, setReferenceOverrides] = useState<
    Record<string, number>
  >({})
  const referencedRef = useRef(loadReferenced())
  const activeIdRef = useRef<string | null>(null)
  const reduceMotionRef = useRef(false)
  const pauseUntilRef = useRef(0)
  const isDraggingRef = useRef(false)
  const lastPointerYRef = useRef<number | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const setRef = useRef<HTMLDivElement | null>(null)
  const listHeightRef = useRef(0)
  const offsetRef = useRef(0)
  const lastTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media: MediaQueryList =
      window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(media.matches)
    update()
    media.addEventListener?.('change', update)
    if (!media.addEventListener) {
      media.addListener(update)
    }
    return () => {
      media.removeEventListener?.('change', update)
      if (!media.removeEventListener) {
        media.removeListener(update)
      }
    }
  }, [])

  useEffect(() => {
    activeIdRef.current = activeInstanceId
  }, [activeInstanceId])

  useEffect(() => {
    reduceMotionRef.current = reduceMotion
  }, [reduceMotion])

  useEffect(() => {
    let isMounted = true
    const fetchReports = async () => {
      setIsLoading(true)
      setLoadError('')
      try {
        const response = await fetch('/api/reports')
        if (!response.ok) {
          throw new Error('Failed to fetch reports')
        }
        const data = (await response.json()) as any[]
        if (!isMounted) return
        const mapped = Array.isArray(data) ? data.map(mapApiReport) : []
        setAllReports(mapped)
        setDisplayReports(mapped.length ? pickDisplayReports(mapped) : [])
      } catch (error) {
        console.error('[reports] fetch failed', error)
        if (!isMounted) return
        setLoadError('取得に失敗しました')
        setAllReports([])
        setDisplayReports([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchReports()
    return () => {
      isMounted = false
    }
  }, [])

  const pauseFromInteraction = () => {
    pauseUntilRef.current = performance.now() + RESUME_DELAY_MS
    lastTimeRef.current = null
  }

  const measureList = () => {
    if (!setRef.current) return
    const height = setRef.current.getBoundingClientRect().height
    listHeightRef.current = height
    if (offsetRef.current > height) offsetRef.current = 0
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(0, ${-offsetRef.current}px, 0)`
    }
  }

  useLayoutEffect(() => {
    measureList()
  }, [displayReports, activeInstanceId])

  useEffect(() => {
    const onResize = () => measureList()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    lastTimeRef.current = null
  }, [activeInstanceId, reduceMotion])

  useEffect(() => {
    const speed = 18

    const tick = (now: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = now
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000)
      lastTimeRef.current = now

      const listHeight = listHeightRef.current
      if (!trackRef.current || listHeight <= 0) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const currentTime = performance.now()
      if (
        reduceMotion ||
        activeInstanceId ||
        currentTime < pauseUntilRef.current
      ) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      offsetRef.current = (offsetRef.current + speed * dt) % listHeight
      trackRef.current.style.transform = `translate3d(0, ${-offsetRef.current}px, 0)`
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [activeInstanceId, reduceMotion])

  const applyManualDelta = (delta: number) => {
    const listHeight = listHeightRef.current
    if (!trackRef.current || listHeight <= 0) return
    offsetRef.current = (offsetRef.current + delta) % listHeight
    if (offsetRef.current < 0) offsetRef.current += listHeight
    trackRef.current.style.transform = `translate3d(0, ${-offsetRef.current}px, 0)`
    lastTimeRef.current = null
  }

  const resumeNow = () => {
    pauseUntilRef.current = performance.now()
    lastTimeRef.current = null
  }

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (reduceMotionRef.current) return
    pauseFromInteraction()
    event.preventDefault()
    applyManualDelta(event.deltaY)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    const target = event.target as HTMLElement | null
    if (target?.closest('button, a, input, textarea, select, .close-layer')) {
      return
    }
    if (target?.closest('[data-no-pause]')) return
    isDraggingRef.current = true
    lastPointerYRef.current = event.clientY
    pauseFromInteraction()
    if (event.target === event.currentTarget) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || lastPointerYRef.current === null) return
    pauseFromInteraction()
    const delta = lastPointerYRef.current - event.clientY
    lastPointerYRef.current = event.clientY
    if (event.pointerType === 'touch') {
      event.preventDefault()
    }
    applyManualDelta(delta)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    lastPointerYRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleReference = (report: Report) => {
    const reportId = report.id
    console.log(`[ref] click reportId=${reportId}`)
    const storageKey = `${STORAGE_KEYS.referencedPrefix}${reportId}`
    const already = typeof window !== 'undefined' &&
      localStorage.getItem(storageKey) === '1'
    console.log('[ref] localStorage key/ref already?', storageKey, already)
    if (already || referencedRef.current.has(reportId)) return
    const url = `/api/reports/${reportId}/reference`
    console.log('[ref] sending PATCH url=', url)
    fetch(url, { method: 'PATCH' })
      .then(async (response) => {
        const bodyText = await response.text()
        console.log('[ref] response status=', response.status, 'body=', bodyText)
        if (!response.ok) {
          throw new Error('Failed to update reference count.')
        }
        localStorage.setItem(storageKey, '1')
        referencedRef.current.add(reportId)
        setReferenceOverrides((prev) => {
          const current = prev[reportId] ?? report.referenceCount
          return { ...prev, [reportId]: current + 1 }
        })
      })
      .catch((error) => {
        console.error('[ref] request failed', error)
      })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    console.log('[submit] fired')
    if (!formData.content.trim()) return
    setSubmitError('')
    const newReport: Report = {
      id: createId(),
      name: formData.name.trim() || '匿名',
      period: formData.period,
      content: formData.content.trim(),
      referenceCount: 0,
      createdAt: new Date().toISOString()
    }
    setIsSubmitting(true)
    let requestFailed = false
    let createdReport: Report | null = null
    try {
      console.log('[submit] request start', newReport)
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newReport.name,
          period: newReport.period,
          content: newReport.content
        })
      })
      console.log('[submit] response status', response.status)
      const body = await response.json().catch(() => null)
      console.log('[submit] response body', body)
      if (!response.ok) {
        requestFailed = true
      } else if (body && typeof body === 'object') {
        createdReport = mapApiReport(body)
      }
    } catch (error) {
      console.error('[submit] request failed', error)
      requestFailed = true
    } finally {
      setIsSubmitting(false)
    }
    if (requestFailed) {
      console.error('[submit] request failed: response not ok')
      setSubmitError('投稿内容を確認してください')
      return
    }
    const reportToInsert = createdReport ?? newReport
    setAllReports((prev) => [reportToInsert, ...prev])
    setDisplayReports((prev) => {
      const next = [
        reportToInsert,
        ...prev.filter((report) => report.id !== reportToInsert.id)
      ]
      return next.slice(0, 20)
    })
    setActiveInstanceId(null)
    setShowForm(false)
    setFormData({ name: '', period: PERIOD_OPTIONS[0], content: '' })
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="title-block">
          <p className="kicker">説明できない体験を、ただ報告する場所。</p>
          <h1>■■の報告</h1>
        </div>
        <button
          className="report-toggle"
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
        >
          報告する
        </button>
      </header>

      <section className={`report-form ${showForm ? 'is-open' : ''}`}>
        <form onSubmit={handleSubmit}>
          <label>
            名前（任意）
            <input
              type="text"
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="匿名"
            />
          </label>
          <label>
            いつ頃？
            <select
              value={formData.period}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, period: event.target.value }))
              }
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="full">
            報告内容
            <textarea
              value={formData.content}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, content: event.target.value }))
              }
              rows={4}
              placeholder="淡々と記録する"
            />
          </label>
          <button className="submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '報告中…' : '報告する'}
          </button>
          {submitError && (
            <p className="submit-error" role="status" aria-live="polite">
              {submitError}
            </p>
          )}
        </form>
      </section>

      <section className="stream" aria-live="off">
        <div
          className="stream-frame"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {loadError ? (
            <div className="stream-placeholder">取得に失敗しました</div>
          ) : isLoading ? (
            <div className="stream-placeholder">読み込み中…</div>
          ) : displayReports.length === 0 ? (
            <div className="stream-placeholder">まだ報告はありません</div>
          ) : (
            <div className="stream-track" ref={trackRef}>
              <div className="report-set" ref={setRef}>
                {displayReports.map((report) => {
                  const instanceId = `${report.id}-a`
                  const isActive = instanceId === activeInstanceId
                  const isReferenced = referencedRef.current.has(report.id)
                  const count =
                    referenceOverrides[report.id] ?? report.referenceCount
                  return (
                    <article
                      key={instanceId}
                      className={`report-card ${
                        activeInstanceId && !isActive ? 'dimmed' : ''
                      } ${isActive ? 'active' : ''}`}
                      onClick={() =>
                        setActiveInstanceId((prev) => {
                          const next = prev === instanceId ? null : instanceId
                          if (!next) resumeNow()
                          return next
                        })
                      }
                    >
                      <div className="report-meta">
                        <span>{report.name ?? '匿名'}</span>
                        <span>・</span>
                        <span>{report.period}</span>
                      </div>
                      <p
                        className={`report-content ${
                          isActive ? 'expanded' : ''
                        }`}
                      >
                        {report.content}
                      </p>
                      <div className="report-actions">
                        <span className="reference-label">参照件数</span>
                        <span className="reference-count">{count}</span>
                        <button
                          type="button"
                          className={`check ${isReferenced ? 'checked' : ''}`}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleReference(report)
                          }}
                          aria-label="参照として記録"
                        >
                          ✓
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
              <div className="report-set" aria-hidden="true">
                {displayReports.map((report) => {
                  const instanceId = `${report.id}-b`
                  const isActive = instanceId === activeInstanceId
                  const isReferenced = referencedRef.current.has(report.id)
                  const count =
                    referenceOverrides[report.id] ?? report.referenceCount
                  return (
                    <article
                      key={instanceId}
                      className={`report-card ${
                        activeInstanceId && !isActive ? 'dimmed' : ''
                      } ${isActive ? 'active' : ''}`}
                      onClick={() =>
                        setActiveInstanceId((prev) => {
                          const next = prev === instanceId ? null : instanceId
                          if (!next) resumeNow()
                          return next
                        })
                      }
                    >
                      <div className="report-meta">
                        <span>{report.name ?? '匿名'}</span>
                        <span>・</span>
                        <span>{report.period}</span>
                      </div>
                      <p
                        className={`report-content ${
                          isActive ? 'expanded' : ''
                        }`}
                      >
                        {report.content}
                      </p>
                      <div className="report-actions">
                        <span className="reference-label">参照件数</span>
                        <span className="reference-count">{count}</span>
                        <button
                          type="button"
                          className={`check ${isReferenced ? 'checked' : ''}`}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleReference(report)
                          }}
                          aria-label="参照として記録"
                        >
                          ✓
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        {activeInstanceId && (
          <button
            className="close-layer"
            type="button"
            data-no-pause
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => {
              setActiveInstanceId(null)
              resumeNow()
            }}
            aria-label="閉じる"
          />
        )}
      </section>

      <footer className="report-note">
        <p>
          この場所は、説明できない体験をただ記録するための場所です。真偽は問いません。解釈もしません。ここにあるのは、誰かが「起きた」と感じたことだけです。
        </p>
        <p>
          この場所では、議論・評価・検証は行いません。
          <br />あるのは、ただの記録です。
        </p>
      </footer>
    </div>
  )
}

export default App
