/**
 * Combat Tools — weapons, targeting, and defensive systems.
 * The AI can fire weapons, deploy countermeasures, and manage loadout.
 */

import { registry } from "../core/registry.js";
import { gameState } from "../core/state.js";
import { WEAPONS } from "../combat/combat.js";
import { bus, GameEvents } from "../core/events.js";

let combatSystem: import("../combat/combat.js").CombatSystem | null = null;

export function setCombatSystem(system: import("../combat/combat.js").CombatSystem): void {
  combatSystem = system;
}

function str(params: Record<string, unknown>, key: string, def = ""): string {
  return typeof params[key] === "string" ? params[key] as string : def;
}

export function registerCombatTools(): void {
  // ─── Fire Missile ────────────────────────────────────────────────

  registry.register("fire_missile", {
    name: "fire_missile",
    description: "Launch an air-to-air missile. Specify the missile type (AIM-9X or AIM-120) and optionally a target ID. The missile will guide toward the target using proportional navigation.",
    parameters: {
      missile_type: {
        type: "string",
        description: "Missile type",
        required: true,
        enum: ["AIM-9X", "AIM-120"],
      },
      target_id: { type: "string", description: "Target bandit ID (from get_bandits). Omit for unguided launch." },
    },
  }, (params, _ctx) => {
    const type = str(params, "missile_type");
    const targetId = params.target_id ? str(params, "target_id") : null;
    const result = combatSystem?.fireMissile(type, targetId);
    if (!result) return { success: false, error: "Combat system not initialized" };
    return result;
  }, "combat");

  // ─── Drop Bomb ───────────────────────────────────────────────────

  registry.register("drop_bomb", {
    name: "drop_bomb",
    description: "Release a bomb. Currently supports GBU-12 Paveway II laser-guided bomb. The bomb falls ballistically toward the ground.",
    parameters: {
      bomb_type: {
        type: "string",
        description: "Bomb type",
        required: true,
        enum: ["GBU-12"],
      },
    },
  }, (params, _ctx) => {
    const type = str(params, "bomb_type");
    const result = combatSystem?.dropBomb(type);
    if (!result) return { success: false, error: "Combat system not initialized" };
    return result;
  }, "combat");

  // ─── Fire Gun ────────────────────────────────────────────────────

  registry.register("fire_gun", {
    name: "fire_gun",
    description: "Fire the aircraft cannon for a specified duration. Gun rounds are limited. Effective within 3000m of target.",
    parameters: {
      duration: { type: "number", description: "Firing duration in seconds (e.g., 0.5 for a burst)", required: true, minimum: 0.1, maximum: 5 },
    },
  }, (params, _ctx) => {
    const duration = typeof params.duration === "number" ? params.duration : 0.5;
    const result = combatSystem?.fireGun(duration);
    if (!result) return { success: false, error: "Combat system not initialized" };
    return result;
  }, "combat");

  // ─── Deploy Flares ───────────────────────────────────────────────

  registry.register("deploy_flares", {
    name: "deploy_flares",
    description: "Deploy defensive flares to confuse incoming heat-seeking missiles. Limited supply.",
    parameters: {},
  }, () => {
    const result = combatSystem?.deployFlares();
    if (!result) return { success: false, error: "Combat system not initialized" };
    return result;
  }, "combat");

  // ─── Get Bandits ─────────────────────────────────────────────────

  registry.register("get_bandits", {
    name: "get_bandits",
    description: "Get a list of all enemy bandits (hostile aircraft) with their positions, altitudes, headings, speeds, and alive status.",
    parameters: {},
  }, (_params, ctx) => {
    const bandits = combatSystem?.getBandits() ?? [];
    const result = bandits.map(b => ({
      id: b.id,
      type: b.aircraftType,
      position: { x: Math.round(b.position.x), y: Math.round(b.position.y), z: Math.round(b.position.z) },
      altitude_ft: Math.round(b.altitude * 3.28084),
      heading: Math.round(b.heading),
      speed_kts: Math.round(b.speed * 1.94384),
      skill: b.skill,
      alive: b.alive,
      locked: b.locked,
    }));
    return {
      success: true,
      data: result,
      message: result.length > 0
        ? `${result.filter(b => b.alive).length} bandits active: ${result.map(b => `${b.id} (${b.type}) at ${b.altitude_ft}ft`).join(", ")}`
        : "No bandits detected",
    };
  }, "combat");

  // ─── Get Loadout ─────────────────────────────────────────────────

  registry.register("get_loadout", {
    name: "get_loadout",
    description: "Get current weapon loadout: gun rounds, missiles, bombs, flares, chaff, and master arm status.",
    parameters: {},
  }, (_params, ctx) => {
    const lo = ctx.aircraft!.loadout;
    return {
      success: true,
      data: {
        gun: `${lo.gunRounds}/${lo.gunCapacity}`,
        missiles: lo.missiles,
        bombs: lo.bombs,
        flares: lo.flares,
        chaff: lo.chaff,
        master_arm: lo.masterArm,
      },
      message: `Loadout: Gun ${lo.gunRounds}/${lo.gunCapacity} | Missiles: ${lo.missiles.map(m => `${m.type}×${m.count}`).join(", ")} | Flares: ${lo.flares}`,
    };
  }, "combat");

  // ─── Master Arm ──────────────────────────────────────────────────

  registry.register("set_master_arm", {
    name: "set_master_arm",
    description: "Set the master arm switch. When ON, weapons can be fired. When OFF (SAFE), weapons cannot be released.",
    parameters: {
      armed: { type: "boolean", description: "true = ARM, false = SAFE", required: true },
    },
  }, (params, _ctx) => {
    const armed = params.armed === true;
    gameState.aircraft.loadout.masterArm = armed;
    return { success: true, message: `Master arm: ${armed ? "ARMED" : "SAFE"}` };
  }, "combat");

  // ─── List Weapons ────────────────────────────────────────────────

  registry.register("list_weapons", {
    name: "list_weapons",
    description: "List all available weapon types and their specifications.",
    parameters: {},
  }, () => {
    const weapons = Object.values(WEAPONS).map(w => ({
      type: w.type,
      name: w.name,
      kind: w.kind,
      seeker_range: w.seekerRange ? `${Math.round(w.seekerRange / 1000)} km` : "N/A",
      lethal_radius: `${w.lethalRadius} m`,
    }));
    return { success: true, data: weapons, message: `Available weapons: ${weapons.map(w => w.name).join(", ")}` };
  }, "combat");
}
