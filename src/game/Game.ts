import * as THREE from 'three'
import { GameBalance } from './balance/GameBalance'
import { InputController } from './core/InputController'
import { PlayerController } from './core/PlayerController'
import type { Boss } from './entities/Boss'
import { AudioManager } from './systems/AudioManager'
import { PickupSystem } from './systems/PickupSystem'
import { WaveSystem } from './systems/WaveSystem'
import { WeaponSystem } from './systems/WeaponSystem'
import type { DamageDirection, HUDState, PickupType, ShotFeedback } from './types'
import { HUD } from './ui/HUD'
import { buildStasiunTegal } from './world/StationBuilder'

interface ExplosionParticle {
  mesh: THREE.Mesh
  velocity: THREE.Vector3
  life: number
}

export class Game {
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.1, 220)
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true })
  private readonly clock = new THREE.Clock()

  private readonly input: InputController
  private readonly player: PlayerController
  private readonly audio = new AudioManager()
  private readonly hud: HUD
  private readonly waveSystem: WaveSystem
  private readonly weapon: WeaponSystem
  private readonly pickupSystem: PickupSystem

  private readonly introText: HTMLDivElement

  private hp: number = GameBalance.player.maxHp
  private readonly maxHp: number = GameBalance.player.maxHp
  private score = 0
  private scrap = 0
  private objectiveBase = 'Secure Stasiun Tegal'
  private objective = this.objectiveBase
  private boss: Boss | null = null
  private damageDirection: DamageDirection = null
  private damageDirectionTimer = 0
  private shakeTrauma = 0
  private shakeTime = 0
  private readonly explosions: ExplosionParticle[] = []

  constructor(private readonly root: HTMLElement) {
    this.root.innerHTML = ''

    this.scene.background = new THREE.Color(0x090b11)
    this.scene.fog = new THREE.Fog(0x090b11, 28, 130)

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.root.append(this.renderer.domElement)

    const station = buildStasiunTegal(this.scene)
    this.player = new PlayerController(this.camera, station.playerSpawn, station.bounds)
    this.scene.add(this.player.getObject())

    const ambient = new THREE.HemisphereLight(0xaec6ff, 0x1b2633, 0.58)
    this.scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.5)
    keyLight.position.set(12, 30, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2048, 2048)
    keyLight.shadow.camera.near = 5
    keyLight.shadow.camera.far = 120
    keyLight.shadow.camera.left = -44
    keyLight.shadow.camera.right = 44
    keyLight.shadow.camera.top = 44
    keyLight.shadow.camera.bottom = -44
    this.scene.add(keyLight)

    this.hud = new HUD(this.root)
    const overlay = document.createElement('div')
    overlay.className = 'overlay'
    overlay.innerHTML = '<div class="crosshair"></div>'
    this.root.append(overlay)

    this.introText = document.createElement('div')
    this.introText.className = 'intro-text'
    this.introText.textContent = 'Click to lock cursor | WASD move | Mouse aim | R reload | Survive the station'
    this.root.append(this.introText)

    this.input = new InputController(this.renderer.domElement)
    this.renderer.domElement.addEventListener('click', () => {
      this.audio.unlock()
    })

    this.waveSystem = new WaveSystem(this.scene, station.enemySpawns, {
      onPlayerDamaged: (damage, sourcePosition) => this.applyPlayerDamage(damage, sourcePosition),
      onEnemyKilled: (gain, isBoss) => {
        this.score += gain
        this.scrap += isBoss ? GameBalance.pickups.scrapPerKill * 4 : GameBalance.pickups.scrapPerKill
      },
      onWaveChanged: (wave, objective) => {
        this.objectiveBase = objective
        this.score += wave * 20
      },
      onBossState: (boss) => {
        this.boss = boss
      },
      onBossRoar: () => this.audio.play('bossRoar'),
      onBossStep: () => this.audio.play('bossFootstep'),
      onBossDeath: (position) => {
        this.audio.play('deathExplosion')
        this.spawnExplosion(position)
      },
    })

    this.weapon = new WeaponSystem(
      this.camera,
      this.scene,
      this.audio,
      (raycaster, damage) => {
        const result = this.waveSystem.applyShot(raycaster, damage)
        if (result) {
          this.onShotHit(result)
        }
        return result
      },
      (intensity) => this.addCameraShake(intensity),
    )

    this.pickupSystem = new PickupSystem(this.scene, station.pickupSpawns, (type) => this.collectPickup(type))

    window.addEventListener('resize', this.onResize)
    this.updateHUD()
    this.animate()
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate)

    const delta = Math.min(0.033, this.clock.getDelta())
    const dead = this.hp <= 0

    if (!dead) {
      this.player.update(this.input, delta)
      this.waveSystem.update(delta, this.player.getPosition())
      this.weapon.update(delta, this.input, this.player)
      this.pickupSystem.update(delta, this.player.getPosition())
      this.introText.style.opacity = this.input.isPointerLocked() ? '0' : '1'

      const waveState = this.waveSystem.getWaveState()
      if (waveState.bossPhase === 'windup' || waveState.bossPhase === 'charge') {
        this.objective = `${this.objectiveBase} | Boss charging: dodge now`
      } else if (waveState.bossPhase === 'rage') {
        this.objective = `${this.objectiveBase} | Boss rage mode`
      } else {
        this.objective = this.objectiveBase
      }
    } else {
      this.objective = 'You are down. Press F to restart defense.'
      if (this.input.isKeyDown('KeyF')) {
        window.location.reload()
      }
    }

    this.damageDirectionTimer = Math.max(0, this.damageDirectionTimer - delta)
    if (this.damageDirectionTimer <= 0) {
      this.damageDirection = null
    }

    this.updateExplosions(delta)
    this.updateCameraShake(delta)
    this.updateHUD()
    this.renderer.render(this.scene, this.camera)
  }

  private onShotHit(result: ShotFeedback): void {
    this.hud.pulseHitmarker(result.zone, result.didKill)

    if (result.zone === 'head') {
      this.score += 35
      this.addCameraShake(0.08)
    }

    if (result.zone === 'weakspot') {
      this.score += 90
      this.addCameraShake(GameBalance.cameraShake.weakspotKick)
    }

    if (result.didKill) {
      this.score += 50
      this.addCameraShake(GameBalance.cameraShake.killKick)
    }
  }

  private collectPickup(type: PickupType): void {
    if (type === 'ammo') {
      this.weapon.addAmmo(GameBalance.pickups.ammoAmount)
    } else if (type === 'medkit') {
      this.hp = Math.min(this.maxHp, this.hp + GameBalance.pickups.medkitAmount)
    } else {
      this.scrap += GameBalance.pickups.scrapPickupAmount
      this.score += 120
    }

    this.audio.play('pickup')
  }

  private applyPlayerDamage(damage: number, sourcePosition: THREE.Vector3): void {
    if (damage <= 0) {
      return
    }

    this.hp = Math.max(0, this.hp - damage)
    this.damageDirection = this.computeDamageDirection(sourcePosition)
    this.damageDirectionTimer = 0.35
    this.addCameraShake(GameBalance.cameraShake.hitKick)
  }

  private computeDamageDirection(sourcePosition: THREE.Vector3): DamageDirection {
    const toSource = new THREE.Vector3().subVectors(sourcePosition, this.player.getPosition())
    toSource.y = 0
    if (toSource.lengthSq() < 0.0001) {
      return 'front'
    }

    toSource.normalize()
    const forward = this.player.getForwardDirection(new THREE.Vector3())
    const right = this.player.getRightDirection(new THREE.Vector3())

    const frontDot = forward.dot(toSource)
    const sideDot = right.dot(toSource)

    if (Math.abs(frontDot) >= Math.abs(sideDot)) {
      return frontDot >= 0 ? 'front' : 'back'
    }

    return sideDot >= 0 ? 'right' : 'left'
  }

  private spawnExplosion(position: THREE.Vector3): void {
    for (let i = 0; i < 28; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.9 }),
      )
      mesh.position.copy(position).add(new THREE.Vector3(0, 1.2, 0))
      this.scene.add(mesh)

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 9,
        Math.random() * 6,
        (Math.random() - 0.5) * 9,
      )

      this.explosions.push({ mesh, velocity, life: 0.85 })
    }

    this.addCameraShake(0.3)
  }

  private updateExplosions(delta: number): void {
    for (let i = this.explosions.length - 1; i >= 0; i -= 1) {
      const particle = this.explosions[i]
      particle.life -= delta
      particle.mesh.position.addScaledVector(particle.velocity, delta)
      particle.velocity.y -= 13 * delta
      const material = particle.mesh.material as THREE.MeshBasicMaterial
      material.opacity = Math.max(0, particle.life)

      if (particle.life <= 0) {
        this.scene.remove(particle.mesh)
        particle.mesh.geometry.dispose()
        material.dispose()
        this.explosions.splice(i, 1)
      }
    }
  }

  private updateHUD(): void {
    const weapon = this.weapon.getWeaponState()
    const waveState = this.waveSystem.getWaveState()
    const bossHp = this.boss?.hp ?? 0
    const bossMaxHp = this.boss?.maxHp ?? 0

    const state: HUDState = {
      hp: this.hp,
      maxHp: this.maxHp,
      ammoInMag: weapon.ammoInMag,
      reserveAmmo: weapon.reserveAmmo,
      weaponMode: weapon.modeName,
      wave: waveState.wave,
      score: this.score,
      scrap: this.scrap,
      objective: this.objective,
      bossName: this.boss?.name ?? null,
      bossHp,
      bossMaxHp,
      isLowHp: this.hp <= GameBalance.player.lowHpThreshold,
      isReloading: weapon.isReloading,
      bossPhase: waveState.bossPhase,
      damageDirection: this.damageDirection,
    }

    this.hud.update(state)
  }

  private addCameraShake(amount: number): void {
    this.shakeTrauma = Math.min(1, this.shakeTrauma + Math.max(0, amount))
  }

  private updateCameraShake(delta: number): void {
    this.shakeTrauma = Math.max(0, this.shakeTrauma - GameBalance.cameraShake.decay * delta)
    this.shakeTime += delta * 50

    if (this.shakeTrauma <= 0.0001) {
      this.camera.position.set(0, 0, 0)
      this.camera.rotation.z = 0
      return
    }

    const t = this.shakeTrauma * this.shakeTrauma
    const tx = Math.sin(this.shakeTime * 1.13) * GameBalance.cameraShake.maxTranslation * t
    const ty = Math.cos(this.shakeTime * 1.73) * GameBalance.cameraShake.maxTranslation * 0.8 * t
    const tz = Math.sin(this.shakeTime * 1.37) * GameBalance.cameraShake.maxTranslation * 0.5 * t
    const roll = Math.sin(this.shakeTime * 1.89) * GameBalance.cameraShake.maxRoll * t

    this.camera.position.set(tx, ty, tz)
    this.camera.rotation.z = roll
  }

  private readonly onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }
}
