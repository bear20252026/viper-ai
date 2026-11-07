/**
 * Navigation & Autopilot Tools — route planning, heading control, altitude control.
 * The AI can navigate to waypoints, set headings, and control altitude.
 */

import { registry } from "../core/registry.js";
import { gameState } from "../core/state.js";
import { bus, GameEvents } from "../core/events.js";

let flightEngine: import("../engine/flight.js").FlightEngine | null = null;

export function setFlightEngine(engine: import("../engine/flight.js").FlightEngine): void {
  flightEngine = engine;
}

export function registerNavigationTools(): void {
  // ─── Set Heading ─────────────────────────────────────────────────

  registry.register("set_heading", {
    name: "set_heading",
    description: "Turn the aircraft to a specific magnetic heading (0-359 degrees). The aircraft will roll and yaw to achieve the target heading.",
    parameters: {
      heading: { type: "number", description: "Target heading in degrees (0-359)", required: true, minimum: 0, maximum: 359 },
      rate: { type: "number", description: "Turn rate (0-1, default 0.5)", minimum: 0, maximum: 1 },
    },
  }, (params, ctx) => {
    const targetHeading = typeof params.heading === "number" ? params.heading : 0;
    const rate = typeof params.rate === "number" ? params.rate : 0.5;
    const currentHeading = ctx.aircraft?.heading ?? 0;
    let diff = targetHeading - currentHeading;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    const rollInput = Math.max(-1, Math.min(1, diff / 45 * rate));
    const yawInput = Math.max(-1, Math.min(1, diff / 90 * rate));
    flightEngine?.setControls({ roll: rollInput, yaw: yawInput });
    return {
      success: true,
      message: `Turning to heading ${Math.round(targetHeading)}° (currently ${Math.round(currentHeading)}°, diff ${Math.round(diff)}°)`,
      data: { target: targetHeading, current: Math.round(currentHeading), diff: Math.round(diff) },
    };
  }, "navigation");

  // ─── Set Altitude ────────────────────────────────────────────────

  registry.register("set_altitude", {
    name: "set_altitude",
    description: "Climb or descend to a target altitude. Specify the altitude in feet and the climb/descent rate.",
    parameters: {
      altitude_ft: { type: "number", description: "Target altitude in feet MSL", required: true, minimum: 0, maximum: 60000 },
      vertical_speed: { type: "number", description: "Target vertical speed in feet per minute (-6000 to 6000)", minimum: -6000, maximum: 6000 },
    },
  }, (params, ctx) => {
    const targetAlt = typeof params.altitude_ft === "number" ? params.altitude_ft : 5000;
    const vs = typeof params.vertical_speed === "number" ? params.vertical_speed : 2000;
    const currentAlt = (ctx.aircraft?.altitude ?? 0) * 3.28084;
    const diff = targetAlt - currentAlt;
    const pitchInput = Math.max(-0.5, Math.min(0.5, diff / 1000 * 0.3));
    const throttle = diff > 500 ? 0.9 : diff < -500 ? 0.3 : 0.6;
    flightEngine?.setControls({ pitch: pitchInput, throttle });
    return {
      success: true,
      message: `${diff > 0 ? "Climbing" : "Descending"} to ${Math.round(targetAlt)} ft (currently ${Math.round(currentAlt)} ft, diff ${Math.round(diff)} ft)`,
      data: { target_ft: targetAlt, current_ft: Math.round(currentAlt), diff_ft: Math.round(diff), vertical_speed: vs },
    };
  }, "navigation");

  // ─── Set Speed ───────────────────────────────────────────────────

  registry.register("set_speed", {
    name: "set_speed",
    description: "Set a target airspeed. The aircraft will adjust throttle to achieve and maintain the target speed.",
    parameters: {
      speed_kts: { type: "number", description: "Target speed in knots", required: true, minimum: 0, maximum: 1500 },
    },
  }, (params, ctx) => {
    const targetKts = typeof params.speed_kts === "number" ? params.speed_kts : 300;
    const targetMs = targetKts / 1.94384;
    const currentMs = ctx.aircraft?.speed ?? 0;
    const diff = targetMs - currentMs;
    const throttle = Math.max(0, Math.min(1, 0.5 + diff / 100));
    flightEngine?.setControls({ throttle, afterburner: diff > 50 });
    return {
      success: true,
      message: `Target speed ${Math.round(targetKts)} kts (currently ${Math.round(currentMs * 1.94384)} kts, throttle ${Math.round(throttle * 100)}%)`,
      data: { target_kts: targetKts, current_kts: Math.round(currentMs * 1.94384) },
    };
  }, "navigation");

  // ─── Navigate to Waypoint ────────────────────────────────────────

  registry.register("navigate_to", {
    name: "navigate_to",
    description: "Navigate to a specific position in 3D space (x, y, z in meters). The aircraft will turn and adjust altitude to reach the target.",
    parameters: {
      x: { type: "number", description: "Target X coordinate (meters)", required: true },
      y: { type: "number", description: "Target altitude (meters)", required: true },
      z: { type: "number", description: "Target Z coordinate (meters)", required: true },
    },
  }, (params, ctx) => {
    const tx = typeof params.x === "number" ? params.x : 0;
    const ty = typeof params.y === "number" ? params.y : 1000;
    const tz = typeof params.z === "number" ? params.z : 0;
    const ac = ctx.aircraft!;
    const dx = tx - ac.position.x;
    const dz = tz - ac.position.z;
    const targetHeading = ((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360;
    const dist = Math.sqrt(dx * dx + dz * dz);
    let diff = targetHeading - ac.heading;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    const rollInput = Math.max(-1, Math.min(1, diff / 45));
    const altDiff = ty - ac.altitude;
    const pitchInput = Math.max(-0.5, Math.min(0.5, altDiff / 500));
    flightEngine?.setControls({ roll: rollInput, pitch: pitchInput });
    return {
      success: true,
      message: `Navigating to (${Math.round(tx)}, ${Math.round(ty)}, ${Math.round(tz)}). Distance ${Math.round(dist)}m, heading ${Math.round(targetHeading)}°, alt diff ${Math.round(altDiff)}m`,
      data: { distance_m: Math.round(dist), target_heading: Math.round(targetHeading), altitude_diff_m: Math.round(altDiff) },
    };
  }, "navigation");

  // ─── Return to Base ──────────────────────────────────────────────

  registry.register("return_to_base", {
    name: "return_to_base",
    description: "Turn toward the home airfield and begin navigating back. Sets a comfortable descent profile.",
    parameters: {},
  }, (_params, ctx) => {
    const ac = ctx.aircraft!;
    // Base is at origin (0, 0, 0)
    const dx = 0 - ac.position.x;
    const dz = 0 - ac.position.z;
    const targetHeading = ((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360;
    let diff = targetHeading - ac.heading;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    const rollInput = Math.max(-1, Math.min(1, diff / 45));
    flightEngine?.setControls({ roll: rollInput, pitch: -0.1, throttle: 0.5 });
    return {
      success: true,
      message: `Returning to base. Target heading ${Math.round(targetHeading)}°, distance ${Math.round(Math.sqrt(dx * dx + dz * dz))}m`,
      data: { target_heading: Math.round(targetHeading), distance_m: Math.round(Math.sqrt(dx * dx + dz * dz)) },
    };
  }, "navigation");
}
