import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import POIMarker from './POIMarker'
import POIPanels3D from './POIPanels3D'
import VRPanelContent from './VRPanelContent'
import StereoRenderer from './StereoRenderer'
import DwellRaycaster from './DwellRaycaster'
import ProximityIndicator from './ProximityIndicator'
import GPSPlacedObject from './GPSPlacedObject'
import { useGeolocation } from './hooks/useGeolocation'
import { useNearbyPOIs, getClampedCoords } from './hooks/useNearbyPOIs'
import { useLocationAR, useLocationARSetup, LocationARContext } from './hooks/useLocationAR'
import { useOrientationDetect } from './hooks/useOrientationDetect'
import { usePOIsFromFirestore } from './hooks/usePOIsFromFirestore'
import ARNavigationArrow from './ARNavigationArrow'
import CategoryListPanel from './CategoryListPanel'
import { CATEGORIES } from './data/pois'

const MAX_MARKER_DISTANCE = 200

// Shows rear camera as background — supports mono and stereo (VR) layout
function CameraBackground({ vrMode }) {
  const videoRef = useRef()
  const videoRef2 = useRef()
  const streamRef = useRef(null)

  useEffect(() => {
    if (!navigator.mediaDevices) {
      console.warn('navigator.mediaDevices not available (requires HTTPS)')
      return
    }

    let stopped = false

    function startCamera() {
      if (stopped) return

      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        })
        .then((stream) => {
          if (stopped) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }
          streamRef.current = stream

          // Assign stream to both video elements
          const assignStream = (ref) => {
            if (!ref.current) return
            ref.current.srcObject = stream
            ref.current.onloadedmetadata = () => {
              ref.current?.play().catch((err) => console.warn('Video play failed:', err))
            }
          }
          assignStream(videoRef)
          assignStream(videoRef2)

          stream.getVideoTracks().forEach((track) => {
            track.addEventListener('ended', () => {
              console.warn('Camera track ended, restarting...')
              startCamera()
            })
          })
        })
        .catch((err) => console.warn('Camera access denied:', err))
    }

    startCamera()

    return () => {
      stopped = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // When switching to/from VR, reassign stream to new video elements
  useEffect(() => {
    const stream = streamRef.current
    if (!stream) return
    const assign = (ref) => {
      if (!ref.current) return
      ref.current.srcObject = stream
      ref.current.play().catch(() => {})
    }
    assign(videoRef)
    assign(videoRef2)
  }, [vrMode])

  const videoProps = {
    autoPlay: true,
    playsInline: true,
    muted: true,
    'webkit-playsinline': 'true',
  }

  if (vrMode) {
    return (
      <div style={{ display: 'flex', position: 'absolute', inset: 0, zIndex: 0 }}>
        <video
          ref={videoRef}
          style={{ width: '50%', height: '100%', objectFit: 'cover' }}
          {...videoProps}
        />
        <video
          ref={videoRef2}
          style={{ width: '50%', height: '100%', objectFit: 'cover' }}
          {...videoProps}
        />
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        objectFit: 'cover', zIndex: 0,
      }}
      {...videoProps}
    />
  )
}

function FallbackDeviceOrientationCamera() {
  const { camera } = useThree()
  const orient = useRef({ alpha: 0, beta: 90, gamma: 0 })
  const targetQ = useRef(new THREE.Quaternion())
  const currentQ = useRef(new THREE.Quaternion())
  const initialized = useRef(false)

  useEffect(() => {
    const onOrientation = (e) => {
      orient.current = { alpha: e.alpha ?? 0, beta: e.beta ?? 90, gamma: e.gamma ?? 0 }
    }
    window.addEventListener('deviceorientation', onOrientation)

    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().catch(console.warn)
    }

    return () => window.removeEventListener('deviceorientation', onOrientation)
  }, [])

  useFrame(() => {
    const { alpha, beta, gamma } = orient.current
    const deg2rad = THREE.MathUtils.degToRad

    const euler = new THREE.Euler(deg2rad(beta), deg2rad(alpha), deg2rad(-gamma), 'YXZ')
    targetQ.current.setFromEuler(euler)

    const screenAdjust = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2)
    targetQ.current.multiply(screenAdjust)

    const screenOrient = window.screen?.orientation?.angle || window.orientation || 0
    const orientAdjust = new THREE.Quaternion()
    orientAdjust.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -deg2rad(screenOrient))
    targetQ.current.multiply(orientAdjust)

    if (!initialized.current) {
      currentQ.current.copy(targetQ.current)
      initialized.current = true
    } else {
      currentQ.current.slerp(targetQ.current, 0.3)
    }

    camera.quaternion.copy(currentQ.current)
  })

  return null
}

