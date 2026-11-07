/**
 * Flight Physics Engine — simplified 6-DOF aircraft model.
 * 
 * Models: lift, drag, thrust, gravity, angle of attack, G-forces,
 * Mach effects, stall, ground handling, and fuel consumption.
 * 
 * Each aircraft type has its own aerodynamic parameters.
 */

import * as THREE from "three";
import type { AircraftState } from "../core/types.js";
import { gameState } from "../core/state.js";
import { bus, GameEvents } from "../core/events.js";

/** Atmospheric constants */
const GRAVITY = 9.80665; // m/s²
const AIR_DENSITY_SEA_LEVEL = 1.225; // kg/m³
const SPEED_OF_SOUND_SEA_LEVEL = 340.294; // m/s

/** Standard atmosphere model */
function airDensity(altitudeMSL: number): number {
  // Simplified ISA model
  const temp = Math.max(288.15 - 0.0065 * altitudeMSL, 216.65);
  const pressure = 101325 * Math.pow(temp / 288.15, 5.2559);
  return pressure / (287.05 * temp);
}

function speedOfSound(altitudeMSL: number): number {
  const temp = Math.max(288.15 - 0.0065 * altitudeMSL, 216.65);
  return Math.sqrt(1.4 * 287.05 * temp);
}

/** Aircraft performance parameters */
export interface AircraftPerfParams {
  type: string;
  name: string;
  mass: number; // kg
  wingArea: number; // m²
  maxThrustMil: number; // N
  maxThrustAB: number; // N
  liftCoeffSlope: number; // per radian
  zeroLiftDrag: number;
  inducedDragFactor: number;
  alphaLimit: number; // degrees
  gLimit: number;
  maxMach: number;
  rollRate: number; // deg/s at reference speed
  fuelCapacity: number; // kg
  gunCapacity: number;
}

/** Performance database — inspired by VIPER 11's aircraft */
export const AIRCRAFT_PERF: Record<string, AircraftPerfParams> = {
  f16c: {
    type: "f16c",
    name: "F-16C Viper",
    mass: 12000,
    wingArea: 27.87,
    maxThrustMil: 76000,
    maxThrustAB: 127000,
    liftCoeffSlope: 4.5,
    zeroLiftDrag: 0.020,
    inducedDragFactor: 0.15,
    alphaLimit: 25,
    gLimit: 9,
    maxMach: 2.05,
    rollRate: 270,
    fuelCapacity: 3175,
    gunCapacity: 511,
  },
  f35c: {
    type: "f35c",
    name: "F-35C Lightning II",
    mass: 15800,
    wingArea: 42.7,
    maxThrustMil: 125000,
    maxThrustAB: 191000,
    liftCoeffSlope: 4.8,
    zeroLiftDrag: 0.018,
    inducedDragFactor: 0.12,
    alphaLimit: 20,
    gLimit: 7,
    maxMach: 1.6,
    rollRate: 200,
    fuelCapacity: 8600,
    gunCapacity: 220,
  },
  fa18e: {
    type: "fa18e",
    name: "F/A-18E Super Hornet",
    mass: 14500,
    wingArea: 50.0,
    maxThrustMil: 2 * 62000,
    maxThrustAB: 2 * 94000,
    liftCoeffSlope: 4.6,
    zeroLiftDrag: 0.022,
    inducedDragFactor: 0.14,
    alphaLimit: 22,
    gLimit: 7.5,
    maxMach: 1.8,
    rollRate: 220,
    fuelCapacity: 4900,
    gunCapacity: 412,
  },
  f14b: {
    type: "f14b",
    name: "F-14B Tomcat",
    mass: 19800,
    wingArea: 52.5,
    maxThrustMil: 2 * 79000,
    maxThrustAB: 2 * 115000,
    liftCoeffSlope: 4.2,
    zeroLiftDrag: 0.024,
    inducedDragFactor: 0.16,
    alphaLimit: 20,
    gLimit: 6.5,
    maxMach: 2.34,
    rollRate: 180,
    fuelCapacity: 6200,
    gunCapacity: 677,
  },
  mig29: {
    type: "mig29",
    name: "MiG-29 Fulcrum",
    mass: 11000,
    wingArea: 38.0,
    maxThrustMil: 2 * 50000,
    maxThrustAB: 2 * 81000,
    liftCoeffSlope: 4.4,
    zeroLiftDrag: 0.021,
    inducedDragFactor: 0.13,
    alphaLimit: 27,
    gLimit: 9,
    maxMach: 2.3,
    rollRate: 250,
    fuelCapacity: 3500,
    gunCapacity: 150,
  },
  su57: {
    type: "su57",
    name: "Su-57 Felon",
    mass: 18500,
    wingArea: 49.0,
    maxThrustMil: 2 * 89000,
    maxThrustAB: 2 * 145000,
    liftCoeffSlope: 5.0,
    zeroLiftDrag: 0.019,
    inducedDragFactor: 0.11,
    alphaLimit: 35,
    gLimit: 9,
    maxMach: 2.0,
    rollRate: 240,
    fuelCapacity: 5000,
    gunCapacity: 150,
  },
};

