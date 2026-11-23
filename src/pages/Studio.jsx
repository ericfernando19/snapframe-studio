import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStudio } from '../state/StudioContext.jsx'
import { THEMES } from '../data/themes.js'
import { LAYOUTS } from '../data/layouts.js'
import StripPreview from '../components/StripPreview.jsx'
import { defaultCaption } from '../lib/preview.js'
import Stepper from '../components/Stepper.jsx'
import CameraView from '../components/CameraView.jsx'
import useMediaQuery from '../hooks/useMediaQuery.js'
import {
  captureFrame,
  cameraSupported,
  fileToDataUrl,
  startCamera,
  stopCamera,
} from '../lib/camera.js'
import {
  liveSupported,
  startLiveBuffer,
  capturePostFrames,
  closeClip,
  bitmapToDataUrl,
  LIVE_FPS,
  LIVE_MAX_SIDE,
  LIVE_DURATION_MS,
} from '../lib/live.js'

const FILTERS = [
  { id: 'natural', label: 'Natural' },
  { id: 'bw', label: 'Hitam putih' },
  { id: 'warm', label: 'Hangat' },
  { id: 'film', label: 'Film' },
  { id: 'pastel', label: 'Pastel' },
]

const FRAME_SWATCHES = ['#F6C9C0', '#A8BFA3', '#E8D5B5', '#1F1B18']

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function canDecode(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

export default function Studio() {
  const {
    theme,
    layout,
    settings,
    photos,
    liveClips,
    filledCount,
    allFilled,
    effectiveFilter,
    frameColor,
    update,
    selectTheme,
    selectLayout,
    setPhotos,
    setLiveClips,
    setStep,
  } = useStudio()
  const navigate = useNavigate()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const [activeSlot, setActiveSlot] = useState(0)
  const [mobileStep, setMobileStep] = useState(1)
  const [mode, setMode] = useState('preview')
  const [countdown, setCountdown] = useState(null)
  const [camError, setCamError] = useState(null)
  const [facing, setFacing] = useState('user')
  const [mirror, setMirror] = useState(true)
  const [flash, setFlash] = useState(false)
  const [notice, setNotice] = useState(null)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const cancelRef = useRef(false)
  const shootResolver = useRef(null)
  const camErrorRef = useRef(null)
  const fileInputRef = useRef(null)
  const noticeTimer = useRef(null)
  const liveBufferRef = useRef(null)
  const [isVisible, setIsVisible] = useState(true)
  const [keyFrameSlot, setKeyFrameSlot] = useState(null)
  const [keyFrameUrls, setKeyFrameUrls] = useState([])

  const showNotice = useCallback((msg) => {
    setNotice(msg)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 3500)
  }, [])

  const effectiveCaption = settings.caption || defaultCaption()

  const targets = useMemo(() => {
    const empty = []
    for (let i = 0; i < layout.slots; i++) if (!photos[i]) empty.push(i)
    if (empty.length) return empty
    const slot = Math.min(activeSlot, layout.slots - 1)
    return [slot]
  }, [photos, layout.slots, activeSlot])

  useEffect(() => {
    const onVis = () => setIsVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVis)
    onVis()
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  /* ---------- kamera ---------- */
  useEffect(() => {
    if (mode !== 'camera') {
      stopCamera(streamRef.current)
      streamRef.current = null
      camErrorRef.current = null
      setCamError(null)
      setCountdown(null)
      return undefined
    }

    let disposed = false
    camErrorRef.current = null
    setCamError(null)

    startCamera(facing)
      .then((stream) => {
        if (disposed) {
          stopCamera(stream)
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play?.().catch(() => {})
        }
      })
      .catch((err) => {
        if (disposed) return
        camErrorRef.current = err
        setCamError(err)
        cancelRef.current = true
      })

    return () => {
      disposed = true
      stopCamera(streamRef.current)
      streamRef.current = null
    }
  }, [mode, facing])

  useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play?.().catch(() => {})
    }
  }, [mode, countdown, camError])

  useEffect(() => {
    // hentikan buffer jika Live dimatikan / kamera off / tab tersembunyi
    if (liveBufferRef.current) {
      liveBufferRef.current.stop()
      liveBufferRef.current = null
    }
    if (mode !== 'camera' || !settings.liveEnabled || !isVisible) return
    if (!videoRef.current) return
    const buf = startLiveBuffer(videoRef.current, { mirror })
    liveBufferRef.current = buf
    return () => {
      if (liveBufferRef.current === buf) {
        buf.stop()
        liveBufferRef.current = null
      }
    }
  }, [mode, settings.liveEnabled, isVisible, mirror])

  const exitCamera = useCallback(() => {
    cancelRef.current = true
    shootResolver.current?.(false)
    shootResolver.current = null
    setMode('preview')
    setCountdown(null)
  }, [])

  const requestShoot = useCallback(() => {
    shootResolver.current?.(true)
  }, [])

  function waitForShootOr(ms) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        shootResolver.current = null
        resolve(false)
      }, ms)
      shootResolver.current = (v) => {
        clearTimeout(timer)
        shootResolver.current = null
        resolve(v)
      }
    })
  }

  const shootInto = useCallback(
    (idx) => {
      const url = captureFrame(videoRef.current, { mirror })
      if (!url) {
        showNotice('Kamera belum siap, coba lagi.')
        return false
      }
      setPhotos((prev) => {
        const next = Array.from({ length: layout.slots }, (_, i) => prev[i] || null)
        next[idx] = url
        return next
      })
      setFlash(true)
      setTimeout(() => setFlash(false), 460)

      // Tangkap klip Live bila aktif
      if (settings.liveEnabled && liveBufferRef.current) {
        const buf = liveBufferRef.current
        const preFrames = buf.frames.map((f) => f.bitmap)
        // clone bitmaps agar tidak ikut dibebaskan oleh buffer
        Promise.all(preFrames.map((b) => (b ? createImageBitmap(b) : null)))
          .then(async (clones) => {
            const validPre = clones.filter(Boolean)
            const width = validPre[0]?.width || LIVE_MAX_SIDE
            const height = validPre[0]?.height || Math.round((LIVE_MAX_SIDE * 3) / 4)
            const clip = {
              id: `live-${Date.now()}-${idx}`,
              slotIndex: idx,
              fps: LIVE_FPS,
              width,
              height,
              frames: validPre,
              keyFrameIndex: validPre.length ? validPre.length - 1 : 0,
              shutterIndex: validPre.length,
              pending: true,
            }
            setLiveClips((prev) => {
              const next = Array.from({ length: layout.slots }, (_, i) => prev[i] || null)
              // bebaskan klip lama
              if (next[idx]) closeClip(next[idx])
              next[idx] = clip
              return next
            })

            // rekam pasca-rana di latar belakang
            capturePostFrames(videoRef.current, { mirror }).then((post) => {
              setLiveClips((prev) => {
                const next = [...prev]
                const cur = next[idx]
                if (!cur || cur.id !== clip.id) return prev
                const frames = [...cur.frames, ...post]
                const updated = { ...cur, frames, pending: false, shutterIndex: validPre.length }
                // update dimensi
                if (frames[0]) {
                  updated.width = frames[0].width
                  updated.height = frames[0].height
                }
                next[idx] = updated
                return next
              })
            })
          })
          .catch(() => {
            /* abaikan */
          })
      }

      return true
    },
    [mirror, layout.slots, setPhotos, setLiveClips, showNotice, settings.liveEnabled],
  )

  const runSequence = useCallback(
    async (list) => {
      for (const idx of list) {
        if (cancelRef.current || camErrorRef.current) break
        setActiveSlot(idx)
        const secs = settings.timer
        let proceed = true
        for (let s = secs; s >= 1; s--) {
          if (cancelRef.current) {
            proceed = false
            break
          }
          setCountdown(s)
          const early = await waitForShootOr(1000)
          if (cancelRef.current) {
            proceed = false
            break
          }
          if (early) break
        }
        setCountdown(null)
        if (!proceed) break
        shootInto(idx)
        await sleep(420)
      }
      if (!cancelRef.current) {
        setMode('preview')
        setMobileStep(4)
      }
      setCountdown(null)
    },
    [settings.timer, shootInto],
  )

  const startCameraFlow = useCallback(async () => {
    if (!cameraSupported()) {
      showNotice('Kamera tidak didukung di peramban ini. Gunakan unggah foto.')
      return
    }
    cancelRef.current = false
    setMode('camera')

    let ready = false
    for (let i = 0; i < 70; i++) {
      if (camErrorRef.current) return
      if (videoRef.current?.videoWidth > 0) {
        ready = true
        break
      }
      await sleep(100)
    }
    if (!ready) {
      if (!camErrorRef.current) showNotice('Kamera lambat merespons, coba lagi.')
      return
    }
    await sleep(250)
    await runSequence(targets)
  }, [runSequence, targets, showNotice])

  const toggleLive = useCallback(() => {
    if (!liveSupported()) {
      showNotice('Live Photo tidak didukung di perangkat ini.')
      return
    }
    if (!settings.liveEnabled) {
      const seen = localStorage.getItem('snapframe.live.notice.v1')
      if (!seen) {
        const ok = window.confirm(
          'Live Photo merekam klip singkat (~3 detik) di perangkatmu. Klip tidak diunggah ke server. Aktifkan?',
        )
        if (!ok) return
        try {
          localStorage.setItem('snapframe.live.notice.v1', '1')
        } catch {
          /* ignore */
        }
      }
    }
    update({ liveEnabled: !settings.liveEnabled })
  }, [settings.liveEnabled, update, showNotice])

  const switchFacing = useCallback(() => {
    setFacing((f) => (f === 'user' ? 'environment' : 'user'))
  }, [])

  const toggleMirror = useCallback(() => setMirror((m) => !m), [])

  useEffect(() => {
    setMirror(facing === 'user')
  }, [facing])

  /* ---------- unggah ---------- */
  const handleFiles = useCallback(
    async (fileList) => {
      const files = Array.from(fileList || [])
      if (!files.length) return
      const urls = []
      let failed = 0
      for (const f of files) {
        try {
          const url = await fileToDataUrl(f)
          if (await canDecode(url)) urls.push(url)
          else failed++
        } catch {
          failed++
        }
      }
      if (!urls.length) {
        showNotice('Foto gagal dibaca. Format HEIC mungkin belum didukung - coba JPG atau PNG.')
        return
      }
      setPhotos((prev) => {
        const next = Array.from({ length: layout.slots }, (_, i) => prev[i] || null)
        const empty = []
        for (let i = 0; i < next.length; i++) if (!next[i]) empty.push(i)
        let ei = 0
        let over = 0
        for (const u of urls) {
          if (ei < empty.length) next[empty[ei++]] = u
          else {
            next[over % next.length] = u
            over++
          }
        }
        return next
      })
      showNotice(
        failed
          ? `${urls.length} foto ditambahkan, ${failed} dilewati.`
          : `${urls.length} foto ditambahkan.`,
      )
    },
    [layout.slots, setPhotos, showNotice],
  )

  useEffect(() => () => clearTimeout(noticeTimer.current), [])

  const toggleLiveSlot = useCallback(
    (idx) => {
      setLiveClips((prev) => {
        const next = Array.from({ length: layout.slots }, (_, i) => prev[i] || null)
        if (next[idx]) {
          closeClip(next[idx])
          next[idx] = null
          showNotice('Live dimatikan untuk slot ini.')
        } else {
          showNotice('Slot ini tidak memiliki klip Live.')
        }
        return next
      })
    },
    [layout.slots, showNotice, setLiveClips],
  )

  const openKeyFrame = useCallback(
    (idx) => {
      const clip = liveClips[idx]
      if (!clip || !clip.frames?.length) {
        showNotice('Slot ini tidak memiliki klip Live.')
        return
      }
      setKeyFrameSlot(idx)
      setKeyFrameUrls(clip.frames.map((f) => bitmapToDataUrl(f, 0.7)))
    },
    [liveClips, showNotice],
  )

  const closeKeyFrame = useCallback(() => {
    setKeyFrameSlot(null)
    setKeyFrameUrls([])
  }, [])

  const applyKeyFrame = useCallback(
    (frameIdx) => {
      if (keyFrameSlot === null) return
      const idx = keyFrameSlot
      const clip = liveClips[idx]
      if (!clip || !clip.frames?.[frameIdx]) return
      const url = bitmapToDataUrl(clip.frames[frameIdx], 0.92)
      setPhotos((prev) => {
        const next = Array.from({ length: layout.slots }, (_, i) => prev[i] || null)
        next[idx] = url
        return next
      })
      setLiveClips((prev) => {
        const next = [...prev]
        if (next[idx]) next[idx] = { ...next[idx], keyFrameIndex: frameIdx }
        return next
      })
      closeKeyFrame()
      showNotice('Frame utama diperbarui.')
    },
    [keyFrameSlot, liveClips, layout.slots, setPhotos, setLiveClips, showNotice, closeKeyFrame],
  )

  const goResult = () => {
    if (filledCount === 0) {
      showNotice('Ambil atau unggah minimal satu foto dulu.')
      return
    }
    setStep(4)
    navigate('/hasil')
  }

  const done = [true, true, allFilled, false]

  /* ---------- bagian panel ---------- */
  const temaSection = (
    <>
      <h2 className="h text-[22px]">Tema</h2>
      <div className="grid grid-cols-2 gap-2.5 mt-4">
        {THEMES.map((t) => {
          const selected = t.id === settings.themeId
          return (
            <button
              key={t.id}
              type="button"
              className="chip justify-center"
              aria-pressed={selected}
              onClick={() => selectTheme(t.id)}
              style={{
                background: t.swatch,
                borderRadius: 16,
                minHeight: 64,
                color: t.id === 'dark' ? '#fff' : '#1F1B18',
                border: selected ? '3px solid #C4452B' : '1.5px solid #D9CFC3',
                fontWeight: selected ? 600 : 500,
              }}
            >
              {t.name}
            </button>
          )
        })}
      </div>
    </>
  )

  const layoutSection = (
    <>
      <h2 className="h text-[22px] mt-7">Tata letak</h2>
      <div className="flex flex-wrap gap-2.5 mt-4">
        {LAYOUTS.map((l) => {
          const selected = l.id === settings.layoutId
          return (
            <button
              key={l.id}
              type="button"
              className={`chip ${selected ? 'on' : ''}`}
              aria-pressed={selected}
              onClick={() => selectLayout(l.id)}
            >
              {l.name}
            </button>
          )
        })}
      </div>
      <p className="text-sm text-muted mt-4 mb-0 leading-relaxed">
        {layout.slots} slot · {layout.orientation === 'portrait' ? 'potret' : 'lanskap'}
      </p>
    </>
  )

  const fotoSection = (
    <>
      {mode === 'camera' ? (
        <CameraView
          videoRef={videoRef}
          countdown={countdown}
          error={camError}
          mirror={mirror}
          facing={facing}
          slotIndex={Math.min(activeSlot, layout.slots - 1)}
          slotTotal={layout.slots}
          liveEnabled={!!settings.liveEnabled}
          liveSupported={liveSupported()}
          onToggleLive={toggleLive}
          onCancel={exitCamera}
          onShoot={requestShoot}
          onSwitch={switchFacing}
          onToggleMirror={toggleMirror}
        />
      ) : (
        <div className="flex flex-col items-center gap-6 w-full">
          <StripPreview
            theme={theme}
            layout={layout}
            photos={photos}
            liveClips={liveClips}
            frameColor={frameColor}
            caption={effectiveCaption}
            filter={effectiveFilter}
            brightness={settings.brightness}
            contrast={settings.contrast}
            width={isDesktop ? 200 : 'min(62vw, 240px)'}
            interactive
            activeSlot={activeSlot}
            onSelectSlot={(i) => setActiveSlot(i)}
            onToggleLive={toggleLiveSlot}
            onChooseKeyFrame={openKeyFrame}
            autoplay={!!settings.autoplay}
          />

          <div className="flex flex-wrap gap-2.5 justify-center" role="group" aria-label="Hitung mundur">
            {[3, 5, 10].map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${settings.timer === t ? 'on' : ''}`}
                aria-pressed={settings.timer === t}
                onClick={() => update({ timer: t })}
              >
                {t} dtk
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3.5 justify-center">
            <button type="button" className="btn" onClick={startCameraFlow}>
              Ambil Foto
            </button>
            <button
              type="button"
              className="btn2"
              onClick={() => fileInputRef.current?.click()}
            >
              Unggah Foto
            </button>
          </div>

          <p className="text-sm text-muted text-center m-0 max-w-xs leading-relaxed">
            {allFilled
              ? 'Semua slot terisi. Pilih slot untuk mengambil ulang.'
              : `${filledCount} dari ${layout.slots} slot terisi. Pilih slot lalu ambil foto.`}
          </p>
        </div>
      )}
    </>
  )

  const editSection = (
    <>
      <h2 className="h text-[22px]">Edit</h2>

      {!isDesktop && (
        <div className="bg-panel rounded-panel p-5 -mx-1 mt-4 flex justify-center">
          <StripPreview
            theme={theme}
            layout={layout}
            photos={photos}
            liveClips={liveClips}
            frameColor={frameColor}
            caption={effectiveCaption}
            filter={effectiveFilter}
            brightness={settings.brightness}
            contrast={settings.contrast}
            width="min(54vw, 200px)"
            onToggleLive={toggleLiveSlot}
            onChooseKeyFrame={openKeyFrame}
            autoplay={!!settings.autoplay}
          />
        </div>
      )}

      <div className="lbl">Filter</div>
      <div className="flex flex-wrap gap-2.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`chip ${settings.filter === f.id ? 'on' : ''}`}
            aria-pressed={settings.filter === f.id}
            onClick={() => update({ filter: f.id })}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="lbl">Kecerahan</div>
      <input
        type="range"
        min="70"
        max="130"
        value={settings.brightness}
        onChange={(e) => update({ brightness: Number(e.target.value) })}
        className="w-full accent-[#C4452B]"
        aria-label="Kecerahan"
      />

      <div className="lbl">Kontras</div>
      <input
        type="range"
        min="70"
        max="140"
        value={settings.contrast}
        onChange={(e) => update({ contrast: Number(e.target.value) })}
        className="w-full accent-[#C4452B]"
        aria-label="Kontras"
      />

      <div className="lbl">Warna bingkai</div>
      <div className="flex gap-3 flex-wrap">
        {[...new Set([theme.frame, ...FRAME_SWATCHES])].map((c) => {
          const selected = frameColor === c
          return (
            <button
              key={c}
              type="button"
              aria-label={`Warna bingkai ${c}`}
              aria-pressed={selected}
              onClick={() => update({ frameColor: c })}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: c,
                border: selected ? '3px solid #C4452B' : '2px solid #E6DED3',
                cursor: 'pointer',
              }}
            />
          )
        })}
      </div>

      <div className="lbl">
        <label htmlFor="caption">Teks bawah strip</label>
      </div>
      <input
        id="caption"
        className="field"
        value={settings.caption}
        placeholder={defaultCaption()}
        onChange={(e) => update({ caption: e.target.value })}
      />

      {liveClips.some(Boolean) && (
        <div className="mt-6">
          <div className="lbl">Live Photo</div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!settings.autoplay}
              onChange={(e) => update({ autoplay: e.target.checked })}
            />
            Putar otomatis di pratinjau
          </label>
          <div className="flex flex-wrap gap-2 mt-3">
            {liveClips.map((c, i) =>
              c ? (
                <button
                  key={i}
                  type="button"
                  className="chip"
                  onClick={() => openKeyFrame(i)}
                >
                  Pilih frame utama slot {i + 1}
                </button>
              ) : null,
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        className="btn w-full mt-7"
        onClick={goResult}
        disabled={filledCount === 0}
      >
        Lanjut ke Unduh
      </button>
      {filledCount === 0 && (
        <p className="text-xs text-muted text-center mt-2 mb-0">
          Ambil atau unggah minimal satu foto dulu.
        </p>
      )}
    </>
  )

  const mobileLabels = ['Tema', 'Layout', 'Foto', 'Edit']

  return (
    <div className="font-sans text-charcoal bg-cream min-h-screen">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 pt-6 pb-40 lg:pb-12">
        <header className="flex flex-wrap gap-4 items-center justify-between mb-7">
          <a href="/" className="h text-[26px]">
            SnapFrame
          </a>
          {isDesktop ? (
            <Stepper done={done} />
          ) : (
            <span className="chip on" style={{ pointerEvents: 'none' }}>
              {mobileLabels[mobileStep - 1]}
            </span>
          )}
        </header>

        {isDesktop ? (
          <div className="flex flex-wrap gap-6 items-start">
            <aside className="flex-1 basis-[260px] bg-white rounded-card p-6">
              {temaSection}
              {layoutSection}
            </aside>
            <main className="flex-[2_1_360px] bg-panel rounded-panel p-6 sm:p-8 flex flex-col items-center gap-6 min-h-[520px] justify-center">
              {fotoSection}
            </main>
            <aside className="flex-1 basis-[260px] bg-white rounded-card p-6">{editSection}</aside>
          </div>
        ) : (
          <div className="bg-white rounded-card p-5 min-h-[60vh]">
            {mobileStep === 1 && temaSection}
            {mobileStep === 2 && layoutSection}
            {mobileStep === 3 && <div className="bg-panel rounded-panel p-5 -mx-1">{fotoSection}</div>}
            {mobileStep === 4 && editSection}
          </div>
        )}
      </div>

      {!isDesktop && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line px-4 py-3 flex gap-3 z-20">
          <button
            type="button"
            className="btn2 flex-1"
            onClick={() => setMobileStep((s) => Math.max(1, s - 1))}
            disabled={mobileStep === 1}
          >
            Kembali
          </button>
          {mobileStep < 4 ? (
            <button
              type="button"
              className="btn flex-1"
              onClick={() => setMobileStep((s) => Math.min(4, s + 1))}
            >
              Lanjut
            </button>
          ) : (
            <button type="button" className="btn flex-1" onClick={goResult} disabled={filledCount === 0}>
              Lanjut ke Unduh
            </button>
          )}
        </div>
      )}

      {keyFrameSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-card w-full max-w-2xl p-5 max-h-[80vh] overflow-auto">
            <h3 className="h text-[20px] mb-3">Pilih frame utama</h3>
            <p className="text-sm text-muted mb-3">
              Ketuk frame untuk menjadikannya foto utama slot {keyFrameSlot + 1}.
            </p>
            <div className="flex gap-2 overflow-x-auto pb-3">
              {keyFrameUrls.map((u, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyKeyFrame(i)}
                  className="shrink-0 rounded-lg overflow-hidden"
                  style={{
                    border:
                      liveClips[keyFrameSlot]?.keyFrameIndex === i
                        ? '3px solid #C4452B'
                        : '2px solid #D9CFC3',
                  }}
                >
                  <img
                    src={u}
                    alt={`Frame ${i + 1}`}
                    style={{ width: 120, height: 90, objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="btn2" onClick={closeKeyFrame}>
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {flash && (
        <div
          className="fixed inset-0 bg-white snap-flash pointer-events-none z-30"
          aria-hidden="true"
        />
      )}

      {notice && (
        <div
          role="status"
          className="fixed left-1/2 -translate-x-1/2 bottom-24 lg:bottom-8 bg-charcoal text-white text-sm px-5 py-3 rounded-full z-40 shadow-strip max-w-[90vw] text-center"
        >
          {notice}
        </div>
      )}
    </div>
  )
}