// Fallback: POIs spread in a full arc in front of the camera
function FallbackPOIMarkers({ pois, targetedPoiId }) {
  const groupRef = useRef()
  const radius = 4

  return (
    <group ref={groupRef}>
      {pois.map((poi, i) => {
        const arcSpan = Math.PI * 0.8 // ~145 degrees spread
        const angle = pois.length > 1
          ? -arcSpan / 2 + (arcSpan / (pois.length - 1)) * i
          : 0
        const x = Math.sin(angle) * radius
        const z = -Math.cos(angle) * radius
        return (
          <group key={poi.id} position={[x, 0, z]}>
            <POIMarker poi={poi} isTargeted={targetedPoiId === poi.id} />
          </group>
        )
      })}
    </group>
  )
}

// Always-visible close arc of category spheres — camera-relative, no GPS needed
function CloseCategoryMarkers({ categories, targetedId }) {
  const { camera } = useThree()
  const groupRef = useRef()
  const radius = 4

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.position.copy(camera.position)
  })

  return (
    <group ref={groupRef}>
      {categories.map((cat, i) => {
        const arcSpan = Math.PI * 0.8
        const angle = categories.length > 1
          ? -arcSpan / 2 + (arcSpan / (categories.length - 1)) * i
          : 0
        const x = Math.sin(angle) * radius
        const z = -Math.cos(angle) * radius
        // Reuse POIMarker shape — pass category as a poi-shaped object
        const asPoi = { ...cat, id: cat.id }
        return (
          <group key={cat.id} position={[x, 0, z]}>
            <POIMarker poi={asPoi} isTargeted={targetedId === cat.id} />
          </group>
        )
      })}
    </group>
  )
}

// ─── Shared Components ───────────────────────────────────────────────

