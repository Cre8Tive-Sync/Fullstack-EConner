/* @jsxRuntime automatic */
/* @jsxImportSource react */
import { useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

function FloatingSphere() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y += 0.005
  })
  return (
    <mesh ref={ref} position={[0, 0, -1.5]}>
      <sphereGeometry args={[0.15, 32, 32]} />
      <meshStandardMaterial color="#4488ff" />
    </mesh>
  )
}

export default function ARScene() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas camera={{ position: [0, 0, 0] }}>
        <ambientLight intensity={0.6} />
        <FloatingSphere />
      </Canvas>
    </div>
  )
}