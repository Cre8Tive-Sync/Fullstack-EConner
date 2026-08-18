import { useNavigate } from 'react-router-dom'
import ARScene from '../components/ar/ARScene'

/**
 * AR is a standalone feature now: the rest of the app is a normal browsing UI
 * and this route is the only place the camera scene mounts. The exit button
 * sits above every AR overlay (including the permission gate) so there is
 * always a way back to the main app.
 */
export default function ARPage() {
  const navigate = useNavigate()

  return (
    <>
      <ARScene />
      <button type="button" style={styles.exit} onClick={() => navigate('/')}>
        ← Exit AR
      </button>
    </>
  )
}

const styles = {
  exit: {
    position: 'fixed',
    left: '1rem',
    bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
    zIndex: 9999,
    padding: '9px 16px',
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    background: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.78rem',
    fontWeight: 700,
    letterSpacing: '0.03em',
    cursor: 'pointer',
  },
}
