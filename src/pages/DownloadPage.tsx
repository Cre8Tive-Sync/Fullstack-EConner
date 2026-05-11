import { useEffect, useRef, useState } from 'react'

type Platform = 'android' | 'ios' | 'desktop' | 'unknown'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/windows|macintosh|linux/i.test(ua) && !/mobile/i.test(ua)) return 'desktop'
  return 'unknown'
}

export default function DownloadPage() {
  const [platform] = useState<Platform>(detectPlatform)
  const [installState, setInstallState] = useState<'idle' | 'installing' | 'installed' | 'unavailable'>('idle')
  const [promptReady, setPromptReady] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [parallax, setParallax] = useState({ x: 50, y: 50 })
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      const x = 50 + (e.gamma ?? 0) * 0.3
      const y = 50 + ((e.beta ?? 90) - 90) * 0.3
      setParallax({ x: Math.min(80, Math.max(20, x)), y: Math.min(80, Math.max(20, y)) })
    }
    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [])

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstallState('installed')
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setPromptReady(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const timer = setTimeout(() => {
      if (!deferredPrompt.current && platform === 'android') {
        setInstallState('unavailable')
      }
    }, 4000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      clearTimeout(timer)
    }
  }, [platform])

  async function handleInstall() {
    if (platform === 'ios') {
      setShowIOSGuide(true)
      return
    }

    if (!deferredPrompt.current) {
      const waited = await new Promise<boolean>((resolve) => {
        const check = setInterval(() => {
          if (deferredPrompt.current) { clearInterval(check); resolve(true) }
        }, 200)
        setTimeout(() => { clearInterval(check); resolve(false) }, 3000)
      })
      if (!waited) { setInstallState('unavailable'); return }
    }

    setInstallState('installing')
    await deferredPrompt.current!.prompt()
    const { outcome } = await deferredPrompt.current!.userChoice
    deferredPrompt.current = null
    setPromptReady(false)

    setInstallState(outcome === 'accepted' ? 'installed' : 'idle')
  }

  const isWaiting = platform === 'android' && !promptReady && installState === 'idle'

  return (
    <div
      style={{
        ...styles.page,
        backgroundPosition: `${parallax.x}% ${parallax.y}%`,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes drawCircle {
          from { stroke-dashoffset: 138; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes drawCheck {
          from { stroke-dashoffset: 40; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }

        .install-btn:active {
          opacity: 0.75;
          transform: scale(0.98);
        }
      `}</style>

      <div style={styles.card}>
        {installState === 'installed' ? (
          <div style={{ animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <svg width="88" height="88" viewBox="0 0 88 88" fill="none">
              <circle
                cx="44" cy="44" r="22"
                stroke="#00ffcc"
                strokeWidth="2"
                fill="none"
                strokeDasharray="138"
                style={{ animation: 'drawCircle 0.5s ease forwards' }}
              />
              <polyline
                points="34,44 41,51 54,37"
                stroke="#00ffcc"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray="40"
                style={{ animation: 'drawCheck 0.35s 0.4s ease forwards', strokeDashoffset: 40 }}
              />
            </svg>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              marginBottom: '0.5rem',
              animation: installState === 'installing'
                ? 'pulse 1.2s ease-in-out infinite'
                : 'pulse 2s ease-in-out infinite',
            }}
          >
            <img src="/AR.svg" alt="AR" style={styles.icon} />
          </div>
        )}

        {installState === 'installed' ? (
          <p style={{ ...styles.desc, marginTop: '0.75rem' }}>Added to your home screen.</p>
        ) : (
          <>
            <p style={styles.desc}>
              {platform === 'ios'
                ? 'Add Conner AR to your home screen to explore Apayao in augmented reality.'
                : 'Install Conner AR for the full experience — camera, GPS, and offline access.'}
            </p>

            <button
              className="install-btn"
              style={{
                ...styles.btn,
                ...(isWaiting || installState === 'installing' ? styles.btnDim : {}),
              }}
              onClick={handleInstall}
              disabled={isWaiting || installState === 'installing'}
            >
              {installState === 'installing' ? (
                <span style={styles.spinnerWrap}>
                  <span style={styles.spinner} />
                  Adding…
                </span>
              ) : isWaiting ? (
                'Preparing…'
              ) : platform === 'ios' ? (
                'How to Install'
              ) : (
                'Add to Home Screen'
              )}
            </button>

            {installState === 'unavailable' && (
              <p style={styles.hint}>
                {platform === 'android'
                  ? 'Already installed, or open in Chrome over HTTPS.'
                  : 'Open this page on your phone to install.'}
              </p>
            )}
          </>
        )}
      </div>

      {showIOSGuide && (
        <div style={styles.overlay} onClick={() => setShowIOSGuide(false)}>
          <div style={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetHandle} />
            <p style={styles.sheetStep}>
              <span style={styles.stepNum}>1</span>
              Tap the <strong>Share</strong> button at the bottom of Safari
            </p>
            <p style={styles.sheetStep}>
              <span style={styles.stepNum}>2</span>
              Tap <strong>"Add to Home Screen"</strong>
            </p>
            <p style={styles.sheetStep}>
              <span style={styles.stepNum}>3</span>
              Tap <strong>Add</strong>
            </p>
            <p style={styles.sheetNote}>
              The icon on your home screen opens the AR experience directly.
            </p>
            <button
              className="install-btn"
              style={styles.btn}
              onClick={() => setShowIOSGuide(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: 'fixed',
    inset: 0,
    backgroundImage: "url('/LoadingScreen Bg.png')",
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'background-position 0.1s ease-out',
  },
  card: {
    textAlign: 'center',
    maxWidth: '320px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.25rem',
    animation: 'fadeUp 0.5s ease forwards',
  },
  icon: {
    width: '40px',
    height: '40px',
  },
  desc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 1.6,
    margin: 0,
    padding: '0 1rem',
  },
  btn: {
    padding: '14px 36px',
    borderRadius: '999px',
    background: '#0000001e',
    color: '#ffffff',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    border: '1px solid rgba(255,255,255,0.3)',
    transition: 'opacity 0.2s, transform 0.15s',
    width: '100%',
  },
  btnDim: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  hint: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.45)',
    margin: 0,
  },
  spinnerWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    animation: 'spin 0.7s linear infinite',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
    backdropFilter: 'blur(6px)',
  },
  sheet: {
    background: 'rgba(10,10,10,0.92)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '24px 24px 0 0',
    padding: '24px 28px 40px',
    maxWidth: '480px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    fontFamily: "'DM Sans', sans-serif",
    animation: 'sheetUp 0.3s cubic-bezier(0.32,0.72,0,1) forwards',
    backdropFilter: 'blur(20px)',
  },
  sheetHandle: {
    width: '36px',
    height: '4px',
    borderRadius: '2px',
    background: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: '4px',
  },
  sheetStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.85)',
    margin: 0,
    lineHeight: 1.5,
  },
  stepNum: {
    background: 'rgba(0,255,204,0.12)',
    color: '#00ffcc',
    borderRadius: '50%',
    width: '26px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  sheetNote: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.4)',
    margin: 0,
    lineHeight: 1.5,
  },
}
