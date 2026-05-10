export class InputController {
  private readonly keys = new Set<string>()
  private readonly mouseButtons = new Set<number>()
  private lookDeltaX = 0
  private lookDeltaY = 0
  private pointerLocked = false

  constructor(private readonly host: HTMLElement) {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
    window.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('pointerlockchange', this.onPointerLockChange)
    host.addEventListener('click', this.requestPointerLock)
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mouseup', this.onMouseUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('pointerlockchange', this.onPointerLockChange)
    this.host.removeEventListener('click', this.requestPointerLock)
  }

  isPointerLocked(): boolean {
    return this.pointerLocked
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code)
  }

  isMouseDown(button = 0): boolean {
    return this.mouseButtons.has(button)
  }

  consumeLookDelta(): { x: number; y: number } {
    const delta = { x: this.lookDeltaX, y: this.lookDeltaY }
    this.lookDeltaX = 0
    this.lookDeltaY = 0
    return delta
  }

  getMoveAxis(): { forward: number; right: number } {
    const forward = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'))
    const right = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'))
    return { forward, right }
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code)
  }

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code)
  }

  private readonly onMouseDown = (event: MouseEvent): void => {
    this.mouseButtons.add(event.button)
  }

  private readonly onMouseUp = (event: MouseEvent): void => {
    this.mouseButtons.delete(event.button)
  }

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.pointerLocked) {
      return
    }

    this.lookDeltaX += event.movementX
    this.lookDeltaY += event.movementY
  }

  private readonly onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.host
  }

  private readonly requestPointerLock = (): void => {
    if (!this.pointerLocked) {
      this.host.requestPointerLock()
    }
  }
}
