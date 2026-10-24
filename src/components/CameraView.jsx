export default function CameraView({
  videoRef,
  countdown,
  error,
  mirror,
  facing,
  slotIndex,
  slotTotal,
  onCancel,
  onShoot,
  onSwitch,
  onToggleMirror,
}) {
  return (
    <div className="w-full flex flex-col items-center gap-5 pop-in">
      <div
        className="relative w-full overflow-hidden bg-charcoal"
        style={{ borderRadius: 20, aspectRatio: '4 / 3', maxHeight: '52vh' }}
      >
        {!error && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
          />
        )}

        {/* Sudut bingkai viewfinder */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {[
            'top-4 left-4 border-t-2 border-l-2 rounded-tl-lg',
            'top-4 right-4 border-t-2 border-r-2 rounded-tr-lg',
            'bottom-4 left-4 border-b-2 border-l-2 rounded-bl-lg',
            'bottom-4 right-4 border-b-2 border-r-2 rounded-br-lg',
          ].map((cls) => (
            <span
              key={cls}
              className={`absolute w-10 h-10 border-white/80 ${cls}`}
            />
          ))}
        </div>

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6 text-white">
            <p className="h text-[22px] m-0">
              {error.code === 'denied'
                ? 'Izin kamera ditolak'
                : 'Kamera tidak dapat dibuka'}
            </p>
            <p className="m-0 text-sm text-white/75 max-w-sm leading-relaxed">
              {error.code === 'denied'
                ? 'Buka izin kamera di pengaturan browser, atau gunakan unggah foto dari galeri.'
                : 'Perangkat ini tidak mendukung kamera browser. Unggah foto dari galeri tetap bisa dipakai.'}
            </p>
          </div>
        ) : countdown !== null ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              key={countdown}
              className="h text-white pop-in"
              style={{ fontSize: 'clamp(64px, 18vw, 128px)', lineHeight: 1 }}
              aria-live="assertive"
            >
              {countdown}
            </span>
          </div>
        ) : null}

        <div className="absolute left-0 right-0 bottom-3 text-center text-white/85 text-xs font-medium">
          Slot {slotIndex + 1} dari {slotTotal}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 justify-center items-center">
        <button type="button" className="btn2" onClick={onCancel}>
          Batal
        </button>
        <button type="button" className="btn" onClick={onShoot} disabled={Boolean(error)}>
          Ambil sekarang
        </button>
        <button type="button" className="chip" onClick={onToggleMirror} aria-pressed={mirror}>
          Mirror {mirror ? 'hidup' : 'mati'}
        </button>
        <button type="button" className="chip" onClick={onSwitch}>
          {facing === 'user' ? 'Kamera depan' : 'Kamera belakang'}
        </button>
      </div>
    </div>
  )
}
