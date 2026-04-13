export default function NearbyList({ pois, geoError }) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        {geoError ? (
          <span style={styles.errorText}>{geoError}</span>
        ) : (
          <span style={styles.title}>Nearby Points of Interest</span>
        )}
      </div>

      <div style={styles.list}>
        {pois.map((poi) => (
          <div key={poi.id} style={styles.item}>
            <div style={styles.dot} />
            <div style={styles.itemText}>
              <span style={styles.itemName}>{poi.name}</span>
              <span style={styles.itemCategory}>{poi.category_id}</span>
            </div>
            <span style={styles.itemDistance}>
              {poi.distance < 1000
                ? `${Math.round(poi.distance)}m`
                : `${(poi.distance / 1000).toFixed(1)}km`}
            </span>
          </div>
        ))}

        {pois.length === 0 && !geoError && (
          <div style={styles.empty}>Waiting for GPS signal...</div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '45vh',
    zIndex: 15,
    background: 'rgba(10, 10, 20, 0.85)',
    backdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '20px 20px 0 0',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px 20px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  title: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.8rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  errorText: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.8rem',
    color: '#ff6b6b',
  },
  list: {
    overflowY: 'auto',
    padding: '8px 0',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#00ffcc',
    flexShrink: 0,
  },
  itemText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  itemName: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#fff',
  },
  itemCategory: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.4)',
    textTransform: 'capitalize',
  },
  itemDistance: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.6)',
    flexShrink: 0,
  },
  empty: {
    padding: '20px',
    textAlign: 'center',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.8rem',
    color: 'rgba(255, 255, 255, 0.3)',
  },
}
