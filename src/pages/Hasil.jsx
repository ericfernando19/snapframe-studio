import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudio } from '../state/StudioContext.jsx'
import StripPreview from '../components/StripPreview.jsx'
import { defaultCaption } from '../lib/preview.js'
import Stepper from '../components/Stepper.jsx'
import { renderStrip } from '../lib/render.js'
import {
  copyImageToClipboard,
  copyText,
  downloadImage,
  downloadPdf,
  shareToInstagram,
  shareToWhatsApp,
} from '../lib/download.js'
import { exportLiveVideo, mp4Supported } from '../lib/exportLive.js'

const FORMATS = [
  { id: 'png', label: 'PNG' },
  { id: 'jpg', label: 'JPG' },
  { id: 'pdf', label: 'PDF siap cetak' },
]

const QUALITIES = [
  { id: 'standar', label: 'Standar' },
  { id: 'hd', label: 'HD 300 DPI' },
]

export default function Hasil() {
  const {
    theme,
    layout,
    settings,
    photos,
    liveClips,
    setLiveClips,
    effectiveFilter,
    frameColor,
    update,
    resetProject,
  } = useStudio()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const [progress, setProgress] = useState(0)
  const [controller, setController] = useState(null)

  useEffect(() => {
    if (!hasLive && ['mp4', 'webm', 'gif'].includes(settings.format)) {
      update({ format: 'png' })
    }
  }, [hasLive, settings.format, update])

  const caption = settings.caption || defaultCaption()
  const filled = photos.slice(0, layout.slots).filter(Boolean).length
  const hasLive = (liveClips || []).some((c) => c?.frames?.length)

  const formats = [
    { id: 'png', label: 'PNG' },
    { id: 'jpg', label: 'JPG' },
    { id: 'pdf', label: 'PDF siap cetak' },
  ]
  if (hasLive) {
    if (mp4Supported()) formats.push({ id: 'mp4', label: 'MP4 (video)' })
    else formats.push({ id: 'webm', label: 'WebM (video)' })
    formats.push({ id: 'gif', label: 'GIF' })
  }

  const say = (msg) => {
    setNotice(msg)
    clearTimeout(say._t)
    say._t = setTimeout(() => setNotice(null), 4000)
  }

  const makeCanvas = () =>
    renderStrip({
      theme,
      layout,
      photos,
      frameColor,
      caption,
      filter: effectiveFilter,
      brightness: settings.brightness,
      contrast: settings.contrast,
      targetWidth: settings.quality === 'hd' ? 3000 : 1200,
    })

  const handleDownload = async () => {
    if (filled === 0) {
      say('Belum ada foto untuk diunduh.')
      return
    }
    const fmt = settings.format
    const isLiveFmt = ['mp4', 'webm', 'gif'].includes(fmt)
    if (isLiveFmt) {
      if (!hasLive) {
        say('Tidak ada slot Live untuk diekspor.')
        return
      }
      setBusy('download')
      setProgress(0)
      const ctrl = new AbortController()
      setController(ctrl)
      try {
        const blob = await exportLiveVideo({
          theme,
          layout,
          photos,
          liveClips,
          settings: { ...settings, caption },
          format: fmt,
          resolution: settings.quality,
          onProgress: (p) => setProgress(p),
          signal: ctrl.signal,
        })
        const ext = fmt === 'gif' ? 'gif' : fmt === 'webm' ? 'webm' : 'mp4'
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `SnapFrame-${Date.now()}.${ext}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
        say('File bergerak diunduh.')
      } catch (e) {
        if (e?.message === 'cancelled') say('Ekspor dibatalkan.')
        else if (e?.message === 'mp4-unsupported' || e?.message === 'mp4-config-unsupported')
          say('Format MP4 tidak didukung di perangkat ini. Coba GIF.')
        else say(e?.message || 'Gagal membuat file. Coba lagi.')
      } finally {
        setBusy(null)
        setController(null)
        setProgress(0)
      }
      return
    }

    setBusy('download')
    try {
      const canvas = await makeCanvas()
      if (settings.format === 'pdf') await downloadPdf(canvas)
      else await downloadImage(canvas, settings.format)
      say(settings.format === 'pdf' ? 'PDF siap cetak diunduh.' : 'Foto diunduh ke perangkatmu.')
    } catch (e) {
      say(e?.message || 'Gagal membuat file. Coba lagi.')
    } finally {
      setBusy(null)
    }
  }

  const handleShare = async (kind) => {
    if (filled === 0) {
      say('Belum ada foto untuk dibagikan.')
      return
    }
    setBusy(kind)
    try {
      if (kind === 'wa') {
        const text = `Foto strip ala studio dari SnapFrame - ${window.location.origin}`
        await shareToWhatsApp(text)
        say('WhatsApp terbuka. Unduh fotonya dulu untuk melampirkannya.')
      } else if (kind === 'ig') {
        const canvas = await makeCanvas()
        const blob = await new Promise((res, rej) =>
          canvas.toBlob((b) => (b ? res(b) : rej(new Error('gagal'))), 'image/png'),
        )
        try {
          await copyImageToClipboard(blob)
          say('Gambar disalin. Buka Instagram lalu tempel di story atau postingan.')
        } catch {
          await downloadImage(canvas, 'png')
          say('Gambar diunduh. Buka Instagram lalu unggah fotonya.')
        }
        shareToInstagram()
      } else {
        await copyText(window.location.href)
        say('Tautan disalin ke papan klip.')
      }
    } catch (e) {
      say(e?.message || 'Tidak dapat membagikan foto.')
    } finally {
      setBusy(null)
    }
  }

  const restart = () => {
    resetProject()
    navigate('/studio')
  }

  return (
    <div className="font-sans text-charcoal bg-cream min-h-screen">
      <div className="max-w-[1120px] mx-auto px-5 sm:px-8 py-6 pb-24">
        <header className="flex flex-wrap gap-4 items-center justify-between">
          <a href="/" className="h text-[26px]">
            SnapFrame
          </a>
          <Stepper done={[true, true, true, true]} />
        </header>

        <section className="flex flex-wrap gap-8 lg:gap-14 items-center pt-10">
          <div className="flex-1 basis-[320px] flex justify-center bg-panel rounded-panel py-12 px-6">
            <StripPreview
              theme={theme}
              layout={layout}
              photos={photos}
              liveClips={liveClips}
              frameColor={frameColor}
              caption={caption}
              filter={effectiveFilter}
              brightness={settings.brightness}
              contrast={settings.contrast}
              width={220}
              autoplay={!!settings.autoplay}
              onToggleLive={(i) => {
                setLiveClips((prev) => {
                  const next = Array.from({ length: layout.slots }, (_, j) => (prev || [])[j] || null)
                  if (next[i]) {
                    try {
                      next[i].frames?.forEach((f) => f?.close?.())
                    } catch {
                      /* ignore */
                    }
                    next[i] = null
                  }
                  return next
                })
              }}
            />
          </div>

          <div className="flex-1 basis-[380px]">
            <h1 className="h text-[36px] sm:text-[48px] leading-[1.1] mb-3">
              Fotomu sudah siap.
            </h1>
            <p className="m-0 text-[17px] sm:text-[18px] leading-[1.6] text-muted">
              Pilih format dan kualitas, lalu unduh.
            </p>

            <div className="lbl mt-7" id="format-label">
              Format
            </div>
            <div className="flex flex-wrap gap-2.5" role="group" aria-labelledby="format-label">
              {formats.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`chip ${settings.format === f.id ? 'on' : ''}`}
                  aria-pressed={settings.format === f.id}
                  onClick={() => update({ format: f.id })}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="lbl" id="quality-label">
              Kualitas
            </div>
            <div className="flex flex-wrap gap-2.5" role="group" aria-labelledby="quality-label">
              {QUALITIES.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  className={`chip ${settings.quality === q.id ? 'on' : ''}`}
                  aria-pressed={settings.quality === q.id}
                  onClick={() => update({ quality: q.id })}
                >
                  {q.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn w-full mt-8"
              onClick={handleDownload}
              disabled={busy !== null}
            >
              {busy === 'download' ? 'Membuat file...' : 'Unduh Foto'}
            </button>

            {busy === 'download' && progress > 0 && (
              <div className="mt-3">
                <div className="w-full h-2 bg-line rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C4452B] transition-all"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-1 mb-0 text-center">
                  {Math.round(progress * 100)}%
                </p>
              </div>
            )}

            {busy === 'download' && controller && (
              <button
                type="button"
                className="btn2 w-full mt-3"
                onClick={() => controller.abort()}
              >
                Batal
              </button>
            )}

            <div className="lbl mt-7" id="share-label">
              Bagikan
            </div>
            <div className="flex flex-wrap gap-2.5" role="group" aria-labelledby="share-label">
              <button
                type="button"
                className="chip"
                onClick={() => handleShare('wa')}
                disabled={busy !== null}
              >
                WhatsApp
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => handleShare('ig')}
                disabled={busy !== null}
              >
                Instagram
              </button>
              <button
                type="button"
                className="chip"
                onClick={() => handleShare('link')}
                disabled={busy !== null}
              >
                Salin tautan
              </button>
            </div>

            <p className="mt-7 mb-0">
              <button
                type="button"
                onClick={restart}
                className="bg-transparent border-0 p-0 font-sans text-[16px] font-medium text-charcoal cursor-pointer hover:text-[#C4452B]"
              >
                Buat lagi dari awal
              </button>
            </p>

            <p className="mt-5 mb-0 text-sm text-muted leading-relaxed">
              Fotomu diproses sepenuhnya di perangkatmu - tidak ada yang diunggah ke server.
            </p>
          </div>
        </section>
      </div>

      {notice && (
        <div
          role="status"
          className="fixed left-1/2 -translate-x-1/2 bottom-6 bg-charcoal text-white text-sm px-5 py-3 rounded-full z-40 shadow-strip max-w-[92vw] text-center"
        >
          {notice}
        </div>
      )}
    </div>
  )
}
