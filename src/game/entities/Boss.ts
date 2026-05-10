import * as THREE from 'three'
import { GameBalance } from '../balance/GameBalance'
import type { BossPhase, EnemyZone } from '../types'
import { Enemy, type EnemyStats } from './Enemy'

export class Boss extends Enemy {
  readonly name = GameBalance.boss.name
  private readonly aura: THREE.Mesh
  private readonly weakSpot: THREE.Mesh
  private readonly weakSpotMaterial: THREE.MeshStandardMaterial

  private chargeCooldown: number = GameBalance.boss.chargeCooldown
  private phase: BossPhase = 'idle'
  private phaseTimer = 0
  private chargeDirection = new THREE.Vector3()
  private inRage = false
  private stepTimer = 0
  private weakspotActive = false
  private chargeHitDone = false

  constructor(position: THREE.Vector3, wave: number) {
    const bossCycle = Math.max(1, Math.floor(wave / GameBalance.wave.bossEvery))
    const bossStats: EnemyStats = {
      hp: GameBalance.boss.baseHp + (bossCycle - 1) * GameBalance.boss.hpPerBossWave,
      speed: GameBalance.boss.moveSpeed,
      attackDamage: GameBalance.boss.attackDamage,
      attackInterval: GameBalance.boss.attackInterval,
    }

    super(position, bossStats)

    this.group.scale.setScalar(1.9)
    this.attackRange = GameBalance.boss.attackRange
    this.scoreValue = 2500

    this.weakSpotMaterial = new THREE.MeshStandardMaterial({ color: 0xff2233, emissive: 0x881122, emissiveIntensity: 1.1 })

    this.weakSpot = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      this.weakSpotMaterial,
    )
    this.weakSpot.position.set(0, 1.45, -0.32)
    this.weakSpot.userData.enemy = this
    this.weakSpot.userData.zone = 'weakspot'
    this.group.add(this.weakSpot)
    this.hitboxes.push(this.weakSpot)

    this.aura = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 18, 18),
      new THREE.MeshBasicMaterial({ color: 0xaa0000, transparent: true, opacity: 0.07 }),
    )
    this.aura.position.y = 1.4
    this.group.add(this.aura)
  }

  isRaging(): boolean {
    return this.inRage
  }

  isCharging(): boolean {
    return this.phase === 'windup' || this.phase === 'charge'
  }

  getPhase(): BossPhase {
    if (this.phase === 'idle' && this.inRage) {
      return 'rage'
    }
    return this.phase
  }

  updateBoss(
    delta: number,
    playerPosition: THREE.Vector3,
    separationForce: THREE.Vector3,
    onPlayerHit: (damage: number, sourcePosition: THREE.Vector3) => void,
    onHeavyStep: () => void,
    onRoar: () => void,
  ): void {
    this.stepTimer -= delta
    if (this.stepTimer <= 0) {
      this.stepTimer = this.phase === 'charge' ? 0.2 : 0.42
      onHeavyStep()
    }

    if (!this.inRage && this.hp <= this.maxHp * GameBalance.boss.rageThreshold) {
      this.inRage = true
      this.speed = GameBalance.boss.rageMoveSpeed
      this.attackDamage = GameBalance.boss.rageAttackDamage
      this.chargeCooldown = 0.65
      const auraMaterial = this.aura.material as THREE.MeshBasicMaterial
      auraMaterial.opacity = 0.18
      onRoar()
    }

    this.updateChargeState(delta, playerPosition, onRoar)

    if (this.phase === 'charge') {
      this.group.position.addScaledVector(this.chargeDirection, (this.inRage ? GameBalance.boss.rageChargeSpeed : GameBalance.boss.chargeSpeed) * delta)
      if (!this.chargeHitDone && this.group.position.distanceTo(playerPosition) <= this.attackRange + 0.6) {
        this.chargeHitDone = true
        onPlayerHit(this.attackDamage + 6, this.group.position.clone())
      }
    } else {
      super.update(delta, playerPosition, separationForce, onPlayerHit)
    }

    this.updateWeakspotVisual(delta)
  }

  applyDamage(amount: number, zone: EnemyZone): { died: boolean; effectiveDamage: number } {
    const mappedZone = zone === 'weakspot' && !this.weakspotActive ? 'body' : zone
    return super.applyDamage(amount, mappedZone)
  }

  private updateChargeState(
    delta: number,
    playerPosition: THREE.Vector3,
    onRoar: () => void,
  ): void {
    if (this.phase === 'idle' || this.phase === 'rage') {
      this.chargeCooldown -= delta
      if (this.chargeCooldown <= 0) {
        this.phase = 'windup'
        this.phaseTimer = GameBalance.boss.chargeWindup
        this.chargeDirection.subVectors(playerPosition, this.group.position).setY(0).normalize()
        this.chargeHitDone = false
        onRoar()
      }
      return
    }

    this.phaseTimer -= delta

    if (this.phase === 'windup') {
      if (this.phaseTimer <= 0) {
        this.phase = 'charge'
        this.phaseTimer = GameBalance.boss.chargeDuration
      }
      return
    }

    if (this.phase === 'charge') {
      if (this.phaseTimer <= 0) {
        this.phase = 'recover'
        this.phaseTimer = GameBalance.boss.chargeRecovery
      }
      return
    }

    if (this.phase === 'recover' && this.phaseTimer <= 0) {
      this.phase = this.inRage ? 'rage' : 'idle'
      this.chargeCooldown = this.inRage ? GameBalance.boss.rageChargeCooldown : GameBalance.boss.chargeCooldown
    }
  }

  private updateWeakspotVisual(delta: number): void {
    const shouldActivate = this.inRage && (this.phase === 'windup' || this.phase === 'charge')
    this.weakspotActive = shouldActivate

    const targetIntensity = shouldActivate ? 2.4 : 0.55
    this.weakSpotMaterial.emissiveIntensity = THREE.MathUtils.lerp(this.weakSpotMaterial.emissiveIntensity, targetIntensity, Math.min(1, delta * 8))
    this.weakSpot.scale.setScalar(shouldActivate ? 1.2 : 1)
  }
}
