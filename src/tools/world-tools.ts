/**
 * World Tools — environment, weather, time-of-day, and navigation.
 * The AI can change any world parameter just like a human uses the settings menu.
 */

import { registry } from "../core/registry.js";
import { gameState } from "../core/state.js";
import { bus, GameEvents } from "../core/events.js";
import { ENVIRONMENTS, WEATHER_PRESETS, TIME_PRESETS } from "../world/world.js";

let worldEngine: import("../world/world.js").WorldEngine | null = null;

export function setWorldEngine(engine: import("../world/world.js").WorldEngine): void {
  worldEngine = engine;
}

function str(params: Record<string, unknown>, key: string, def = ""): string {
  return typeof params[key] === "string" ? params[key] as string : def;
}

export function registerWorldTools(): void {
  // ─── Environment Selection ────────────────────────────────────────

  registry.register("set_environment", {
    name: "set_environment",
    description: "Change the flying environment/airfield. Available: Nellis AFB, Hill AFB, NAS Key West, NAS Fallon, MCAS Miramar, Edwards AFB, JBER Elmendorf, Pacific/Carrier.",
    parameters: {
      environment: {
        type: "string",
        description: "Environment ID",
        required: true,
        enum: Object.keys(ENVIRONMENTS),
      },
    },
  }, (params, _ctx) => {
    const envId = str(params, "environment");
    if (!ENVIRONMENTS[envId]) {
      return { success: false, error: `Unknown environment: ${envId}. Available: ${Object.keys(ENVIRONMENTS).join(", ")}` };
    }
    worldEngine?.setEnvironment(envId);
    return { success: true, message: `Environment changed to ${ENVIRONMENTS[envId].name}`, data: { environment: ENVIRONMENTS[envId] } };
  }, "world");

  // ─── Weather Control ─────────────────────────────────────────────

  registry.register("set_weather", {
    name: "set_weather",
    description: "Set weather conditions: clear, scattered clouds, overcast, rain, or storm. Affects visibility, cloud coverage, turbulence, and ground wetness.",
    parameters: {
      weather: {
        type: "string",
        description: "Weather preset",
        required: true,
        enum: Object.keys(WEATHER_PRESETS),
      },
    },
  }, (params, _ctx) => {
    const weather = str(params, "weather");
    if (!WEATHER_PRESETS[weather]) {
      return { success: false, error: `Unknown weather: ${weather}. Available: ${Object.keys(WEATHER_PRESETS).join(", ")}` };
    }
    worldEngine?.setWeather(weather);
    return { success: true, message: `Weather set to ${weather}`, data: WEATHER_PRESETS[weather] };
  }, "world");

  // ─── Time of Day ─────────────────────────────────────────────────

  registry.register("set_time_of_day", {
    name: "set_time_of_day",
    description: "Set the time of day: morning, afternoon, golden hour, sunset, dusk, or night. Changes sun position, lighting, and sky color.",
    parameters: {
      time: {
        type: "string",
        description: "Time of day preset",
        required: true,
        enum: Object.keys(TIME_PRESETS),
      },
    },
  }, (params, _ctx) => {
    const tod = str(params, "time");
    if (!TIME_PRESETS[tod]) {
      return { success: false, error: `Unknown time: ${tod}. Available: ${Object.keys(TIME_PRESETS).join(", ")}` };
    }
    worldEngine?.setTimeOfDay(tod);
    return { success: true, message: `Time of day set to ${tod}`, data: TIME_PRESETS[tod] };
  }, "world");

  // ─── Wind Control ────────────────────────────────────────────────

  registry.register("set_wind", {
    name: "set_wind",
    description: "Set wind direction and speed. Wind affects aircraft handling, especially during takeoff and landing.",
    parameters: {
      direction: { type: "number", description: "Wind direction in degrees (0-359)", minimum: 0, maximum: 359 },
      speed: { type: "number", description: "Wind speed in knots", minimum: 0, maximum: 100 },
    },
  }, (params, _ctx) => {
    const dir = typeof params.direction === "number" ? params.direction : gameState.world.windDirection;
    const spd = typeof params.speed === "number" ? params.speed : gameState.world.windSpeed;
    gameState.updateWorld({ windDirection: dir, windSpeed: spd / 1.94384 }); // convert kts to m/s
    return { success: true, message: `Wind: ${Math.round(dir)}° at ${Math.round(spd)} kts` };
  }, "world");

  // ─── Get World Info ──────────────────────────────────────────────

  registry.register("get_world_info", {
    name: "get_world_info",
    description: "Get current world conditions: environment, weather, time of day, wind, and visibility.",
    parameters: {},
  }, (_params, ctx) => {
    return {
      success: true,
      data: {
        environment: ctx.world.environment,
        weather: ctx.world.weather,
        time_of_day: ctx.world.timeOfDay,
        wind_direction: Math.round(ctx.world.windDirection) + "°",
        wind_speed: Math.round(ctx.world.windSpeed * 1.94384) + " kts",
        visibility: Math.round(ctx.world.visibility) + " m",
      },
      message: `World: ${ctx.world.environment} | ${ctx.world.weather.preset} | ${ctx.world.timeOfDay.preset} | Wind ${Math.round(ctx.world.windDirection)}° at ${Math.round(ctx.world.windSpeed * 1.94384)} kts`,
    };
  }, "world");

  // ─── List Environments ───────────────────────────────────────────

  registry.register("list_environments", {
    name: "list_environments",
    description: "List all available environments with their names and IDs.",
    parameters: {},
  }, () => {
    const envs = Object.entries(ENVIRONMENTS).map(([id, env]) => ({
      id,
      name: env.name,
      has_water: env.hasWater,
      has_snow: env.hasSnow,
    }));
    return { success: true, data: envs, message: `Available environments: ${envs.map(e => e.name).join(", ")}` };
  }, "world");
}
