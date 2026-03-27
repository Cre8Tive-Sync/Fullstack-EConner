import { useEffect, useRef, useState } from 'react'
import PanelContent from './PanelContent'

export default function PanoramicView({ poi, onClose }) {
  const [yaw, setYaw] = useState(0)
  const baseYaw = useRef(null)

  const PANELS = [
    { id: 'overview', label: poi.name, angle: -41 },
    { id: 'gallery',  label: 'Gallery',  angle: 0 },
    { id: 'details',  label: 'Details',  angle: 41 },
  ]

  // Gyroscope — move phone to rotate the arc
  useEffect(() => {
    const handleOrientation = (e) => {
      const alpha = e.alpha ?? 0

      if (baseYaw.current === null) {
        baseYaw.current = alpha
      }

      let delta = alpha - baseYaw.current
      if (delta > 180) delta -= 360
      if (delta < -180) delta += 360

      setYaw(-delta * 0.6)
    }

    window.addEventListener('deviceorientation', handleOrientation)

    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().catch(console.error)
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [])

  const handleBackdropTap = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div style={styles.overlay} onClick={handleBackdropTap}>

      {/* Arc container — rotates with gyroscope */}
      <div
        style={{
          ...styles.arc,
          transform: `translateX(-50%) rotateY(${yaw}deg)`,
        }}
      >
        {PANELS.map((panel) => (
          <div
            key={panel.id}
            style={{
              ...styles.panel,
              transform: `rotateY(${panel.angle}deg) translateZ(-360px)`,
              opacity: 1,
              scale: '1',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel tab label */}
            <div style={styles.panelTab}>{panel.label}</div>

            {/* Panel content */}
            <PanelContent type={panel.id} poi={poi} />
          </div>
        ))}
      </div>

      {/* Gyro hint */}
      <div style={styles.hint}>
        <span>↔ Move phone to explore</span>
      </div>

      {/* Close button */}
      <button style={styles.closeBtn} onClick={onClose}>✕</button>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    background: 'rgba(0, 0, 0, 0.35)',
    backdropFilter: 'blur(2px)',
    perspective: '1000px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  arc: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transformStyle: 'preserve-3d',
    transform: 'translateX(-50%)',
    marginTop: '-180px',
    transformOrigin: 'center center',
    transition: 'transform 0.08s linear',
  },
  panel: {
    position: 'absolute',
    width: '260px',
    height: '360px',
    left: '-130px',
    top: '-180px',
    background: 'rgba(10, 10, 20, 0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.12)',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'opacity 0.3s, scale 0.3s',
    transformStyle: 'preserve-3d',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  panelTab: {
    padding: '12px 16px 8px',
    fontSize: '0.7rem',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.4)',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  hint: {
    position: 'fixed',
    bottom: '5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.05em',
    pointerEvents: 'none',
  },
  closeBtn: {
    position: 'fixed',
    top: '1.5rem',
    right: '1.5rem',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: '1rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 60,
  },
}
