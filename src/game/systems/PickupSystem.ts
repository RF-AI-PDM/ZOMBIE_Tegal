import * as THREE from 'three'
import type { PickupType } from '../types'

interface PickupInstance {
  type: PickupType
  mesh: THREE.Mesh
  spinOffset: number
}

const pickupColor: Record<PickupType, number> = {
  ammo: 0x3da5ff,
  medkit: 0x39e36d,
  scrap: 0xf0c54b,
}

export class PickupSystem {
  private readonly pickups: PickupInstance[] = []
  private spawnTimer = 3

  constructor(
    private readonly scene: THREE.Scene,
    private readonly spawnPoints: THREE.Vector3[],
    private readonly onCollect: (type: PickupType) => void,
  ) {}

  update(delta: number, playerPosition: THREE.Vector3): void {
    this.spawnTimer -= delta
    if (this.spawnTimer <= 0) {
      this.spawnPickup()
      this.spawnTimer = 5 + Math.random() * 4
    }

    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = this.pickups[i]
      pickup.mesh.rotation.y += delta * 1.8
      pickup.mesh.position.y = 1 + Math.sin(performance.now() * 0.0018 + pickup.spinOffset) * 0.15

      if (pickup.mesh.position.distanceTo(playerPosition) < 1.35) {
        this.onCollect(pickup.type)
        this.scene.remove(pickup.mesh)
        this.pickups.splice(i, 1)
      }
    }
  }

  private spawnPickup(): void {
    if (this.pickups.length >= 10) {
      return
    }

    const roll = Math.random()
    const type: PickupType = roll < 0.45 ? 'ammo' : roll < 0.75 ? 'scrap' : 'medkit'
    const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)]

    const geometry =
      type === 'ammo'
        ? new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10)
        : type === 'medkit'
          ? new THREE.BoxGeometry(0.55, 0.4, 0.55)
          : new THREE.DodecahedronGeometry(0.3)

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: pickupColor[type], emissive: pickupColor[type], emissiveIntensity: 0.2 }),
    )
    mesh.position.copy(spawnPoint)
    mesh.position.y = 1
    mesh.castShadow = true
    this.scene.add(mesh)

    this.pickups.push({ type, mesh, spinOffset: Math.random() * 10 })
  }
}
