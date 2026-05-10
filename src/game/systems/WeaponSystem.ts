import * as THREE from 'three'
import { GameBalance } from '../balance/GameBalance'
import { InputController } from '../core/InputController'
import { PlayerController } from '../core/PlayerController'
import type { EnemyZone, ShotFeedback, WeaponState } from '../types'
import { AudioManager } from './AudioManager'

interface Trail {
  line: THREE.Line
  life: number
  maxLife: number
}

interface Spark {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  life: number
  maxLife: number
}

interface ImpactPulse {
  sprite: THREE.Sprite
  life: number
  maxLife: number
}

export class WeaponSystem {
  private readonly weaponRoot = new THREE.Group()
  private readonly muzzle = new THREE.Object3D()
  private readonly muzzleFlash: THREE.Mesh
  private readonly muzzleBloom: THREE.Mesh

  private ammoInMag = GameBalance.weapon.magazineSize
  private reserveAmmo = GameBalance.weapon.reserveAmmoStart

  private fireCooldown = 0
  private reloadTimer = 0

  private recoilVisual = 0
  private shotStreak = 0
  private activeModeIndex = 0
  private modeSwitchLatch = false

  private readonly trails: Trail[] = []
  private readonly sparks: Spark[] = []
  private readonly pulses: ImpactPulse[] = []

