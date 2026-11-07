/**
 * Mission Tools — game mode, scoring, mission control, and system management.
 * The AI can start missions, check objectives, and manage game state.
 */

import { registry } from "../core/registry.js";
import { gameState } from "../core/state.js";
import { bus, GameEvents } from "../core/events.js";

export function registerMissionTools(): void {
  // ─── Get Game Status ─────────────────────────────────────────────

  registry.register("get_game_status", {
    name: "get_game_status",
    description: "Get the overall game status: current mode, score, time, player callsign, and whether the game is paused.",
    parameters: {},
  }, (_params, ctx) => {
    return {
      success: true,
      data: {
        mode: ctx.gameState.mode,
        paused: ctx.gameState.paused,
        time_seconds: Math.round(ctx.gameState.time),
        score: ctx.gameState.score,
        callsign: ctx.gameState.playerCallsign,
        credits: ctx.gameState.credits,
      },
      message: `Game: ${ctx.gameState.mode} | Score: ${ctx.gameState.score} | Time: ${Math.round(ctx.gameState.time)}s`,
    };
  }, "mission");

  // ─── Get Mission Objectives ──────────────────────────────────────

  registry.register("get_objectives", {
    name: "get_objectives",
    description: "Get the current mission objectives and their completion status.",
    parameters: {},
  }, (_params, ctx) => {
    if (!ctx.mission) {
      return { success: true, data: [], message: "No active mission" };
    }
    return {
      success: true,
      data: ctx.mission.objectives,
      message: `Mission: ${ctx.mission.name} | ${ctx.mission.objectives.filter(o => o.completed).length}/${ctx.mission.objectives.length} objectives complete`,
    };
  }, "mission");

  // ─── Start Free Flight ───────────────────────────────────────────

  registry.register("start_free_flight", {
    name: "start_free_flight",
    description: "Start a free flight session. No objectives, just fly. Aircraft starts on the runway at the selected environment.",
    parameters: {},
  }, () => {
    gameState.start("flying");
    bus.emit(GameEvents.GAME_MODE_CHANGE, { mode: "free" });
    return { success: true, message: "Free flight started. Aircraft is on the runway. Use takeoff to begin." };
  }, "mission");

  // ─── Start Dogfight ──────────────────────────────────────────────

  registry.register("start_dogfight", {
    name: "start_dogfight",
    description: "Start a dogfight against AI bandits. Spawns enemy aircraft and begins combat.",
    parameters: {
      difficulty: { type: "string", description: "AI difficulty", enum: ["rookie", "pilot", "ace"], default: "pilot" },
      bandit_count: { type: "integer", description: "Number of enemy aircraft", minimum: 1, maximum: 6, default: 2 },
    },
  }, (params, _ctx) => {
    const difficulty = typeof params.difficulty === "string" ? params.difficulty : "pilot";
    const count = typeof params.bandit_count === "number" ? Math.floor(params.bandit_count) : 2;
    gameState.start("flying");
    // Note: actual bandit spawning happens in the game initialization
    bus.emit(GameEvents.GAME_MODE_CHANGE, { mode: "dogfight", difficulty, banditCount: count });
    return {
      success: true,
      message: `Dogfight started! ${count} bandit(s) at ${difficulty} skill level. Check get_bandits for positions.`,
      data: { difficulty, banditCount: count },
    };
  }, "mission");

  // ─── Pause/Resume ────────────────────────────────────────────────

  registry.register("pause_game", {
    name: "pause_game",
    description: "Pause the game simulation.",
    parameters: {},
  }, () => {
    gameState.state.paused = true;
    bus.emit(GameEvents.GAME_PAUSE);
    return { success: true, message: "Game paused" };
  }, "mission");

  registry.register("resume_game", {
    name: "resume_game",
    description: "Resume the game simulation.",
    parameters: {},
  }, () => {
    gameState.state.paused = false;
    bus.emit(GameEvents.GAME_RESUME);
    return { success: true, message: "Game resumed" };
  }, "mission");

  // ─── Time Scale ──────────────────────────────────────────────────

  registry.register("set_time_scale", {
    name: "set_time_scale",
    description: "Set the simulation time scale. 1 = real-time, 2 = twice as fast, 0.5 = half speed, 0 = paused.",
    parameters: {
      scale: { type: "number", description: "Time scale multiplier (0-10)", required: true, minimum: 0, maximum: 10 },
    },
  }, (params, _ctx) => {
    const scale = typeof params.scale === "number" ? params.scale : 1;
    gameState.state.timeScale = scale;
    return { success: true, message: `Time scale set to ${scale}x` };
  }, "mission");

  // ─── Get Score ───────────────────────────────────────────────────

  registry.register("get_score", {
    name: "get_score",
    description: "Get the current score and credits earned.",
    parameters: {},
  }, (_params, ctx) => {
    return {
      success: true,
      data: { score: ctx.gameState.score, credits: ctx.gameState.credits },
      message: `Score: ${ctx.gameState.score} | Credits: ${ctx.gameState.credits}`,
    };
  }, "mission");

  // ─── List All Tools ──────────────────────────────────────────────

  registry.register("list_tools", {
    name: "list_tools",
    description: "List all available AI tools that can be called. Use this to discover what the AI can do.",
    parameters: {},
  }, () => {
    const tools = registry.names;
    const categories: Record<string, string[]> = {};
    for (const name of tools) {
      // Get category from registry
      const cats = registry.getByCategory("flight").includes(name) ? "flight"
        : registry.getByCategory("world").includes(name) ? "world"
        : registry.getByCategory("combat").includes(name) ? "combat"
        : registry.getByCategory("navigation").includes(name) ? "navigation"
        : "mission";
      if (!categories[cats]) categories[cats] = [];
      categories[cats].push(name);
    }
    return {
      success: true,
      data: categories,
      message: `${tools.length} tools available: ${Object.entries(categories).map(([cat, names]) => `${cat} (${names.length})`).join(", ")}`,
    };
  }, "mission");
}
