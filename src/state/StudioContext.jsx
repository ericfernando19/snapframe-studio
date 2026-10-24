/* eslint-disable react-refresh/only-export-components -- provider & hook memang sengaja satu file */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getTheme } from '../data/themes.js'
import { getLayout } from '../data/layouts.js'

const StudioContext = createContext(null)

const STORAGE_KEY = 'snapframe.settings.v1'

const DEFAULTS = {
  themeId: 'pastel',
  layoutId: 'strip-3',
  filter: 'natural',
  brightness: 100,
  contrast: 100,
  frameColor: null,
  caption: '',
  timer: 3,
  format: 'png',
  quality: 'hd',
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function StudioProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)
  const [photos, setPhotos] = useState([])
  const [step, setStep] = useState(1)

  useEffect(() => {
    const persistable = { ...settings, caption: settings.caption }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
    } catch {
      /* kuota penuh - abaikan, foto tidak ikut disimpan */
    }
  }, [settings])

  const theme = useMemo(() => getTheme(settings.themeId), [settings.themeId])
  const layout = useMemo(() => getLayout(settings.layoutId), [settings.layoutId])

  const update = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }))
  }, [])

  const selectTheme = useCallback(
    (themeId) => {
      const t = getTheme(themeId)
      setSettings((s) => ({ ...s, themeId, frameColor: null, filter: t.filter }))
    },
    [],
  )

  const selectLayout = useCallback((layoutId) => {
    const next = getLayout(layoutId)
    setSettings((s) => ({ ...s, layoutId }))
    setPhotos((prev) => prev.slice(0, next.slots))
  }, [])

  const setPhotosSafe = useCallback((updater) => {
    setPhotos((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }, [])

  const resetProject = useCallback(() => {
    const t = getTheme(DEFAULTS.themeId)
    setSettings({ ...DEFAULTS, filter: t.filter })
    setPhotos([])
    setStep(1)
  }, [])

  const filledCount = useMemo(
    () => photos.slice(0, layout.slots).filter(Boolean).length,
    [photos, layout.slots],
  )
  const allFilled = filledCount >= layout.slots

  const effectiveFilter = useMemo(() => {
    if (settings.filter && settings.filter !== 'natural') return settings.filter
    return theme.filter || 'natural'
  }, [settings.filter, theme.filter])

  const frameColor = settings.frameColor || theme.frame

  const value = useMemo(
    () => ({
      theme,
      layout,
      settings,
      photos,
      step,
      filledCount,
      allFilled,
      effectiveFilter,
      frameColor,
      update,
      selectTheme,
      selectLayout,
      setPhotos: setPhotosSafe,
      setStep,
      resetProject,
    }),
    [
      theme,
      layout,
      settings,
      photos,
      step,
      filledCount,
      allFilled,
      effectiveFilter,
      frameColor,
      update,
      selectTheme,
      selectLayout,
      setPhotosSafe,
      resetProject,
    ],
  )

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}

export function useStudio() {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio harus dipakai di dalam StudioProvider')
  return ctx
}
