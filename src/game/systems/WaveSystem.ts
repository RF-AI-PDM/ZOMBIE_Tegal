import * as THREE from 'three'
import { GameBalance, getWaveProfile, type WaveProfile } from '../balance/GameBalance'
import { Boss } from '../entities/Boss'
import { Enemy, type EnemyStats } from '../entities/Enemy'
import type { BossPhase, EnemyZone, ShotFeedback, WaveState } from '../types'

interface WaveEvents {
  onPlayerDamaged: (damage: number, sourcePosition: THREE.Vector3) => void
  onEnemyKilled: (score: number, isBoss: boolean) => void
  onWaveChanged: (wave: number, objective: string) => void
  onBossState: (boss: Boss | null) => void
  onBossRoar: () => void
  onBossStep: () => void
  onBossDeath: (position: THREE.Vector3) => void
}

export class WaveSystem {
  private wave = 0
  private readonly enemies: Enemy[] = []
  private aliveCount = 0
  private enemiesToSpawn = 0
  private spawnTimer = 0
  private intermission = GameBalance.wave.intermissionSeconds
  private objective = 'Secure Stasiun Tegal'
  private currentBoss: Boss | null = null
  private isBossWave = false
  private currentProfile: WaveProfile = getWaveProfile(1)

  constructor(
    private readonly scene: THREE.Scene,
    private readonly spawnPoints: THREE.Vector3[],
    private readonly events: WaveEvents,
  ) {
    this.startNextWave()
  }

  getWave(): number {
    return this.wave
  }

  getObjective(): string {
    return this.objective
  }

  getBoss(): Boss | null {
    return this.currentBoss
  }

getWaveState(): WaveState {
    const bossPhase: BossPhase = this.currentBoss ? this.currentBoss.getPhase() : 'none'
    return {
      wave: this.wave,
      aliveCount: this.aliveCount,
      pendingSpawn: this.enemiesToSpawn,
      isBossWave: this.isBossWave,
      bossPhase,
    }
  }

  update(delta: number, playerPosition: THREE.Vector3): void {
    const aliveEnemies: Enemy[] = []
    for (let i = 0; i < this.enemies.length; i++) {
      if (this.enemies[i].isAlive()) {
        aliveEnemies.push(this.enemies[i])
      }
    }
    this.aliveCount = aliveEnemies.length

if (this.enemiesToSpawn > 0) {
      this.spawnTimer -= delta
      if (this.spawnTimer <= 0) {
        this.spawnOne()
        this.enemiesToSpawn -= 1
        this.spawnTimer = this.getNextSpawnInterval(this.aliveCount)
      }
    }

    for (const enemy of aliveEnemies) {
      const separation = this.computeSeparation(enemy, aliveEnemies)
      if (enemy instanceof Boss) {
        enemy.updateBoss(
          delta,
          playerPosition,
          separation,
          this.events.onPlayerDamaged,
          this.events.onBossStep,
          this.events.onBossRoar,
        )
      } else {
        enemy.update(delta, playerPosition, separation, this.events.onPlayerDamaged)
      }
    }

    if (this.enemiesToSpawn === 0 && this.aliveCount === 0) {
      this.intermission -= delta
      if (this.intermission <= 0) {
        this.intermission = GameBalance.wave.intermissionSeconds
        this.startNextWave()
      }
    }
  }

  applyShot(raycaster: THREE.Raycaster, damage: number): ShotFeedback | null {
    const hitboxes: THREE.Object3D[] = []
    for (const enemy of this.enemies) {
      if (enemy.isAlive()) {
        hitboxes.push(...enemy.hitboxes)
      }
    }

    const hits = raycaster.intersectObjects(hitboxes, false)
    if (hits.length === 0) {
      return null
    }

    const hit = hits[0]
    const zone = (hit.object.userData.zone ?? 'body') as EnemyZone
    const enemy = hit.object.userData.enemy as Enemy | undefined
    if (!enemy) {
      return null
    }

    const result = enemy.applyDamage(damage, zone)
    if (result.died) {
      this.handleEnemyDeath(enemy)
    }

    return {
      hit: true,
      hitPoint: hit.point.clone(),
      didKill: result.died,
      zone,
    }
  }

