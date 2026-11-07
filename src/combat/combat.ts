/**
 * Combat System — weapons, missiles, guns, flares, damage.
 * All combat actions are exposed as tools for the AI.
 */

import * as THREE from "three";
import type { AircraftState, BanditState } from "../core/types.js";
import { gameState } from "../core/state.js";
import { bus, GameEvents } from "../core/events.js";

export interface WeaponSpec {
  type: string;
  name: string;
  kind: "missile" | "bomb" | "gun" | "flare";
  mass: number;
  thrust: number;
  burnTime: number;
  dragCoeff: number;
  navGain: number;
  gimbalLimit: number;
  seekerRange: number;
  lethalRadius: number;
  armDelay: number;
  fuzeDelay: number;
}

export const WEAPONS: Record<string, WeaponSpec> = {
  "AIM-9X": {
    type: "AIM-9X",
    name: "AIM-9X Sidewinder",
    kind: "missile",
    mass: 85,
    thrust: 18000,
    burnTime: 3.5,
    dragCoeff: 0.15,
    navGain: 4.0,
    gimbalLimit: 60,
    seekerRange: 18000,
    lethalRadius: 8,
    armDelay: 0.5,
    fuzeDelay: 0.3,
  },
  "AIM-120": {
    type: "AIM-120",
    name: "AIM-120 AMRAAM",
    kind: "missile",
    mass: 152,
    thrust: 22000,
    burnTime: 4.5,
    dragCoeff: 0.12,
    navGain: 4.5,
    gimbalLimit: 90,
    seekerRange: 30000,
    lethalRadius: 10,
    armDelay: 0.8,
    fuzeDelay: 0.3,
  },
  "GBU-12": {
    type: "GBU-12",
    name: "GBU-12 Paveway II",
    kind: "bomb",
    mass: 227,
    thrust: 0,
    burnTime: 0,
    dragCoeff: 0.3,
    navGain: 0,
    gimbalLimit: 0,
    seekerRange: 0,
    lethalRadius: 15,
    armDelay: 0,
    fuzeDelay: 0,
  },
};

interface ActiveMissile {
  id: string;
  spec: WeaponSpec;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  targetId: string | null;
  targetPosition: THREE.Vector3;
  burnTime: number;
  armed: boolean;
  age: number;
  active: boolean;
  trail: THREE.Vector3[];
}

interface ActiveBomb {
  id: string;
  spec: WeaponSpec;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  active: boolean;
  age: number;
}

interface GunState {
  rounds: number;
  firing: boolean;
  lastFireTime: number;
  burstCount: number;
}

export class CombatSystem {
  private missiles: ActiveMissile[] = [];
  private bombs: ActiveBomb[] = [];
  private gun: GunState = { rounds: 511, firing: false, lastFireTime: 0, burstCount: 0 };
  private bandits: BanditState[] = [];
  private nextId = 0;

  constructor() {
    this.gun.rounds = gameState.aircraft.loadout.gunRounds;
  }

  /** Fire a missile at a target */
  fireMissile(missileType: string, targetId: string | null): { success: boolean; message: string; missileId?: string } {
    const spec = WEAPONS[missileType];
    if (!spec || spec.kind !== "missile") {
      return { success: false, message: `Unknown missile type: ${missileType}` };
    }

    const loadout = gameState.aircraft.loadout;
    const missileGroup = loadout.missiles.find(m => m.type === missileType);
    if (!missileGroup || missileGroup.count <= 0) {
      return { success: false, message: `No ${missileType} missiles remaining` };
    }

    // Find target
    let targetPos = new THREE.Vector3();
    if (targetId) {
      const target = this.bandits.find(b => b.id === targetId && b.alive);
      if (!target) {
        return { success: false, message: `Target ${targetId} not found or destroyed` };
      }
      targetPos.set(target.position.x, target.position.y, target.position.z);
    } else {
      // Fire unguided
      targetPos.set(0, 0, -10000);
    }

    const aircraft = gameState.aircraft;
    const missile: ActiveMissile = {
      id: `missile-${++this.nextId}`,
      spec,
      position: new THREE.Vector3(aircraft.position.x, aircraft.position.y, aircraft.position.z),
      velocity: new THREE.Vector3(aircraft.velocity.x, aircraft.velocity.y, aircraft.velocity.z),
      targetId,
      targetPosition: targetPos,
      burnTime: spec.burnTime,
      armed: false,
      age: 0,
      active: true,
      trail: [],
    };

    this.missiles.push(missile);
    missileGroup.count--;
    loadout.gunRounds = this.gun.rounds;

    bus.emit(GameEvents.MISSILE_LAUNCH, { missileId: missile.id, type: missileType, targetId });
    return { success: true, message: `Fox two! ${missileType} away`, missileId: missile.id };
  }