/** Flight control inputs */
export interface FlightControls {
  pitch: number; // -1 to 1
  roll: number; // -1 to 1
  yaw: number; // -1 to 1
  throttle: number; // 0 to 1
  brake: number; // 0 to 1
  speedBrake: boolean;
  gearDown: boolean;
  flaps: number; // 0 to 1
  afterburner: boolean;
}

const DEFAULT_CONTROLS: FlightControls = {
  pitch: 0,
  roll: 0,
  yaw: 0,
  throttle: 0,
  brake: 0,
  speedBrake: false,
  gearDown: true,
  flaps: 0,
  afterburner: false,
};

/** Flight model state */
interface FlightModelState {
  perf: AircraftPerfParams;
  position: THREE.Vector3;
  velocity: THREE.Vector3; // world frame m/s
  quaternion: THREE.Quaternion;
  angularVelocity: THREE.Vector3; // body frame rad/s
  fuel: number;
  controls: FlightControls;
  alpha: number; // radians
  gForce: number;
  onGround: boolean;
  mach: number;
  stalled: boolean;
}

export class FlightEngine {
  private model: FlightModelState;
  private perf: AircraftPerfParams;
  private lastTime = 0;
  private tempVec = new THREE.Vector3();
  private tempQuat = new THREE.Quaternion();

  constructor(aircraftType = "f16c") {
    this.perf = AIRCRAFT_PERF[aircraftType] || AIRCRAFT_PERF.f16c;
    this.model = {
      perf: this.perf,
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      quaternion: new THREE.Quaternion(),
      angularVelocity: new THREE.Vector3(0, 0, 0),
      fuel: this.perf.fuelCapacity,
      controls: { ...DEFAULT_CONTROLS },
      alpha: 0,
      gForce: 1,
      onGround: true,
      mach: 0,
      stalled: false,
    };
  }

  get state(): Readonly<FlightModelState> {
    return this.model;
  }

  setControls(controls: Partial<FlightControls>): void {
    Object.assign(this.model.controls, controls);
  }

  getControls(): FlightControls {
    return { ...this.model.controls };
  }

