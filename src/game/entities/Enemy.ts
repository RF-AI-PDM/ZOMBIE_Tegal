import * as THREE from 'three'
import { GameBalance } from '../balance/GameBalance'
import type { EnemyZone } from '../types'

const BODY_TAG = 'body'
const HEAD_TAG = 'head'

export interface EnemyStats {
  hp: number
  speed: number
  attackDamage: number
  attackInterval: number
}

export class Enemy {
  readonly group = new THREE.Group()
  readonly hitboxes: THREE.Mesh[] = []

  maxHp: number
  hp: number
  speed: number
  attackDamage: number
  attackRange: number = GameBalance.enemy.attackRange
  attackInterval: number
  scoreValue = 100

  private readonly leftArm: THREE.Mesh
  private readonly rightArm: THREE.Mesh
  private readonly leftLeg: THREE.Mesh
  private readonly rightLeg: THREE.Mesh
  private readonly bodyMaterial: THREE.MeshStandardMaterial

private cooldownTimer = 0
  private telegraphTimer = 0
  private walkT = Math.random() * Math.PI * 2
  private alive = true

  private readonly _toPlayer = new THREE.Vector3()
  private readonly _move = new THREE.Vector3()
  private readonly _lookTarget = new THREE.Vector3()

  constructor(position: THREE.Vector3, stats: EnemyStats) {
    this.maxHp = stats.hp
    this.hp = this.maxHp
    this.speed = stats.speed
    this.attackDamage = stats.attackDamage
    this.attackInterval = stats.attackInterval

    const skinMat = new THREE.MeshStandardMaterial({ color: 0x90a56b, roughness: 0.85 })
    this.bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x37414f, roughness: 0.95 })

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), this.bodyMaterial)
    torso.position.y = 1.25
    torso.castShadow = true
    this.group.add(torso)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 12), skinMat)
    head.position.y = 2.1
    head.castShadow = true
    this.group.add(head)

    this.leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.95, 0.25), skinMat)
    this.leftArm.position.set(-0.62, 1.28, 0)
    this.leftArm.castShadow = true
    this.group.add(this.leftArm)

    this.rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.95, 0.25), skinMat)
    this.rightArm.position.set(0.62, 1.28, 0)
    this.rightArm.castShadow = true
    this.group.add(this.rightArm)

    this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1, 0.32), this.bodyMaterial)
    this.leftLeg.position.set(-0.22, 0.5, 0)
    this.leftLeg.castShadow = true
    this.group.add(this.leftLeg)

    this.rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1, 0.32), this.bodyMaterial)
    this.rightLeg.position.set(0.22, 0.5, 0)
    this.rightLeg.castShadow = true
    this.group.add(this.rightLeg)

    const bodyHitbox = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.45, 1.3, 4, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    bodyHitbox.position.y = 1.22
    bodyHitbox.userData.enemy = this
    bodyHitbox.userData.zone = BODY_TAG
    this.group.add(bodyHitbox)

    const headHitbox = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 8, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    )
    headHitbox.position.y = 2.1
    headHitbox.userData.enemy = this
    headHitbox.userData.zone = HEAD_TAG
    this.group.add(headHitbox)

    this.hitboxes.push(bodyHitbox, headHitbox)
    this.group.position.copy(position)
  }

  isAlive(): boolean {
    return this.alive
  }

  getPosition(target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.group.position)
  }

update(
    delta: number,
    playerPosition: THREE.Vector3,
    separationForce: THREE.Vector3,
    onPlayerHit: (damage: number, sourcePosition: THREE.Vector3) => void,
  ): void {
    if (!this.alive) {
      return
    }

    this.cooldownTimer = Math.max(0, this.cooldownTimer - delta)

    this._toPlayer.subVectors(playerPosition, this.group.position)
    const distance = this._toPlayer.length()
    const inRange = distance <= this.attackRange

    if (this.telegraphTimer > 0) {
      this.telegraphTimer -= delta
      this.leftArm.rotation.x = -1.15
      this.rightArm.rotation.x = -1.15
      this.bodyMaterial.emissive.setHex(0x441515)
      this.bodyMaterial.emissiveIntensity = 0.5

      if (this.telegraphTimer <= 0 && inRange) {
        onPlayerHit(this.attackDamage, this.group.position.clone())
        this.cooldownTimer = this.attackInterval
      }
    } else {
      this.bodyMaterial.emissiveIntensity = 0
      if (inRange && this.cooldownTimer <= 0) {
        this.telegraphTimer = GameBalance.enemy.attackTelegraph
      }
    }

    if (!inRange || this.telegraphTimer <= 0.05) {
      this._toPlayer.normalize()
      this._move.copy(this._toPlayer).multiplyScalar(this.speed)
      this._move.addScaledVector(separationForce, GameBalance.enemy.separationForce)
      this.group.position.addScaledVector(this._move, delta)
    }

    this._lookTarget.set(playerPosition.x, this.group.position.y + 1.3, playerPosition.z)
    this.group.lookAt(this._lookTarget)

    this.walkT += delta * 8
    const gaitScale = this.telegraphTimer > 0 ? 0.18 : 0.45
    this.leftLeg.rotation.x = Math.sin(this.walkT) * gaitScale
    this.rightLeg.rotation.x = Math.sin(this.walkT + Math.PI) * gaitScale
    this.leftArm.rotation.x = this.telegraphTimer > 0 ? this.leftArm.rotation.x : Math.sin(this.walkT + Math.PI) * 0.35
    this.rightArm.rotation.x = this.telegraphTimer > 0 ? this.rightArm.rotation.x : Math.sin(this.walkT) * 0.35
  }

  applyDamage(amount: number, zone: EnemyZone): { died: boolean; effectiveDamage: number } {
    if (!this.alive) {
      return { died: false, effectiveDamage: 0 }
    }

    const multiplier =
      zone === 'head'
        ? GameBalance.enemy.headMultiplier
        : zone === 'weakspot'
          ? GameBalance.enemy.weakspotMultiplier
          : 1

    const effectiveDamage = amount * multiplier
    this.hp -= effectiveDamage

    if (this.hp <= 0) {
      this.hp = 0
      this.alive = false
    }

    return { died: !this.alive, effectiveDamage }
  }

dispose(scene: THREE.Scene): void {
    scene.remove(this.group)
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        const mat = child.material
        if (mat instanceof THREE.Material) {
          mat.dispose()
        }
      }
    })
  }
}
