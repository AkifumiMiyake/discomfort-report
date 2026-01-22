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
  reports: 'discomfort-reports',
  referenced: 'discomfort-referenced'
}

const seedReports: Report[] = [
  {
    id: 'seed-01',
    name: '匿名',
    period: '最近',
    content:
      '夜、玄関のドアが少しだけ開いていることが続いた。鍵は閉めていたはずだが、毎回同じ角度で止まっている。',
    referenceCount: 12,
    createdAt: '2025-12-28T09:12:00.000Z'
  },
  {
    id: 'seed-02',
    name: 'I',
    period: '数年前',
    content:
      '洗面台の鏡に、朝の自分とは少し違う水滴が付いていた。拭いたはずの位置だけが濡れている。',
    referenceCount: 8,
    createdAt: '2025-12-25T04:40:00.000Z'
  },
  {
    id: 'seed-03',
    name: 'M',
    period: '子どもの頃',
    content:
      '学校から帰る道で、同じ犬に三回すれ違った気がする。角を曲がるたびにいた。',
    referenceCount: 17,
    createdAt: '2025-12-20T06:15:00.000Z'
  },
  {
    id: 'seed-04',
    name: '匿名',
    period: '最近',
    content:
      '冷蔵庫の中の水の量が少しずつ減っていた。飲んだ記憶はない。',
    referenceCount: 5,
    createdAt: '2025-12-19T14:05:00.000Z'
  },
  {
    id: 'seed-05',
    name: 'S',
    period: '覚えていない',
    content:
      '手帳の最後のページにだけ、今日の日付で短い線が引かれていた。自分の字ではない気がする。',
    referenceCount: 9,
    createdAt: '2025-12-16T11:02:00.000Z'
  },
  {
    id: 'seed-06',
    name: '匿名',
    period: '数年前',
    content:
      '部屋の時計が一日だけ、正しい時間より三分早く進んでいた。翌日は元に戻っていた。',
    referenceCount: 6,
    createdAt: '2025-12-12T03:50:00.000Z'
  },
  {
    id: 'seed-07',
    name: 'K',
    period: '子どもの頃',
    content:
      '夕方の公園で遊んでいたとき、帰る時間の音楽が二回鳴った。誰も気にしていない。',
    referenceCount: 11,
    createdAt: '2025-12-10T02:20:00.000Z'
  },
  {
    id: 'seed-08',
    name: '匿名',
    period: '最近',
    content:
      '郵便受けに自分宛の封筒が入っていたが、中は白紙だった。封だけは新しかった。',
    referenceCount: 7,
    createdAt: '2025-12-08T08:44:00.000Z'
  },
  {
    id: 'seed-09',
    name: 'N',
    period: '覚えていない',
    content:
      'いつも使う鉛筆の消しゴムが、昨日より少しだけ長い。削った覚えはない。',
    referenceCount: 3,
    createdAt: '2025-12-04T13:10:00.000Z'
  },
  {
    id: 'seed-10',
    name: '匿名',
    period: '数年前',
    content:
      '電車のドアが閉まる直前に、車内に似た声が聞こえた。自分の声だと思った。',
    referenceCount: 14,
    createdAt: '2025-12-01T07:30:00.000Z'
  },
  {
    id: 'seed-11',
    name: 'T',
    period: '最近',
    content:
      '買った覚えのない同じ靴下が、洗濯物に混ざっていた。サイズは合っていた。',
    referenceCount: 4,
    createdAt: '2025-11-29T10:22:00.000Z'
  },
  {
    id: 'seed-12',
    name: '匿名',
    period: '子どもの頃',
    content:
      '図書館で借りた本に、以前読んだときのしおりが入っていた。借りた記憶はない。',
    referenceCount: 10,
    createdAt: '2025-11-26T01:18:00.000Z'
  },
  {
    id: 'seed-13',
    name: 'R',
    period: '数年前',
    content:
      '部屋の隅に置いた箱の向きが、毎朝少しずつ変わっている。風は入らない。',
    referenceCount: 2,
    createdAt: '2025-11-21T09:55:00.000Z'
  },
  {
    id: 'seed-14',
    name: '匿名',
    period: '覚えていない',
    content:
      '携帯の充電が満タンになると、通知音が二回だけ鳴る日があった。設定は変えていない。',
    referenceCount: 13,
    createdAt: '2025-11-18T05:12:00.000Z'
  },
  {
    id: 'seed-15',
    name: 'H',
    period: '最近',
    content:
      '天気予報で雨と言っていたのに、窓の外は乾いたままだった。傘だけ濡れていた。',
    referenceCount: 5,
    createdAt: '2025-11-15T12:41:00.000Z'
  },
  {
    id: 'seed-16',
    name: '匿名',
    period: '数年前',
    content:
      'コンビニのレシートに、買っていない商品が一行だけ印字されていた。値段は0円。',
    referenceCount: 6,
    createdAt: '2025-11-12T06:20:00.000Z'
  },
  {
    id: 'seed-17',
    name: 'Y',
    period: '子どもの頃',
    content:
      '夕飯の時間にテレビが消え、数分後に同じ番組が最初から始まった。誰も操作していない。',
    referenceCount: 9,
    createdAt: '2025-11-08T02:04:00.000Z'
  },
  {
    id: 'seed-18',
    name: '匿名',
    period: '覚えていない',
    content:
      '駅の階段の数を数えると、上りと下りで一段だけ違う。どちらも同じ幅に見える。',
    referenceCount: 3,
    createdAt: '2025-11-05T15:37:00.000Z'
  },
  {
    id: 'seed-19',
    name: 'U',
    period: '数年前',
    content:
      '家の鍵の音が、たまに二重に鳴る。誰かが同時に回したように聞こえる。',
    referenceCount: 7,
    createdAt: '2025-11-02T07:06:00.000Z'
  },
  {
    id: 'seed-20',
    name: '匿名',
    period: '最近',
    content:
      '毎朝同じ場所に置いているペンが、一度だけ机の真ん中にあった。触った覚えはない。',
    referenceCount: 4,
    createdAt: '2025-10-30T04:12:00.000Z'
  }
]

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const loadUserReports = (): Report[] => {
  if (typeof window === 'undefined') return []
  return safeParse<Report[]>(localStorage.getItem(STORAGE_KEYS.reports), [])
}

