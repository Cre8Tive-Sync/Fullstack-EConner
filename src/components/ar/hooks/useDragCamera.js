import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function useDragCamera({ enabled = true, sensitivity = 0.005 } = {}) {
  const { camera } = useThree()
  const dragStateRef = useRef({ isDragging: false, lastX: 0, lastY: 0 })
  const rotationRef = useRef({ yaw: 0, pitch: 0 })

  useEffect(() => {
    if (!enabled) return

    const canvas = document.querySelector('canvas')
    if (!canvas) return

    const onPointerDown = (e) => {
      dragStateRef.current = {
        isDragging: true,
        lastX: e.clientX,
        lastY: e.clientY,
      }
    }

    const onPointerMove = (e) => {
      if (!dragStateRef.current.isDragging) return

      const deltaX = e.clientX - dragStateRef.current.lastX
      const deltaY = e.clientY - dragStateRef.current.lastY

      rotationRef.current.yaw += deltaX * sensitivity
      rotationRef.current.pitch += deltaY * sensitivity

      rotationRef.current.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.pitch))

      const euler = new THREE.Euler(rotationRef.current.pitch, rotationRef.current.yaw, 0, 'YXZ')
      const quat = new THREE.Quaternion()
      quat.setFromEuler(euler)
      camera.quaternion.copy(quat)

      dragStateRef.current.lastX = e.clientX
      dragStateRef.current.lastY = e.clientY
    }

    const onPointerUp = () => {
      dragStateRef.current.isDragging = false
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerUp)

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerUp)
    }
  }, [enabled, sensitivity, camera])
}
