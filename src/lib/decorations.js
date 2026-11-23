// Helpers to draw theme decorations on canvas.

export function drawBackground(ctx, theme, w, h) {
  const bg = theme.background
  if (bg && bg.type === 'linear' && Array.isArray(bg.colors) && bg.colors.length >= 2) {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    bg.colors.forEach((c, i) => g.addColorStop(i / (bg.colors.length - 1), c))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    return
  }
  if (bg && bg.type === 'conic') {
    // approximate gingham
    const step = Math.max(12, Math.round(w / 20))
    ctx.fillStyle = bg.base || theme.slotBg || '#fff'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = bg.alt || '#eee'
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        if (((x / step + y / step) % 2) === 0) {
          ctx.fillRect(x, y, step, step)
        }
      }
    }
    return
  }
  ctx.fillStyle = theme.frame || '#fff'
  ctx.fillRect(0, 0, w, h)
}

const PATHS = {
  heart: 'M12 21C5 16 2 12 2 8.5A5 5 0 0 1 12 6a5 5 0 0 1 10 2.5C22 12 19 16 12 21z',
  spark: 'M12 1C12.8 7.5 16.5 11.2 23 12 16.5 12.8 12.8 16.5 12 23 11.2 16.5 7.5 12.8 1 12 7.5 11.2 11.2 7.5 12 1z',
  bow: 'M12 12 2 5v14zM12 12l10-7v14z',
}

export function drawDecoration(ctx, d, scale) {
  const type = d[0]
  const x = (d[1] / 100) * (ctx.canvas.width)
  const y = (d[2] / 100) * (ctx.canvas.height)
  const size = d[3] * scale
  const color = d[4]
  const rot = ((d[5] || 0) * Math.PI) / 180

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(size / 24, size / 24)

  if (type === 'heart' || type === 'spark' || type === 'bow') {
    const p = new Path2D(PATHS[type])
    ctx.fillStyle = color
    ctx.fill(p)
    if (type === 'bow') {
      ctx.beginPath()
      ctx.arc(12, 12, 3, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.lineWidth = 1.2
      ctx.strokeStyle = '#fff'
      ctx.stroke()
    }
  } else if (type === 'sq') {
    ctx.fillStyle = color
    ctx.fillRect(4, 4, 16, 16)
  } else if (type === 'cloud') {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(7, 14, 4.5, 0, Math.PI * 2)
    ctx.arc(13, 10.5, 5.5, 0, Math.PI * 2)
    ctx.arc(18, 14, 4, 0, Math.PI * 2)
    ctx.fillRect(3, 14, 19, 5)
    ctx.fill()
  } else if (type === 'sun') {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(12, 12, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    const rays = [
      [12, 1, 12, 4],
      [12, 20, 12, 23],
      [1, 12, 4, 12],
      [20, 12, 23, 12],
      [4.5, 4.5, 6.5, 6.5],
      [17.5, 17.5, 19.5, 19.5],
      [4.5, 19.5, 6.5, 17.5],
      [17.5, 6.5, 19.5, 4.5],
    ]
    for (const r of rays) {
      ctx.beginPath()
      ctx.moveTo(r[0], r[1])
      ctx.lineTo(r[2], r[3])
      ctx.stroke()
    }
  } else if (type === 'rainbow') {
    ctx.lineWidth = 3
    const colors = ['#D9541E', '#F2A33A', '#8A5A2B']
    const paths = [
      'M2 20a10 10 0 0 1 20 0',
      'M5 20a7 7 0 0 1 14 0',
      'M8 20a4 4 0 0 1 8 0',
    ]
    paths.forEach((p, i) => {
      ctx.strokeStyle = colors[i]
      ctx.stroke(new Path2D(p))
    })
  } else if (type === 'flower') {
    ctx.fillStyle = color
    for (let a = 0; a < 8; a++) {
      ctx.save()
      ctx.rotate((a * 45 * Math.PI) / 180)
      ctx.beginPath()
      ctx.ellipse(12, 5.5, 2.6, 4.6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = '#F5C84C'
    ctx.beginPath()
    ctx.arc(12, 12, 3.2, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

export function drawDecorations(ctx, decorations, scale) {
  if (!Array.isArray(decorations)) return
  for (const d of decorations) drawDecoration(ctx, d, scale)
}

export function drawTitle(ctx, theme, w, h, scale, opts = {}) {
  if (!theme.title) return
  const font = theme.titleFont || '600 32px Inter, sans-serif'
  const lines = String(theme.title).split('\n')
  const maxWidth = opts.maxWidth || w * 0.9
  const maxHeight = opts.maxHeight || h * 0.12

  let currentFont = scaleFont(font, scale)
  let fontSize = parseFloat(currentFont.match(/(\d+(?:\.\d+)?)px/)?.[1]) || 32
  ctx.save()
  ctx.font = currentFont
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width))
  const neededHeight = lines.length * fontSize * 1.08
  if (widest > 0) {
    const factor = Math.min(1.15, maxWidth / widest, maxHeight / neededHeight)
    if (Number.isFinite(factor) && factor > 0 && Math.abs(factor - 1) > 0.02) {
      fontSize = Math.max(7, fontSize * factor)
      currentFont = currentFont.replace(/(\d+(?:\.\d+)?)px/, `${fontSize}px`)
    }
  }
  ctx.font = currentFont
  ctx.fillStyle = theme.titleColor || theme.caption || '#111'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (theme.titleShadow) {
    ctx.shadowColor = 'rgba(0,0,0,.35)'
    ctx.shadowBlur = 6
  }
  const lineHeight = fontSize * 1.06
  const startY = (theme.titleY || 0.07) * h
  lines.forEach((line, i) => {
    ctx.fillText(line, w / 2, startY + i * lineHeight)
  })
  ctx.restore()
}

function scaleFont(font, scale) {
  return font.replace(/(\d+(?:\.\d+)?)px/, (_, n) => `${Math.round(Number(n) * scale)}px`)
}

export function drawFooter(ctx, theme, w, h, scale) {
  if (!theme.footer) return
  const y = (theme.footerY || 0.93) * h
  ctx.save()
  ctx.font = scaleFont(theme.footerFont || '500 12px DM Mono, monospace', scale)
  const text = theme.footer
  const metrics = ctx.measureText(text)
  const padX = 10 * scale
  const padY = 4 * scale
  const bw = metrics.width + padX * 2
  const bh = 18 * scale + padY * 2
  const x = (w - bw) / 2
  const by = y - bh / 2
  if (theme.footerBg && theme.footerBg !== 'transparent') {
    ctx.fillStyle = theme.footerBg
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath()
      ctx.roundRect(x, by, bw, bh, 6 * scale)
      ctx.fill()
    } else {
      ctx.fillRect(x, by, bw, bh)
    }
  }
  if (theme.footerBorder) {
    ctx.strokeStyle = theme.footerBorder
    ctx.lineWidth = 1.5 * scale
    ctx.setLineDash([4 * scale, 3 * scale])
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath()
      ctx.roundRect(x, by, bw, bh, 6 * scale)
      ctx.stroke()
    } else {
      ctx.strokeRect(x, by, bw, bh)
    }
    ctx.setLineDash([])
  }
  ctx.fillStyle = theme.footerColor || '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, w / 2, y)
  ctx.restore()
}