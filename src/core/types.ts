/**
 * Tool Definition — the atomic unit of AI-game interaction.
 * Every game function (flight control, weapons, weather, etc.) is
 * registered as a tool with a JSON Schema so the AI can call it
 * with the same authority as a human player.
 */

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "integer" | "array" | "object";
  description: string;
  enum?: (string | number | boolean)[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
  required?: boolean;
  default?: unknown;
  minimum?: number;
  maximum?: number;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  /** Whether this tool is available to the AI in the current game state */
  available?: (ctx: ToolContext) => boolean;
}

export interface ToolContext {
  gameState: GameState;
  aircraft: AircraftState | null;
  world: WorldState;
  mission: MissionState | null;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export type ToolHandler = (params: Record<string, unknown>, ctx: ToolContext) => ToolResult | Promise<ToolResult>;

export interface RegisteredTool {
  schema: ToolSchema;
  handler: ToolHandler;
}

/** Game state snapshot passed to every tool */
export interface GameState {
  mode: "menu" | "loading" | "flying" | "paused" | "mission_complete";
  paused: boolean;
  time: number; // simulation time in seconds
  timeScale: number;
  playerAircraftId: string;
  playerCallsign: string;
  score: number;
  credits: number;
}

export interface AircraftState {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number; z: number }; // meters, local scene coords
  velocity: { x: number; y: number; z: number }; // m/s
  attitude: { pitch: number; roll: number; yaw: number }; // radians
  speed: number; // m/s (TAS)
  mach: number;
  altitude: number; // meters AGL (above ground)
  altitudeMSL: number; // meters above sea level
  heading: number; // degrees
  gForce: number;
  angleOfAttack: number; // degrees
  throttle: number; // 0-1
  afterburner: boolean;
  fuel: number; // kg
  fuelPercent: number;
  gearDown: boolean;
  flaps: number; // 0-1
  speedBrake: boolean;
  onGround: boolean;
  onCarrier: boolean;
  stalled: boolean;
  ejected: boolean;
  destroyed: boolean;
  loadout: LoadoutState;
}

export interface LoadoutState {
  gunRounds: number;
  gunCapacity: number;
  missiles: { type: string; count: number }[];
  bombs: { type: string; count: number }[];
  flares: number;
  chaff: number;
  selectedStation: number;
  masterArm: boolean;
}

export interface WorldState {
  environment: string;
  terrainHeightAtPlayer: number;
  weather: WeatherState;
  timeOfDay: TimeOfDayState;
  windDirection: number; // degrees
  windSpeed: number; // m/s
  visibility: number; // meters
}

export interface WeatherState {
  preset: string;
  rainIntensity: number;
  cloudCoverage: number;
  cloudBase: number;
  cloudTop: number;
  turbulence: number;
}

export interface TimeOfDayState {
  preset: string;
  sunAzimuth: number;
  sunElevation: number;
  ambientLight: number;
}

export interface MissionState {
  id: string;
  name: string;
  currentObjective: string;
  objectives: ObjectiveState[];
  score: number;
  timeRemaining: number | null;
  bandits: BanditState[];
  allies: AllyState[];
}

export interface ObjectiveState {
  id: string;
  text: string;
  completed: boolean;
  optional: boolean;
}

export interface BanditState {
  id: string;
  aircraftType: string;
  position: { x: number; y: number; z: number };
  altitude: number;
  heading: number;
  speed: number;
  skill: string;
  alive: boolean;
  locked: boolean;
}

export interface AllyState {
  id: string;
  aircraftType: string;
  position: { x: number; y: number; z: number };
  callsign: string;
  alive: boolean;
}
