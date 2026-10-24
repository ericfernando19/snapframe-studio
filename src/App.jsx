import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Beranda from './pages/Beranda.jsx'
import Studio from './pages/Studio.jsx'
import Hasil from './pages/Hasil.jsx'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Beranda />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/hasil" element={<Hasil />} />
        <Route path="*" element={<Beranda />} />
      </Routes>
    </>
  )
}
