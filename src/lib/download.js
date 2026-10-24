import { jsPDF } from 'jspdf'

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

export function canvasToBlob(canvas, format, quality = 0.92) {
  return new Promise((resolve, reject) => {
    const mime = format === 'jpg' ? 'image/jpeg' : 'image/png'
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Gagal membuat gambar'))),
      mime,
      quality,
    )
  })
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export async function downloadImage(canvas, format) {
  const blob = await canvasToBlob(canvas, format)
  const ext = format === 'jpg' ? 'jpg' : 'png'
  triggerDownload(blob, `SnapFrame-${stamp()}.${ext}`)
  return blob
}

export async function downloadPdf(canvas) {
  const isPortrait = canvas.height >= canvas.width
  const ratio = canvas.width / canvas.height
  let wmm, hmm
  if (isPortrait) {
    hmm = 150
    wmm = 150 * ratio
  } else {
    wmm = 150
    hmm = 150 / ratio
  }

  const pdf = new jsPDF({
    orientation: isPortrait ? 'portrait' : 'landscape',
    unit: 'mm',
    format: [wmm, hmm],
    compress: true,
  })

  const dataUrl = canvas.toDataURL('image/jpeg', 0.94)
  pdf.addImage(dataUrl, 'JPEG', 0, 0, wmm, hmm)
  pdf.save(`SnapFrame-siap-cetak-${stamp()}.pdf`)
}

export async function shareToWhatsApp(text) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function shareToInstagram() {
  window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
}

export async function copyImageToClipboard(blob) {
  if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined') {
    throw new Error('unsupported')
  }
  await navigator.clipboard.write([
    new window.ClipboardItem({ [blob.type]: blob }),
  ])
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
}
