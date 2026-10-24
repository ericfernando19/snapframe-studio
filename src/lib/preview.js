export function filterStyle(filter, brightness = 100, contrast = 100) {
  const base = {
    natural: '',
    bw: 'grayscale(1) contrast(1.05)',
    warm: 'sepia(0.28) saturate(1.15) brightness(1.03)',
    film: 'sepia(0.18) contrast(1.12) saturate(0.88) brightness(0.98)',
    pastel: 'saturate(0.82) brightness(1.08) contrast(0.94)',
  }[filter]

  const parts = []
  if (base) parts.push(base)
  if (brightness !== 100) parts.push(`brightness(${brightness / 100})`)
  if (contrast !== 100) parts.push(`contrast(${contrast / 100})`)

  return parts.length ? parts.join(' ') : 'none'
}

export function defaultCaption() {
  const d = new Date()
  const bulan = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ]
  return `SnapFrame · ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`
}
