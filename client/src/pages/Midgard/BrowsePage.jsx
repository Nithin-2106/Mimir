import { useState, useEffect, useRef, useCallback } from 'react'

const TMDB_KEY  = import.meta.env.VITE_TMDB_KEY
const TMDB_BASE = 'https://api.themoviedb.org/3'
const IMG_BASE  = 'https://image.tmdb.org/t/p'

const C = {
  bg:           '#080D1A',
  surface:      '#0F1829',
  surfaceHover: '#141F33',
  ember:        '#C2410C',
  gold:         '#CA8A04',
  goldBright:   '#F59E0B',
  electric:     '#38BDF8',
  electricSoft: 'rgba(56,189,248,0.12)',
  violet:       '#7C3AED',
  text:         '#E8EDF5',
  textMuted:    '#8899B4',
  textDim:      '#3D4F6B',
  borderGold:   'rgba(202,138,4,0.2)',
}

const BLOCKED_GENRES = new Set([16, 10764, 10767, 10763, 10766])

// How many TMDB pages to pre-fetch per query on initial load
// TMDB returns 20 items/page, cap is 500 pages
// We fetch 25 pages = up to 500 raw items per query
// For "All" with a combined country query that's 500 globally sorted items upfront
const INITIAL_PAGES = 25
const PAGE_SIZE     = 24  // cards revealed per infinite scroll step

const SORT_MODES = [
  { key: 'popularity', label: 'Popularity',       rune: 'ᚦ' },
  { key: 'toprated',   label: 'Top Rated',         rune: '★' },
  { key: 'recent',     label: 'Recently Released', rune: 'ᚾ' },
]