const saveUserReports = (reports: Report[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.reports, JSON.stringify(reports))
}

const loadReferenced = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()
  const list = safeParse<string[]>(localStorage.getItem(STORAGE_KEYS.referenced), [])
  return new Set(list)
}

const saveReferenced = (set: Set<string>) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(
    STORAGE_KEYS.referenced,
    JSON.stringify(Array.from(set))
  )
}

const mergeReports = (): Report[] => {
  const userReports = loadUserReports()
  const merged = [...userReports, ...seedReports]
  const seen = new Set<string>()
  return merged.filter((report) => {
    if (seen.has(report.id)) return false
    seen.add(report.id)
    return true
  })
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

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`
}

function App() {
  const [allReports, setAllReports] = useState<Report[]>(() => mergeReports())
  const [displayReports, setDisplayReports] = useState<Report[]>(() =>
    pickDisplayReports(allReports)
  )
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    period: PERIOD_OPTIONS[0],
    content: ''
  })
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
    if (referencedRef.current.has(report.id)) return
    referencedRef.current.add(report.id)
    saveReferenced(referencedRef.current)
    setReferenceOverrides((prev) => {
      const current = prev[report.id] ?? report.referenceCount
      return { ...prev, [report.id]: current + 1 }
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formData.content.trim()) return
    const newReport: Report = {
      id: createId(),
      name: formData.name.trim() || '匿名',
      period: formData.period,
      content: formData.content.trim(),
      referenceCount: 0,
      createdAt: new Date().toISOString()
    }
    const stored = loadUserReports()
    const nextStored = [newReport, ...stored]
    saveUserReports(nextStored)
    setAllReports((prev) => [newReport, ...prev])
    setDisplayReports((prev) => {
      const next = [
        newReport,
        ...prev.filter((report) => report.id !== newReport.id)
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
          <button className="submit" type="submit">
            記録する
          </button>
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
                    <p className={`report-content ${isActive ? 'expanded' : ''}`}>
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
                    <p className={`report-content ${isActive ? 'expanded' : ''}`}>
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
    </div>
  )
}

export default App
