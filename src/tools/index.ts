/**
 * Tool Registration — registers all game tools with the registry.
 * This is called once at startup to make every game function available to the AI.
 */

import { registerFlightTools, setFlightEngine as setFlightEngineTools } from "./flight-tools.js";
import { registerWorldTools, setWorldEngine as setWorldEngineTools } from "./world-tools.js";
import { registerCombatTools, setCombatSystem } from "./combat-tools.js";
import { registerNavigationTools, setFlightEngine as setNavFlightEngine } from "./navigation-tools.js";
import { registerMissionTools } from "./mission-tools.js";

export function registerAllTools(
  flightEngine: import("../engine/flight.js").FlightEngine,
  worldEngine: import("../world/world.js").WorldEngine,
  combatSystem: import("../combat/combat.js").CombatSystem
): void {
  // Set engine references for tools that need direct engine access
  setFlightEngineTools(flightEngine);
  setNavFlightEngine(flightEngine);
  setWorldEngineTools(worldEngine);
  setCombatSystem(combatSystem);

  // Register all tool categories
  registerFlightTools();
  registerWorldTools();
  registerCombatTools();
  registerNavigationTools();
  registerMissionTools();

  console.log(`[Tools] Registered all tools`);
}