const TYPE_FILTERS = [
  { key: 'All',    label: 'All',      color: C.electric },
  { key: 'Kdrama', label: 'Korean',   color: C.electric },
  { key: 'Cdrama', label: 'Chinese',  color: C.violet },
  { key: 'Jdrama', label: 'Japanese', color: C.goldBright },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDramaType(item) {
  const countries = (item.origin_country || []).map(c => c.toUpperCase())
  const lang      = (item.original_language || '').toLowerCase()
  if (countries.includes('KR') || lang === 'ko') return 'Kdrama'
  if (['CN','TW','HK'].some(c => countries.includes(c)) || lang === 'zh') return 'Cdrama'
  if (countries.includes('JP') || lang === 'ja') return 'Jdrama'
  return null
}
function typeColor(type) {
  if (type === 'Kdrama') return C.electric
  if (type === 'Cdrama') return C.violet
  if (type === 'Jdrama') return C.goldBright
  return C.electric
}
function typeLabel(type) {
  if (type === 'Kdrama') return 'Korean'
  if (type === 'Cdrama') return 'Chinese'
  if (type === 'Jdrama') return 'Japanese'
  return type
}
function isValidItem(item, typeFilter) {
  if (!item.poster_path) return false
  const type = getDramaType(item)
  if (!type) return false
  if (typeFilter !== 'All' && type !== typeFilter) return false
  const genres = item.genre_ids || []
  if (genres.some(g => BLOCKED_GENRES.has(g))) return false
  return true
}
function dedupeById(items) {
  const seen = new Set()
  return items.filter(item => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

// ── Country param ─────────────────────────────────────────────────────────────
// For "All": use a single combined query with all countries pipe-separated.
// TMDB will sort this unified result set, giving us a true global ranking.
// For a specific type: query only that country (or countries for Cdrama).
function getCountryParam(typeFilter) {
  if (typeFilter === 'All')    return 'KR|CN|TW|HK|JP'
  if (typeFilter === 'Kdrama') return 'KR'
  if (typeFilter === 'Cdrama') return 'CN|TW|HK'
  if (typeFilter === 'Jdrama') return 'JP'
  return 'KR|CN|TW|HK|JP'
}

// ── Sort param ────────────────────────────────────────────────────────────────
function getSortParam(sortMode) {
  if (sortMode === 'toprated')   return 'vote_average.desc'
  if (sortMode === 'recent')     return 'first_air_date.desc'
  return 'popularity.desc'
}

// ── Extra filter params ───────────────────────────────────────────────────────
function getExtraParams(sortMode) {
  if (sortMode === 'toprated') {
    // Require meaningful vote count so obscure 10.0/1vote titles don't dominate
    return '&vote_count.gte=150'
  }
  if (sortMode === 'recent') {
    // Last 2 years
    const cutoff = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
    return `&first_air_date.gte=${cutoff}`
  }
  return ''
}

// ── Core pool builder ─────────────────────────────────────────────────────────
// Fetches INITIAL_PAGES pages from a SINGLE unified TMDB query (not per-country),
// so TMDB's own sorting applies to the combined result set.
// This means page 1 = true global top 20, page 2 = true global 21-40, etc.
// We then just filter client-side (poster, type, genres) and dedupe.
// No client-side re-sorting needed — TMDB already sorted it correctly.
async function buildPool(sortMode, typeFilter) {
  const countryParam = getCountryParam(typeFilter)
  const sortParam    = getSortParam(sortMode)
  const extraParams  = getExtraParams(sortMode)

  // Fetch all pages in parallel
  const fetches = Array.from({ length: INITIAL_PAGES }, (_, i) =>
    fetch(
      `${TMDB_BASE}/discover/tv` +
      `?api_key=${TMDB_KEY}` +
      `&with_origin_country=${countryParam}` +
      `&sort_by=${sortParam}` +
      `${extraParams}` +
      `&page=${i + 1}`
    )
      .then(r => r.json())
      .then(d => ({ results: d.results || [], totalPages: d.total_pages || 0 }))
      .catch(() => ({ results: [], totalPages: 0 }))
  )

  const pages = await Promise.all(fetches)

  // Flatten in page order — TMDB order is preserved, which IS the correct sort
  const allItems = pages.flatMap(p => p.results)

  // Filter but DO NOT re-sort — TMDB already sorted this correctly
  const filtered = allItems.filter(item => isValidItem(item, typeFilter))

  return dedupeById(filtered)
}

// ── Fetch next batch of pages (for background pool expansion) ─────────────────
async function fetchMorePages(sortMode, typeFilter, startPage, count) {
  const countryParam = getCountryParam(typeFilter)
  const sortParam    = getSortParam(sortMode)
  const extraParams  = getExtraParams(sortMode)

  const fetches = Array.from({ length: count }, (_, i) =>
    fetch(
      `${TMDB_BASE}/discover/tv` +
      `?api_key=${TMDB_KEY}` +
      `&with_origin_country=${countryParam}` +
      `&sort_by=${sortParam}` +
      `${extraParams}` +
      `&page=${startPage + i}`
    )
      .then(r => r.json())
      .then(d => d.results || [])
      .catch(() => [])
  )

  const pages = await Promise.all(fetches)
  return pages.flat()
}

// ── UI Components ─────────────────────────────────────────────────────────────
function Corners({ color = C.goldBright, size = 10, opacity = 0.6 }) {
  const s = { position: 'absolute', width: size, height: size, opacity }
  const b = `1px solid ${color}`
  return (
    <>
      <div style={{ ...s, top: 6, left: 6,    borderTop: b, borderLeft: b }} />
      <div style={{ ...s, top: 6, right: 6,   borderTop: b, borderRight: b }} />
      <div style={{ ...s, bottom: 6, left: 6,  borderBottom: b, borderLeft: b }} />
      <div style={{ ...s, bottom: 6, right: 6, borderBottom: b, borderRight: b }} />
    </>
  )
}

function SkeletonCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{
        height: '220px',
        background: `linear-gradient(110deg, ${C.surface} 30%, ${C.surfaceHover} 50%, ${C.surface} 70%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        border: `1px solid ${C.borderGold}`,
      }} />
      <div style={{ height: '12px', width: '80%', background: C.surface, borderRadius: '2px' }} />
      <div style={{ height: '10px', width: '40%', background: C.surface, borderRadius: '2px' }} />
    </div>
  )
}

function DramaCard({ item, onNavigate }) {
  const [hovered, setHovered] = useState(false)
  const type   = getDramaType(item) || 'Kdrama'
  const tColor = typeColor(type)
  const year   = item.first_air_date ? item.first_air_date.split('-')[0] : null
  const rating = item.vote_average   ? item.vote_average.toFixed(1) : null

  return (
    <div
      onClick={() => onNavigate('Info', item.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.25s ease',
      }}
    >
      <div style={{
        position: 'relative', height: '220px',
        background: C.surface,
        border: `1px solid ${hovered ? tColor + '99' : C.borderGold}`,
        overflow: 'hidden',
        boxShadow: hovered
          ? `0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px ${tColor}44`
          : '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'all 0.25s ease',
      }}>
        {item.poster_path ? (
          <img
            src={`${IMG_BASE}/w300${item.poster_path}`}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.textDim, fontSize: '32px',
            background: `linear-gradient(135deg, ${C.surface}, ${C.bg})`,
          }}>📺</div>
        )}

        <div style={{
          position: 'absolute', top: '8px', left: '8px',
          padding: '3px 8px', background: 'rgba(8,13,26,0.92)',
          border: `1px solid ${tColor}66`,
          fontSize: '9px', letterSpacing: '0.15em',
          color: tColor, fontFamily: '"Cinzel", serif',
        }}>{typeLabel(type)}</div>

        {rating && parseFloat(rating) > 0 && (
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '3px 8px', background: 'rgba(8,13,26,0.92)',
            border: `1px solid ${C.gold}55`,
            fontSize: '10px', color: C.goldBright,
            fontFamily: '"Cinzel", serif', fontWeight: 700,
          }}>★ {rating}</div>
        )}

        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to top, ${tColor}33, transparent 60%)`,
          opacity: hovered ? 1 : 0, transition: 'opacity 0.25s',
        }} />

        {hovered && <Corners color={tColor} />}
      </div>

      <div style={{ marginTop: '10px', padding: '0 2px' }}>
        <div style={{
          fontSize: '13px', fontWeight: 600,
          color: hovered ? C.text : C.textMuted,
          transition: 'color 0.25s', lineHeight: 1.35,
          overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>{item.name || item.original_name}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '5px' }}>
          {year && <span style={{ fontSize: '11px', color: C.textDim }}>{year}</span>}
          {item.vote_count > 0 && (
            <span style={{ fontSize: '10px', color: C.textDim }}>
              {item.vote_count.toLocaleString()} votes
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function SortTab({ mode, active, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: active ? C.electric : hovered ? C.text : C.textMuted,
        background: active ? C.electricSoft : hovered ? C.surfaceHover : 'transparent',
        border: 'none',
        borderBottom: `2px solid ${active ? C.electric : 'transparent'}`,
        padding: '10px 20px', cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: active ? C.electric : C.gold + '66', fontSize: '13px' }}>
        {mode.rune}
      </span>
      {mode.label}
    </button>
  )
}

function TypePill({ filter, active, onClick }) {
  const [hovered, setHovered] = useState(false)
  const c = filter.color
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: '"Cinzel", serif',
        fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase',
        color: active ? C.bg : hovered ? c : C.textMuted,
        background: active ? c : hovered ? `${c}18` : 'transparent',
        border: `1px solid ${active ? c : hovered ? `${c}66` : C.borderGold}`,
        padding: '6px 16px', cursor: 'pointer', transition: 'all 0.2s ease',
      }}
    >
      {filter.label}
    </button>
  )
}