function CrosshairRaycaster({ onHit, onMiss }) {
  const { camera, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const lastPoiId = useRef(null)

  // Store callbacks in refs so useFrame never triggers re-renders from stale closures
  const onHitRef = useRef(onHit)
  const onMissRef = useRef(onMiss)
  onHitRef.current = onHit
  onMissRef.current = onMiss

  useFrame(() => {
    raycaster.current.setFromCamera({ x: 0, y: 0 }, camera)
    const hits = raycaster.current.intersectObjects(scene.children, true)
    const hit = hits.find((h) => h.object.userData.interactive)
    const poiId = hit ? hit.object.userData.poiId : null

    // Only fire callbacks when the targeted POI actually changes
    if (poiId !== lastPoiId.current) {
      lastPoiId.current = poiId
      if (poiId) {
        onHitRef.current(poiId)
      } else {
        onMissRef.current()
      }
    }
  })

  return null
}

// DEBUG: red sphere placed 5m in front of camera after 2s delay
function DebugForwardSphere({ poiId, sphereRef, onPlaced }) {
  const { camera } = useThree()
  const [show, setShow] = useState(false)
  const placed = useRef(false)
  const timer = useRef(0)
  const savedPos = useRef(new THREE.Vector3(0, -9999, 0))

  useFrame((_, delta) => {
    if (placed.current) return

    timer.current += delta
    if (timer.current < 2) return

    // Place sphere 5m in front of wherever the camera is looking
    const forward = new THREE.Vector3(0, 0, -5)
    forward.applyQuaternion(camera.quaternion)
    savedPos.current.copy(camera.position).add(forward)
    placed.current = true
    setShow(true)
    onPlaced?.()
  })

  if (!show) return null

  return (
    <mesh
      ref={sphereRef}
      position={[savedPos.current.x, savedPos.current.y, savedPos.current.z]}
      userData={{ interactive: true, poiId }}
    >
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
    </mesh>
  )
}

// DEBUG: green arrow that follows the camera and always points at the target
function DirectionArrow({ targetRef, visible }) {
  const { camera } = useThree()
  const groupRef = useRef()

  useFrame(() => {
    if (!groupRef.current || !targetRef?.current) return
    if (!targetRef.current.visible) return

    // Stick the arrow 1.5m in front of camera, slightly below center
    const offset = new THREE.Vector3(0, -0.3, -1.5)
    offset.applyQuaternion(camera.quaternion)
    groupRef.current.position.copy(camera.position).add(offset)

    // Point arrow toward target using simple quaternion from direction
    const dir = new THREE.Vector3()
    dir.subVectors(targetRef.current.position, groupRef.current.position).normalize()

    // Build quaternion that rotates +Z to point along `dir`
    const defaultDir = new THREE.Vector3(0, 0, 1)
    const quat = new THREE.Quaternion()
    quat.setFromUnitVectors(defaultDir, dir)
    groupRef.current.quaternion.copy(quat)
  })

  return (
    <group ref={groupRef} visible={visible}>
      {/* Shaft — along +Z */}
      <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.5} />
      </mesh>
      {/* Arrow head — cone tip pointing +Z (rotate +90° around X: +Y → +Z) */}
      <mesh position={[0, 0, 0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.25, 8]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

function Crosshair({ active }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r="8"
          fill="none"
          stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'}
          strokeWidth="1.5"
        />
        <line
          x1="20"
          y1="4"
          x2="20"
          y2="13"
          stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'}
          strokeWidth="1.5"
        />
        <line
          x1="20"
          y1="27"
          x2="20"
          y2="36"
          stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'}
          strokeWidth="1.5"
        />
        <line
          x1="4"
          y1="20"
          x2="13"
          y2="20"
          stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'}
          strokeWidth="1.5"
        />
        <line
          x1="27"
          y1="20"
          x2="36"
          y2="20"
          stroke={active ? '#00ffcc' : 'rgba(255,255,255,0.8)'}
          strokeWidth="1.5"
        />
        {active && <circle cx="20" cy="20" r="3" fill="#00ffcc" />}
      </svg>
    </div>
  )
}

function ShutterButton({ targeted, onCapture }) {
  return (
    <button
      style={{
        ...styles.shutter,
        opacity: targeted ? 1 : 0.4,
        cursor: targeted ? 'pointer' : 'default',
      }}
      disabled={!targeted}
      onClick={onCapture}
    >
      <div
        style={{
          ...styles.shutterInner,
          background: targeted ? '#00ffcc' : '#fff',
          transform: targeted ? 'scale(1)' : 'scale(0.92)',
        }}
      />
    </button>
  )
}

// ─── GPS-placed POIs with distance clamping ─────────────────────────

function ClampedPOIs({ pois, coords, targetedPoiId }) {
  const clampedPois = useMemo(() => {
    if (!coords) return pois.map((poi) => ({ poi, lat: poi.lat, lng: poi.lng }))

    return pois.map((poi) => {
      const clamped = getClampedCoords(coords.latitude, coords.longitude, poi, MAX_MARKER_DISTANCE)
      return { poi, lat: clamped.lat, lng: clamped.lng }
    })
  }, [pois, coords?.latitude, coords?.longitude])

  return (
    <>
      {clampedPois.map(({ poi, lat, lng }) => (
        <GPSPlacedObject key={poi.id} lat={lat} lng={lng}>
          <POIMarker poi={poi} isTargeted={targetedPoiId === poi.id} />
        </GPSPlacedObject>
      ))}
    </>
  )
}

// ─── Compass HUD ────────────────────────────────────────────────────

function Compass() {
  const [heading, setHeading] = useState(null) // null = no data yet
  const smoothHeading = useRef(0)

  useEffect(() => {
    let active = true

    const onOrientation = (e) => {
      if (!active) return

      // iOS provides webkitCompassHeading (true north, 0-360)
      // Android/others: alpha is 0-360 but relative — we use it as best-effort
      let h = null
      if (e.webkitCompassHeading != null) {
        h = e.webkitCompassHeading
      } else if (e.alpha != null) {
        // On Android, alpha=0 is wherever the phone was pointing at page load
        // With absolute:true events this is true north; otherwise approximate
        h = 360 - e.alpha
      }

      if (h != null) {
        // Smooth the heading to avoid jitter
        let delta = h - smoothHeading.current
        if (delta > 180) delta -= 360
        if (delta < -180) delta += 360
        smoothHeading.current = (smoothHeading.current + delta * 0.3 + 360) % 360
        setHeading(smoothHeading.current)
      }
    }

    // Try absolute orientation first (true north on Android)
    window.addEventListener('deviceorientationabsolute', onOrientation)
    window.addEventListener('deviceorientation', onOrientation)

    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().catch(() => {})
    }

    return () => {
      active = false
      window.removeEventListener('deviceorientationabsolute', onOrientation)
      window.removeEventListener('deviceorientation', onOrientation)
    }
  }, [])

  const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const h = heading ?? 0
  const index = Math.round(h / 45) % 8
  const label = cardinals[index]

  return (
    <div style={styles.compass}>
      <div
        style={{
          ...styles.compassRing,
          transform: `rotate(${-h}deg)`,
        }}
      >
        {/* North needle */}
        <div style={styles.compassNeedle} />
        <span style={styles.compassN}>N</span>
      </div>
      <span style={styles.compassLabel}>
        {heading == null ? 'No compass' : `${label} ${Math.round(h)}°`}
      </span>
    </div>
  )
}

// ─── Permission Gate ─────────────────────────────────────────────────
// iOS requires deviceorientation permission from a user gesture.
// This screen requests all permissions before launching the AR scene.

export default function ARScene() {
  const [permitted, setPermitted] = useState(false)
  const [parallax, setParallax] = useState({ x: 50, y: 50 })

  useEffect(() => {
    const handleOrientation = (e) => {
      // gamma: left/right tilt (-90 to 90), beta: front/back tilt (-180 to 180)
      const x = 50 + (e.gamma ?? 0) * 0.3
      const y = 50 + ((e.beta ?? 90) - 90) * 0.3
      setParallax({ x: Math.min(80, Math.max(20, x)), y: Math.min(80, Math.max(20, y)) })
    }
    window.addEventListener('deviceorientation', handleOrientation)
    return () => window.removeEventListener('deviceorientation', handleOrientation)
  }, [])

  const requestPermissions = async () => {
    // 1. Device orientation (iOS 13+)
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const result = await DeviceOrientationEvent.requestPermission()
        if (result !== 'granted') {
          alert('Device orientation permission is required for AR.')
          return
        }
      } catch (err) {
        console.warn('Orientation permission error:', err)
      }
    }

    // 2. Camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      })
      // Stop the test stream — CameraBackground will open its own
      stream.getTracks().forEach((t) => t.stop())
    } catch (err) {
      console.warn('Camera permission error:', err)
    }

    // 3. Geolocation (just trigger the prompt)
    navigator.geolocation?.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: true })

    setPermitted(true)
  }

  if (!permitted) {
    return (
      <div style={{ ...styles.permissionGate, backgroundPosition: `${parallax.x}% ${parallax.y}%` }}>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
        <div style={styles.permissionCard}>
          <div style={{ ...styles.permissionIcons, animation: 'pulse 2s ease-in-out infinite' }}>
            <img src="/Camera.svg" alt="Camera" style={styles.permissionIcon} />
            <img src="/AR.svg" alt="AR" style={styles.permissionIcon} />
          </div>
          <p style={styles.permissionDesc}>
            Camera Access is required for Augmented Reality Functionality
            <br /><br />
            Please allow permissions when prompted.
          </p>
          <button style={styles.permissionBtn} onClick={requestPermissions}>
            Proceed
          </button>
        </div>
      </div>
    )
  }

  return <ARSceneInner />
}

