import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js'

/**
 * When enabled, takes over R3F's render loop and renders the scene
 * in side-by-side stereoscopic mode using Three.js StereoEffect.
 *
 * Must be placed inside a <Canvas> with frameloop="never" when active,
 * OR we use renderPriority + return true to skip R3F's default render.
 */
export default function StereoRenderer({ enabled }) {
  const { gl, scene, camera, size } = useThree()
  const effectRef = useRef(null)
  const originalRender = useRef(null)

  useEffect(() => {
    if (!enabled) {
      effectRef.current = null
      return
    }

    const effect = new StereoEffect(gl)
    effect.setEyeSeparation(0.064) // 64mm average human IPD
    effectRef.current = effect

    return () => {
      effectRef.current = null
      // Restore viewport/scissor to full canvas
      gl.setScissorTest(false)
      gl.setViewport(0, 0, size.width, size.height)
    }
  }, [enabled, gl]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update stereo effect size when canvas resizes
  useEffect(() => {
    if (effectRef.current) {
      effectRef.current.setSize(size.width, size.height)
    }
  }, [size.width, size.height])

  // Take over rendering — priority 1 runs after scene graph updates
  useFrame(() => {
    if (!enabled || !effectRef.current) return

    // Clear with transparent background
    gl.setClearColor(0x000000, 0)
    effectRef.current.render(scene, camera)
  }, enabled ? 1 : 0)

  return null
}