  private startNextWave(): void {
    this.wave += 1
    this.isBossWave = this.wave % GameBalance.wave.bossEvery === 0
    this.currentProfile = getWaveProfile(this.wave)

    if (this.isBossWave) {
      this.objective = `Wave ${this.wave}: Eliminate ${GameBalance.boss.name}`
      const escortCount = Math.max(
        GameBalance.wave.extraEscortMin,
        Math.floor(this.currentProfile.enemyCount * GameBalance.wave.extraEscortScale),
      )
      this.enemiesToSpawn = escortCount
      this.spawnBoss()
    } else {
      this.objective = `Wave ${this.wave}: Survive zombie swarm`
      this.enemiesToSpawn = this.currentProfile.enemyCount
      this.currentBoss = null
      this.events.onBossState(null)
    }

    this.spawnTimer = 0.2
    this.events.onWaveChanged(this.wave, this.objective)
  }

  private spawnBoss(): void {
    const position = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)].clone()
    const boss = new Boss(position, this.wave)
    this.currentBoss = boss
    this.enemies.push(boss)
    this.scene.add(boss.group)
    this.events.onBossState(boss)
    this.events.onBossRoar()
  }

  private spawnOne(): void {
    const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)].clone()
    const enemyStats: EnemyStats = {
      hp: this.currentProfile.enemyHp,
      speed: this.currentProfile.enemySpeed,
      attackDamage: this.currentProfile.attackDamage,
      attackInterval: this.currentProfile.attackInterval,
    }

    const enemy = new Enemy(spawnPoint, enemyStats)
    this.enemies.push(enemy)
    this.scene.add(enemy.group)
  }

  private getNextSpawnInterval(aliveCount: number): number {
    const gapToCap = this.currentProfile.concurrentCap - aliveCount
    const pressure = gapToCap > 0
      ? -gapToCap * this.currentProfile.spawnPressure
      : Math.abs(gapToCap) * 0.08

    const interval = this.currentProfile.spawnBaseInterval + pressure
    return THREE.MathUtils.clamp(interval, this.currentProfile.spawnMinInterval, 1.2)
  }

private readonly _sepTemp = new THREE.Vector3()
  private readonly _sepOrigin = new THREE.Vector3()
  private readonly _sepOtherPos = new THREE.Vector3()
  private readonly _sepAway = new THREE.Vector3()

  private computeSeparation(enemy: Enemy, aliveEnemies: Enemy[]): THREE.Vector3 {
    const separation = this._sepTemp.set(0, 0, 0)
    enemy.getPosition(this._sepOrigin)

    for (const other of aliveEnemies) {
      if (other === enemy) {
        continue
      }

      other.getPosition(this._sepOtherPos)
      const distance = this._sepOrigin.distanceTo(this._sepOtherPos)
      if (distance <= 0 || distance > GameBalance.enemy.separationRadius) {
        continue
      }

      this._sepAway.subVectors(this._sepOrigin, this._sepOtherPos).normalize()
      const weight = 1 - distance / GameBalance.enemy.separationRadius
      separation.addScaledVector(this._sepAway, weight)
    }

    if (separation.lengthSq() > 0.0001) {
      separation.normalize()
    }

    return separation
  }

  private handleEnemyDeath(enemy: Enemy): void {
    const isBossKill = enemy === this.currentBoss
    this.events.onEnemyKilled(enemy.scoreValue, isBossKill)

    if (isBossKill) {
      const deathPosition = enemy.group.position.clone()
      this.currentBoss = null
      this.events.onBossState(null)
      this.events.onBossDeath(deathPosition)
    }

enemy.dispose(this.scene)
    const enemyIndex = this.enemies.indexOf(enemy)
    if (enemyIndex >= 0) {
      this.enemies.splice(enemyIndex, 1)
    }
  }
}
