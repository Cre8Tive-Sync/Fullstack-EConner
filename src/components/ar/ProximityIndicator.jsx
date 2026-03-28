export default function ProximityIndicator({ poi }) {
  if (!poi) return null

  const distance = Math.round(poi.distance)

  return (
    <div style={styles.container}>
      <div style={styles.pulse} />
      <div style={styles.inner}>
        <span style={styles.name}>{poi.name}</span>
        <span style={styles.distance}>{distance}m away</span>
      </div>
      <style>{`
        @keyframes ar-proximity-pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    top: '1.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 15,
    pointerEvents: 'none',
  },
  pulse: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '100%',
    height: '100%',
    borderRadius: '999px',
    border: '1px solid rgba(0, 255, 204, 0.4)',
    animation: 'ar-proximity-pulse 2s ease-out infinite',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '0.5rem 1.2rem',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(0, 255, 204, 0.3)',
    borderRadius: '999px',
  },
  name: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#fff',
    letterSpacing: '0.02em',
  },
  distance: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.7rem',
    color: '#00ffcc',
    fontWeight: 500,
  },
}
