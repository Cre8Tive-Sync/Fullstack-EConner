import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Renders a glowing sphere + floating name label for a single POI.
 * Attach userData.poiId so the crosshair raycaster can identify which POI was hit.
 */
export default function POIMarker({ poi, isTargeted }) {
  const groupRef = useRef()
  const sphereRef = useRef()

  // Canvas texture for the name label
  const labelTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 1024, 256)

    // Glow
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)'
    ctx.shadowBlur = 16

    ctx.font = 'bold 72px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(poi.name, 512, 110)

    // Category subtitle
    ctx.shadowBlur = 0
    ctx.font = '40px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.fillText(poi.category.toUpperCase(), 512, 180)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [poi.name, poi.category])

  // Bobbing animation
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 0.6 + poi.id.charCodeAt(4)) * 0.15
    }
  })

  const emissiveIntensity = isTargeted ? 1.8 : 0.6
  const sphereRadius = 1.25
  const glowRadius = 1.5

  return (
    <group ref={groupRef}>
      {/* Glowing sphere */}
      <mesh
        ref={sphereRef}
        userData={{ interactive: true, poiId: poi.id }}
      >
        <sphereGeometry args={[sphereRadius, 32, 32]} />
        <meshStandardMaterial
          color={poi.sphereColor}
          emissive={poi.sphereEmissive}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={isTargeted ? 0.95 : 0.75}
        />
      </mesh>

      {/* Outer glow ring when targeted */}
      {isTargeted && (
        <mesh userData={{ interactive: true, poiId: poi.id }}>
          <sphereGeometry args={[glowRadius, 32, 32]} />
          <meshBasicMaterial
            color={poi.sphereColor}
            transparent
            opacity={0.15}
            side={THREE.BackSide}
          />
        </mesh>
      )}

      {/* Floating name label */}
      <sprite
        position={[0, sphereRadius + 1, 0]}
        scale={[4, 1, 1]}
        userData={{ interactive: true, poiId: poi.id }}
      >
        <spriteMaterial
          map={labelTexture}
          transparent
          opacity={isTargeted ? 1 : 0.75}
          depthTest={false}
        />
      </sprite>
    </group>
  )
}
