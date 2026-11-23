// Geometri bingkai slot per tema desain (mengikuti mockup CSS).

const BORDERS = {
  polaroid: 0,
  gls: 0,
  rounded: 5,
  square: 3,
  arch: 5,
  neon: 3,
  newspaper: 2,
  film: 2,
}

const PADDING = {
  polaroid: 8,
  gls: 6,
}

export function slotStyle(theme, rect, scale) {
  const style = theme.frameStyle
  if (!style) {
    return {
      outer: rect,
      inner: rect,
      radius: (theme.slotRadius || 6) * scale,
      borderWidth: 0,
      borderColor: theme.borderColor,
      bg: theme.slotBg,
      shadow: false,
    }
  }

  const border = (BORDERS[style] ?? 0) * scale
  const padding = (PADDING[style] ?? 0) * scale
  const bottomExtra = style === 'polaroid' ? 22 * scale : 0
  const inset = border + padding

  const outer = { ...rect }
  const inner = {
    x: rect.x + inset,
    y: rect.y + inset,
    w: Math.max(1, rect.w - inset * 2),
    h: Math.max(1, rect.h - inset * 2 - bottomExtra),
  }

  return {
    outer,
    inner,
    radius: (theme.slotRadius || 0) * scale,
    borderWidth: border,
    borderColor: theme.borderColor || '#111',
    bg: theme.slotBg,
    shadow: ['polaroid', 'rounded', 'gls', 'arch'].includes(style),
    glow: style === 'neon',
    styleName: style,
  }
}
