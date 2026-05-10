import type * as THREE from 'three'

export type PickupType = 'ammo' | 'medkit' | 'scrap'
export type EnemyZone = 'body' | 'head' | 'weakspot'
export type BossPhase = 'none' | 'idle' | 'windup' | 'charge' | 'recover' | 'rage'
export type DamageDirection = 'front' | 'back' | 'left' | 'right' | null

export interface Bounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface SpawnLayout {
  enemySpawns: THREE.Vector3[]
  pickupSpawns: THREE.Vector3[]
  playerSpawn: THREE.Vector3
  bounds: Bounds
}

export interface WeaponState {
  ammoInMag: number
  reserveAmmo: number
  isReloading: boolean
  recoilPhase: number
  modeName: string
}

export interface WaveState {
  wave: number
  aliveCount: number
  pendingSpawn: number
  isBossWave: boolean
  bossPhase: BossPhase
}

export interface HUDState {
  hp: number
  maxHp: number
  ammoInMag: number
  reserveAmmo: number
  weaponMode: string
  wave: number
  score: number
  scrap: number
  objective: string
  bossName: string | null
  bossHp: number
  bossMaxHp: number
  isLowHp: boolean
  isReloading: boolean
  bossPhase: BossPhase
  damageDirection: DamageDirection
}

export interface ShotFeedback {
  hit: boolean
  hitPoint: THREE.Vector3
  didKill: boolean
  zone: EnemyZone
}
