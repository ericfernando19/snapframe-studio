const STEPS = ['1 Tema', '2 Layout', '3 Foto', '4 Unduh']

export default function Stepper({ done = [true, true, false, false], compact = false }) {
  return (
    <ol
      className="flex flex-wrap gap-2.5 m-0 p-0 list-none"
      aria-label="Langkah pembuatan foto"
    >
      {STEPS.map((label, i) => {
        const isDone = done[i]
        return (
          <li
            key={label}
            aria-current={isDone ? 'step' : undefined}
            className={`chip ${isDone ? 'on' : ''} ${compact ? 'px-3 min-h-[40px]' : ''}`}
            style={{ pointerEvents: 'none', fontWeight: isDone ? 600 : 500 }}
          >
            {label}
          </li>
        )
      })}
    </ol>
  )
}
