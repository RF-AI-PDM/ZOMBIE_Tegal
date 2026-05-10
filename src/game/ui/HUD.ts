import type { DamageDirection, EnemyZone, HUDState } from '../types'

export class HUD {
  private readonly root: HTMLDivElement
  private readonly hpText: HTMLSpanElement
  private readonly ammoText: HTMLSpanElement
  private readonly waveText: HTMLSpanElement
  private readonly objectiveText: HTMLSpanElement
  private readonly scoreText: HTMLSpanElement
  private readonly scrapText: HTMLSpanElement
  private readonly bossPanel: HTMLDivElement
  private readonly bossName: HTMLSpanElement
  private readonly bossBarFill: HTMLDivElement
  private readonly bossValue: HTMLSpanElement
  private readonly bossPhaseText: HTMLSpanElement
  private readonly warningText: HTMLDivElement
  private readonly hpCard: HTMLDivElement
  private readonly ammoCard: HTMLDivElement
  private readonly damageIndicator: HTMLDivElement
  private readonly hitmarker: HTMLDivElement

  private lastHp = -1
  private lastAmmo = ''
  private lastWave = -1
  private lastScore = -1
  private lastScrap = -1
  private lastObjective = ''
  private lastIsLowHp = false
  private lastIsReloading = false
  private lastDamageDirection: DamageDirection = null
  private lastBossName: string | null = null
  

