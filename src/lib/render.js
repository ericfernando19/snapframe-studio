import { filterStyle } from './preview.js'
import { drawBackground, drawDecorations, drawTitle, drawFooter } from './decorations.js'
import { themeRects } from './themeLayout.js'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gagal memuat gambar'))
    img.src = src
  })
}

function roundedPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2)
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, radius)
    return
  }
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function archPath(ctx, x, y, w, h, r) {
  const top = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x, y + top)
  ctx.arcTo(x, y, x + w, y, top)
  ctx.arcTo(x + w, y, x + w, y + h, top)
  ctx.lineTo(x + w, y + h - 10)
  ctx.arcTo(x + w, y + h, x, y + h, 10)
  ctx.arcTo(x, y + h, x, y, 10)
  ctx.closePath()
}

function drawCover(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
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

async function ensureFonts(theme) {
  if (!document.fonts) return
  const family = theme.captionFont || 'Inter'
  try {
    await document.fonts.load(`600 60px "${family}"`)
    await document.fonts.ready
  } catch {
    /* font fallback tetap jalan */
  }
}

/**
 * Render strip foto ke canvas.
 * @param {object} opts
 * @param {number} opts.targetWidth lebar output dalam piksel
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderStrip({
  theme,
  layout,
  photos = [],
  frameColor,
  caption,
  filter = 'natural',
  brightness = 100,
  contrast = 100,
  targetWidth = 1200,
}) {
  const scale = targetWidth / layout.w
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(layout.w * scale)
  canvas.height = Math.round(layout.h * scale)
  const ctx = canvas.getContext('2d')

  const decoScale = canvas.width / 600

  drawBackground(ctx, theme, canvas.width, canvas.height)

  // sprocket film
  if (theme.frameStyle === 'film') {
    const holeW = 6 * decoScale
    const holeH = 10 * decoScale
    const gap = 16 * decoScale
    ctx.fillStyle = '#E8E0D0'
    for (let y = 0; y < canvas.height; y += gap) {
      ctx.fillRect(7 * decoScale, y + 2 * decoScale, holeW, holeH)
      ctx.fillRect(canvas.width - 13 * decoScale, y + 2 * decoScale, holeW, holeH)
    }
  }

  const cssFilter = filterStyle(filter, brightness, contrast)
  const supportsFilter = 'filter' in ctx

  const images = await Promise.all(
    photos.slice(0, layout.slots).map((p) => (p ? loadImage(p) : null)),
  )

  await ensureFonts(theme)

  // judul atas (tema desain)
  drawTitle(ctx, theme, canvas.width, canvas.height, decoScale)

  const slotRadius = (theme.slotRadius || 6) * decoScale
  const slotBorderWidth = (theme.slotBorderWidth || 2) * decoScale
  const borderColor = theme.borderColor || frameColor || theme.frame
  const pathFn = theme.frameStyle === 'arch' ? archPath : roundedPath
  const shadowStyles = ['polaroid', 'rounded', 'gls', 'arch']
  const rects = themeRects(layout, theme)

  rects.forEach((rect, i) => {
    const img = images[i]
    const dx = rect.x * scale
    const dy = rect.y * scale
    const dw = rect.w * scale
    const dh = rect.h * scale

    // bingkai slot
    ctx.save()
    pathFn(ctx, dx, dy, dw, dh, slotRadius)
    ctx.fillStyle = theme.slotBg
    if (shadowStyles.includes(theme.frameStyle)) {
      ctx.shadowColor = 'rgba(0,0,0,.18)'
      ctx.shadowBlur = 8 * decoScale
      ctx.shadowOffsetY = 3 * decoScale
    }
    ctx.fill()
    ctx.restore()

    ctx.save()
    pathFn(ctx, dx, dy, dw, dh, slotRadius)
    ctx.clip()
    if (supportsFilter && cssFilter) ctx.filter = cssFilter
    if (img) {
      drawCover(ctx, img, dx, dy, dw, dh)
    } else {
      ctx.fillStyle = theme.slotBg === '#33302C' ? '#8A817A' : '#5E554E'
      ctx.font = `500 ${44 * scale}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`Foto ${i + 1}`, dx + dw / 2, dy + dh / 2)
    }
    if (supportsFilter) ctx.filter = 'none'
    ctx.restore()

    // border
    if (slotBorderWidth > 0) {
      ctx.save()
      pathFn(ctx, dx, dy, dw, dh, slotRadius)
      ctx.lineWidth = slotBorderWidth
      ctx.strokeStyle = borderColor
      if (theme.frameStyle === 'neon') {
        ctx.shadowColor = borderColor
        ctx.shadowBlur = 12 * decoScale
      }
      ctx.stroke()
      ctx.restore()
    }

    // caption bar ala koran
    if (theme.slotCaptions && theme.slotCaptions[i]) {
      const barH = 16 * decoScale
      ctx.save()
      ctx.fillStyle = '#111'
      ctx.fillRect(dx, dy + dh - barH, dw, barH)
      ctx.fillStyle = '#F4F0E6'
      ctx.font = `500 ${8 * decoScale}px DM Mono, monospace`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(theme.slotCaptions[i], dx + 6 * decoScale, dy + dh - barH / 2)
      ctx.restore()
    }
  })

  if (supportsFilter) ctx.filter = 'none'

  // footer / caption
  if (theme.footer) {
    drawFooter(ctx, theme, canvas.width, canvas.height, decoScale)
  } else {
    const fontName = theme.captionFont || 'Inter'
    ctx.fillStyle = theme.caption
    ctx.font = `500 ${layout.caption.size * scale}px "${fontName}", ${fontName === 'Caveat' ? 'cursive' : 'sans-serif'}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(caption, canvas.width / 2, layout.caption.y * scale)
  }

  // dekorasi di atas
  drawDecorations(ctx, theme.decorations, decoScale)

  return canvas
}
