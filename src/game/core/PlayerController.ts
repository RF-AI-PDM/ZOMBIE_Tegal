import * as THREE from 'three'
import { GameBalance } from '../balance/GameBalance'
import type { Bounds } from '../types'
import { InputController } from './InputController'

export class PlayerController {
  private readonly body = new THREE.Object3D()
  private readonly pitchNode = new THREE.Object3D()
  private readonly velocity = new THREE.Vector3()
  private yaw = 0
  private pitch = 0
  private recoilPitch = 0
  private recoilYaw = 0

  private readonly moveSpeed = 8.5
  private readonly lookSensitivity = 0.0022

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    spawn: THREE.Vector3,
    private readonly bounds: Bounds,
  ) {
    this.body.position.copy(spawn)
    this.body.position.y = 1.7
    this.pitchNode.add(camera)
    this.body.add(this.pitchNode)
  }

  getObject(): THREE.Object3D {
    return this.body
  }

  getPosition(): THREE.Vector3 {
    return this.body.position
  }

  getForwardDirection(target = new THREE.Vector3()): THREE.Vector3 {
    this.camera.getWorldDirection(target)
    target.y = 0
    return target.normalize()
  }

  getRightDirection(target = new THREE.Vector3()): THREE.Vector3 {
    const forward = this.getForwardDirection(new THREE.Vector3())
    target.crossVectors(new THREE.Vector3(0, 1, 0), forward)
    return target.normalize()
  }

  applyRecoil(pitchKick: number, yawKick: number): void {
    this.recoilPitch -= pitchKick
    this.recoilYaw += yawKick
  }

  update(input: InputController, delta: number): void {
    const look = input.consumeLookDelta()
    this.yaw -= look.x * this.lookSensitivity
    this.pitch -= look.y * this.lookSensitivity
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.5, 1.5)

    const recoilRecover = Math.min(1, delta * GameBalance.weapon.recoilRecoveryRate)
    this.recoilPitch = THREE.MathUtils.lerp(this.recoilPitch, 0, recoilRecover)
    this.recoilYaw = THREE.MathUtils.lerp(this.recoilYaw, 0, recoilRecover)

    this.body.rotation.y = this.yaw + this.recoilYaw
    this.pitchNode.rotation.x = THREE.MathUtils.clamp(this.pitch + this.recoilPitch, -1.5, 1.5)

    const axis = input.getMoveAxis()
    this.velocity.set(0, 0, 0)

    if (axis.forward !== 0 || axis.right !== 0) {
      const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).normalize()
      const right = new THREE.Vector3(forward.z, 0, -forward.x)
      this.velocity.addScaledVector(forward, axis.forward)
      this.velocity.addScaledVector(right, axis.right)
      this.velocity.normalize().multiplyScalar(this.moveSpeed * delta)
      this.body.position.add(this.velocity)
    }

    this.body.position.x = THREE.MathUtils.clamp(this.body.position.x, this.bounds.minX, this.bounds.maxX)
    this.body.position.z = THREE.MathUtils.clamp(this.body.position.z, this.bounds.minZ, this.bounds.maxZ)
    this.body.position.y = 1.7
  }
}
