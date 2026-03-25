export default function PanelContent({ type }) {
  if (type === 'attractions') return <AttractionsPanel />
  if (type === 'dining')      return <DiningPanel />
  if (type === 'activities')  return <ActivitiesPanel />
  return null
}

// --- Placeholder data (will be replaced by scraper data) ---

const ATTRACTIONS = [
  { name: 'Dupag Rock Formation', desc: 'Stunning natural rock pillars along the Apayao River', img: 'https://picsum.photos/seed/dupag/400/200' },
  { name: 'Lam-Lamig Cave', desc: 'Underground river cave system with crystal-clear waters', img: 'https://picsum.photos/seed/lamlamig/400/200' },
  { name: 'Marag Waterfalls', desc: 'Multi-tiered cascading falls surrounded by lush forest', img: 'https://picsum.photos/seed/marag/400/200' },
  { name: 'Bayugao Falls', desc: 'Hidden gem waterfall deep in the Cordillera highlands', img: 'https://picsum.photos/seed/bayugao/400/200' },
]

const RESTAURANTS = [
  { name: 'Kusina ni Manang', cuisine: 'Local Filipino', desc: 'Home-cooked Ilocano and Cordilleran dishes' },
  { name: 'Apayao River Grill', cuisine: 'Seafood & Grill', desc: 'Fresh river fish and grilled meats' },
  { name: 'Cafe Cordillera', cuisine: 'Coffee & Snacks', desc: 'Local arabica coffee and pastries' },
]

const ACTIVITIES = [
  { name: 'River Trekking', desc: 'Navigate the Apayao River on foot through stunning gorges', icon: 'W' },
  { name: 'Cave Exploration', desc: 'Guided spelunking through underground river systems', icon: 'C' },
  { name: 'Cultural Immersion', desc: 'Visit indigenous Isnag and Malaueg communities', icon: 'P' },
  { name: 'Bamboo Rafting', desc: 'Float downstream on traditional bamboo rafts', icon: 'R' },
]

// --- Panels ---

function AttractionsPanel() {
  return (
    <div style={{ ...panel.wrap, padding: '12px', overflowY: 'auto' }}>
      <h2 style={panel.title}>Top Attractions</h2>
      {ATTRACTIONS.map((item) => (
        <div key={item.name} style={panel.card}>
          <img src={item.img} alt={item.name} style={panel.cardImg} draggable={false} />
          <div style={panel.cardBody}>
            <span style={panel.cardName}>{item.name}</span>
            <span style={panel.cardDesc}>{item.desc}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function DiningPanel() {
  return (
    <div style={{ ...panel.wrap, padding: '12px', overflowY: 'auto' }}>
      <h2 style={panel.title}>Food & Dining</h2>
      {RESTAURANTS.map((item) => (
        <div key={item.name} style={panel.card}>
          <div style={panel.cuisineBadge}>{item.cuisine}</div>
          <div style={panel.cardBody}>
            <span style={panel.cardName}>{item.name}</span>
            <span style={panel.cardDesc}>{item.desc}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ActivitiesPanel() {
  return (
    <div style={{ ...panel.wrap, padding: '12px', overflowY: 'auto' }}>
      <h2 style={panel.title}>Activities</h2>
      {ACTIVITIES.map((item) => (
        <div key={item.name} style={panel.card}>
          <div style={panel.activityIcon}>{item.icon}</div>
          <div style={panel.cardBody}>
            <span style={panel.cardName}>{item.name}</span>
            <span style={panel.cardDesc}>{item.desc}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Styles ---

const panel = {
  wrap: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    color: '#fff',
  },
  title: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.85rem',
    fontWeight: 700,
    marginBottom: '10px',
    color: '#fff',
    letterSpacing: '0.02em',
  },
  card: {
    display: 'flex',
    gap: '10px',
    padding: '8px',
    marginBottom: '8px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  cardImg: {
    width: '70px',
    height: '50px',
    objectFit: 'cover',
    borderRadius: '6px',
    flexShrink: 0,
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    justifyContent: 'center',
    minWidth: 0,
  },
  cardName: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#fff',
  },
  cardDesc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.65rem',
    color: 'rgba(255, 255, 255, 0.5)',
    lineHeight: 1.4,
  },
  cuisineBadge: {
    padding: '4px 8px',
    background: 'rgba(0, 255, 204, 0.1)',
    border: '1px solid rgba(0, 255, 204, 0.2)',
    borderRadius: '6px',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.6rem',
    fontWeight: 600,
    color: '#00ffcc',
    whiteSpace: 'nowrap',
    alignSelf: 'center',
    flexShrink: 0,
  },
  activityIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'rgba(0, 255, 204, 0.1)',
    border: '1px solid rgba(0, 255, 204, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#00ffcc',
    flexShrink: 0,
    alignSelf: 'center',
  },
}
