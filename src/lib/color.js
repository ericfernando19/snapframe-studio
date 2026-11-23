function parseHex(hex) {
  if (typeof hex !== 'string') return null
  const h = hex.trim().replace('#', '')
  if (h.length === 3) {
    return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
  }
  if (h.length === 6) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  return null
}

export function isDarkColor(hex) {
  const rgb = parseHex(hex)
  if (!rgb) return false
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum < 0.45
}

export function readableText(hex, dark = '#1F1B18', light = '#FFFFFF') {
  return isDarkColor(hex) ? light : dark
}
