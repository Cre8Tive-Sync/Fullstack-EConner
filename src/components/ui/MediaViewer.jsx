import { useCallback, useEffect, useRef, useState } from 'react'
import { IconBack, IconChevronRight, IconClose, IconPlay } from './Icons'

/**
 * Full-screen viewer for a place's media. Images are shown uncropped
 * (`object-fit: contain`), videos play inline — either a real file or an
 * embedded player — and the whole set can be paged with swipes, arrows,
 * the thumbnail strip or the keyboard.
 *
 * @param items      [{ type: 'image' | 'video', src, kind, poster }]
 * @param startIndex Item to open on.
 */
export default function MediaViewer({ items, startIndex = 0, title, onClose }) {
  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), Math.max(items.length - 1, 0)))
  const [loaded, setLoaded] = useState(false)
  const touch = useRef(null)
  const thumbsRef = useRef(null)

  const count = items.length
  const item = items[index]

  const go = useCallback(
    (dir) => {
      if (count < 2) return
      setLoaded(false)
      setIndex((i) => (i + dir + count) % count)
    },
    [count]
  )

  const jumpTo = useCallback((i) => {
    setLoaded(false)
    setIndex(i)
  }, [])

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  // Keep the active thumbnail in view
  useEffect(() => {
    const strip = thumbsRef.current
    const active = strip?.children[index]
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [index])

  const onTouchStart = (e) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY }
  }

  const onTouchEnd = (e) => {
    if (!touch.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touch.current.x
    const dy = t.clientY - touch.current.y
    touch.current = null

    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1)
    } else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) {
      onClose()
    }
  }

  if (!item) return null

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={title || 'Media viewer'}>
      <div className="viewer__bar">
        <button type="button" className="btn btn--icon" aria-label="Close" onClick={onClose}>
          <IconClose />
        </button>
        <span className="viewer__count">
          {title ? `${title} · ` : ''}
          {index + 1} / {count}
        </span>
      </div>

      <div className="viewer__stage" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {item.type === 'video' && item.kind === 'embed' ? (
          <iframe
            className="viewer__frame"
            src={item.src}
            title={title || 'Video'}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : item.type === 'video' ? (
          <video
            className="viewer__media"
            src={item.src}
            poster={item.poster || undefined}
            controls
            autoPlay
            playsInline
            onLoadedData={() => setLoaded(true)}
          />
        ) : (
          <>
            {!loaded && <span className="spinner" style={{ position: 'absolute' }} />}
            <img
              className="viewer__media"
              src={item.src}
              alt={title ? `${title} — photo ${index + 1}` : `Photo ${index + 1}`}
              style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.25s ease' }}
              onLoad={() => setLoaded(true)}
              onError={() => setLoaded(true)}
              draggable={false}
            />
          </>
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              className="viewer__arrow viewer__arrow--prev"
              aria-label="Previous"
              onClick={() => go(-1)}
            >
              <IconBack />
            </button>
            <button
              type="button"
              className="viewer__arrow viewer__arrow--next"
              aria-label="Next"
              onClick={() => go(1)}
            >
              <IconChevronRight />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="viewer__thumbs" ref={thumbsRef}>
          {items.map((media, i) => (
            <button
              type="button"
              key={`${media.src}-${i}`}
              className={`viewer__thumb${i === index ? ' viewer__thumb--active' : ''}`}
              aria-label={`Show item ${i + 1}`}
              onClick={() => jumpTo(i)}
            >
              {media.type === 'video' ? (
                <>
                  {media.poster && <img src={media.poster} alt="" />}
                  <span className="gallery__play">
                    <IconPlay style={{ width: 16, height: 16 }} />
                  </span>
                </>
              ) : (
                <img src={media.src} alt="" loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
