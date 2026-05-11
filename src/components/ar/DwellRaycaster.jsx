import { useRef, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const DWELL_TIME = 2.0 // seconds to stare before activating
const RING_SEGMENTS = 64

/**
 * VR-mode raycaster: gaze at a POI for 2 seconds to activate.
 * Shows a circular progress ring in 3D space around the crosshair.
 *
 * Props:
 *  - onActivate(poiId): called when dwell timer completes on a POI
 *  - onTargetChange(poiId | null): called when targeted POI changes
 */
export default function DwellRaycaster({ onActivate, onTargetChange }) {
  const { camera, scene } = useThree()
  const raycaster = useRef(new THREE.Raycaster())
  const lastPoiId = useRef(null)
  const dwellTimer = useRef(0)
  const ringRef = useRef()
  const ringGroupRef = useRef()

  const onActivateRef = useRef(onActivate)
  const onTargetChangeRef = useRef(onTargetChange)
  onActivateRef.current = onActivate
  onTargetChangeRef.current = onTargetChange

  // Build ring geometry once — update drawRange each frame instead of recreating geometry
  const ringGeometry = useMemo(() => {
    const points = []
    const r = 0.09
    for (let i = 0; i <= RING_SEGMENTS; i++) {
      const angle = (i / RING_SEGMENTS) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0))
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points)
    geom.setDrawRange(0, 0)
    return geom
  }, [])

  useFrame((_, delta) => {
    // Raycast from camera center
    raycaster.current.setFromCamera({ x: 0, y: 0 }, camera)
    const hits = raycaster.current.intersectObjects(scene.children, true)
    const hit = hits.find((h) => h.object.userData.interactive)
    const poiId = hit ? hit.object.userData.poiId : null

    // Target changed
    if (poiId !== lastPoiId.current) {
      lastPoiId.current = poiId
      dwellTimer.current = 0
      onTargetChangeRef.current?.(poiId)
    }

    // Advance dwell timer
    if (poiId) {
      dwellTimer.current += delta
      if (dwellTimer.current >= DWELL_TIME) {
        onActivateRef.current?.(poiId)
        dwellTimer.current = 0
        lastPoiId.current = null // reset so it can re-trigger
      }
    }

    // Update progress ring position & arc
    if (ringGroupRef.current) {
      // Stick in front of camera
      const offset = new THREE.Vector3(0, 0, -1.5)
      offset.applyQuaternion(camera.quaternion)
      ringGroupRef.current.position.copy(camera.position).add(offset)
      ringGroupRef.current.quaternion.copy(camera.quaternion)

      // Show/hide
      ringGroupRef.current.visible = poiId != null
    }

    // Update arc via drawRange — no geometry allocation
    if (ringRef.current) {
      const progress = poiId ? Math.min(dwellTimer.current / DWELL_TIME, 1) : 0
      ringRef.current.geometry.setDrawRange(0, Math.floor(progress * RING_SEGMENTS) + 1)
    }
  })

  return (
    <group ref={ringGroupRef} visible={false}>
      <line ref={ringRef} geometry={ringGeometry}>
        <lineBasicMaterial
          color="#00ffcc"
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </line>
    </group>
  )
}
