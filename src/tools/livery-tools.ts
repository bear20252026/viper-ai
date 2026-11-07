/**
 * Livery Tools — AI-callable tools for aircraft customization.
 * The AI can change paint schemes, finishes, and inspect the hangar.
 */

import { registry } from "../core/registry.js";
import { LIVERIES } from "../engine/livery.js";

let liverySystem: import("../engine/livery.js").LiverySystem | null = null;

export function setLiverySystem(system: import("../engine/livery.js").LiverySystem): void {
  liverySystem = system;
}

function str(params: Record<string, unknown>, key: string, def = ""): string {
  return typeof params[key] === "string" ? params[key] as string : def;
}

export function registerLiveryTools(): void {
  // ─── Apply Livery ────────────────────────────────────────────────

  registry.register("set_livery", {
    name: "set_livery",
    description: "Apply a paint scheme to the aircraft. Choose from 50+ liveries including tactical, special, and premium finishes. Each livery has unique colors, patterns, and effects.",
    parameters: {
      livery: {
        type: "string",
        description: "Livery ID to apply",
        required: true,
        enum: Object.keys(LIVERIES),
      },
    },
  }, (params, _ctx) => {
    const id = str(params, "livery");
    const livery = LIVERIES[id];
    if (!livery) {
      return { success: false, error: `Unknown livery: ${id}. Use list_liveries to see available options.` };
    }
    liverySystem?.applyLivery(livery);
    return {
      success: true,
      message: `Applied "${livery.name}" — ${livery.description}`,
      data: { livery },
    };
  }, "livery");

  // ─── Get Current Livery ──────────────────────────────────────────

  registry.register("get_current_livery", {
    name: "get_current_livery",
    description: "Get the currently applied paint scheme and its details.",
    parameters: {},
  }, (_params, _ctx) => {
    const current = liverySystem?.getLivery() ?? LIVERIES.stock;
    return {
      success: true,
      data: { livery: current },
      message: `Current livery: ${current.name} — ${current.description}`,
    };
  }, "livery");

  // ─── List Liveries ───────────────────────────────────────────────

  registry.register("list_liveries", {
    name: "list_liveries",
    description: "List all available paint schemes. Use set_livery to apply one.",
    parameters: {
      category: {
        type: "string",
        description: "Filter by category",
        enum: ["all", "standard", "special", "shop"],
      },
    },
  }, (params, _ctx) => {
    const category = str(params, "category", "all");
    let liveries;
    if (category === "all" || !category) {
      liveries = Object.values(LIVERIES);
    } else {
      liveries = liverySystem?.getLiveriesByCategory(category as "standard" | "special" | "shop") ?? [];
    }
    return {
      success: true,
      data: liveries.map(l => ({
        id: l.id,
        name: l.name,
        finish: l.finish,
        pattern: l.pattern,
        description: l.description,
      })),
      message: `${liveries.length} liveries available: ${liveries.map(l => l.name).join(", ")}`,
    };
  }, "livery");

  // ─── Get Livery Details ──────────────────────────────────────────

  registry.register("get_livery_details", {
    name: "get_livery_details",
    description: "Get detailed information about a specific paint scheme including colors, finish, and pattern.",
    parameters: {
      livery: {
        type: "string",
        description: "Livery ID",
        required: true,
        enum: Object.keys(LIVERIES),
      },
    },
  }, (params, _ctx) => {
    const id = str(params, "livery");
    const livery = LIVERIES[id];
    if (!livery) {
      return { success: false, error: `Unknown livery: ${id}` };
    }
    return {
      success: true,
      data: { livery },
      message: `${livery.name}: ${livery.description} | Finish: ${livery.finish} | Pattern: ${livery.pattern} | Colors: ${livery.baseColor}/${livery.accentColor}/${livery.inkColor}`,
    };
  }, "livery");

  // ─── Random Livery ───────────────────────────────────────────────

  registry.register("random_livery", {
    name: "random_livery",
    description: "Apply a random paint scheme to the aircraft. Fun for discovering new looks!",
    parameters: {},
  }, () => {
    const ids = Object.keys(LIVERIES);
    const randomId = ids[Math.floor(Math.random() * ids.length)];
    const livery = LIVERIES[randomId];
    liverySystem?.applyLivery(livery);
    return {
      success: true,
      message: `🎲 Random livery applied: "${livery.name}" — ${livery.description}`,
      data: { livery },
    };
  }, "livery");
}
