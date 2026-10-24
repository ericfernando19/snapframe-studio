import { useNavigate } from 'react-router-dom'
import { THEMES } from '../data/themes.js'

const STEPS = [
  {
    n: 1,
    title: 'Pilih tema',
    desc: 'Retro film, pastel, minimalis, dan lainnya. Pratinjau langsung sebelum dipilih.',
  },
  {
    n: 2,
    title: 'Pilih tata letak',
    desc: 'Strip 3 atau 4 foto, grid 2x2, polaroid, atau kartu pos.',
  },
  {
    n: 3,
    title: 'Foto dan unduh',
    desc: 'Ambil foto dengan hitung mundur, percantik, lalu unduh PNG, JPG, atau PDF.',
  },
]

export default function Beranda() {
  const navigate = useNavigate()
  const start = () => navigate('/studio')

  const scrollTo = (id) => (e) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="font-sans text-charcoal bg-cream">
      <div className="max-w-[1120px] mx-auto px-5 sm:px-8">
        <nav className="flex flex-wrap gap-4 items-center justify-between py-7">
          <a href="/" className="h text-[28px]" onClick={scrollToTopOnly}>
            SnapFrame
          </a>
          <div className="flex flex-wrap gap-5 sm:gap-7 items-center">
            <a href="#cara" onClick={scrollTo('cara')}>
              Cara kerja
            </a>
            <a href="#tema" onClick={scrollTo('tema')}>
              Tema
            </a>
            <a href="#tema" onClick={scrollTo('tema')}>
              Layout
            </a>
            <button type="button" className="btn" onClick={start}>
              Mulai Foto
            </button>
          </div>
        </nav>

        <section className="flex flex-wrap gap-12 items-center pt-12 pb-20">
          <div className="flex-1 basis-[420px]">
            <span className="inline-block bg-blush rounded-full px-4 py-2 text-sm font-semibold">
              Studio foto online
            </span>
            <h1 className="h text-[40px] sm:text-[52px] lg:text-[64px] leading-[1.05] my-5">
              Foto ala studio, langsung dari browser.
            </h1>
            <p className="text-[17px] sm:text-[19px] leading-[1.6] text-muted max-w-[480px] mb-8">
              Pilih tema, pilih tata letak, ambil foto, lalu unduh. Selesai kurang dari dua menit,
              tanpa instal aplikasi.
            </p>
            <div className="flex flex-wrap gap-3.5">
              <button type="button" className="btn" onClick={start}>
                Mulai Foto
              </button>
              <button type="button" className="btn2" onClick={scrollTo('tema')}>
                Lihat Tema
              </button>
            </div>
          </div>

          <div className="flex-1 basis-[360px] flex justify-center gap-7 py-6">
            <StripMockup
              bg="#fff"
              colors={['#F6C9C0', '#A8BFA3', '#E8D5B5']}
              caption="SnapFrame"
              captionColor="#5E554E"
              rotate="-5deg"
            />
            <StripMockup
              bg="#F6C9C0"
              colors={['#E8D5B5', '#fff', '#A8BFA3']}
              caption="21 Okt 2026"
              captionColor="#3D3530"
              rotate="5deg"
              offset
            />
          </div>
        </section>

        <section id="cara" className="pt-6 pb-20 scroll-mt-6">
          <h2 className="h text-[30px] sm:text-[40px] mb-8">Tiga langkah, satu strip foto</h2>
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-white rounded-card p-8">
                <div className="w-11 h-11 rounded-full bg-blush flex items-center justify-center font-semibold">
                  {s.n}
                </div>
                <h3 className="h text-[24px] mt-5 mb-2">{s.title}</h3>
                <p className="m-0 leading-[1.6] text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="tema" className="pb-4 scroll-mt-6">
          <h2 className="h text-[30px] sm:text-[40px] mb-8">Tema untuk setiap suasana</h2>
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={start}
                className="rounded-card min-h-[200px] p-6 flex flex-col justify-end text-left transition-transform duration-200 hover:-translate-y-1"
                style={{
                  background: t.swatch,
                  border: t.swatchBorder ? '1px solid #E6DED3' : 'none',
                }}
              >
                <span className="font-semibold text-[18px]">{t.name}</span>
                <span className="text-sm" style={{ color: t.caption }}>
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-[88px] bg-charcoal text-white rounded-[32px] px-6 sm:px-10 py-14 sm:py-16 text-center">
          <h2 className="h text-[30px] sm:text-[44px] mb-4">
            Siap bikin strip foto pertamamu?
          </h2>
          <p className="text-line m-0 mb-7 text-[17px] sm:text-[18px]">
            Cepat dan privat: fotomu diproses di perangkatmu.
          </p>
          <button type="button" className="btn" style={{ background: '#F6C9C0', color: '#1F1B18' }} onClick={start}>
            Mulai Foto
          </button>
        </section>

        <footer className="py-12 flex flex-wrap gap-4 justify-between text-muted text-sm">
          <span>SnapFrame</span>
          <span>
            <a href="#privasi">Kebijakan privasi</a> · <a href="#bantuan">Bantuan</a>
          </span>
        </footer>
      </div>
    </div>
  )
}

function scrollToTopOnly(e) {
  e.preventDefault()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function StripMockup({ bg, colors, caption, captionColor, rotate, offset }) {
  return (
    <div
      className="hidden sm:flex flex-col gap-2.5"
      style={{
        width: 170,
        background: bg,
        padding: 14,
        borderRadius: 8,
        boxShadow: '0 18px 40px rgba(31,27,24,.15)',
        transform: `rotate(${rotate})`,
        marginTop: offset ? 56 : 0,
      }}
      aria-hidden="true"
    >
      {colors.map((c) => (
        <div key={c} style={{ height: 120, borderRadius: 4, background: c }} />
      ))}
      <div className="text-center text-xs" style={{ color: captionColor }}>
        {caption}
      </div>
    </div>
  )
}
