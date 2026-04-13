import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Renders a 3D model or glowing sphere + floating name label for a single POI.
 * When poi.modelUrl is set, loads and displays that GLB instead of the sphere.
 * Attach userData.poiId so the crosshair raycaster can identify which POI was hit.
 */
function ModelMarker({ poi, isTargeted }) {
  const { scene } = useGLTF(poi.modelUrl)
  const ref = useRef()

  // Auto-scale model to fit within a ~1.25 unit radius
  const cloned = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone()
        child.material.emissive = new THREE.Color(poi.sphereEmissive)
        child.material.emissiveIntensity = isTargeted ? 0.6 : 0.25
        child.userData = { interactive: true, poiId: poi.id }
      }
    })

    // Compute bounding box and normalize scale
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = maxDim > 0 ? 2.5 / maxDim : 1
    clone.scale.setScalar(scale)

    // Center the model
    const center = new THREE.Vector3()
    box.getCenter(center)
    clone.position.sub(center.multiplyScalar(scale))

    return clone
  }, [scene, poi.sphereEmissive, poi.id, isTargeted])

  // Slow rotation
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.3
    }
  })

  return <primitive ref={ref} object={cloned} />
}

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
  const hasModel = !!poi.modelUrl
  const labelY = hasModel ? 2.5 : sphereRadius + 1

  return (
    <group ref={groupRef}>
      {/* 3D Model or Glowing sphere */}
      {hasModel ? (
        <ModelMarker poi={poi} isTargeted={isTargeted} />
      ) : (
        <>
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
        </>
      )}

      {/* Floating name label */}
      <sprite
        position={[0, labelY, 0]}
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

// Preload 3D models so they're ready when markers appear
useGLTF.preload('/models/dining_set_plate_spoon_and_fork.glb')
useGLTF.preload('/models/map_pointer_3d_icon.glb')
