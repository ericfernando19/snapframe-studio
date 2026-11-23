export const LIVE_FPS = 15
export const LIVE_MAX_SIDE = 720
export const LIVE_DURATION_MS = 1500

export function liveSupported() {
  return Boolean(
    typeof window !== 'undefined' &&
      'ImageBitmap' in window &&
      typeof createImageBitmap === 'function' &&
      HTMLCanvasElement.prototype.toBlob,
  )
}

export function scaleSize(w, h, maxSide) {
  const long = Math.max(w, h)
  if (long <= maxSide) return { w, h }
  const scale = maxSide / long
  return { w: Math.round(w * scale), h: Math.round(h * scale) }
}

export async function captureBitmap(video, { mirror = false, maxSize = LIVE_MAX_SIDE } = {}) {
  if (!video || !video.videoWidth || !video.videoHeight) return null
  const { w, h } = scaleSize(video.videoWidth, video.videoHeight, maxSize)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (mirror) {
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, 0, 0, w, h)
  try {
    return await createImageBitmap(canvas)
  } catch {
    return null
  }
}

export function cloneBitmap(bmp) {
  if (!bmp) return null
  try {
    // createImageBitmap accepts ImageBitmap in modern browsers
    return createImageBitmap(bmp)
  } catch {
    return null
  }
}

export function closeClip(clip) {
  if (!clip || !clip.frames) return
  for (const f of clip.frames) {
    try {
      f?.close?.()
    } catch {
      /* ignore */
    }
  }
}

export function startLiveBuffer(video, { mirror = false, fps = LIVE_FPS, maxSize = LIVE_MAX_SIDE } = {}) {
  const frames = []
  let stopped = false
  let lastCapture = 0
  const interval = 1000 / fps

  const trim = () => {
    const cutoff = performance.now() - 1500
    while (frames.length && frames[0].t < cutoff) {
      const f = frames.shift()
      try {
        f?.bitmap?.close?.()
      } catch {
        /* ignore */
      }
    }
    // hard cap
    while (frames.length > 60) {
      const f = frames.shift()
      try {
        f?.bitmap?.close?.()
      } catch {
        /* ignore */
      }
    }
  }

  const capture = async () => {
    if (stopped) return
    const bmp = await captureBitmap(video, { mirror, maxSize })
    if (stopped || !bmp) return
    frames.push({ bitmap: bmp, t: performance.now() })
    trim()
  }

  let rafId = null
  let rvfcHandle = null

  const onFrame = () => {
    if (stopped) return
    const now = performance.now()
    if (now - lastCapture >= interval) {
      lastCapture = now
      capture()
    }
  }

  if (video && typeof video.requestVideoFrameCallback === 'function') {
    const cb = () => {
      if (stopped) return
      onFrame()
      rvfcHandle = video.requestVideoFrameCallback(cb)
    }
    rvfcHandle = video.requestVideoFrameCallback(cb)
  } else {
    const loop = () => {
      if (stopped) return
      onFrame()
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
  }

  return {
    frames,
    stop() {
      stopped = true
      if (rafId) cancelAnimationFrame(rafId)
      if (rvfcHandle && video && typeof video.cancelVideoFrameCallback === 'function') {
        try {
          video.cancelVideoFrameCallback(rvfcHandle)
        } catch {
          /* ignore */
        }
      }
      // release frames
      for (const f of frames) {
        try {
          f?.bitmap?.close?.()
        } catch {
          /* ignore */
        }
      }
      frames.length = 0
    },
  }
}

export async function capturePostFrames(video, { duration = LIVE_DURATION_MS, fps = LIVE_FPS, mirror = false, maxSize = LIVE_MAX_SIDE } = {}) {
  const frames = []
  const interval = 1000 / fps
  const start = performance.now()
  let last = 0
  return new Promise((resolve) => {
    const loop = async (now) => {
      if (now - start >= duration) {
        resolve(frames)
        return
      }
      if (now - last >= interval) {
        last = now
        const bmp = await captureBitmap(video, { mirror, maxSize })
        if (bmp) frames.push(bmp)
      }
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
}

export function bitmapToDataUrl(bmp, quality = 0.9) {
  const canvas = document.createElement('canvas')
  canvas.width = bmp.width
  canvas.height = bmp.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bmp, 0, 0)
  return canvas.toDataURL('image/jpeg', quality)
}

export function framesToDataUrls(frames, quality = 0.8) {
  return frames.map((f) => bitmapToDataUrl(f, quality))
}