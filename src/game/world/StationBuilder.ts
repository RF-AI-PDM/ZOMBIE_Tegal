import * as THREE from 'three'
import type { SpawnLayout } from '../types'

const createColumn = (height: number, radius: number, color: number): THREE.Mesh => {
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, height, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
  )
  column.castShadow = true
  column.receiveShadow = true
  return column
}

const createSignTexture = (label: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return new THREE.CanvasTexture(canvas)
  }

  ctx.fillStyle = '#101722'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = '#f2b632'
  ctx.lineWidth = 20
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)
  ctx.fillStyle = '#fefefe'
  ctx.font = 'bold 108px "Segoe UI"'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export const buildStasiunTegal = (scene: THREE.Scene): SpawnLayout => {
  const station = new THREE.Group()
  station.name = 'Stasiun Tegal'

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(80, 1, 120),
    new THREE.MeshStandardMaterial({ color: 0x3a434f, roughness: 0.9, metalness: 0.1 }),
  )
  floor.position.y = -0.5
  floor.receiveShadow = true
  station.add(floor)

  const railBed = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.4, 118),
    new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 1 }),
  )
  railBed.position.set(0, -0.2, 0)
  railBed.receiveShadow = true
  station.add(railBed)

  const trackOffset = 2.2
  for (const x of [-trackOffset, trackOffset]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.18, 116),
      new THREE.MeshStandardMaterial({ color: 0xaeb6be, metalness: 0.8, roughness: 0.2 }),
    )
    rail.position.set(x, 0.15, 0)
    rail.castShadow = true
    station.add(rail)
  }

  const leftPlatformMaterial = new THREE.MeshStandardMaterial({ color: 0x4e6680, roughness: 0.78 })
  const rightPlatformMaterial = new THREE.MeshStandardMaterial({ color: 0x80644e, roughness: 0.78 })

  const leftPlatform = new THREE.Mesh(new THREE.BoxGeometry(30, 0.5, 110), leftPlatformMaterial)
  leftPlatform.position.set(-25, 0, 0)
  leftPlatform.receiveShadow = true
  station.add(leftPlatform)

  const rightPlatform = new THREE.Mesh(new THREE.BoxGeometry(30, 0.5, 110), rightPlatformMaterial)
  rightPlatform.position.set(25, 0, 0)
  rightPlatform.receiveShadow = true
  station.add(rightPlatform)

  for (const [x, color] of [[-25, 0x79d0ff], [25, 0xffbb68]] as const) {
    for (let z = -50; z <= 50; z += 8) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.3, 0.03, 4.2),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 }),
      )
      stripe.position.set(x + (x < 0 ? 12.8 : -12.8), 0.28, z)
      station.add(stripe)
    }
  }

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x1e242d, roughness: 0.9 })
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(80, 12, 1), wallMaterial)
  backWall.position.set(0, 5.5, -60)
  station.add(backWall)

  const frontWall = backWall.clone()
  frontWall.position.z = 60
  station.add(frontWall)

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(1, 12, 120), wallMaterial)
  leftWall.position.set(-40, 5.5, 0)
  station.add(leftWall)

  const rightWall = leftWall.clone()
  rightWall.position.x = 40
  station.add(rightWall)

  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(80, 1, 120),
    new THREE.MeshStandardMaterial({ color: 0x232b35, roughness: 0.8 }),
  )
  ceiling.position.y = 11
  station.add(ceiling)

  for (let z = -50; z <= 50; z += 20) {
    const columnLeft = createColumn(10, 0.8, 0x7a8593)
    columnLeft.position.set(-9, 5, z)
    station.add(columnLeft)

    const columnRight = createColumn(10, 0.8, 0x7a8593)
    columnRight.position.set(9, 5, z)
    station.add(columnRight)
  }

  const signTexture = createSignTexture('Stasiun Tegal')
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 6),
    new THREE.MeshStandardMaterial({ map: signTexture, emissive: 0x202020, emissiveIntensity: 0.8 }),
  )
  sign.position.set(0, 7.2, -58.8)
  station.add(sign)

  const leftLandmark = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 2),
    new THREE.MeshBasicMaterial({ color: 0x63bff3 }),
  )
  leftLandmark.position.set(-36.4, 4.2, -15)
  leftLandmark.rotation.y = Math.PI / 2
  station.add(leftLandmark)

  const rightLandmark = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 2),
    new THREE.MeshBasicMaterial({ color: 0xf3b563 }),
  )
  rightLandmark.position.set(36.4, 4.2, 15)
  rightLandmark.rotation.y = -Math.PI / 2
  station.add(rightLandmark)

  for (let z = -45; z <= 45; z += 18) {
    const light = new THREE.PointLight(0xbad6ff, 28, 22, 2)
    light.position.set(0, 9.6, z)
    station.add(light)
  }

  scene.add(station)

  return {
    enemySpawns: [
      new THREE.Vector3(-32, 1.6, -45),
      new THREE.Vector3(-28, 1.6, 40),
      new THREE.Vector3(30, 1.6, -42),
      new THREE.Vector3(28, 1.6, 43),
      new THREE.Vector3(0, 1.6, -50),
      new THREE.Vector3(0, 1.6, 50),
      new THREE.Vector3(-18, 1.6, 0),
      new THREE.Vector3(18, 1.6, 0),
    ],
    pickupSpawns: [
      new THREE.Vector3(-24, 1, -24),
      new THREE.Vector3(-24, 1, 24),
      new THREE.Vector3(24, 1, -24),
      new THREE.Vector3(24, 1, 24),
      new THREE.Vector3(-8, 1, 0),
      new THREE.Vector3(8, 1, 0),
    ],
    playerSpawn: new THREE.Vector3(0, 1.7, 30),
    bounds: {
      minX: -36,
      maxX: 36,
      minZ: -56,
      maxZ: 56,
    },
  }
}
