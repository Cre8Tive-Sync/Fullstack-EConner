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
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

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

    // If the event hasn't fired after 4s the browser won't offer it this session
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
      // Prompt hasn't arrived yet — wait a moment then try again
      const waited = await new Promise<boolean>((resolve) => {
        const check = setInterval(() => {
          if (deferredPrompt.current) {
            clearInterval(check)
            resolve(true)
          }
        }, 200)
        setTimeout(() => { clearInterval(check); resolve(false) }, 3000)
      })
      if (!waited) {
        setInstallState('unavailable')
        return
      }
    }

    setInstallState('installing')
    await deferredPrompt.current!.prompt()
    const { outcome } = await deferredPrompt.current!.userChoice
    deferredPrompt.current = null
    setPromptReady(false)

    if (outcome === 'accepted') {
      setInstallState('installed')
    } else {
      setInstallState('idle')
    }
  }

  const isInstalled = installState === 'installed'
  const isWaiting = platform === 'android' && !promptReady && installState === 'idle'

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <img
          src="/img/icons/android-chrome-512x512.png"
          alt="Conner AR"
          style={styles.icon}
        />

        <h1 style={styles.title}>Conner AR</h1>
        <p style={styles.subtitle}>
          Explore Apayao through augmented reality — tourist spots, farms, accommodations and more.
        </p>

        <div style={styles.badges}>
          <span style={styles.badge}>Free</span>
          <span style={styles.badge}>No account needed</span>
          <span style={styles.badge}>Works offline</span>
        </div>

        {isInstalled ? (
          <div style={styles.successBox}>
            <span style={styles.successIcon}>✓</span>
            <p style={styles.successText}>
              Conner AR is installed! Find it on your home screen.
            </p>
            <a href="/" style={styles.openLink}>Open app →</a>
          </div>
        ) : (
          <>
            <button
              style={{
                ...styles.installBtn,
                ...((installState === 'installing' || isWaiting) ? styles.installBtnLoading : {}),
              }}
              onClick={handleInstall}
              disabled={installState === 'installing' || isWaiting}
            >
              {installState === 'installing'
                ? 'Adding to home screen…'
                : isWaiting
                  ? 'Preparing install…'
                  : platform === 'ios'
                    ? 'Install on iPhone / iPad'
                    : 'Add to Home Screen'}
            </button>

            {installState === 'unavailable' && platform === 'android' && (
              <p style={styles.hint}>
                If the app is already installed, check your home screen. Otherwise, make sure you're using the latest version of Chrome and the site is served over HTTPS.
              </p>
            )}

            {installState === 'unavailable' && platform !== 'android' && platform !== 'ios' && (
              <p style={styles.hint}>
                Open this page on your Android or iOS device to install.
              </p>
            )}

            {platform === 'desktop' && installState !== 'unavailable' && (
              <p style={styles.hint}>
                Open this page on your phone to add it to your home screen.
              </p>
            )}
          </>
        )}

        <div style={styles.features}>
          {[
            { icon: '📍', label: 'GPS-based AR' },
            { icon: '🗺️', label: '360° panoramas' },
            { icon: '📶', label: 'Works offline' },
            { icon: '🏔️', label: 'Local POIs' },
          ].map(({ icon, label }) => (
            <div key={label} style={styles.feature}>
              <span style={styles.featureIcon}>{icon}</span>
              <span style={styles.featureLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {showIOSGuide && (
        <div style={styles.overlay} onClick={() => setShowIOSGuide(false)}>
          <div style={styles.guide} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.guideTitle}>Install on iOS</h2>
            <ol style={styles.guideSteps}>
              <li style={styles.guideStep}>
                <span style={styles.stepNum}>1</span>
                Tap the <strong>Share</strong> button{' '}
                <span style={styles.shareIcon}>⎙</span> at the bottom of Safari
              </li>
              <li style={styles.guideStep}>
                <span style={styles.stepNum}>2</span>
                Scroll down and tap{' '}
                <strong>"Add to Home Screen"</strong>
              </li>
              <li style={styles.guideStep}>
                <span style={styles.stepNum}>3</span>
                Tap <strong>Add</strong> — the app icon will appear on your home screen
              </li>
            </ol>
            <p style={styles.guideNote}>
              The app that opens from your home screen goes directly to the AR experience — not this install page.
            </p>
            <button style={styles.closeBtn} onClick={() => setShowIOSGuide(false)}>
              Got it
            </button>
          </div>
        </div>
      )}

      <p style={styles.footer}>Cre8tive Sync © 2026</p>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
    padding: '24px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#fff',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '40px 32px',
    maxWidth: '420px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    backdropFilter: 'blur(20px)',
  },
  icon: {
    width: '96px',
    height: '96px',
    borderRadius: '22px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    margin: 0,
    lineHeight: 1.5,
  },
  badges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '999px',
    padding: '4px 12px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)',
  },
  installBtn: {
    background: 'linear-gradient(135deg, #6c63ff, #48cae4)',
    color: '#fff',
    border: 'none',
    borderRadius: '16px',
    padding: '16px 32px',
    fontSize: '17px',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    letterSpacing: '0.2px',
    transition: 'opacity 0.2s',
    boxShadow: '0 4px 20px rgba(108,99,255,0.4)',
  },
  installBtnLoading: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  hint: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    margin: 0,
  },
  successBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(72,202,68,0.12)',
    border: '1px solid rgba(72,202,68,0.3)',
    borderRadius: '16px',
    padding: '20px 24px',
    width: '100%',
  },
  successIcon: {
    fontSize: '32px',
    color: '#48ca44',
  },
  successText: {
    textAlign: 'center',
    margin: 0,
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
  },
  openLink: {
    color: '#48ca44',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '15px',
  },
  features: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    width: '100%',
    marginTop: '8px',
  },
  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '10px 14px',
  },
  featureIcon: {
    fontSize: '18px',
  },
  featureLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
    padding: '0 16px 16px',
    backdropFilter: 'blur(4px)',
  },
  guide: {
    background: '#1c1c2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '28px 24px',
    maxWidth: '420px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  guideTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
  },
  guideSteps: {
    margin: 0,
    paddingLeft: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  guideStep: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    fontSize: '15px',
    lineHeight: 1.5,
    color: 'rgba(255,255,255,0.85)',
  },
  stepNum: {
    background: 'rgba(108,99,255,0.3)',
    color: '#a8a3ff',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: 700,
    flexShrink: 0,
  },
  shareIcon: {
    fontSize: '16px',
  },
  guideNote: {
    margin: 0,
    fontSize: '13px',
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 1.5,
  },
  closeBtn: {
    background: 'linear-gradient(135deg, #6c63ff, #48cae4)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
  },
  footer: {
    marginTop: '24px',
    fontSize: '12px',
    color: 'rgba(255,255,255,0.25)',
  },
}
