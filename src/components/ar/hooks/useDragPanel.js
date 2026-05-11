import { useEffect, useRef, useState } from 'react'

export function useDragPanel({ enabled = true, sensitivity = 0.6 } = {}) {
  const [yaw, setYaw] = useState(0)
  const dragStateRef = useRef({ isDragging: false, startX: 0 })

  useEffect(() => {
    if (!enabled) return

    const onPointerDown = (e) => {
      dragStateRef.current = {
        isDragging: true,
        startX: e.clientX,
      }
    }

    const onPointerMove = (e) => {
      if (!dragStateRef.current.isDragging) return

      const deltaX = e.clientX - dragStateRef.current.startX
      const rotation = (deltaX / window.innerWidth) * 180 * sensitivity
      setYaw(rotation)
    }

    const onPointerUp = () => {
      dragStateRef.current.isDragging = false
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('pointerleave', onPointerUp)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('pointerleave', onPointerUp)
    }
  }, [enabled, sensitivity])

  return { yaw }
}
