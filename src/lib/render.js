import { filterStyle } from './preview.js'

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

  ctx.fillStyle = frameColor || theme.frame
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const cssFilter = filterStyle(filter, brightness, contrast)
  const supportsFilter = 'filter' in ctx

  const images = await Promise.all(
    photos.slice(0, layout.slots).map((p) => (p ? loadImage(p) : null)),
  )

  if (supportsFilter && cssFilter) ctx.filter = cssFilter

  layout.rects.forEach((rect, i) => {
    const img = images[i]
    const dx = rect.x * scale
    const dy = rect.y * scale
    const dw = rect.w * scale
    const dh = rect.h * scale

    ctx.save()
    roundedPath(ctx, dx, dy, dw, dh, 6 * scale)
    ctx.clip()
    if (img) {
      drawCover(ctx, img, dx, dy, dw, dh)
    } else {
      ctx.fillStyle = theme.slotBg
      ctx.fillRect(dx, dy, dw, dh)
      ctx.fillStyle = theme.slotBg === '#33302C' ? '#8A817A' : '#5E554E'
      ctx.font = `500 ${44 * scale}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`Foto ${i + 1}`, dx + dw / 2, dy + dh / 2)
    }
    ctx.restore()
  })

  if (supportsFilter) ctx.filter = 'none'

  await ensureFonts(theme)
  const fontName = theme.captionFont || 'Inter'
  ctx.fillStyle = theme.caption
  ctx.font = `500 ${layout.caption.size * scale}px "${fontName}", ${fontName === 'Caveat' ? 'cursive' : 'sans-serif'}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(caption, canvas.width / 2, layout.caption.y * scale)

  return canvas
}