  /** Drop a bomb */
  dropBomb(bombType: string): { success: boolean; message: string; bombId?: string } {
    const spec = WEAPONS[bombType];
    if (!spec || spec.kind !== "bomb") {
      return { success: false, message: `Unknown bomb type: ${bombType}` };
    }

    const loadout = gameState.aircraft.loadout;
    const bombGroup = loadout.bombs.find(b => b.type === bombType);
    if (!bombGroup || bombGroup.count <= 0) {
      return { success: false, message: `No ${bombType} bombs remaining` };
    }

    const aircraft = gameState.aircraft;
    const bomb: ActiveBomb = {
      id: `bomb-${++this.nextId}`,
      spec,
      position: new THREE.Vector3(aircraft.position.x, aircraft.position.y - 1, aircraft.position.z),
      velocity: new THREE.Vector3(aircraft.velocity.x, aircraft.velocity.y, aircraft.velocity.z),
      active: true,
      age: 0,
    };

    this.bombs.push(bomb);
    bombGroup.count--;

    bus.emit(GameEvents.WEAPON_FIRE, { type: bombType, bombId: bomb.id });
    return { success: true, message: `Bomb away! ${bombType} released`, bombId: bomb.id };
  }

  /** Fire the gun */
  fireGun(duration: number): { success: boolean; message: string; roundsFired: number } {
    if (this.gun.rounds <= 0) {
      return { success: false, message: "Guns empty", roundsFired: 0 };
    }

    const burstSize = Math.min(Math.floor(duration * 60), this.gun.rounds);
    this.gun.rounds -= burstSize;
    gameState.aircraft.loadout.gunRounds = this.gun.rounds;
    this.gun.lastFireTime = performance.now();

    bus.emit(GameEvents.GUN_FIRE, { roundsFired: burstSize, remaining: this.gun.rounds });

    // Check for hits on bandits
    const aircraft = gameState.aircraft;
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(aircraft.attitude.pitch, aircraft.attitude.yaw, aircraft.attitude.roll)
    );

    for (const bandit of this.bandits) {
      if (!bandit.alive) continue;
      const toBandit = new THREE.Vector3(
        bandit.position.x - aircraft.position.x,
        bandit.position.y - aircraft.position.y,
        bandit.position.z - aircraft.position.z
      );
      const dist = toBandit.length();
      if (dist < 3000) {
        toBandit.normalize();
        const dot = forward.dot(toBandit);
        if (dot > 0.98) {
          // Hit!
          const damage = burstSize * 0.5;
          if (damage > 20) {
            bandit.alive = false;
            gameState.addScore(100);
            bus.emit(GameEvents.KILL_CONFIRMED, { targetId: bandit.id, method: "gun" });
            bus.emit(GameEvents.WEAPON_HIT, { targetId: bandit.id, damage, method: "gun" });
          }
        }
      }
    }

