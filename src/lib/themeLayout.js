// Menyesuaikan posisi slot agar ada ruang untuk judul dan footer tema desain.

function fontSize(font, fallback = 32) {
  const m = String(font || '').match(/(\d+(?:\.\d+)?)px/)
  return m ? Number(m[1]) : fallback
}

export function themeTitle(theme, layout) {
  if (!theme?.title) return ''
  let title = theme.title
  if (/\bcuts\b/i.test(title)) {
    title = title.replace(/\b\d+\b/, String(layout.slots))
  }
  return title
}

export function themeRects(layout, theme) {
  const rects = layout.rects
  if (layout.design) return rects
  if (!theme || (!theme.title && !theme.footer)) return rects

  const base = layout.w / 600
  const titleLines = theme.title ? String(theme.title).split('\n').length : 0
  const titleH = theme.title ? titleLines * fontSize(theme.titleFont) * 1.15 + 34 : 0
  const footerH = theme.footer ? 46 : 0

  const header = titleH * base
  const footer = footerH * base

  const minY = Math.min(...rects.map((r) => r.y))
  const maxY = Math.max(...rects.map((r) => r.y + r.h))

  const top = minY + header
  const bottom = maxY - footer
  const span = maxY - minY
  if (bottom - top < span * 0.35) return rects

  const scaleY = (bottom - top) / span
  return rects.map((r) => ({
    ...r,
    y: top + (r.y - minY) * scaleY,
    h: r.h * scaleY,
  }))
}
