// Small stroke-based icon set shared by the generic UI.
// Every icon inherits size from CSS (width/height set by the parent class)
// and colour from `currentColor`, so they restyle with their container.

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function IconHome(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.6V20h14V9.6" />
      <path d="M9.5 20v-5.5h5V20" />
    </svg>
  )
}

export function IconGrid(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </svg>
  )
}

export function IconMap(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4 3.5 6.2V20L9 17.8l6 2.2 5.5-2.2V4L15 6.2 9 4Z" />
      <path d="M9 4v13.8" />
      <path d="M15 6.2V20" />
    </svg>
  )
}

export function IconPin(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  )
}

export function IconAR(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6l8-4.4Z" />
      <path d="M4 7.6 12 12l8-4.4" />
      <path d="M12 12v8.8" />
    </svg>
  )
}

export function IconSearch(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export function IconClose(props) {
  return (
    <svg {...base} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

export function IconBack(props) {
  return (
    <svg {...base} {...props}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  )
}

export function IconChevronRight(props) {
  return (
    <svg {...base} {...props}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  )
}

export function IconPlay(props) {
  return (
    <svg {...base} {...props} fill="currentColor" stroke="none">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  )
}

export function IconPhone(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" />
    </svg>
  )
}

export function IconGlobe(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5a13 13 0 0 1 0 17 13 13 0 0 1 0-17Z" />
    </svg>
  )
}

export function IconClock(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.2 2" />
    </svg>
  )
}

export function IconNavigate(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 4 4 10.6l7 2.4 2.4 7L20 4Z" />
    </svg>
  )
}

export function IconStar(props) {
  return (
    <svg {...base} {...props} fill="currentColor" stroke="none">
      <path d="m12 4 2.35 4.9 5.15.72-3.75 3.7.9 5.28L12 16.1l-4.65 2.5.9-5.28-3.75-3.7 5.15-.72L12 4Z" />
    </svg>
  )
}

export function IconImages(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="6.5" width="14" height="11" rx="2.5" />
      <path d="M6.5 14.5 9 12l2.5 2 2-1.6 3 3.1" />
      <path d="M20.5 9v8a3.5 3.5 0 0 1-3.5 3.5H8" />
    </svg>
  )
}

export function IconCrosshair(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </svg>
  )
}

export function IconInfo(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