    return { success: true, message: `Guns guns guns! ${burstSize} rounds fired`, roundsFired: burstSize };
  }

  /** Deploy flares */
  deployFlares(): { success: boolean; message: string } {
    const loadout = gameState.aircraft.loadout;
    if (loadout.flares <= 0) {
      return { success: false, message: "No flares remaining" };
    }
    loadout.flares--;
    bus.emit(GameEvents.FLARE_DEPLOY, { remaining: loadout.flares });
    return { success: true, message: `Flares deployed! ${loadout.flares} remaining` };
  }

  /** Add a bandit to the simulation */
  addBandit(bandit: BanditState): void {
    this.bandits.push(bandit);
  }

  /** Get all bandits */
  getBandits(): BanditState[] {
    return [...this.bandits];
  }

  /** Get active missiles */
  getMissiles(): ActiveMissile[] {
    return this.missiles.filter(m => m.active);
  }

  /** Update all combat systems */
  update(dt: number): void {
    const aircraft = gameState.aircraft;

    // Update missiles
    for (const m of this.missiles) {
      if (!m.active) continue;
      m.age += dt;

      // Arm delay
      if (!m.armed && m.age > m.spec.armDelay) {
        m.armed = true;
      }

      // Motor burn
      if (m.burnTime > 0) {
        const thrust = m.spec.thrust;
        const accel = thrust / m.spec.mass;
        const speed = m.velocity.length();
        if (speed > 1) {
          m.velocity.addScaledVector(m.velocity.clone().normalize(), accel * dt);
        }
        m.burnTime -= dt;
      }

      // Guidance (proportional navigation)
      if (m.armed && m.targetId) {
        const target = this.bandits.find(b => b.id === m.targetId && b.alive);
        if (target) {
          m.targetPosition.set(target.position.x, target.position.y, target.position.z);
          const toTarget = new THREE.Vector3().subVectors(m.targetPosition, m.position);
          const dist = toTarget.length();
          const losRate = toTarget.normalize();

          // Simple PN guidance
          const closingVel = m.velocity.dot(losRate);
          const navCmd = losRate.clone().multiplyScalar(m.spec.navGain * closingVel);
          const maxAccel = 30 * 9.81;
          if (navCmd.length() > maxAccel) {
            navCmd.setLength(maxAccel);
          }
          m.velocity.addScaledVector(navCmd, dt);

          // Proximity fuse
          if (dist < m.spec.lethalRadius) {
            target.alive = false;
            m.active = false;
            gameState.addScore(200);
            bus.emit(GameEvents.MISSILE_HIT, { targetId: target.id, missileId: m.id });
            bus.emit(GameEvents.KILL_CONFIRMED, { targetId: target.id, method: "missile" });
            continue;
          }
        }
      }

      // Drag and gravity
      const speed = m.velocity.length();
      if (speed > 1) {
        const dragForce = 0.5 * 1.225 * speed * speed * 0.01 * m.spec.dragCoeff;
        m.velocity.addScaledVector(m.velocity.clone().normalize(), -dragForce / m.spec.mass * dt);
      }
      m.velocity.y -= 9.81 * dt;

      // Update position
      m.position.addScaledVector(m.velocity, dt);

      // Trail
      m.trail.push(m.position.clone());
      if (m.trail.length > 50) m.trail.shift();

      // End of life
      if (m.age > 30 || m.position.y < -100) {
        m.active = false;
      }

      // Ground hit
      if (m.position.y < 0) {
        m.position.y = 0;
        m.active = false;
      }
    }

    // Update bombs
    for (const b of this.bombs) {
      if (!b.active) continue;
      b.age += dt;

      // Gravity and drag
      b.velocity.y -= 9.81 * dt;
      const speed = b.velocity.length();
      if (speed > 1) {
        const dragForce = 0.5 * 1.225 * speed * speed * 0.5 * b.spec.dragCoeff;
        b.velocity.addScaledVector(b.velocity.clone().normalize(), -dragForce / b.spec.mass * dt);
      }

      b.position.addScaledVector(b.velocity, dt);

      // Ground impact
      if (b.position.y < 0) {
        b.position.y = 0;
        b.active = false;
        bus.emit(GameEvents.WEAPON_HIT, { method: "bomb", position: { x: b.position.x, y: 0, z: b.position.z } });
        // Check bandit hits
        for (const bandit of this.bandits) {
          if (!bandit.alive) continue;
          const dist = Math.sqrt(
            Math.pow(b.position.x - bandit.position.x, 2) +
            Math.pow(b.position.z - bandit.position.z, 2)
          );
          if (dist < b.spec.lethalRadius && Math.abs(b.position.y - bandit.position.y) < 50) {
            bandit.alive = false;
            gameState.addScore(200);
            bus.emit(GameEvents.KILL_CONFIRMED, { targetId: bandit.id, method: "bomb" });
          }
        }
      }
    }

    // Update bandits (simple AI - move toward player)
    for (const bandit of this.bandits) {
      if (!bandit.alive) continue;
      const toPlayer = new THREE.Vector3(
        aircraft.position.x - bandit.position.x,
        aircraft.position.y - bandit.position.y,
        aircraft.position.z - bandit.position.z
      );
      const dist = toPlayer.length();
      if (dist > 1) {
        toPlayer.normalize();
        const speed = bandit.speed;
        bandit.position.x += toPlayer.x * speed * dt;
        bandit.position.y += toPlayer.y * speed * dt;
        bandit.position.z += toPlayer.z * speed * dt;
        bandit.heading = Math.atan2(toPlayer.x, toPlayer.z) * (180 / Math.PI);
      }
    }
  }

  /** Reset combat state */
  reset(): void {
    this.missiles = [];
    this.bombs = [];
    this.bandits = [];
    this.gun.rounds = gameState.aircraft.loadout.gunCapacity;
  }
}