  /**
   * Main physics update — call once per frame.
   */
  update(dt: number): AircraftState {
    if (dt <= 0) return this.toAircraftState();
    
    const m = this.model;
    const c = m.controls;
    const p = this.perf;

    // Clamp dt for stability
    const clampedDt = Math.min(dt, 0.05);
    
    // Get altitude from position (y is up)
    m.position.y = Math.max(m.position.y, 0);
    const altitudeMSL = m.position.y;
    
    // Atmosphere
    const rho = airDensity(altitudeMSL);
    const a = speedOfSound(altitudeMSL);
    
    // Airspeed and Mach
    const speed = m.velocity.length();
    m.mach = speed / a;
    
    // Dynamic pressure
    const q = 0.5 * rho * speed * speed;
    
    // Angle of attack
    if (speed > 1) {
      const forward = this.tempVec.set(0, 0, -1).applyQuaternion(m.quaternion);
      const velNorm = m.velocity.clone().normalize();
      m.alpha = Math.asin(THREE.MathUtils.clamp(forward.dot(velNorm), -1, 1));
    } else {
      m.alpha = 0;
    }
    
    // Stall detection
    m.stalled = Math.abs(m.alpha) > p.alphaLimit * (Math.PI / 180);
    
    // Lift and drag
    const alphaDeg = Math.abs(m.alpha) * (180 / Math.PI);
    let liftCoeff = p.liftCoeffSlope * m.alpha;
    if (alphaDeg > p.alphaLimit) {
      liftCoeff *= Math.max(0.3, 1 - (alphaDeg - p.alphaLimit) / 20);
    }
    // Flaps increase lift
    liftCoeff *= 1 + c.flaps * 0.4;
    
    const lift = q * p.wingArea * liftCoeff;
    const dragCoeff = p.zeroLiftDrag + p.inducedDragFactor * liftCoeff * liftCoeff;
    let drag = q * p.wingArea * dragCoeff;
    // Gear drag
    if (c.gearDown) drag *= 1.15;
    // Speed brake drag
    if (c.speedBrake) drag *= 1.3;
    // Flap drag
    drag *= 1 + c.flaps * 0.3;
    
    // Thrust
    let thrust = 0;
    if (c.throttle > 0) {
      thrust = THREE.MathUtils.lerp(p.maxThrustMil * 0.1, p.maxThrustMil, Math.min(c.throttle / 0.75, 1));
      if (c.afterburner && c.throttle > 0.75) {
        thrust = THREE.MathUtils.lerp(p.maxThrustMil, p.maxThrustAB, (c.throttle - 0.75) / 0.25);
      }
    }
    // Mach-dependent thrust (simplified)
    const thrustFactor = m.mach > 0.8 ? Math.max(0.5, 1 - (m.mach - 0.8) * 0.5) : 1;
    thrust *= thrustFactor;
    
    // Fuel consumption
    const fuelFlow = thrust * 0.00002 + (c.afterburner ? 0.5 : 0);
    m.fuel = Math.max(0, m.fuel - fuelFlow * clampedDt * 60);
    if (m.fuel <= 0) thrust = 0;
    
    // Forces in body frame
    const forward = this.tempVec.set(0, 0, -1).applyQuaternion(m.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(m.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(m.quaternion);
    
    // Total force
    const force = new THREE.Vector3();
    force.addScaledVector(forward, thrust - drag);
    force.addScaledVector(up, lift);
    force.y -= p.mass * GRAVITY;
    
    // Ground handling
    if (m.onGround) {
      if (m.position.y <= 0) {
        m.position.y = 0;
        force.y = Math.max(0, force.y);
        if (m.velocity.y < 0) m.velocity.y = 0;
        // Ground friction
        const friction = 0.02 + c.brake * 0.08;
        const horizVel = new THREE.Vector3(m.velocity.x, 0, m.velocity.z);
        const horizSpeed = horizVel.length();
        if (horizSpeed > 0.01) {
          const frictionForce = horizVel.normalize().multiplyScalar(-friction * p.mass * GRAVITY);
          force.add(frictionForce);
        }
        // Ground steering
        if (speed < 30) {
          m.quaternion.multiply(this.tempQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.yaw * clampedDt * 0.5));
        }
      }
      // Takeoff check
      if (lift > p.mass * GRAVITY * 1.05 && speed > 60) {
        m.onGround = false;
        bus.emit(GameEvents.AIRCRAFT_TAKEOFF, { speed });
      }
    } else {
      // Airborne — G force
      const liftToWeight = lift / (p.mass * GRAVITY);
      m.gForce = THREE.MathUtils.clamp(liftToWeight, -3, p.gLimit);
    }
    
    // Acceleration
    const accel = force.divideScalar(p.mass);
    m.velocity.addScaledVector(accel, clampedDt);
    m.position.addScaledVector(m.velocity, clampedDt);
    
    // Angular dynamics (simplified)
    const rollRate = c.roll * p.rollRate * (Math.PI / 180) * Math.min(speed / 200, 1);
    const pitchRate = c.pitch * 1.5 * Math.min(speed / 200, 1);
    const yawRate = c.yaw * 0.5 * Math.min(speed / 200, 1);
    
    m.angularVelocity.x = THREE.MathUtils.lerp(m.angularVelocity.x, rollRate, clampedDt * 5);
    m.angularVelocity.y = THREE.MathUtils.lerp(m.angularVelocity.y, yawRate, clampedDt * 5);
    m.angularVelocity.z = THREE.MathUtils.lerp(m.angularVelocity.z, pitchRate, clampedDt * 5);
    
    // Apply rotations
    const rotQuat = this.tempQuat.setFromEuler(
      new THREE.Euler(
        m.angularVelocity.x * clampedDt,
        m.angularVelocity.y * clampedDt,
        m.angularVelocity.z * clampedDt,
        "XYZ"
      )
    );
    m.quaternion.multiply(rotQuat);
    m.quaternion.normalize();
    
    // Ground collision
    if (!m.onGround && m.position.y <= 0) {
      m.position.y = 0;
      if (Math.abs(m.velocity.y) > 5) {
        bus.emit(GameEvents.AIRCRAFT_DESTROYED, { reason: "ground_impact", speed: m.velocity.length() });
        m.velocity.set(0, 0, 0);
      }
      m.onGround = true;
      m.velocity.y = Math.max(0, m.velocity.y);
      bus.emit(GameEvents.AIRCRAFT_LAND, { speed: m.velocity.length() });
    }
    
    // Ground effect — reduce sink near ground
    if (!m.onGround && m.position.y < 20) {
      m.velocity.y += 2 * clampedDt;
    }
    
    return this.toAircraftState();
  }

  /** Convert internal model to AircraftState for tools/AI */
  private toAircraftState(): AircraftState {
    const m = this.model;
    const c = m.controls;
    const p = this.perf;
    const euler = new THREE.Euler().setFromQuaternion(m.quaternion, "YXZ");
    
    return {
      id: "player-1",
      type: p.type,
      name: p.name,
      position: { x: m.position.x, y: m.position.y, z: m.position.z },
      velocity: { x: m.velocity.x, y: m.velocity.y, z: m.velocity.z },
      attitude: { pitch: euler.x, roll: euler.z, yaw: euler.y },
      speed: m.velocity.length(),
      mach: m.mach,
      altitude: m.position.y,
      altitudeMSL: m.position.y,
      heading: ((euler.y * 180 / Math.PI) + 360) % 360,
      gForce: m.gForce,
      angleOfAttack: m.alpha * (180 / Math.PI),
      throttle: c.throttle,
      afterburner: c.afterburner,
      fuel: m.fuel,
      fuelPercent: (m.fuel / p.fuelCapacity) * 100,
      gearDown: c.gearDown,
      flaps: c.flaps,
      speedBrake: c.speedBrake,
      onGround: m.onGround,
      onCarrier: false,
      stalled: m.stalled,
      ejected: false,
      destroyed: false,
      loadout: { ...gameState.aircraft.loadout },
    };
  }

  /** Reset the flight model */
  reset(position?: THREE.Vector3): void {
    this.model.position.copy(position || new THREE.Vector3(0, 0, 0));
    this.model.velocity.set(0, 0, 0);
    this.model.quaternion.identity();
    this.model.angularVelocity.set(0, 0, 0);
    this.model.fuel = this.perf.fuelCapacity;
    this.model.controls = { ...DEFAULT_CONTROLS };
    this.model.onGround = true;
    this.model.alpha = 0;
    this.model.gForce = 1;
    this.model.stalled = false;
  }

  /** Get performance params */
  getPerf(): AircraftPerfParams {
    return this.perf;
  }
}

export { DEFAULT_CONTROLS };
// AIRCRAFT_PERF and FlightControls are already exported above
