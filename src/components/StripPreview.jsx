import { useEffect, useRef, useState } from 'react'
import { filterStyle, defaultCaption } from '../lib/preview.js'
import { themeRects, themeTitle } from '../lib/themeLayout.js'

function drawCover(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width || img.videoWidth
  const ih = img.naturalHeight || img.height || img.videoHeight
  if (!iw || !ih) return
  const ir = iw / ih
  const dr = dw / dh
  let sw, sh, sx, sy
  if (ir > dr) {
    sh = ih
    sw = ih * dr
    sx = (iw - sw) / 2
    sy = 0
  } else {
    sw = iw
    sh = iw / dr
    sx = 0
    sy = (ih - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

export default function StripPreview({
  theme,
  layout,
  photos = [],
  liveClips = [],
  frameColor,
  caption,
  filter = 'natural',
  brightness = 100,
  contrast = 100,
  width = 220,
  interactive = false,
  activeSlot = -1,
  onSelectSlot,
  onToggleLive,
  onChooseKeyFrame,
  autoplay = false,
  className = '',
}) {
  const cssFilter = filterStyle(filter, brightness, contrast)
  const captionText = caption || defaultCaption()
  const rects = themeRects(layout, theme)
  const titleText = themeTitle(theme, layout)
  const titleLines = titleText ? titleText.split('\n').length : 1
  const baseTitleCqw =
    ((parseFloat((theme.titleFont || '32').match(/(\d+(?:\.\d+)?)px/)?.[1]) || 32) /
      layout.w) *
    100
  const headerCqw = (Math.min(...rects.map((r) => r.y)) / layout.w) * 100
  const titleCqw = Math.max(
    4.2,
    Math.min(baseTitleCqw * 1.2, (headerCqw / (titleLines * 1.18)) * 0.82),
  )

  const [playing, setPlaying] = useState(null)
  const canvasRefs = useRef([])
  const rafRef = useRef(null)

  const hasLive = (i) => Boolean(liveClips?.[i]?.frames?.length)

  // animasi slot live
  useEffect(() => {
    const slotsToAnimate = autoplay
      ? liveClips.map((c, i) => (c?.frames?.length ? i : null)).filter((v) => v !== null)
      : playing !== null
      ? [playing]
      : []

    if (!slotsToAnimate.length) {
      // bersihkan canvas
      slotsToAnimate.forEach(() => {})
      return undefined
    }

    const start = performance.now()
    const draw = (now) => {
      for (const i of slotsToAnimate) {
        const canvas = canvasRefs.current[i]
        const clip = liveClips[i]
        if (!canvas || !clip?.frames?.length) continue
        const elapsed = (now - start) / 1000
        let idx
        if (autoplay) {
          idx = Math.floor(elapsed * clip.fps) % clip.frames.length
        } else {
          idx = Math.min(clip.frames.length - 1, Math.floor(elapsed * clip.fps))
        }
        const frame = clip.frames[idx]
        if (!frame) continue
        const rect = canvas.getBoundingClientRect()
        const w = Math.max(1, Math.round(rect.width))
        const h = Math.max(1, Math.round(rect.height))
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w
          canvas.height = h
        }
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, w, h)
        if (cssFilter && cssFilter !== 'none') ctx.filter = cssFilter
        drawCover(ctx, frame, 0, 0, w, h)
        ctx.filter = 'none'
      }

      if (autoplay) {
        rafRef.current = requestAnimationFrame(draw)
      } else if (playing !== null) {
        const clip = liveClips[playing]
        const elapsed = (now - start) / 1000
        if (clip && elapsed * clip.fps < clip.frames.length) {
          rafRef.current = requestAnimationFrame(draw)
        } else {
          setPlaying(null)
        }
      }
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, autoplay, liveClips, cssFilter])

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{
        containerType: 'inline-size',
        width: typeof width === 'number' ? `${width}px` : width,
        aspectRatio: `${layout.w} / ${layout.h}`,
        background: frameColor,
        borderRadius: 8,
        boxShadow: '0 18px 40px rgba(31,27,24,.15)',
        padding: 0,
        overflow: 'hidden',
        transition: 'background .25s ease',
      }}
      role={interactive ? 'group' : undefined}
      aria-label={interactive ? 'Pratinjau strip foto' : undefined}
    >
      {rects.map((r, i) => {
        const photo = photos[i]
        const isActive = interactive && activeSlot === i
        const isLive = hasLive(i)
        const isPlaying = autoplay ? isLive : playing === i
        const fs = theme.frameStyle
        const borderMap = { rounded: 5, square: 3, arch: 5, neon: 3, newspaper: 2, film: 2 }
        const borderW = borderMap[fs] || 0
        const isPolaroid = fs === 'polaroid'
        const isGls = fs === 'gls'
        const style = {
          position: 'absolute',
          left: `${(r.x / layout.w) * 100}%`,
          top: `${(r.y / layout.h) * 100}%`,
          width: `${(r.w / layout.w) * 100}%`,
          height: `${(r.h / layout.h) * 100}%`,
          borderRadius:
            fs === 'arch'
              ? '38% 38% 6px 6px'
              : `${theme.slotRadius || 6}px`,
          overflow: 'hidden',
          background: isGls
            ? 'linear-gradient(135deg,#fff,#b9c7ff 50%,#fff)'
            : theme.slotBg,
          padding: isPolaroid ? '4% 4% 12%' : isGls ? '3%' : 0,
          border: borderW ? `${borderW}px solid ${theme.borderColor || '#111'}` : 'none',
          boxShadow:
            fs === 'neon'
              ? `0 0 8px ${theme.borderColor}, inset 0 0 6px ${theme.borderColor}`
              : ['polaroid', 'rounded', 'gls', 'arch'].includes(fs)
              ? '0 3px 8px rgba(0,0,0,.18)'
              : 'none',
          boxSizing: 'border-box',
          cursor: interactive ? 'pointer' : 'default',
          transition: 'border-color .18s ease',
          userSelect: 'none',
          outline: isActive ? '3px solid #C4452B' : 'none',
          outlineOffset: 1,
        }

        return (
          <div
            key={i}
            style={style}
            onPointerDown={() => {
              if (isLive && !autoplay) setPlaying(i)
            }}
            onPointerUp={() => {
              if (!autoplay) setPlaying(null)
            }}
            onPointerLeave={() => {
              if (!autoplay) setPlaying(null)
            }}
          >
            {interactive ? (
              <button
                type="button"
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  cursor: 'pointer',
                }}
                onPointerDown={() => {
                  if (isLive && !autoplay) setPlaying(i)
                }}
                onPointerUp={() => {
                  if (!autoplay) setPlaying(null)
                }}
                onPointerLeave={() => {
                  if (!autoplay) setPlaying(null)
                }}
                onClick={() => onSelectSlot?.(i)}
                aria-label={`Pilih slot foto ${i + 1}${photo ? ' untuk mengambil ulang' : ''}`}
                aria-pressed={isActive}
              />
            ) : null}

            {photo && !(isLive && isPlaying) ? (
              <img
                src={photo}
                alt={`Foto ${i + 1}`}
                className="w-full h-full object-cover pop-in"
                style={{ display: 'block', filter: cssFilter, pointerEvents: 'none' }}
              />
            ) : !photo ? (
              <span
                className="w-full h-full flex items-center justify-center"
                style={{
                  color: theme.slotBg === '#33302C' ? '#8A817A' : '#5E554E',
                  fontSize: `${(44 / layout.w) * 100}cqw`,
                  fontWeight: 500,
                  pointerEvents: 'none',
                }}
              >
                Foto {i + 1}
              </span>
            ) : null}

            {isLive && (
              <canvas
                ref={(el) => (canvasRefs.current[i] = el)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  display: isPlaying ? 'block' : 'none',
                  pointerEvents: 'none',
                }}
              />
            )}

            {isLive && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleLive?.(i)
                }}
                className="absolute top-1 right-1 z-20"
                style={{
                  background: 'rgba(31,27,24,0.7)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  padding: '2px 6px',
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  cursor: 'pointer',
                }}
                aria-label={`Matikan Live slot ${i + 1}`}
              >
                LIVE
              </button>
            )}

            {!isLive && onChooseKeyFrame && liveClips?.[i] === undefined && null}
          </div>
        )
      })}

      {titleText && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: `${(theme.titleY || 0.07) * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: '92%',
            textAlign: 'center',
            color: theme.titleColor || theme.caption,
            fontFamily: (theme.titleFont || '').split(' ').slice(2).join(' ') || theme.captionFont || 'Inter',
            fontSize: `${titleCqw}cqw`,
            fontWeight: (theme.titleFont || '').match(/^(\d+)/)?.[1] || 600,
            lineHeight: 1.05,
            textShadow: theme.titleShadow ? '0 2px 4px rgba(0,0,0,.35)' : 'none',
            whiteSpace: 'pre-line',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {titleText}
        </div>
      )}

      {theme.footer ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: '93%',
            transform: 'translate(-50%, -50%)',
            padding: '2px 8px',
            borderRadius: 999,
            background: theme.footerBg && theme.footerBg !== 'transparent' ? theme.footerBg : 'transparent',
            border: theme.footerBorder ? `1.5px dashed ${theme.footerBorder}` : 'none',
            color: theme.footerColor || theme.caption,
            fontFamily: (theme.footerFont || '').split(' ').slice(2).join(' ') || `${theme.captionFont || 'Inter'}, sans-serif`,
            fontSize: `${((parseFloat((theme.footerFont || '12').match(/(\d+(?:\.\d+)?)px/)?.[1]) || 12) / layout.w) * 100}cqw`,
            fontWeight: (theme.footerFont || '').match(/^(\d+)/)?.[1] || 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {theme.footer}
        </div>
      ) : (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: `${(layout.caption.y / layout.h) * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: '92%',
            textAlign: 'center',
            color: theme.caption,
            fontFamily: `${theme.captionFont || 'Inter'}, sans-serif`,
            fontSize: `${(layout.caption.size / layout.w) * 100}cqw`,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            pointerEvents: 'none',
          }}
        >
          {captionText}
        </div>
      )}

      {!autoplay && liveClips?.some((c) => c?.frames?.length) && (
        <div
          className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] text-white/90 bg-black/40 px-2 py-0.5 rounded-full pointer-events-none"
        >
          Tahan untuk memutar
        </div>
      )}
    </div>
  )
}