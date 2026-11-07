/**
 * Game State — central mutable state for the entire simulation.
 * Tools read from and write to this state. The AI receives a snapshot
 * of it as ToolContext for every function call.
 */

import type {
  GameState, AircraftState, WorldState, MissionState,
  LoadoutState, WeatherState, TimeOfDayState,
} from "./types.js";
import { bus, GameEvents } from "./events.js";

/** Default aircraft state factory */
function createDefaultAircraft(): AircraftState {
  return {
    id: "player-1",
    type: "f16c",
    name: "F-16C Viper",
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    attitude: { pitch: 0, roll: 0, yaw: 0 },
    speed: 0,
    mach: 0,
    altitude: 0,
    altitudeMSL: 0,
    heading: 0,
    gForce: 1,
    angleOfAttack: 0,
    throttle: 0,
    afterburner: false,
    fuel: 3000,
    fuelPercent: 100,
    gearDown: true,
    flaps: 0,
    speedBrake: false,
    onGround: true,
    onCarrier: false,
    stalled: false,
    ejected: false,
    destroyed: false,
    loadout: createDefaultLoadout(),
  };
}

function createDefaultLoadout(): LoadoutState {
  return {
    gunRounds: 511,
    gunCapacity: 511,
    missiles: [{ type: "AIM-9X", count: 2 }],
    bombs: [],
    flares: 30,
    chaff: 30,
    selectedStation: 0,
    masterArm: false,
  };
}

function createDefaultWeather(): WeatherState {
  return {
    preset: "clear",
    rainIntensity: 0,
    cloudCoverage: 0.3,
    cloudBase: 2000,
    cloudTop: 5000,
    turbulence: 0.1,
  };
}

function createDefaultTimeOfDay(): TimeOfDayState {
  return {
    preset: "afternoon",
    sunAzimuth: 180,
    sunElevation: 45,
    ambientLight: 1.0,
  };
}

function createDefaultWorld(): WorldState {
  return {
    environment: "nellis",
    terrainHeightAtPlayer: 0,
    weather: createDefaultWeather(),
    timeOfDay: createDefaultTimeOfDay(),
    windDirection: 270,
    windSpeed: 3,
    visibility: 20000,
  };
}

/** Mutable game state */
class GameStateStore {
  state: GameState = {
    mode: "loading",
    paused: false,
    time: 0,
    timeScale: 1,
    playerAircraftId: "player-1",
    playerCallsign: "VIPER",
    score: 0,
    credits: 0,
  };

  aircraft: AircraftState = createDefaultAircraft();
  world: WorldState = createDefaultWorld();
  mission: MissionState | null = null;

  /** Get a snapshot for tool context */
  getToolContext() {
    return {
      gameState: { ...this.state },
      aircraft: { ...this.aircraft },
      world: { ...this.world },
      mission: this.mission ? { ...this.mission } : null,
    };
  }

  /** Reset to initial state */
  reset(): void {
    this.state = {
      mode: "loading",
      paused: false,
      time: 0,
      timeScale: 1,
      playerAircraftId: "player-1",
      playerCallsign: "VIPER",
      score: 0,
      credits: 0,
    };
    this.aircraft = createDefaultAircraft();
    this.world = createDefaultWorld();
    this.mission = null;
  }

  /** Start a new game session */
  start(mode: GameState["mode"]): void {
    this.state.mode = mode;
    this.state.paused = false;
    bus.emit(GameEvents.GAME_START, { mode });
  }

  /** Update aircraft state */
  updateAircraft(updates: Partial<AircraftState>): void {
    Object.assign(this.aircraft, updates);
    bus.emit(GameEvents.AIRCRAFT_UPDATE, this.aircraft);
  }

  /** Update world state */
  updateWorld(updates: Partial<WorldState>): void {
    Object.assign(this.world, updates);
  }

  /** Add score */
  addScore(points: number): void {
    this.state.score += points;
  }
}

export const gameState = new GameStateStore();