// Infinite scroll sentinel — fires onVisible when scrolled into view
function ScrollSentinel({ onVisible }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) onVisible() },
      { rootMargin: '500px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onVisible])
  return <div ref={ref} style={{ height: '1px' }} />
}

// ── Main BrowsePage ───────────────────────────────────────────────────────────
export default function BrowsePage({ onNavigate }) {
  const [sortMode,   setSortMode]   = useState('popularity')
  const [typeFilter, setTypeFilter] = useState('All')

  // Globally sorted pool — built once per sort+filter combination
  const pool         = useRef([])
  const nextTmdbPage = useRef(INITIAL_PAGES + 1) // next TMDB page to fetch if pool runs low
  const poolExhausted = useRef(false)             // true when TMDB has no more pages

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loading,      setLoading]      = useState(true)
  const [poolReady,    setPoolReady]    = useState(false)
  const [expanding,    setExpanding]    = useState(false) // background pool expansion

  // ── Build pool on sort/filter change ─────────────────────────────────────
  useEffect(() => {
    pool.current      = []
    nextTmdbPage.current  = INITIAL_PAGES + 1
    poolExhausted.current = false
    setVisibleCount(PAGE_SIZE)
    setPoolReady(false)
    setLoading(true)

    buildPool(sortMode, typeFilter)
      .then(sorted => {
        pool.current = sorted
        setPoolReady(true)
      })
      .catch(() => {
        pool.current = []
        setPoolReady(true)
      })
      .finally(() => setLoading(false))
  }, [sortMode, typeFilter])

  // ── Expand pool in the background when user nears the end ────────────────
  const expandPool = useCallback(async () => {
    if (expanding || poolExhausted.current) return
    setExpanding(true)
    try {
      const newItems = await fetchMorePages(
        sortMode, typeFilter, nextTmdbPage.current, 10
      )
      if (newItems.length === 0) {
        poolExhausted.current = true
      } else {
        const filtered = newItems.filter(item => isValidItem(item, typeFilter))
        const existingIds = new Set(pool.current.map(i => i.id))
        const fresh = filtered.filter(item => !existingIds.has(item.id))
        // Append in TMDB order — since TMDB sorts these, appending preserves order
        pool.current = [...pool.current, ...fresh]
        nextTmdbPage.current += 10
      }
    } catch {
      poolExhausted.current = true
    } finally {
      setExpanding(false)
    }
  }, [sortMode, typeFilter, expanding])

  // ── Infinite scroll handler ───────────────────────────────────────────────
  const onSentinelVisible = useCallback(() => {
    if (!poolReady || loading) return

    const newCount = visibleCount + PAGE_SIZE

    // Reveal more from pool
    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, pool.current.length))

    // If we're within 48 cards of the pool end, expand the pool in background
    if (newCount >= pool.current.length - 48 && !poolExhausted.current) {
      expandPool()
    }
  }, [poolReady, loading, visibleCount, expandPool])

  const displayed = pool.current.slice(0, visibleCount)
  const hasMore   = poolReady && (
    visibleCount < pool.current.length || !poolExhausted.current
  )

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      {/* ── Sort tabs ── */}
      <div style={{
        display: 'flex', marginBottom: '24px',
        borderBottom: `1px solid ${C.borderGold}`,
        overflowX: 'auto',
      }}>
        {SORT_MODES.map(mode => (
          <SortTab
            key={mode.key} mode={mode}
            active={sortMode === mode.key}
            onClick={() => setSortMode(mode.key)}
          />
        ))}
      </div>

      {/* ── Type filter row ── */}
      <div style={{
        display: 'flex', gap: '8px', marginBottom: '28px',
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: '10px', letterSpacing: '0.25em', color: C.textDim,
          fontFamily: '"Cinzel", serif', marginRight: '4px', textTransform: 'uppercase',
        }}>Filter</span>
        <div style={{ width: '1px', height: '16px', background: C.borderGold }} />
        {TYPE_FILTERS.map(f => (
          <TypePill
            key={f.key} filter={f}
            active={typeFilter === f.key}
            onClick={() => setTypeFilter(f.key)}
          />
        ))}

        <span style={{
          marginLeft: 'auto', fontSize: '11px', color: C.textDim,
          fontFamily: '"Cinzel", serif', letterSpacing: '0.1em',
        }}>
          {loading
            ? <span style={{ color: C.textDim }}>Fetching realm…</span>
            : <>
                <span style={{ color: C.electric }}>{displayed.length}</span>
                {' shown · '}
                <span style={{ color: C.textMuted }}>{pool.current.length}</span>
                {' loaded'}
              </>
          }
        </span>
      </div>

      {/* ── Divider ── */}
      <div style={{
        height: '1px', marginBottom: '32px',
        background: `linear-gradient(to right, ${C.ember}66, ${C.electric}33, transparent)`,
      }} />

      {/* ── Grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
        gap: '20px 16px',
        marginBottom: '32px',
      }}>
        {loading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)
          : displayed.map(item => (
              <DramaCard key={item.id} item={item} onNavigate={onNavigate} />
            ))
        }
      </div>

      {/* ── Empty state ── */}
      {!loading && pool.current.length === 0 && (
        <div style={{
          padding: '64px 24px', textAlign: 'center',
          border: `1px dashed ${C.borderGold}`,
        }}>
          <div style={{
            fontFamily: '"Cinzel", serif', fontSize: '24px',
            color: C.gold + '33', letterSpacing: '0.4em', marginBottom: '16px',
          }}>ᛟ</div>
          <div style={{
            fontFamily: '"Cinzel", serif', fontSize: '13px',
            letterSpacing: '0.25em', color: C.textMuted,
          }}>No results found for this combination</div>
        </div>
      )}

      {/* ── Infinite scroll sentinel ── */}
      {!loading && hasMore && (
        <ScrollSentinel onVisible={onSentinelVisible} />
      )}

      {/* ── Expanding indicator ── */}
      {expanding && (
        <div style={{
          display: 'flex', justifyContent: 'center',
          padding: '16px 0 32px',
          fontSize: '11px', letterSpacing: '0.3em',
          color: C.textDim, fontFamily: '"Cinzel", serif',
        }}>
          ᚱ Expanding the realm…
        </div>
      )}

      {/* ── End of results ── */}
      {!loading && poolReady && !hasMore && pool.current.length > 0 && (
        <div style={{
          textAlign: 'center', padding: '32px 0 64px',
          fontSize: '11px', letterSpacing: '0.3em',
          color: C.textDim, fontFamily: '"Cinzel", serif',
        }}>
          ᛟ · End of the Realm · ᛟ
        </div>
      )}
    </>
  )
}