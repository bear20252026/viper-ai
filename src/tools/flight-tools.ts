/**
 * Flight Tools — all flight control functions exposed as AI-callable tools.
 * The AI can control the aircraft with the same authority as a human player.
 */

import { registry } from "../core/registry.js";
import { gameState } from "../core/state.js";
import type { ToolContext } from "../core/types.js";
import type { FlightControls } from "../engine/flight.js";
import { AIRCRAFT_PERF } from "../engine/flight.js";
import { bus, GameEvents } from "../core/events.js";

let flightEngine: import("../engine/flight.js").FlightEngine | null = null;

export function setFlightEngine(engine: import("../engine/flight.js").FlightEngine): void {
  flightEngine = engine;
}

/** Helper: validate numeric param */
function num(params: Record<string, unknown>, key: string, def = 0): number {
  const v = params[key];
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    if (!isNaN(n)) return n;
  }
  return def;
}

/** Helper: validate string param */
function str(params: Record<string, unknown>, key: string, def = ""): string {
  return typeof params[key] === "string" ? params[key] as string : def;
}

export function registerFlightTools(): void {
  // ─── Aircraft State Query ─────────────────────────────────────────

  registry.register("get_status", {
    name: "get_status",
    description: "Get the current state of the player aircraft: position, speed, altitude, heading, fuel, G-force, angle of attack, throttle, gear/flaps/speedbrake status, and whether the aircraft is on the ground, stalled, or destroyed.",
    parameters: {},
  }, (_params, ctx) => {
    const a = ctx.aircraft!;
    return {
      success: true,
      data: {
        aircraft: a.name,
        position: { x: Math.round(a.position.x), y: Math.round(a.position.y), z: Math.round(a.position.z) },
        speed_kts: Math.round(a.speed * 1.94384),
        mach: a.mach.toFixed(3),
        altitude_ft: Math.round(a.altitude * 3.28084),
        heading_deg: Math.round(a.heading),
        g_force: a.gForce.toFixed(2),
        angle_of_attack: a.angleOfAttack.toFixed(1) + "°",
        throttle_pct: Math.round(a.throttle * 100),
        afterburner: a.afterburner,
        fuel_kg: Math.round(a.fuel),
        fuel_pct: Math.round(a.fuelPercent),
        gear_down: a.gearDown,
        flaps: Math.round(a.flaps * 100) + "%",
        speed_brake: a.speedBrake,
        on_ground: a.onGround,
        stalled: a.stalled,
        destroyed: a.destroyed,
      },
      message: `Aircraft: ${a.name} | ${Math.round(a.speed * 1.94384)} kts | ${Math.round(a.altitude * 3.28084)} ft | HDG ${Math.round(a.heading)}° | Fuel ${Math.round(a.fuelPercent)}%`,
    };
  }, "flight");

  // ─── Throttle Control ─────────────────────────────────────────────

  registry.register("set_throttle", {
    name: "set_throttle",
    description: "Set the engine throttle to a specific percentage. 0% is idle, 100% is full military power. Afterburner engages above 75% if enabled.",
    parameters: {
      throttle: { type: "number", description: "Throttle percentage (0-100)", required: true, minimum: 0, maximum: 100 },
      afterburner: { type: "boolean", description: "Enable afterburner (default: true if throttle > 75)" },
    },
  }, (params, _ctx) => {
    const throttle = num(params, "throttle", 0) / 100;
    const ab = params.afterburner !== undefined ? params.afterburner === true : throttle > 0.75;
    flightEngine?.setControls({ throttle, afterburner: ab && throttle > 0.75 });
    return { success: true, message: `Throttle set to ${Math.round(throttle * 100)}%${ab && throttle > 0.75 ? " (AB)" : ""}` };
  }, "flight");

  // ─── Pitch Control ────────────────────────────────────────────────

  registry.register("set_pitch", {
    name: "set_pitch",
    description: "Set the pitch control input. -1 is full nose-down, 0 is neutral, 1 is full nose-up. This controls the aircraft's pitch attitude.",
    parameters: {
      pitch: { type: "number", description: "Pitch input (-1 to 1)", required: true, minimum: -1, maximum: 1 },
    },
  }, (params, _ctx) => {
    const pitch = num(params, "pitch", 0);
    flightEngine?.setControls({ pitch });
    return { success: true, message: `Pitch set to ${pitch > 0 ? "nose-up" : pitch < 0 ? "nose-down" : "neutral"} (${pitch.toFixed(2)})` };
  }, "flight");

  // ─── Roll Control ────────────────────────────────────────────────

  registry.register("set_roll", {
    name: "set_roll",
    description: "Set the roll/aileron control input. -1 is full left roll, 0 is neutral, 1 is full right roll.",
    parameters: {
      roll: { type: "number", description: "Roll input (-1 to 1)", required: true, minimum: -1, maximum: 1 },
    },
  }, (params, _ctx) => {
    const roll = num(params, "roll", 0);
    flightEngine?.setControls({ roll });
    return { success: true, message: `Roll set to ${roll > 0 ? "right" : roll < 0 ? "left" : "neutral"} (${roll.toFixed(2)})` };
  }, "flight");

  // ─── Yaw/Rudder Control ──────────────────────────────────────────

  registry.register("set_yaw", {
    name: "set_yaw",
    description: "Set the rudder/yaw control input. -1 is full left rudder, 0 is neutral, 1 is full right rudder. Used for ground steering and coordination.",
    parameters: {
      yaw: { type: "number", description: "Yaw input (-1 to 1)", required: true, minimum: -1, maximum: 1 },
    },
  }, (params, _ctx) => {
    const yaw = num(params, "yaw", 0);
    flightEngine?.setControls({ yaw });
    return { success: true, message: `Rudder set to ${yaw > 0 ? "right" : yaw < 0 ? "left" : "neutral"} (${yaw.toFixed(2)})` };
  }, "flight");

  // ─── Combined Control ────────────────────────────────────────────

  registry.register("set_controls", {
    name: "set_controls",
    description: "Set multiple flight controls at once (pitch, roll, yaw, throttle). Any omitted control keeps its current value. Use this for complex maneuvers.",
    parameters: {
      pitch: { type: "number", description: "Pitch input (-1 to 1)", minimum: -1, maximum: 1 },
      roll: { type: "number", description: "Roll input (-1 to 1)", minimum: -1, maximum: 1 },
      yaw: { type: "number", description: "Yaw input (-1 to 1)", minimum: -1, maximum: 1 },
      throttle: { type: "number", description: "Throttle (0-1)", minimum: 0, maximum: 1 },
      afterburner: { type: "boolean", description: "Enable afterburner" },
    },
  }, (params, _ctx) => {
    const controls: Partial<FlightControls> = {};
    if (params.pitch !== undefined) controls.pitch = num(params, "pitch");
    if (params.roll !== undefined) controls.roll = num(params, "roll");
    if (params.yaw !== undefined) controls.yaw = num(params, "yaw");
    if (params.throttle !== undefined) controls.throttle = num(params, "throttle");
    if (params.afterburner !== undefined) controls.afterburner = params.afterburner === true;
    flightEngine?.setControls(controls);
    return { success: true, message: `Controls updated: ${JSON.stringify(controls)}` };
  }, "flight");

  // ─── Neutral Controls ────────────────────────────────────────────

  registry.register("neutral_controls", {
    name: "neutral_controls",
    description: "Reset all flight controls to neutral (zero pitch, roll, yaw; keep throttle). Useful for stabilizing the aircraft.",
    parameters: {},
  }, () => {
    flightEngine?.setControls({ pitch: 0, roll: 0, yaw: 0 });
    return { success: true, message: "All controls neutralized" };
  }, "flight");

  // ─── Gear Control ────────────────────────────────────────────────

  registry.register("toggle_gear", {
    name: "toggle_gear",
    description: "Retract or extend the landing gear. Gear down increases drag but is required for landing.",
    parameters: {
      gear_down: { type: "boolean", description: "true = extend gear, false = retract gear" },
    },
  }, (params, _ctx) => {
    const down = params.gear_down !== undefined ? params.gear_down === true : !gameState.aircraft.gearDown;
    flightEngine?.setControls({ gearDown: down });
    return { success: true, message: `Landing gear ${down ? "extended" : "retracted"}` };
  }, "flight");

  // ─── Flaps Control ───────────────────────────────────────────────

  registry.register("set_flaps", {
    name: "set_flaps",
    description: "Set flap deployment. 0 = retracted, 1 = full flaps. Flaps increase lift and drag, useful for takeoff and landing.",
    parameters: {
      flaps: { type: "number", description: "Flap setting (0-1)", required: true, minimum: 0, maximum: 1 },
    },
  }, (params, _ctx) => {
    const flaps = num(params, "flaps", 0);
    flightEngine?.setControls({ flaps });
    return { success: true, message: `Flaps set to ${Math.round(flaps * 100)}%` };
  }, "flight");

  // ─── Speed Brake ─────────────────────────────────────────────────

  registry.register("toggle_speedbrake", {
    name: "toggle_speedbrake",
    description: "Toggle the speed brake (airbrake). Extending increases drag significantly for deceleration or steep descents.",
    parameters: {
      extended: { type: "boolean", description: "true = extend speed brake, false = retract" },
    },
  }, (params, _ctx) => {
    const ext = params.extended !== undefined ? params.extended === true : !gameState.aircraft.speedBrake;
    flightEngine?.setControls({ speedBrake: ext });
    return { success: true, message: `Speed brake ${ext ? "extended" : "retracted"}` };
  }, "flight");

  // ─── Brake Control ───────────────────────────────────────────────

  registry.register("set_brake", {
    name: "set_brake",
    description: "Set wheel brake pressure. Only effective on the ground. 0 = no brakes, 1 = maximum braking.",
    parameters: {
      brake: { type: "number", description: "Brake pressure (0-1)", required: true, minimum: 0, maximum: 1 },
    },
  }, (params, _ctx) => {
    const brake = num(params, "brake", 0);
    flightEngine?.setControls({ brake });
    return { success: true, message: `Brakes set to ${Math.round(brake * 100)}%` };
  }, "flight");

  // ─── Aircraft Selection ──────────────────────────────────────────

  registry.register("select_aircraft", {
    name: "select_aircraft",
    description: "Select a different aircraft. Available: F-16C Viper, F-35C Lightning II, F/A-18E Super Hornet, F-14B Tomcat, MiG-29 Fulcrum, Su-57 Felon.",
    parameters: {
      aircraft: {
        type: "string",
        description: "Aircraft type",
        required: true,
        enum: Object.keys(AIRCRAFT_PERF),
      },
    },
  }, (params, _ctx) => {
    const type = str(params, "aircraft");
    if (!AIRCRAFT_PERF[type]) {
      return { success: false, error: `Unknown aircraft: ${type}. Available: ${Object.keys(AIRCRAFT_PERF).join(", ")}` };
    }
    const perf = AIRCRAFT_PERF[type];
    gameState.aircraft.type = type;
    gameState.aircraft.name = perf.name;
    gameState.aircraft.loadout.gunCapacity = perf.gunCapacity;
    bus.emit(GameEvents.AIRCRAFT_SPAWN, { type });
    return { success: true, message: `Selected ${perf.name}`, data: { name: perf.name, maxMach: perf.maxMach, gLimit: perf.gLimit } };
  }, "flight");

  // ─── Takeoff Command ─────────────────────────────────────────────

  registry.register("takeoff", {
    name: "takeoff",
    description: "Configure the aircraft for takeoff: full throttle, afterburner, gear down, flaps set. Then advance throttle to begin the takeoff roll.",
    parameters: {},
  }, () => {
    flightEngine?.setControls({ throttle: 1, afterburner: true, gearDown: true, flaps: 0.3, pitch: 0, roll: 0, yaw: 0, brake: 0 });
    return { success: true, message: "Takeoff config: Full AB, gear down, flaps 30%. Advance throttle to rotate at 160+ kts." };
  }, "flight");

  // ─── Landing Configuration ────────────────────────────────────────

  registry.register("configure_landing", {
    name: "configure_landing",
    description: "Configure the aircraft for landing: gear down, full flaps, speed brake ready, throttle idle. Use before final approach.",
    parameters: {},
  }, () => {
    flightEngine?.setControls({ throttle: 0.1, gearDown: true, flaps: 1, speedBrake: true, pitch: 0, roll: 0 });
    return { success: true, message: "Landing config: Gear down, full flaps, speed brake out, throttle idle" };
  }, "flight");

  // ─── Level Flight ─────────────────────────────────────────────────

  registry.register("level_flight", {
    name: "level_flight",
    description: "Stabilize the aircraft in straight and level flight. Neutralizes all control surfaces and sets throttle to maintain current speed.",
    parameters: {},
  }, (_params, ctx) => {
    const speed = ctx.aircraft?.speed ?? 0;
    const throttle = Math.min(speed / 200, 0.8);
    flightEngine?.setControls({ pitch: 0, roll: 0, yaw: 0, throttle, afterburner: false });
    return { success: true, message: `Level flight: throttle ${Math.round(throttle * 100)}%` };
  }, "flight");
}