  private lastBossValue = ''
  constructor(parent: HTMLElement) {
    this.root = document.createElement('div')
    this.root.className = 'hud'
    this.root.innerHTML = `
      <div class="damage-indicator" id="damage-indicator">
        <div class="dmg-edge dmg-front"></div>
        <div class="dmg-edge dmg-back"></div>
        <div class="dmg-edge dmg-left"></div>
        <div class="dmg-edge dmg-right"></div>
      </div>
      <div class="hitmarker" id="hitmarker" aria-hidden="true">
        <span class="hm a"></span>
        <span class="hm b"></span>
        <span class="hm c"></span>
        <span class="hm d"></span>
      </div>
      <div class="hud-top">
        <div class="hud-card" id="hud-hp-card"><span>HP</span><strong id="hud-hp"></strong></div>
        <div class="hud-card" id="hud-ammo-card"><span>Ammo</span><strong id="hud-ammo"></strong></div>
        <div class="hud-card"><span>Wave</span><strong id="hud-wave"></strong></div>
        <div class="hud-card"><span>Score</span><strong id="hud-score"></strong></div>
        <div class="hud-card"><span>Scrap</span><strong id="hud-scrap"></strong></div>
      </div>
      <div class="hud-warning" id="hud-warning"></div>
      <div class="hud-objective" id="hud-objective"></div>
      <div class="hud-boss" id="hud-boss">
        <div class="hud-boss-head"><span id="hud-boss-name"></span><span id="hud-boss-phase"></span><span id="hud-boss-value"></span></div>
        <div class="hud-boss-bar"><div id="hud-boss-fill"></div></div>
      </div>
    `

    parent.append(this.root)

    this.hpText = this.querySpan('#hud-hp')
    this.ammoText = this.querySpan('#hud-ammo')
    this.waveText = this.querySpan('#hud-wave')
    this.objectiveText = this.querySpan('#hud-objective')
    this.scoreText = this.querySpan('#hud-score')
    this.scrapText = this.querySpan('#hud-scrap')
    this.bossPanel = this.queryDiv('#hud-boss')
    this.bossName = this.querySpan('#hud-boss-name')
    this.bossPhaseText = this.querySpan('#hud-boss-phase')
    this.bossValue = this.querySpan('#hud-boss-value')
    this.bossBarFill = this.queryDiv('#hud-boss-fill')
    this.warningText = this.queryDiv('#hud-warning')
    this.hpCard = this.queryDiv('#hud-hp-card')
    this.ammoCard = this.queryDiv('#hud-ammo-card')
    this.damageIndicator = this.queryDiv('#damage-indicator')
    this.hitmarker = this.queryDiv('#hitmarker')
  }

update(state: HUDState): void {
    const hpVal = Math.max(0, Math.floor(state.hp))
    if (hpVal !== this.lastHp) {
      this.lastHp = hpVal
      this.hpText.textContent = `${hpVal}/${state.maxHp}`
    }

    const ammoKey = `${state.ammoInMag}/${state.reserveAmmo}[${state.weaponMode}]`
    if (ammoKey !== this.lastAmmo) {
      this.lastAmmo = ammoKey
      this.ammoText.textContent = ammoKey
    }

    if (state.wave !== this.lastWave) {
      this.lastWave = state.wave
      this.waveText.textContent = state.wave.toString()
    }

    if (state.score !== this.lastScore) {
      this.lastScore = state.score
      this.scoreText.textContent = state.score.toString()
    }

    if (state.scrap !== this.lastScrap) {
      this.lastScrap = state.scrap
      this.scrapText.textContent = state.scrap.toString()
    }

    if (state.objective !== this.lastObjective) {
      this.lastObjective = state.objective
      this.objectiveText.textContent = state.objective
    }

    if (state.isLowHp !== this.lastIsLowHp) {
      this.lastIsLowHp = state.isLowHp
      this.hpCard.classList.toggle('is-critical', state.isLowHp)
    }

    if (state.isReloading !== this.lastIsReloading) {
      this.lastIsReloading = state.isReloading
      this.ammoCard.classList.toggle('is-reloading', state.isReloading)
    }

    const newWarning = state.isLowHp && state.isReloading
      ? 'Critical HP and reloading: keep moving!'
      : state.isLowHp
        ? 'Low HP: find medkit now!'
        : state.isReloading
          ? 'Reloading... cover yourself'
          : `Weapon mode: ${state.weaponMode} (press 1/2/3)`
    if (this.warningText.textContent !== newWarning) {
      this.warningText.textContent = newWarning
    }

    if (state.damageDirection !== this.lastDamageDirection) {
      this.lastDamageDirection = state.damageDirection
      this.damageIndicator.classList.remove('hit-front', 'hit-back', 'hit-left', 'hit-right')
      if (state.damageDirection) {
        this.damageIndicator.classList.add(`hit-${state.damageDirection}`)
      }
    }

    if (state.bossName && state.bossMaxHp > 0) {
      if (this.bossPanel.style.display !== 'block') {
        this.bossPanel.style.display = 'block'
      }
      if (state.bossName !== this.lastBossName) {
        this.lastBossName = state.bossName
        this.bossName.textContent = state.bossName
      }
      const bossHpVal = Math.ceil(state.bossHp)
      const bossHpStr = `${bossHpVal} / ${Math.ceil(state.bossMaxHp)}`
      if (bossHpStr !== this.lastBossValue) {
        this.lastBossValue = bossHpStr
        this.bossValue.textContent = bossHpStr
      }
      const phaseStr = state.bossPhase === 'charge' || state.bossPhase === 'windup'
        ? 'Charging'
        : state.bossPhase === 'rage'
          ? 'Rage'
          : ''
      if (this.bossPhaseText.textContent !== phaseStr) {
        this.bossPhaseText.textContent = phaseStr
      }
      const ratio = Math.max(0, Math.min(1, state.bossHp / state.bossMaxHp))
      this.bossBarFill.style.width = `${ratio * 100}%`
    } else {
      if (this.bossPanel.style.display !== 'none') {
        this.bossPanel.style.display = 'none'
      }
    }
  }

  

  pulseHitmarker(zone: EnemyZone, didKill: boolean): void {
    this.hitmarker.classList.remove('active', 'weakspot', 'kill')
    void this.hitmarker.offsetWidth
    this.hitmarker.classList.add('active')
    if (zone === 'weakspot' || zone === 'head') {
      this.hitmarker.classList.add('weakspot')
    }
    if (didKill) {
      this.hitmarker.classList.add('kill')
    }
  }

  private querySpan(selector: string): HTMLSpanElement {
    return this.root.querySelector(selector) as HTMLSpanElement
  }

  private queryDiv(selector: string): HTMLDivElement {
    return this.root.querySelector(selector) as HTMLDivElement
  }
}
