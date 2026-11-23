import { filterStyle } from './preview.js'
import { LIVE_FPS } from './live.js'
import { drawBackground, drawTitle, drawFooter, drawDecorations } from './decorations.js'
import { themeRects } from './themeLayout.js'

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Gagal memuat gambar'))
    img.src = src
  })
}

function drawCover(ctx, img, dx, dy, dw, dh) {
  const iw = img.naturalWidth || img.width || img.videoWidth
  const ih = img.naturalHeight || img.height || img.videoHeight
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

export function mp4Supported() {
  return (
    typeof window !== 'undefined' &&
    'VideoEncoder' in window &&
    'VideoFrame' in window
  )
}

export function outputSize(layout, shortSide) {
  const aspect = layout.w / layout.h
  let width, height
  if (layout.w <= layout.h) {
    width = shortSide
    height = Math.round(shortSide / aspect)
  } else {
    height = shortSide
    width = Math.round(shortSide * aspect)
  }
  // even dimensions for video
  width = width - (width % 2)
  height = height - (height % 2)
  if (width < 2) width = 2
  if (height < 2) height = 2
  return { width, height }
}

export async function exportLiveVideo({
  theme,
  layout,
  photos = [],
  liveClips = [],
  settings = {},
  format = 'mp4',
  resolution = 'standar',
  onProgress = () => {},
  signal = null,
}) {
  const isGif = format === 'gif'
  const isWebm = format === 'webm'

  let shortSide = 720
  if (isGif) shortSide = 480
  else if (resolution === 'hd') shortSide = 1080
  else shortSide = 720

  const { width, height } = outputSize(layout, shortSide)
  const fps = LIVE_FPS
  const durationSec = 3
  const totalFrames = durationSec * fps

  const frameColor = settings.frameColor || theme.frame
  const caption = settings.caption || ''
  const filter = settings.filter && settings.filter !== 'natural' ? settings.filter : theme.filter || 'natural'
  const brightness = settings.brightness || 100
  const contrast = settings.contrast || 100
  const cssFilter = filterStyle(filter, brightness, contrast)

  // preload still images
  const images = await Promise.all(
    photos.slice(0, layout.slots).map((p) => (p ? loadImage(p).catch(() => null) : null)),
  )

  const scale = width / layout.w
  const decoScale = width / 600
  const rects = themeRects(layout, theme)
  const slotRadius = (theme.slotRadius || 6) * decoScale
  const slotBorderWidth = (theme.slotBorderWidth || 2) * decoScale
  const borderColor = theme.borderColor || frameColor

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  const drawFrame = (frameIndex) => {
    if (signal?.aborted) throw new Error('cancelled')
    const t = frameIndex / fps
    drawBackground(ctx, theme, width, height)
    drawTitle(ctx, theme, width, height, decoScale)

    rects.forEach((rect, i) => {
      const clip = liveClips[i]
      const dx = rect.x * scale
      const dy = rect.y * scale
      const dw = rect.w * scale
      const dh = rect.h * scale

      // background slot
      ctx.save()
      roundedPath(ctx, dx, dy, dw, dh, slotRadius)
      ctx.fillStyle = theme.slotBg
      ctx.fill()
      ctx.restore()

      ctx.save()
      roundedPath(ctx, dx, dy, dw, dh, slotRadius)
      ctx.clip()
      if (cssFilter && cssFilter !== 'none') ctx.filter = cssFilter

      let drawn = false
      if (clip?.frames?.length) {
        const idx = Math.min(
          clip.frames.length - 1,
          Math.max(0, Math.round(t * clip.fps)),
        )
        const frameBmp = clip.frames[idx]
        if (frameBmp) {
          drawCover(ctx, frameBmp, dx, dy, dw, dh)
          drawn = true
        }
      }
      if (!drawn) {
        const img = images[i]
        if (img) drawCover(ctx, img, dx, dy, dw, dh)
        else {
          ctx.fillStyle = theme.slotBg
          ctx.fillRect(dx, dy, dw, dh)
        }
      }
      ctx.filter = 'none'
      ctx.restore()

      if (slotBorderWidth > 0) {
        ctx.save()
        roundedPath(ctx, dx, dy, dw, dh, slotRadius)
        ctx.lineWidth = slotBorderWidth
        ctx.strokeStyle = borderColor
        if (theme.frameStyle === 'neon') {
          ctx.shadowColor = borderColor
          ctx.shadowBlur = 12 * decoScale
        }
        ctx.stroke()
        ctx.restore()
      }
    })

    // footer / caption
    if (theme.footer) {
      drawFooter(ctx, theme, width, height, decoScale)
    } else {
      try {
        ctx.fillStyle = theme.caption
        ctx.font = `500 ${Math.round(layout.caption.size * scale)}px ${theme.captionFont || 'Inter'}, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(caption, width / 2, layout.caption.y * scale)
      } catch {
        /* ignore */
      }
    }

    drawDecorations(ctx, theme.decorations, decoScale)
  }

  // GIF path
  if (isGif) {
    const { GIFEncoder, quantize, applyPalette } = await import('gifenc')
    const encoder = GIFEncoder()
    for (let f = 0; f < totalFrames; f++) {
      if (signal?.aborted) throw new Error('cancelled')
      drawFrame(f)
      const { data } = ctx.getImageData(0, 0, width, height)
      const palette = quantize(data, 256)
      const index = applyPalette(data, palette)
      encoder.writeFrame(index, width, height, { palette, delay: Math.round(1000 / fps) })
      onProgress((f + 1) / totalFrames)
      // yield
      await new Promise((r) => setTimeout(r, 0))
    }
    encoder.finish()
    return new Blob([encoder.bytes()], { type: 'image/gif' })
  }

  // WebM fallback via MediaRecorder
  if (isWebm) {
    const stream = canvas.captureStream(fps)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    const chunks = []
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data)
    }
    const done = new Promise((resolve, reject) => {
      recorder.onstop = () => resolve()
      recorder.onerror = (e) => reject(e?.error || new Error('recorder error'))
    })
    recorder.start()
    for (let f = 0; f < totalFrames; f++) {
      if (signal?.aborted) {
        try {
          recorder.stop()
        } catch {
          /* ignore */
        }
        throw new Error('cancelled')
      }
      drawFrame(f)
      onProgress((f + 1) / totalFrames)
      await new Promise((r) => setTimeout(r, 1000 / fps))
    }
    recorder.stop()
    await done
    return new Blob(chunks, { type: mimeType })
  }

  // MP4 path (WebCodecs)
  if (!mp4Supported()) {
    throw new Error('mp4-unsupported')
  }

  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer')
  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: {
      codec: 'avc',
      width,
      height,
      frameRate: fps,
    },
    fastStart: 'in-memory',
  })

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      throw e
    },
  })

  const config = {
    codec: 'avc1.42001f',
    width,
    height,
    bitrate: resolution === 'hd' ? 4_000_000 : 2_000_000,
    framerate: fps,
  }
  const support = await VideoEncoder.isConfigSupported(config)
  if (!support.supported) {
    throw new Error('mp4-config-unsupported')
  }
  encoder.configure(config)

  for (let f = 0; f < totalFrames; f++) {
    if (signal?.aborted) {
      try {
        encoder.close()
      } catch {
        /* ignore */
      }
      throw new Error('cancelled')
    }
    drawFrame(f)
    const frame = new VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / fps) })
    const keyFrame = f % (fps * 2) === 0
    encoder.encode(frame, { keyFrame })
    frame.close()
    onProgress((f + 1) / totalFrames)
    // backpressure
    if (encoder.encodeQueueSize > 2) {
      await new Promise((r) => setTimeout(r, 0))
    }
  }

  await encoder.flush()
  encoder.close()
  muxer.finalize()
  const buffer = muxer.target.buffer
  return new Blob([buffer], { type: 'video/mp4' })
}