import { filterStyle, defaultCaption } from '../lib/preview.js'

export default function StripPreview({
  theme,
  layout,
  photos = [],
  frameColor,
  caption,
  filter = 'natural',
  brightness = 100,
  contrast = 100,
  width = 220,
  interactive = false,
  activeSlot = -1,
  onSelectSlot,
  className = '',
}) {
  const cssFilter = filterStyle(filter, brightness, contrast)
  const captionText = caption || defaultCaption()

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
      {layout.rects.map((r, i) => {
        const photo = photos[i]
        const isActive = interactive && activeSlot === i
        const style = {
          position: 'absolute',
          left: `${(r.x / layout.w) * 100}%`,
          top: `${(r.y / layout.h) * 100}%`,
          width: `${(r.w / layout.w) * 100}%`,
          height: `${(r.h / layout.h) * 100}%`,
          borderRadius: '6px',
          overflow: 'hidden',
          background: theme.slotBg,
          padding: 0,
          border: isActive ? '3px solid #C4452B' : '2px solid transparent',
          boxSizing: 'border-box',
          cursor: interactive ? 'pointer' : 'default',
          transition: 'border-color .18s ease',
        }

        const inner = photo ? (
          <img
            src={photo}
            alt={`Foto ${i + 1}`}
            className="w-full h-full object-cover pop-in"
            style={{ display: 'block', filter: cssFilter }}
          />
        ) : (
          <span
            className="w-full h-full flex items-center justify-center"
            style={{
              color: theme.slotBg === '#33302C' ? '#8A817A' : '#5E554E',
              fontSize: `${(44 / layout.w) * 100}cqw`,
              fontWeight: 500,
            }}
          >
            Foto {i + 1}
          </span>
        )

        if (!interactive) {
          return (
            <div key={i} style={style}>
              {inner}
            </div>
          )
        }
        return (
          <button
            key={i}
            type="button"
            style={style}
            onClick={() => onSelectSlot?.(i)}
            aria-label={`Pilih slot foto ${i + 1}${photo ? ' untuk mengambil ulang' : ''}`}
            aria-pressed={isActive}
          >
            {inner}
          </button>
        )
      })}

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
    </div>
  )
}