// ─── AR.js Location Provider + Updater ──────────────────────────────

function LocationARProvider({ onError, children }) {
  const arState = useLocationARSetup({ onError })

  return (
    <LocationARContext.Provider value={arState}>
      {children}
    </LocationARContext.Provider>
  )
}

function ARUpdater() {
  const arState = useLocationAR()

  useFrame(() => {
    arState?.orientControls?.current?.update()
  })

  return null
}

// ─── Main ARScene (rendered after permissions granted) ──────────────

function ARSceneInner() {
  const [targetedId, setTargetedId] = useState(null)       // which sphere is crosshaired
  const [activeCategory, setActiveCategory] = useState(null) // category list panel open
  const [activePoi, setActivePoi] = useState(null)           // place detail panels open
  const [navigatingTo, setNavigatingTo] = useState(null)
  const [arFailed, setArFailed] = useState(false)
  const [debugPlaced, setDebugPlaced] = useState(false)
  const [vrMode, setVrMode] = useState(false)
  const debugSphereRef = useRef()

  // Prevent the page from scrolling/dragging while AR is active
  useEffect(() => {
    const prev = {
      bodyOverflow: document.body.style.overflow,
      bodyTouchAction: document.body.style.touchAction,
      htmlOverflow: document.documentElement.style.overflow,
    }
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev.bodyOverflow
      document.body.style.touchAction = prev.bodyTouchAction
      document.documentElement.style.overflow = prev.htmlOverflow
    }
  }, [])

  const { pois: firebasePois } = usePOIsFromFirestore()

  const showDebug = new URLSearchParams(window.location.search).get('debug') === 'true'

  const { isLandscape } = useOrientationDetect()
  const { coords } = useGeolocation()
  // Auto-toggle VR on landscape, off on portrait
  useEffect(() => {
    setVrMode(isLandscape)
  }, [isLandscape])

  // Request fullscreen + wake lock when entering VR
  useEffect(() => {
    if (!vrMode) return

    // Fullscreen
    const el = document.documentElement
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen()
    }

    // Wake lock (prevent screen sleep)
    let wakeLock = null
    if (navigator.wakeLock) {
      navigator.wakeLock.request('screen').then((wl) => { wakeLock = wl }).catch(() => {})
    }

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
      wakeLock?.release()
    }
  }, [vrMode])

  const allPois = firebasePois

  const { closestPOI } = useNearbyPOIs(coords, allPois)

  // targetedId tracks which category sphere the crosshair is on
  const targeted = targetedId !== null

  const handleHit = useCallback((id) => setTargetedId(id), [])
  const handleMiss = useCallback(() => setTargetedId(null), [])
  const handleArError = useCallback(() => setArFailed(true), [])
  const handleDebugPlaced = useCallback(() => setDebugPlaced(true), [])

  // Shutter / dwell on a category sphere → open the category list panel
  const handleCapture = useCallback(() => {
    if (!targetedId) return
    const cat = CATEGORIES.find((c) => c.id === targetedId)
    if (cat) setActiveCategory(cat)
  }, [targetedId])

  // User picks a place from the category list → open the 3-panel detail view
  const handleSelectPlace = useCallback((poi) => {
    setActiveCategory(null)
    setActivePoi(poi)
  }, [])

  const handleCloseCategoryPanel = useCallback(() => setActiveCategory(null), [])
  const handleClosePoiPanel = useCallback(() => setActivePoi(null), [])

  const handleNavigate = useCallback((poi) => {
    setNavigatingTo(poi)
    setActivePoi(null)
  }, [])

  const handleStopNavigating = useCallback(() => setNavigatingTo(null), [])

  // VR dwell: gaze at category sphere → open list
  const handleDwellActivate = useCallback((id) => {
    if (id === '__vr_close__') { setActivePoi(null); setActiveCategory(null); return }
    const cat = CATEGORIES.find((c) => c.id === id)
    if (cat) { setActiveCategory(cat); return }
    const poi = allPois.find((p) => p.id === id)
    if (poi) setActivePoi(poi)
  }, [allPois])

  const handleDwellTargetChange = useCallback((id) => setTargetedId(id), [])

  // Places for the currently active category
  const categoryPlaces = useMemo(() => {
    if (!activeCategory) return []
    return allPois.filter((p) => p.category === activeCategory.category)
  }, [activeCategory, allPois])

  const noPanelOpen = !activeCategory && !activePoi

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', touchAction: 'none', overscrollBehavior: 'none' }}>
      <CameraBackground vrMode={vrMode} />

      <button style={styles.vrToggle} onClick={() => setVrMode((v) => !v)}>
        {vrMode ? 'Exit VR' : 'VR'}
      </button>

      {!vrMode && <Compass />}
      {!vrMode && showDebug && closestPOI && <ProximityIndicator poi={closestPOI} />}

      {!vrMode && arFailed && (
        <div style={styles.fallbackBanner}>Demo mode — location AR unavailable</div>
      )}

      {!vrMode && showDebug && (
        <div style={styles.debug}>
          <div>Mode: {arFailed ? 'FALLBACK' : 'AR.js'} {vrMode ? '+ VR' : ''}</div>
          <div>GPS: {coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} (±${Math.round(coords.accuracy)}m)` : 'waiting...'}</div>
          <div>POIs loaded: {allPois.length}</div>
<div>Targeted: {targetedId || 'none'}</div>
          <div>Shutter: {targeted ? 'ENABLED' : 'disabled'}</div>
          <div>Category panel: {activeCategory ? activeCategory.name : 'no'}</div>
          <div>Place panel: {activePoi ? activePoi.name : 'no'}</div>
          <div>Debug sphere: {debugPlaced ? 'PLACED' : 'waiting...'}</div>
        </div>
      )}

      {!vrMode && showDebug && (
        <div style={styles.howTo}>
          1. Aim crosshair at a category sphere{'\n'}
          2. Shutter lights up — tap to open place list{'\n'}
          3. Tap a place to open detail panels
        </div>
      )}

      <Canvas
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        camera={{ position: [0, 0, 0] }}
        gl={{ alpha: true, premultipliedAlpha: false }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0) }}
      >
        <StereoRenderer enabled={vrMode} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 2]} intensity={1} />

        {/* DEBUG only */}
        {showDebug && (
          <>
            <DebugForwardSphere poiId={allPois[0]?.id} sphereRef={debugSphereRef} onPlaced={handleDebugPlaced} />
            <DirectionArrow targetRef={debugSphereRef} visible={debugPlaced} />
          </>
        )}

        {/* AR orientation + GPS placement — always mounted so camera tracking never stops */}
        {!arFailed ? (
          <LocationARProvider onError={handleArError}>
            <ARUpdater />
            {/* Category spheres and GPS markers — only when no panel is open */}
            {noPanelOpen && (
              <CloseCategoryMarkers categories={CATEGORIES} targetedId={targetedId} />
            )}
          </LocationARProvider>
        ) : (
          <>
            <FallbackDeviceOrientationCamera />
            {noPanelOpen && (
              <CloseCategoryMarkers categories={CATEGORIES} targetedId={targetedId} />
            )}
          </>
        )}

        {/* Raycasters — only when no panel is open */}
        {noPanelOpen && vrMode && (
          <DwellRaycaster onActivate={handleDwellActivate} onTargetChange={handleDwellTargetChange} />
        )}
        {noPanelOpen && !vrMode && (
          <CrosshairRaycaster onHit={handleHit} onMiss={handleMiss} />
        )}

        {/* Category list panel */}
        {activeCategory && !activePoi && (
          <CategoryListPanel
            category={activeCategory}
            places={categoryPlaces}
            onSelectPlace={handleSelectPlace}
            onClose={handleCloseCategoryPanel}
          />
        )}

        {/* Place detail panels */}
        {activePoi && vrMode && (
          <VRPanelContent poi={activePoi} onClose={handleClosePoiPanel} />
        )}
        {activePoi && !vrMode && (
          <POIPanels3D poi={activePoi} onClose={handleClosePoiPanel} onNavigate={handleNavigate} />
        )}

        {/* AR navigation arrow */}
        {navigatingTo && (
          <ARNavigationArrow destination={navigatingTo} userCoords={coords} />
        )}
      </Canvas>

      {/* DOM overlays */}
      {!vrMode && <Crosshair active={targeted} />}

      {!vrMode && targeted && noPanelOpen && (
        <div style={styles.targetHint}>
          {CATEGORIES.find((c) => c.id === targetedId)?.name}
        </div>
      )}

      {!vrMode && noPanelOpen && (
        <ShutterButton targeted={targeted} onCapture={handleCapture} />
      )}

      {!vrMode && navigatingTo && (
        <button style={styles.stopNavBtn} onClick={handleStopNavigating}>
          ✕ Stop Navigation
        </button>
      )}

      {vrMode && noPanelOpen && (
        <div style={styles.vrHint}>Gaze at a category sphere for 2s to open</div>
      )}
    </div>
  )
}

const styles = {
  arButton: {
    position: 'fixed',
    top: '1.5rem',
    right: '1.5rem',
    padding: '0.5rem 1.2rem',
    background: 'rgba(255,255,255,0.1)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '999px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    zIndex: 20,
  },
  openButton: {
    position: 'fixed',
    bottom: '3rem',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0.9rem 2rem',
    background: 'rgba(0, 255, 204, 0.15)',
    backdropFilter: 'blur(12px)',
    border: '1px solid #00ffcc',
    borderRadius: '999px',
    color: '#00ffcc',
    fontSize: '1rem',
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    cursor: 'pointer',
    zIndex: 20,
    letterSpacing: '0.03em',
  },
  compass: {
    position: 'fixed',
    top: '1rem',
    left: '1rem',
    zIndex: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    pointerEvents: 'none',
  },
  compassRing: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(8px)',
    position: 'relative',
    transition: 'transform 0.15s ease-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compassNeedle: {
    position: 'absolute',
    top: '6px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '0',
    height: '0',
    borderLeft: '5px solid transparent',
    borderRight: '5px solid transparent',
    borderBottom: '12px solid #ff3333',
  },
  compassN: {
    position: 'absolute',
    top: '-1px',
    left: '50%',
    transform: 'translateX(-50%) translateY(-100%)',
    fontSize: '0.55rem',
    fontWeight: 700,
    color: '#ff3333',
    fontFamily: "'DM Sans', sans-serif",
  },
  compassLabel: {
    fontSize: '0.6rem',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: "'DM Sans', sans-serif",
    background: 'rgba(0, 0, 0, 0.4)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  debug: {
    position: 'fixed',
    bottom: '6rem',
    left: '0.5rem',
    zIndex: 30,
    background: 'rgba(0, 0, 0, 0.7)',
    color: '#0f0',
    fontFamily: 'monospace',
    fontSize: '0.6rem',
    padding: '6px 8px',
    borderRadius: '6px',
    lineHeight: 1.6,
    pointerEvents: 'none',
    maxWidth: '60vw',
    wordBreak: 'break-all',
  },
  howTo: {
    position: 'fixed',
    top: '50%',
    right: '0.5rem',
    transform: 'translateY(-50%)',
    zIndex: 30,
    background: 'rgba(0, 0, 0, 0.7)',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '0.55rem',
    padding: '8px 10px',
    borderRadius: '6px',
    lineHeight: 1.8,
    pointerEvents: 'none',
    whiteSpace: 'pre-line',
    maxWidth: '35vw',
  },
  permissionGate: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundImage: "url('/LoadingScreen Bg.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    zIndex: 9998,
  },
  permissionCard: {
    textAlign: 'center',
    maxWidth: '320px',
  },
  permissionTitle: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '1rem',
  },
  permissionDesc: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.9rem',
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 1.6,
    marginBottom: '2rem',
    padding: '0 2rem',
  },
  permissionBtn: {
    padding: '14px 36px',
    borderRadius: '999px',
    background: '#0000001e',
    color: '#ffffff',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  permissionIcons: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  permissionIcon: {
    width: '35px',
    height: '35px',
  },
  shutter: {
    position: 'fixed',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.15)',
    border: '3px solid rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s',
    padding: 0,
  },
  shutterInner: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'background 0.2s, transform 0.2s',
  },
  targetHint: {
    position: 'fixed',
    bottom: '6.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    color: '#00ffcc',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.8rem',
    fontWeight: 600,
    padding: '6px 16px',
    borderRadius: '999px',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
  fallbackBanner: {
    position: 'fixed',
    top: '3.5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    background: 'rgba(255, 165, 0, 0.2)',
    border: '1px solid rgba(255, 165, 0, 0.5)',
    color: '#ffaa00',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: '999px',
    pointerEvents: 'none',
  },
  vrToggle: {
    position: 'fixed',
    top: '1rem',
    right: '1rem',
    zIndex: 30,
    padding: '8px 16px',
    borderRadius: '999px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.75rem',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.06em',
  },
  stopNavBtn: {
    position: 'fixed',
    top: '1rem',
    right: '5rem',
    padding: '8px 18px',
    borderRadius: '999px',
    background: 'rgba(255,100,0,0.18)',
    border: '1px solid rgba(255,100,0,0.7)',
    color: '#ff8844',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.8rem',
    fontWeight: 700,
    cursor: 'pointer',
    zIndex: 20,
    backdropFilter: 'blur(10px)',
    letterSpacing: '0.03em',
  },
  vrHint: {
    position: 'fixed',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(8px)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '0.65rem',
    fontWeight: 600,
    padding: '6px 16px',
    borderRadius: '999px',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
}
