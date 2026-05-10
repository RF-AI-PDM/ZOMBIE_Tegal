export type AudioEvent =
  | 'gunshot'
  | 'reload'
  | 'enemyHit'
  | 'bossRoar'
  | 'bossFootstep'
  | 'pickup'
  | 'deathExplosion'

export class AudioManager {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicInterval: number | null = null
  private musicStep = 0
  private readonly eventMap: Partial<Record<AudioEvent, () => void>> = {}

  unlock(): void {
    if (!this.context) {
      this.context = new AudioContext()
      this.masterGain = this.context.createGain()
      this.masterGain.gain.value = 0.25
      this.masterGain.connect(this.context.destination)
      this.bindEvents()
      this.startMusic()
    }

    void this.context.resume()
  }

  dispose(): void {
    if (this.musicInterval !== null) {
      window.clearInterval(this.musicInterval)
      this.musicInterval = null
    }
  }

  play(event: AudioEvent): void {
    this.eventMap[event]?.()
  }

  private bindEvents(): void {
    this.eventMap.gunshot = () => {
      this.playTone(180, 0.06, 0.22, 'sawtooth', 0.5)
      this.playNoise(0.08, 0.2)
    }

    this.eventMap.reload = () => {
      this.playTone(540, 0.08, 0.1, 'triangle', 0.2)
      this.playTone(320, 0.14, 0.08, 'square', 0.1)
    }

    this.eventMap.enemyHit = () => {
      this.playTone(120, 0.04, 0.12, 'square', 0.08)
    }

    this.eventMap.bossRoar = () => {
      this.playTone(90, 0.6, 0.33, 'sawtooth', 0.15)
      this.playNoise(0.5, 0.18)
    }

    this.eventMap.bossFootstep = () => {
      this.playTone(55, 0.17, 0.24, 'sine', 0.03)
    }

    this.eventMap.pickup = () => {
      this.playTone(680, 0.07, 0.14, 'triangle', 0.03)
      this.playTone(940, 0.05, 0.09, 'triangle', 0.09)
    }

    this.eventMap.deathExplosion = () => {
      this.playNoise(0.45, 0.4)
      this.playTone(65, 0.35, 0.32, 'square', 0.2)
    }
  }

  private startMusic(): void {
    if (!this.context || !this.masterGain || this.musicInterval !== null) {
      return
    }

    const progression = [110, 130, 98, 147, 123, 147, 98, 123]
    this.musicInterval = window.setInterval(() => {
      const freq = progression[this.musicStep % progression.length]
      this.musicStep += 1
      this.playTone(freq, 0.35, 0.06, 'triangle', 0)
      if (this.musicStep % 4 === 0) {
        this.playTone(freq * 2, 0.1, 0.04, 'sine', 0.04)
      }
    }, 380)
  }

  private playTone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    detuneSeconds: number,
  ): void {
    if (!this.context || !this.masterGain) {
      return
    }

    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()

    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.value = 0

    oscillator.connect(gain)
    gain.connect(this.masterGain)

    const now = this.context.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    if (detuneSeconds > 0) {
      oscillator.detune.setValueAtTime(-320, now)
      oscillator.detune.linearRampToValueAtTime(220, now + detuneSeconds)
    }

    oscillator.start(now)
    oscillator.stop(now + duration)
  }

  private playNoise(duration: number, volume: number): void {
    if (!this.context || !this.masterGain) {
      return
    }

    const sampleRate = this.context.sampleRate
    const frameCount = Math.floor(sampleRate * duration)
    const buffer = this.context.createBuffer(1, frameCount, sampleRate)
    const data = buffer.getChannelData(0)

    for (let i = 0; i < frameCount; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount)
    }

    const source = this.context.createBufferSource()
    source.buffer = buffer

    const gain = this.context.createGain()
    gain.gain.value = volume
    source.connect(gain)
    gain.connect(this.masterGain)

    source.start()
  }
}
