import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

// ── Haversine bearing (degrees, 0 = North, clockwise) ────────────────
function calcBearing(fromLat, fromLng, toLat, toLng) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLng = toRad(toLng - fromLng)
  const lat1 = toRad(fromLat)
  const lat2 = toRad(toLat)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (Math.atan2(y, x) * (180 / Math.PI) + 360) % 360
}

// ── Haversine distance (metres) ───────────────────────────────────────
function calcDistance(fromLat, fromLng, toLat, toLng) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(toLat - fromLat)
  const dLng = toRad(toLng - fromLng)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * AR compass arrow that always points toward a GPS destination.
 *
 * Approach:
 *  1. Listen to deviceorientation to get the real-world compass heading.
 *  2. Calculate the bearing from the user's GPS coords to the destination.
 *  3. relativeBearing = bearing − heading  →  "how many degrees right of camera forward?"
 *  4. Rotate the camera's forward vector by relativeBearing around Y to get
 *     the world-space direction the arrow tip should face.
 *  5. The arrow group follows the camera position (always visible in AR).
 */
export default function ARNavigationArrow({ destination, userCoords }) {
  const { camera } = useThree()
  const groupRef = useRef()
  const headingRef = useRef(0)   // live compass heading (degrees, 0 = North)
  const frameCount = useRef(0)
  const [displayDist, setDisplayDist] = useState(null)

  // Listen to device compass
  useEffect(() => {
    const handler = (e) => {
      // iOS: webkitCompassHeading is true north, clockwise
      // Android / absolute: alpha is magnetic north, clockwise when e.absolute=true
      if (e.webkitCompassHeading != null) {
        headingRef.current = e.webkitCompassHeading
      } else if (e.alpha != null) {
        headingRef.current = (360 - e.alpha) % 360
      }
    }
    window.addEventListener('deviceorientationabsolute', handler, { passive: true })
    window.addEventListener('deviceorientation', handler, { passive: true })
    return () => {
      window.removeEventListener('deviceorientationabsolute', handler)
      window.removeEventListener('deviceorientation', handler)
    }
  }, [])

  useFrame(() => {
    if (!groupRef.current) return

    // ── Position: 2m forward, 0.5m below camera ─────────────────────
    const forward = new THREE.Vector3(0, 0, -2)
    forward.applyQuaternion(camera.quaternion)
    groupRef.current.position
      .copy(camera.position)
      .add(forward)
      .add(new THREE.Vector3(0, -0.5, 0))

    if (!userCoords) return

    // ── Bearing + relative angle ─────────────────────────────────────
    const bearing = calcBearing(
      userCoords.latitude, userCoords.longitude,
      destination.lat, destination.lng,
    )
    const relDeg = ((bearing - headingRef.current) + 360) % 360

    // ── Camera forward projected flat onto XZ plane ──────────────────
    const camFwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    camFwd.y = 0
    if (camFwd.lengthSq() < 0.0001) return
    camFwd.normalize()

    // Rotate camFwd clockwise by relDeg to get the destination direction
    // (negative angle = clockwise in right-hand Y-up system)
    const destDir = camFwd
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -THREE.MathUtils.degToRad(relDeg))

    // Align arrow model (+Z = forward) to destDir
    if (destDir.lengthSq() > 0.0001) {
      groupRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        destDir,
      )
    }

    // ── Update displayed distance ~once per second ───────────────────
    frameCount.current++
    if (frameCount.current % 60 === 0) {
      const dist = Math.round(
        calcDistance(userCoords.latitude, userCoords.longitude, destination.lat, destination.lng),
      )
      setDisplayDist(dist)
    }
  })

  const distLabel =
    displayDist == null
      ? ''
      : displayDist < 1000
      ? `${displayDist} m`
      : `${(displayDist / 1000).toFixed(1)} km`

  return (
    <group ref={groupRef}>
      {/* Shaft — cylinder along +Z */}
      <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.38, 8]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff3300"
          emissiveIntensity={1.5}
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </mesh>

      {/* Head — cone tip pointing in +Z */}
      <mesh position={[0, 0, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 0.3, 8]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff3300"
          emissiveIntensity={2}
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </mesh>

      {/* Tail feather — thin cone in -Z direction */}
      <mesh position={[0, 0, -0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.07, 0.18, 8]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff3300"
          emissiveIntensity={0.8}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>

      {/* Info label */}
      <Html
        center
        position={[0, 0.38, 0]}
        distanceFactor={3}
        style={{ pointerEvents: 'none', whiteSpace: 'nowrap' }}
      >
        <div style={labelStyle}>
          <span style={labelDest}>{destination.name}</span>
          {distLabel ? <span style={labelDist}>{distLabel}</span> : null}
        </div>
      </Html>
    </group>
  )
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
  background: 'rgba(0,0,0,0.72)',
  borderRadius: '10px',
  padding: '5px 12px',
  border: '1px solid rgba(255,100,0,0.55)',
  boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
}

const labelDest = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '0.68rem',
  fontWeight: 700,
  color: '#ff8844',
  letterSpacing: '0.03em',
}

const labelDist = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '0.62rem',
  fontWeight: 500,
  color: 'rgba(255,200,120,0.9)',
}
