import { useMemo, useRef, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PANEL_DEFS = [
  { id: 'overview', angleOffset: -0.55 },
  { id: 'gallery',  angleOffset: 0 },
  { id: 'details',  angleOffset: 0.55 },
]

const PANEL_DISTANCE = 4
const PANEL_Y = 0.3
const PANEL_WIDTH = 2.2
const PANEL_HEIGHT = 3.0

// ─── Canvas drawing helpers ─────────────────────────────────────────

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ')
  let line = ''
  let curY = y
  for (const word of words) {
    const test = line + word + ' '
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line.trim(), x, curY)
      line = word + ' '
      curY += lineHeight
    } else {
      line = test
    }
  }
  if (line.trim()) ctx.fillText(line.trim(), x, curY)
  return curY + lineHeight
}

// ─── Panel texture generators ───────────────────────────────────────

function createOverviewTexture(poi) {
  const w = 512, h = 700
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  // Background
  drawRoundedRect(ctx, 0, 0, w, h, 24)
  ctx.fillStyle = 'rgba(10, 10, 26, 0.95)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Category badge
  ctx.font = 'bold 22px sans-serif'
  ctx.fillStyle = poi.sphereColor || '#00ffcc'
  ctx.fillText(poi.category_id?.toUpperCase() || '', 30, 50)

  // Divider
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.fillRect(30, 70, w - 60, 1)

  // Name
  ctx.font = 'bold 36px sans-serif'
  ctx.fillStyle = '#ffffff'
  let curY = wrapText(ctx, poi.name, 30, 115, w - 60, 42)

  // Description
  curY += 10
  ctx.font = '22px sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
  curY = wrapText(ctx, poi.description || '', 30, curY, w - 60, 30)

  // Tags
  if (poi.tags?.length) {
    curY += 16
    ctx.font = 'bold 20px sans-serif'
    let tagX = 30
    for (const tag of poi.tags) {
      const tw = ctx.measureText(tag).width + 20
      drawRoundedRect(ctx, tagX, curY - 16, tw, 28, 6)
      ctx.fillStyle = 'rgba(0, 255, 204, 0.15)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = '#00ffcc'
      ctx.fillText(tag, tagX + 10, curY + 4)
      tagX += tw + 10
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createGalleryTexture(poi) {
  const w = 512, h = 700
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  drawRoundedRect(ctx, 0, 0, w, h, 24)
  ctx.fillStyle = 'rgba(10, 10, 26, 0.95)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = 'bold 32px sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('Gallery', 30, 50)

  // Image placeholders
  const imgH = 160
  const gap = 14
  let y = 80
  const imgCount = Math.min(poi.images?.length || 0, 3)
  for (let i = 0; i < imgCount; i++) {
    drawRoundedRect(ctx, 30, y, w - 60, imgH, 12)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Image label
    ctx.font = '20px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.textAlign = 'center'
    ctx.fillText(`Photo ${i + 1}`, w / 2, y + imgH / 2 + 6)
    ctx.textAlign = 'left'

    y += imgH + gap
  }

  if (poi.videoUrl) {
    drawRoundedRect(ctx, 30, y, w - 60, 50, 10)
    ctx.fillStyle = 'rgba(0, 255, 204, 0.1)'
    ctx.fill()
    ctx.font = 'bold 22px sans-serif'
    ctx.fillStyle = '#00ffcc'
    ctx.textAlign = 'center'
    ctx.fillText('▶  Video available', w / 2, y + 32)
    ctx.textAlign = 'left'
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

function createDetailsTexture(poi) {
  const w = 512, h = 700
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  drawRoundedRect(ctx, 0, 0, w, h, 24)
  ctx.fillStyle = 'rgba(10, 10, 26, 0.95)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.font = 'bold 32px sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('Details', 30, 50)

  let y = 90
  const rows = [
    { label: 'HOURS', value: poi.hours || 'N/A' },
    { label: 'LOCATION', value: `${poi.lat?.toFixed(4)}, ${poi.lng?.toFixed(4)}` },
    { label: 'CATEGORY', value: poi.category_id || '' },
  ]

  for (const row of rows) {
    // Label
    ctx.font = 'bold 18px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.fillText(row.label, 30, y)
    // Value
    ctx.font = '22px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(row.value, 30, y + 28)
    // Divider
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
    ctx.fillRect(30, y + 42, w - 60, 1)
    y += 62
  }

  // Address
  if (poi.address) {
    y += 8
    ctx.font = 'bold 18px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.fillText('ADDRESS', 30, y)
    y += 26
    ctx.font = '20px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    wrapText(ctx, poi.address, 30, y, w - 60, 26)
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

const textureCreators = {
  overview: createOverviewTexture,
  gallery: createGalleryTexture,
  details: createDetailsTexture,
}

// ─── VR Close target — a 3D sphere the user gazes at to close ───────

function VRCloseButton({ onClose }) {
  const { camera } = useThree()
  const groupRef = useRef()

  useFrame(() => {
    if (!groupRef.current) return
    const offset = new THREE.Vector3(0, -1.2, -2.5)
    offset.applyQuaternion(camera.quaternion)
    groupRef.current.position.copy(camera.position).add(offset)
    groupRef.current.quaternion.copy(camera.quaternion)
  })

  return (
    <group ref={groupRef}>
      <mesh userData={{ interactive: true, poiId: '__vr_close__' }}>
        <planeGeometry args={[1.2, 0.4]} />
        <meshBasicMaterial color="#ff4466" transparent opacity={0.8} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* "CLOSE" label */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[1.0, 0.3]} />
        <meshBasicMaterial map={createCloseLabelTexture()} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

function createCloseLabelTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.font = 'bold 36px sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('CLOSE', 128, 32)
  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

// ─── Main VR Panels component ───────────────────────────────────────

export default function VRPanelContent({ poi, onClose }) {
  const { camera } = useThree()

  const panelData = useMemo(() => {
    const pos = camera.position.clone()
    const forward = new THREE.Vector3(0, 0, -1)
    forward.applyQuaternion(camera.quaternion)
    forward.y = 0
    forward.normalize()

    const baseAngle = Math.atan2(forward.x, forward.z)

    return PANEL_DEFS.map((def) => {
      const angle = baseAngle + def.angleOffset
      const x = pos.x + Math.sin(angle) * PANEL_DISTANCE
      const z = pos.z + Math.cos(angle) * PANEL_DISTANCE
      const position = new THREE.Vector3(x, pos.y + PANEL_Y, z)

      const dx = pos.x - x
      const dz = pos.z - z
      const faceAngle = Math.atan2(dx, dz)

      const texture = textureCreators[def.id](poi)

      return { id: def.id, position, faceAngle, texture }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group>
      {panelData.map((p) => (
        <mesh
          key={p.id}
          position={p.position}
          rotation={[0, p.faceAngle, 0]}
        >
          <planeGeometry args={[PANEL_WIDTH, PANEL_HEIGHT]} />
          <meshBasicMaterial
            map={p.texture}
            transparent
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}

      <VRCloseButton onClose={onClose} />
    </group>
  )
}