  constructor(
    camera: THREE.PerspectiveCamera,
    private readonly scene: THREE.Scene,
    private readonly audio: AudioManager,
    private readonly fireRay: (raycaster: THREE.Raycaster, damage: number) => ShotFeedback | null,
    private readonly onShotFired?: (intensity: number) => void,
  ) {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.18, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x2a2d32, metalness: 0.6, roughness: 0.4 }),
    )
    body.position.set(0.2, -0.22, -0.52)
    this.weaponRoot.add(body)

    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.05, 0.65, 10),
      new THREE.MeshStandardMaterial({ color: 0x121518, metalness: 0.8, roughness: 0.25 }),
    )
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0.2, -0.2, -1)
    this.weaponRoot.add(barrel)

    this.muzzle.position.set(0.2, -0.2, -1.35)
    this.weaponRoot.add(this.muzzle)

    this.muzzleFlash = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0 }),
    )
    this.muzzleFlash.position.copy(this.muzzle.position)
    this.weaponRoot.add(this.muzzleFlash)

    this.muzzleBloom = new THREE.Mesh(
      new THREE.PlaneGeometry(0.36, 0.36),
      new THREE.MeshBasicMaterial({ color: 0xffd783, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    )
    this.muzzleBloom.position.copy(this.muzzle.position)
    this.weaponRoot.add(this.muzzleBloom)

    camera.add(this.weaponRoot)
  }

  update(delta: number, input: InputController, player: PlayerController): void {
    this.handleWeaponModeSwitch(input)

    this.fireCooldown = Math.max(0, this.fireCooldown - delta)

    if (this.reloadTimer > 0) {
      this.reloadTimer -= delta
      if (this.reloadTimer <= 0) {
        this.finishReload()
      }
    }

    if (input.isKeyDown('KeyR')) {
      this.tryReload()
    }

    if (input.isMouseDown(0) && input.isPointerLocked()) {
      this.tryShoot(input, player)
    } else {
      this.shotStreak = Math.max(0, this.shotStreak - 1)
    }

    this.recoilVisual = Math.max(0, this.recoilVisual - delta * 7)
    this.weaponRoot.position.z = -this.recoilVisual * 0.06

    const muzzleMaterial = this.muzzleFlash.material as THREE.MeshBasicMaterial
    muzzleMaterial.opacity = Math.max(0, muzzleMaterial.opacity - delta / GameBalance.weapon.muzzleFlashLife)

    const bloomMaterial = this.muzzleBloom.material as THREE.MeshBasicMaterial
    bloomMaterial.opacity = Math.max(0, bloomMaterial.opacity - delta / (GameBalance.weapon.muzzleFlashLife * 0.8))

    this.updateTransientEffects(delta)
  }

  getWeaponState(): WeaponState {
    return {
      ammoInMag: this.ammoInMag,
      reserveAmmo: this.reserveAmmo,
      isReloading: this.reloadTimer > 0,
      recoilPhase: this.recoilVisual,
      modeName: this.getActiveMode().name,
    }
  }

  addAmmo(amount: number): void {
    this.reserveAmmo += amount
  }

  private handleWeaponModeSwitch(input: InputController): void {
    const nextMode = input.isKeyDown('Digit1')
      ? 0
      : input.isKeyDown('Digit2')
        ? 1
        : input.isKeyDown('Digit3')
          ? 2
          : -1

    if (nextMode >= 0 && !this.modeSwitchLatch) {
      this.activeModeIndex = nextMode
      this.modeSwitchLatch = true
      this.audio.play('reload')
    }

    if (nextMode < 0) {
      this.modeSwitchLatch = false
    }
  }

  private tryShoot(input: InputController, player: PlayerController): void {
    if (this.reloadTimer > 0 || this.fireCooldown > 0) {
      return
    }

    if (this.ammoInMag <= 0) {
      this.tryReload()
      return
    }

    const mode = this.getActiveMode()

    this.fireCooldown = 1 / (GameBalance.weapon.fireRate * mode.fireRateMul)
    this.ammoInMag -= 1
    this.recoilVisual = Math.min(1, this.recoilVisual + 0.8)
    this.shotStreak = Math.min(10, this.shotStreak + 1)
    this.audio.play('gunshot')
    this.onShotFired?.(GameBalance.cameraShake.shotKick * mode.recoilMul)

    const muzzleMaterial = this.muzzleFlash.material as THREE.MeshBasicMaterial
    muzzleMaterial.opacity = 0.95
    muzzleMaterial.color.setHex(mode.flashColor)

    const bloomMaterial = this.muzzleBloom.material as THREE.MeshBasicMaterial
    bloomMaterial.opacity = 0.8
    bloomMaterial.color.setHex(mode.flashColor)

    const shotOrigin = new THREE.Vector3()
    const shotDirection = new THREE.Vector3()
    player.getObject().getWorldPosition(shotOrigin)
    player.getForwardDirection(shotDirection)

    const moveAxis = input.getMoveAxis()
    const isMoving = moveAxis.forward !== 0 || moveAxis.right !== 0
    const spread = (GameBalance.weapon.spreadBase + this.shotStreak * 0.00024 + (isMoving ? GameBalance.weapon.spreadMoveBonus : 0)) * mode.spreadMul
    shotDirection
      .add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread))
      .normalize()

    const raycaster = new THREE.Raycaster(shotOrigin, shotDirection, 0, GameBalance.weapon.range)
    const feedback = this.fireRay(raycaster, GameBalance.weapon.damage)

    const hitPoint = feedback?.hitPoint ?? shotOrigin.clone().addScaledVector(shotDirection, GameBalance.weapon.range)
    this.spawnBulletTrail(shotOrigin.clone().add(new THREE.Vector3(0, 1.4, 0)), hitPoint, mode.trailColor, mode.trailLifeMul)

    if (feedback) {
      this.audio.play('enemyHit')
      this.spawnHitSparks(hitPoint, feedback.zone, mode.sparkMul)
      this.spawnImpactPulse(hitPoint, feedback.zone)
    }

    const recoilYaw = (Math.random() - 0.5) * GameBalance.weapon.recoilHorizontalJitter * mode.recoilMul
    const recoilPitch = THREE.MathUtils.lerp(
      GameBalance.weapon.recoilVerticalMin,
      GameBalance.weapon.recoilVerticalMax,
      Math.min(1, this.shotStreak / 8),
    ) * mode.recoilMul
    player.applyRecoil(recoilPitch, recoilYaw)

    if (this.ammoInMag <= 0) {
      this.tryReload()
    }
  }

  private tryReload(): void {
    if (this.reloadTimer > 0 || this.ammoInMag >= GameBalance.weapon.magazineSize || this.reserveAmmo <= 0) {
      return
    }

    this.reloadTimer = GameBalance.weapon.reloadDuration
    this.audio.play('reload')
  }

  private finishReload(): void {
    const missing = GameBalance.weapon.magazineSize - this.ammoInMag
    const load = Math.min(missing, this.reserveAmmo)
    this.ammoInMag += load
    this.reserveAmmo -= load
  }

  private spawnBulletTrail(start: THREE.Vector3, end: THREE.Vector3, color: number, lifeMul: number): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
    const line = new THREE.Line(geometry, material)
    this.scene.add(line)

    const life = GameBalance.weapon.trailLife * lifeMul
    this.trails.push({
      line,
      life,
      maxLife: life,
    })
  }

  private spawnHitSparks(point: THREE.Vector3, zone: EnemyZone, sparkMul: number): void {
    const profile = GameBalance.hitConfirm[zone]
    const sparkCount = Math.max(1, Math.round(profile.sparkCount * sparkMul))

    for (let i = 0; i < sparkCount; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 6),
        new THREE.MeshBasicMaterial({ color: profile.color, transparent: true, opacity: 1 }),
      )
      mesh.position.copy(point)
      this.scene.add(mesh)

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 2.8,
        (Math.random() - 0.5) * 4,
      )

      this.sparks.push({ mesh, velocity, life: profile.life, maxLife: profile.life })
    }
  }

  private spawnImpactPulse(point: THREE.Vector3, zone: EnemyZone): void {
    const color = GameBalance.hitConfirm[zone].color
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color, transparent: true, opacity: 0.9 }))
    sprite.position.copy(point)
    sprite.scale.setScalar(zone === 'weakspot' ? 0.9 : 0.65)
    this.scene.add(sprite)

    const life = zone === 'weakspot' ? 0.17 : 0.12
    this.pulses.push({ sprite, life, maxLife: life })
  }

  private updateTransientEffects(delta: number): void {
    for (let i = this.trails.length - 1; i >= 0; i -= 1) {
      const trail = this.trails[i]
      trail.life -= delta
      const material = trail.line.material as THREE.LineBasicMaterial
      material.opacity = THREE.MathUtils.clamp(trail.life / trail.maxLife, 0, 1)
      if (trail.life <= 0) {
        this.scene.remove(trail.line)
        trail.line.geometry.dispose()
        material.dispose()
        this.trails.splice(i, 1)
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i -= 1) {
      const spark = this.sparks[i]
      spark.life -= delta
      spark.mesh.position.addScaledVector(spark.velocity, delta)
      spark.velocity.y -= 8 * delta
      const material = spark.mesh.material as THREE.MeshBasicMaterial
      material.opacity = THREE.MathUtils.clamp(spark.life / spark.maxLife, 0, 1)

      if (spark.life <= 0) {
        this.scene.remove(spark.mesh)
        spark.mesh.geometry.dispose()
        material.dispose()
        this.sparks.splice(i, 1)
      }
    }

    for (let i = this.pulses.length - 1; i >= 0; i -= 1) {
      const pulse = this.pulses[i]
      pulse.life -= delta
      const material = pulse.sprite.material as THREE.SpriteMaterial
      const t = THREE.MathUtils.clamp(pulse.life / pulse.maxLife, 0, 1)
      material.opacity = t
      pulse.sprite.scale.multiplyScalar(1 + delta * 6)

      if (pulse.life <= 0) {
        this.scene.remove(pulse.sprite)
        pulse.sprite.material.dispose()
        this.pulses.splice(i, 1)
      }
    }
  }

  private getActiveMode() {
    return GameBalance.weaponModes[this.activeModeIndex] ?? GameBalance.weaponModes[0]
  }
}
