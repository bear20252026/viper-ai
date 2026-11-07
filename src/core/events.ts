/**
 * Event Bus — decoupled communication between engine, UI, AI, and tools.
 * The game emits events; tools and AI subscribe to them.
 */

type EventCallback = (data: unknown) => void;

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, data?: unknown): void {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[EventBus] Error in listener for "${event}":`, err);
      }
    });
  }

  once(event: string, callback: EventCallback): void {
    const wrapper = (data: unknown) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const bus = new EventBus();

/** Standard game events */
export const GameEvents = {
  // Lifecycle
  GAME_INIT: "game:init",
  GAME_START: "game:start",
  GAME_PAUSE: "game:pause",
  GAME_RESUME: "game:resume",
  GAME_MODE_CHANGE: "game:mode_change",
  
  // Aircraft
  AIRCRAFT_SPAWN: "aircraft:spawn",
  AIRCRAFT_UPDATE: "aircraft:update",
  AIRCRAFT_DESTROYED: "aircraft:destroyed",
  AIRCRAFT_EJECT: "aircraft:eject",
  AIRCRAFT_LAND: "aircraft:land",
  AIRCRAFT_TAKEOFF: "aircraft:takeoff",
  AIRCRAFT_STALL: "aircraft:stall",
  
  // Combat
  WEAPON_FIRE: "combat:weapon_fire",
  WEAPON_HIT: "combat:weapon_hit",
  MISSILE_LAUNCH: "combat:missile_launch",
  MISSILE_HIT: "combat:missile_hit",
  GUN_FIRE: "combat:gun_fire",
  FLARE_DEPLOY: "combat:flare_deploy",
  DAMAGE_TAKEN: "combat:damage_taken",
  KILL_CONFIRMED: "combat:kill_confirmed",
  
  // World
  WEATHER_CHANGE: "world:weather_change",
  TIME_CHANGE: "world:time_change",
  ENVIRONMENT_CHANGE: "world:environment_change",
  
  // AI
  AI_COMMAND: "ai:command",
  AI_RESPONSE: "ai:response",
  AI_TOOL_CALL: "ai:tool_call",
  AI_ERROR: "ai:error",
  
  // Mission
  MISSION_START: "mission:start",
  MISSION_COMPLETE: "mission:complete",
  MISSION_OBJECTIVE: "mission:objective",
  MISSION_FAIL: "mission:fail",
  
  // UI
  UI_MENU_SHOW: "ui:menu_show",
  UI_MENU_HIDE: "ui:menu_hide",
  UI_HUD_UPDATE: "ui:hud_update",
  UI_MESSAGE: "ui:message",
} as const;
