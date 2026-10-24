export function cameraSupported() {
  return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
}

export async function startCamera(facingMode = 'user') {
  if (!cameraSupported()) {
    const err = new Error('unsupported')
    err.code = 'unsupported'
    throw err
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 1280 },
      },
      audio: false,
    })
  } catch (e) {
    const err = new Error(e?.name || 'camera-error')
    err.code = e?.name === 'NotAllowedError' ? 'denied' : e?.name || 'error'
    throw err
  }
}

export function stopCamera(stream) {
  if (!stream) return
  stream.getTracks().forEach((t) => t.stop())
}

export function captureFrame(video, { mirror = false } = {}) {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return null

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  if (mirror) {
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.92)
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
