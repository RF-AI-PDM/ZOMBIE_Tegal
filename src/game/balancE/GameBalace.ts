export interface WaveProfile {
  enemyHp: number
  enemySpeed: number
  enemyCount: number
  spawnBaseInterval: number
  spawnMinInterval: number
  spawnPressure: number
  concurrentCap: number
  attackDamage: number
  attackInterval: number
}

const WAVE_1_TO_10: WaveProfile[] = [
  { enemyHp: 76, enemySpeed: 1.8, enemyCount: 8, spawnBaseInterval: 0.9, spawnMinInterval: 0.5, spawnPressure: 0.08, concurrentCap: 3, attackDamage: 7, attackInterval: 1.25 },
  { enemyHp: 80, enemySpeed: 1.9, enemyCount: 10, spawnBaseInterval: 0.88, spawnMinInterval: 0.48, spawnPressure: 0.09, concurrentCap: 3, attackDamage: 8, attackInterval: 1.2 },
  { enemyHp: 84, enemySpeed: 2.0, enemyCount: 12, spawnBaseInterval: 0.86, spawnMinInterval: 0.46, spawnPressure: 0.1, concurrentCap: 4, attackDamage: 8, attackInterval: 1.15 },
  { enemyHp: 89, enemySpeed: 2.1, enemyCount: 14, spawnBaseInterval: 0.82, spawnMinInterval: 0.44, spawnPressure: 0.11, concurrentCap: 4, attackDamage: 9, attackInterval: 1.1 },
  { enemyHp: 94, enemySpeed: 2.2, enemyCount: 16, spawnBaseInterval: 0.8, spawnMinInterval: 0.42, spawnPressure: 0.12, concurrentCap: 5, attackDamage: 9, attackInterval: 1.05 },
  { enemyHp: 100, enemySpeed: 2.25, enemyCount: 18, spawnBaseInterval: 0.78, spawnMinInterval: 0.4, spawnPressure: 0.13, concurrentCap: 5, attackDamage: 10, attackInterval: 1.0 },
  { enemyHp: 106, enemySpeed: 2.3, enemyCount: 20, spawnBaseInterval: 0.75, spawnMinInterval: 0.38, spawnPressure: 0.14, concurrentCap: 6, attackDamage: 10, attackInterval: 0.98 },
  { enemyHp: 112, enemySpeed: 2.35, enemyCount: 22, spawnBaseInterval: 0.72, spawnMinInterval: 0.36, spawnPressure: 0.15, concurrentCap: 6, attackDamage: 11, attackInterval: 0.95 },
  { enemyHp: 118, enemySpeed: 2.4, enemyCount: 24, spawnBaseInterval: 0.7, spawnMinInterval: 0.34, spawnPressure: 0.16, concurrentCap: 7, attackDamage: 11, attackInterval: 0.92 },
  { enemyHp: 124, enemySpeed: 2.5, enemyCount: 26, spawnBaseInterval: 0.68, spawnMinInterval: 0.32, spawnPressure: 0.17, concurrentCap: 7, attackDamage: 12, attackInterval: 0.9 },
]

export const GameBalance = {
  player: {
    maxHp: 100,
    lowHpThreshold: 30,
  },
  weapon: {
    magazineSize: 30,
    reserveAmmoStart: 150,
    damage: 20,
    range: 85,
    fireRate: 9.5,
    reloadDuration: 1.55,
    spreadBase: 0.0014,
    spreadMoveBonus: 0.0028,
    recoilVerticalMin: 0.02,
    recoilVerticalMax: 0.033,
    recoilHorizontalJitter: 0.008,
    recoilRecoveryRate: 10,
    muzzleFlashLife: 0.065,
    trailLife: 0.075,
  },
  weaponModes: [
    {
      name: 'Ranger',
      recoilMul: 0.8,
      spreadMul: 0.85,
      fireRateMul: 0.95,
      trailColor: 0x8fd6ff,
      trailLifeMul: 1.1,
      flashColor: 0x9ce6ff,
      sparkMul: 0.9,
    },
    {
      name: 'Striker',
      recoilMul: 1.2,
      spreadMul: 1.2,
      fireRateMul: 1,
      trailColor: 0xffcf7a,
      trailLifeMul: 1.2,
      flashColor: 0xffa53a,
      sparkMul: 1.3,
    },
    {
      name: 'Phantom',
      recoilMul: 0.7,
      spreadMul: 0.75,
      fireRateMul: 1.15,
      trailColor: 0xff6cf3,
      trailLifeMul: 0.9,
      flashColor: 0xff83f5,
      sparkMul: 1.5,
    },
  ],
  cameraShake: {
    decay: 2.8,
    maxTranslation: 0.06,
    maxRoll: 0.012,
    shotKick: 0.22,
    hitKick: 0.45,
    killKick: 0.32,
    weakspotKick: 0.52,
  },
  hitConfirm: {
    body: { color: 0xff523a, life: 0.2, sparkCount: 4 },
    head: { color: 0xffd36d, life: 0.26, sparkCount: 6 },
    weakspot: { color: 0xff2f2f, life: 0.34, sparkCount: 9 },
  },
  enemy: {
    headMultiplier: 2.2,
    weakspotMultiplier: 2.8,
    attackRange: 1.75,
    attackTelegraph: 0.36,
    separationRadius: 1.2,
    separationForce: 2.4,
  },
  wave: {
    intermissionSeconds: 2,
    bossEvery: 5,
    extraEscortMin: 4,
    extraEscortScale: 0.4,
    baseProfiles: WAVE_1_TO_10,
  },
  boss: {
    name: 'Metro Butcher',
    baseHp: 1550,
    hpPerBossWave: 320,
    moveSpeed: 2.4,
    rageMoveSpeed: 3.8,
    attackDamage: 19,
    rageAttackDamage: 26,
    attackRange: 2.45,
    attackInterval: 1,
    rageThreshold: 0.42,
    chargeCooldown: 8,
    rageChargeCooldown: 5.8,
    chargeWindup: 0.7,
    chargeDuration: 1.4,
    chargeRecovery: 0.95,
    chargeSpeed: 11,
    rageChargeSpeed: 13.4,
  },
  pickups: {
    ammoAmount: 40,
    medkitAmount: 30,
    scrapPickupAmount: 18,
    scrapPerKill: 1,
  },
} as const

export const getWaveProfile = (wave: number): WaveProfile => {
  const clampedWave = Math.max(1, Math.floor(wave))
  if (clampedWave <= GameBalance.wave.baseProfiles.length) {
    return GameBalance.wave.baseProfiles[clampedWave - 1]
  }

  const last = GameBalance.wave.baseProfiles[GameBalance.wave.baseProfiles.length - 1]
  const delta = clampedWave - GameBalance.wave.baseProfiles.length

  return {
    enemyHp: last.enemyHp + delta * 6,
    enemySpeed: last.enemySpeed + delta * 0.05,
    enemyCount: last.enemyCount + delta * 2,
    spawnBaseInterval: Math.max(0.5, last.spawnBaseInterval - delta * 0.015),
    spawnMinInterval: Math.max(0.24, last.spawnMinInterval - delta * 0.01),
    spawnPressure: Math.min(0.22, last.spawnPressure + delta * 0.005),
    concurrentCap: last.concurrentCap + Math.floor(delta / 2),
    attackDamage: last.attackDamage + Math.floor(delta / 2),
    attackInterval: Math.max(0.72, last.attackInterval - delta * 0.015),
  }
}
