/**
 * Campaign System — 12-mission campaign inspired by VIPER 11.
 * Each mission has objectives, bandits, briefing, and rewards.
 * The AI can start missions, check objectives, and track progress.
 */

import { gameState } from "../core/state.js";
import { bus, GameEvents } from "../core/events.js";
import type { MissionState, ObjectiveState, BanditState } from "../core/types.js";

export interface MissionObjective {
  id: string;
  text: string;
  type: "takeoff" | "navigate" | "destroy" | "identify" | "land" | "rtb" | "escort" | "defend" | "survive" | "strike" | "carrier";
  targetId?: string;
  targetPosition?: { x: number; y: number; z: number };
  requiredCount?: number;
  optional?: boolean;
}

export interface MissionDefinition {
  id: string;
  number: number;
  name: string;
  tagline: string;
  briefing: string;
  situation: string;
  plan: string;
  environment: string;
  timeOfDay: string;
  weather: string;
  aircraft: string;
  loadout: {
    missiles: { type: string; count: number }[];
    bombs: { type: string; count: number }[];
    flares: number;
  };
  objectives: MissionObjective[];
  bandits: {
    type: string;
    count: number;
    skill: string;
    startPosition: { x: number; y: number; z: number };
  }[];
  parTime: number; // seconds
  difficulty: "easy" | "medium" | "hard" | "extreme";
  achievements: string[];
  nextMission?: string;
}

export const CAMPAIGN: MissionDefinition[] = [
  {
    id: "scramble",
    number: 1,
    name: "Scramble",
    tagline: "Unknown contact heading toward Las Vegas",
    briefing: "An unknown aircraft is approaching Las Vegas from the northwest at 6,000 feet. You are the closest fighter. Launch immediately, intercept, and visually identify the contact. Return to base and land.",
    situation: "Unidentified aircraft, possibly civilian, heading toward restricted airspace.",
    plan: "1. Take off from runway 21L\n2. Intercept heading 330°\n3. Visual ID the contact\n4. Return to base and land",
    environment: "nellis",
    timeOfDay: "afternoon",
    weather: "clear",
    aircraft: "f16c",
    loadout: { missiles: [], bombs: [], flares: 30 },
    objectives: [
      { id: "takeoff", text: "Take off from runway 21L", type: "takeoff" },
      { id: "intercept", text: "Intercept the unknown contact", type: "navigate", targetPosition: { x: 15000, y: 1800, z: 15000 } },
      { id: "identify", text: "Visually identify the contact", type: "identify" },
      { id: "rtb", text: "Return to base and land", type: "land" },
    ],
    bandits: [{ type: "mig29", count: 1, skill: "rookie", startPosition: { x: 20000, y: 1800, z: 20000 } }],
    parTime: 600,
    difficulty: "easy",
    achievements: ["Wheels Up", "Eyes On", "Greaser"],
    nextMission: "intercept",
  },
  {
    id: "intercept",
    number: 2,
    name: "Intercept",
    tagline: "Two hostile fighters east of Las Vegas",
    briefing: "AWACS has detected two MiG-29 Fulcrums approaching from the east. They are armed with R-73 missiles and 30mm cannons. Intercept and splash both bandits. AWACS will provide vector support.",
    situation: "Two hostile fighters at 15,000 ft, closing at 400 knots.",
    plan: "1. Take off and climb to 15,000 ft\n2. Follow AWACS vectors east\n3. Engage and destroy both bandits\n4. Return to base",
    environment: "nellis",
    timeOfDay: "golden",
    weather: "clear",
    aircraft: "f16c",
    loadout: { missiles: [{ type: "AIM-9X", count: 4 }], bombs: [], flares: 30 },
    objectives: [
      { id: "takeoff", text: "Take off", type: "takeoff" },
      { id: "climb", text: "Climb to 15,000 ft", type: "navigate", targetPosition: { x: 0, y: 4572, z: 0 } },
      { id: "splash1", text: "Splash bandit 1", type: "destroy", targetId: "bandit-1" },
      { id: "splash2", text: "Splash bandit 2", type: "destroy", targetId: "bandit-2" },
      { id: "rtb", text: "Return to base", type: "rtb" },
    ],
    bandits: [
      { type: "mig29", count: 2, skill: "pilot", startPosition: { x: 30000, y: 4572, z: 0 } },
    ],
    parTime: 480,
    difficulty: "medium",
    achievements: ["Splash One", "Fox Two", "Guns Guns"],
    nextMission: "night",
  },
  {
    id: "night",
    number: 3,
    name: "Into the Night",
    tagline: "Night strike with laser-guided bombs",
    briefing: "Intel has identified a truck convoy in a village 25nm west. You will deliver a single GBU-12 Paveway II laser-guided bomb. Rules of engagement: avoid civilian structures. Night operations. Use your targeting pod for identification.",
    situation: "Target truck convoy stationary in village. Light winds. Clear night.",
    plan: "1. Take off at night\n2. Navigate to target area\n3. Identify truck with targeting pod\n4. Deliver GBU-12\n5. Return to base",
    environment: "nellis",
    timeOfDay: "night",
    weather: "clear",
    aircraft: "f16c",
    loadout: { missiles: [{ type: "AIM-9X", count: 2 }], bombs: [{ type: "GBU-12", count: 1 }], flares: 30 },
    objectives: [
      { id: "takeoff", text: "Take off", type: "takeoff" },
      { id: "navigate", text: "Navigate to target area", type: "navigate", targetPosition: { x: -46000, y: 3000, z: 0 } },
      { id: "strike", text: "Destroy the truck with GBU-12", type: "strike" },
      { id: "rtb", text: "Return to base", type: "rtb" },
    ],
    bandits: [{ type: "mig29", count: 2, skill: "pilot", startPosition: { x: -40000, y: 4000, z: 5000 } }],
    parTime: 600,
    difficulty: "medium",
    achievements: ["Night Strike", "Shack"],
    nextMission: "hunted",
  },
  {
    id: "hunted",
    number: 4,
    name: "Hunted",
    tagline: "You are the prey",
    briefing: "You are alone, low on fuel, and two ace-level Su-57 Felons are hunting you. Survive. Use terrain, speed, and your limited missiles. You have one AIM-9X and 412 rounds. Good luck.",
    situation: "Two Su-57 aces inbound from the north. You are at 8,000 ft with 40% fuel.",
    plan: "1. Defend yourself\n2. Survive the ambush\n3. Splash both bandits or escape",
    environment: "nellis",
    timeOfDay: "afternoon",
    weather: "clear",
    aircraft: "f16c",
    loadout: { missiles: [{ type: "AIM-9X", count: 1 }], bombs: [], flares: 4 },
    objectives: [
      { id: "survive", text: "Survive the ambush", type: "survive" },
      { id: "splash1", text: "Splash bandit 1 (optional)", type: "destroy", targetId: "bandit-1", optional: true },
      { id: "splash2", text: "Splash bandit 2 (optional)", type: "destroy", targetId: "bandit-2", optional: true },
    ],
    bandits: [
      { type: "su57", count: 2, skill: "ace", startPosition: { x: 0, y: 8000, z: -20000 } },
    ],
    parTime: 300,
    difficulty: "hard",
    achievements: ["Hunted", "Close Call"],
    nextMission: "samalley",
  },
  {
    id: "samalley",
    number: 5,
    name: "SAM Alley",
    tagline: "Surface-to-air missile threat",
    briefing: "An SA-6 battery is defending a strategic target. You must destroy the radar to enable follow-on strikes. The SAM site is in a valley. Use terrain masking and speed. You have AGM-88 HARMs and a targeting pod.",
    situation: "SA-6 Gainful radar active. Site defended by AAA.",
    plan: "1. Take off and navigate to the valley\n2. Use terrain to avoid radar\n3. Destroy the radar\n4. Return to base",
    environment: "nellis",
    timeOfDay: "afternoon",
    weather: "scattered",
    aircraft: "f16c",
    loadout: { missiles: [{ type: "AIM-9X", count: 2 }], bombs: [{ type: "GBU-12", count: 2 }], flares: 30 },
    objectives: [
      { id: "takeoff", text: "Take off", type: "takeoff" },
      { id: "navigate", text: "Navigate to the valley", type: "navigate", targetPosition: { x: -30000, y: 1000, z: -20000 } },
      { id: "destroy_radar", text: "Destroy the SA-6 radar", type: "strike" },
      { id: "rtb", text: "Return to base", type: "rtb" },
    ],
    bandits: [{ type: "mig29", count: 2, skill: "pilot", startPosition: { x: -25000, y: 4000, z: -15000 } }],
    parTime: 720,
    difficulty: "hard",
    achievements: ["Iron Hand"],
    nextMission: "furball",
  },
  {
    id: "furball",
    number: 6,
    name: "Furball",
    tagline: "Large-scale dogfight",
    briefing: "Multiple bandits inbound in a large furball. You have wingman support. Splash as many as you can. Blue chevrons for friendlies, red brackets for bandits. Par time 8 minutes.",
    situation: "6 bandits at various altitudes. Wingman on your wing.",
    plan: "1. Take off and climb\n2. Engage bandits\n3. Splash at least 3\n4. Return to base",
    environment: "nellis",
    timeOfDay: "afternoon",
    weather: "scattered",
    aircraft: "f16c",
    loadout: { missiles: [{ type: "AIM-9X", count: 6 }], bombs: [], flares: 30 },
    objectives: [
      { id: "takeoff", text: "Take off", type: "takeoff" },
      { id: "splash3", text: "Splash 3 bandits", type: "destroy", requiredCount: 3 },
      { id: "rtb", text: "Return to base", type: "rtb" },
    ],
    bandits: [{ type: "mig29", count: 6, skill: "pilot", startPosition: { x: 20000, y: 5000, z: 20000 } }],
    parTime: 480,
    difficulty: "hard",
    achievements: ["Knife Fight", "Notched"],
    nextMission: "carrier",
  },
  {
    id: "carrier",
    number: 7,
    name: "Carrier",
    tagline: "Carrier launch and recovery",
    briefing: "You are on the USS Carl Vinson (CVN-70) in the Pacific. Launch from the catapult, fly a combat air patrol, then recover aboard the carrier. Practice your carrier landing skills.",
    situation: "Carrier at sea. Calm conditions. Day operations.",
    plan: "1. Catapult launch\n2. Climb to 10,000 ft\n3. Fly CAP for 5 minutes\n4. Return and carrier landing",
    environment: "carrier",
    timeOfDay: "afternoon",
    weather: "clear",
    aircraft: "f16c",
    loadout: { missiles: [{ type: "AIM-9X", count: 2 }], bombs: [], flares: 30 },
    objectives: [
      { id: "launch", text: "Catapult launch", type: "carrier" },
      { id: "climb", text: "Climb to 10,000 ft", type: "navigate", targetPosition: { x: 0, y: 3048, z: 0 } },
      { id: "cap", text: "Fly CAP for 5 minutes", type: "navigate" },
      { id: "recover", text: "Carrier landing", type: "carrier" },
    ],
    bandits: [],
    parTime: 900,
    difficulty: "medium",
    achievements: ["Greaser"],
    nextMission: "bomber-stream",
  },
  {
    id: "bomber-stream",
    number: 8,
    name: "Bomber Stream",
    tagline: "Intercept the bomber stream",
    briefing: "A stream of enemy bombers is heading toward our fleet. Intercept and destroy as many as possible before they reach their launch points. Time is critical.",
    situation: "8 bombers at 25,000 ft, escorted by 2 fighters.",
    plan: "1. Take off and climb to 25,000 ft\n2. Intercept bomber stream\n3. Splash bombers before launch point\n4. Return to base",
    environment: "nellis",
    timeOfDay: "afternoon",
    weather: "clear",
    aircraft: "f16c",
    loadout: { missiles: [{ type: "AIM-120", count: 6 }], bombs: [], flares: 30 },
    objectives: [
      { id: "takeoff", text: "Take off", type: "takeoff" },
      { id: "intercept", text: "Intercept bomber stream", type: "navigate", targetPosition: { x: 40000, y: 7620, z: 0 } },
      { id: "splash5", text: "Splash 5 bombers", type: "destroy", requiredCount: 5 },
      { id: "rtb", text: "Return to base", type: "rtb" },
    ],
    bandits: [
      { type: "su57", count: 2, skill: "ace", startPosition: { x: 42000, y: 7620, z: 0 } },
    ],
    parTime: 600,
    difficulty: "hard",
    achievements: ["Notched"],
    nextMission: "escort",
  },
  {
    id: "escort",
    number: 9,
    name: "Escort",
    tagline: "Protect the strike package",
    briefing: "A strike package of F-16s is heading to a high-value target. Your job is to escort them and keep them alive. Bandits will try to intercept. Defend the package.",
    situation: "4 friendly strike aircraft, 4 bandits inbound.",
    plan: "1. Take off and join the package\n2. Intercept bandits\n3. Protect the strike aircraft\n4. Return to base",
    environment: "nellis",
    timeOfDay: "afternoon",
    weather: "clear",
    aircraft: "f16c",
    loadout: { missiles: [{ type: "AIM-9X", count: 4 }], bombs: [], flares: 30 },
    objectives: [
      { id: "takeoff", text: "Take off", type: "takeoff" },
      { id: "escort", text: "Escort the strike package", type: "escort" },
      { id: "protect", text: "Keep strike aircraft alive", type: "defend" },
      { id: "rtb", text: "Return to base", type: "rtb" },
    ],
    bandits: [{ type: "mig29", count: 4, skill: "pilot", startPosition: { x: 25000, y: 5000, z: 15000 } }],
    parTime: 600,
    difficulty: "hard",
    achievements: ["Close Call"],
    nextMission: "strip-run",
  },
  {
    id: "strip-run",
    number: 10,
    name: "Strip Run",
    tagline: "Attack the enemy airfield",
    briefing: "Enemy fighters are operating from a forward airfield. You will make a low-level strip run to destroy aircraft on the ground. Use terrain masking for ingress. Egress at high speed.",
    situation: "Enemy airfield with 4 aircraft on the ground. Light AAA.",
    plan: "1. Take off\n2. Low-level ingress\n3. Destroy 4 aircraft on ground\n4. High-speed egress\n5. Return to base",
    environment: "nellis",
    timeOfDay: "golden",
    weather: "clear",
    aircraft: "f16c",
    loadout: { missiles: [{ type: "AIM-9X", count: 2 }], bombs: [{ type: "GBU-12", count: 4 }], flares: 30 },
    objectives: [
      { id: "takeoff", text: "Take off", type: "takeoff" },
      { id: "ingress", text: "Low-level ingress", type: "navigate", targetPosition: { x: -40000, y: 500, z: -30000 } },
      { id: "destroy4", text: "Destroy 4 ground aircraft", type: "strike", requiredCount: 4 },
      { id: "rtb", text: "Return to base", type: "rtb" },
    ],
    bandits: [{ type: "mig29", count: 2, skill: "pilot", startPosition: { x: -38000, y: 3000, z: -28000 } }],
    parTime: 720,
    difficulty: "hard",
    achievements: ["Shack"],
    nextMission: "night-flak",
  },
  {
    id: "night-flak",
    number: 11,
    name: "Night Flak",
    tagline: "Night strike under fire",
    briefing: "A high-value command bunker must be destroyed. The target is heavily defended with flak. Night operations. Use terrain masking and speed. You have two GBU-12s.",
    situation: "Bunker target defended by flak batteries. Night, clear.",
    plan: "1. Take off at night\n2. Navigate to target\n3. Avoid flak\n4. Destroy the bunker\n5. Return to base",
    environment: "nellis",
    timeOfDay: "night",
    weather: "clear",
    aircraft: "f16c",
    loadout: { missiles: [{ type: "AIM-9X", count: 2 }], bombs: [{ type: "GBU-12", count: 2 }], flares: 30 },
    objectives: [
      { id: "takeoff", text: "Take off", type: "takeoff" },
      { id: "navigate", text: "Navigate to target", type: "navigate", targetPosition: { x: -35000, y: 2000, z: -25000 } },
      { id: "destroy", text: "Destroy the bunker", type: "strike" },
      { id: "rtb", text: "Return to base", type: "rtb" },
    ],
    bandits: [{ type: "mig29", count: 2, skill: "pilot", startPosition: { x: -30000, y: 4000, z: -20000 } }],
    parTime: 600,
    difficulty: "hard",
    achievements: ["Night Strike", "Iron Hand"],
    nextMission: "last-missile",
  },
  {
    id: "last-missile",
    number: 12,
    name: "Last Missile",
    tagline: "One missile. One ace. No retreat.",
    briefing: "This is it. An Su-57 ace is inbound. You have ONE AIM-9X missile and your gun. Fuel is critically low. You must make this count. No retreat. No surrender.",
    situation: "Su-57 Felon ace at 20,000 ft. You at 15,000 ft. 1 missile, 412 rounds, 15% fuel.",
    plan: "1. Take off\n2. Climb to meet the bandit\n3. Use your missile wisely\n4. Finish with guns if needed\n5. Return to base",
    environment: "nellis",
    timeOfDay: "sunset",
    weather: "clear",
    aircraft: "f16c",
    loadout: { missiles: [{ type: "AIM-9X", count: 1 }], bombs: [], flares: 4 },
    objectives: [
      { id: "takeoff", text: "Take off", type: "takeoff" },
      { id: "engage", text: "Engage the Su-57 ace", type: "destroy", targetId: "bandit-1" },
      { id: "rtb", text: "Return to base", type: "rtb" },
    ],
    bandits: [{ type: "su57", count: 1, skill: "ace", startPosition: { x: 0, y: 6096, z: -25000 } }],
    parTime: 300,
    difficulty: "extreme",
    achievements: ["Ace Killer", "Lights Out"],
  },
];

export class CampaignSystem {
  private missions: Map<string, MissionDefinition> = new Map();
  private currentMission: MissionDefinition | null = null;
  private missionState: MissionState | null = null;
  private completedMissions: Set<string> = new Set();
  private missionStartTime = 0;

  constructor() {
    for (const m of CAMPAIGN) {
      this.missions.set(m.id, m);
    }
    // Load completed missions from localStorage
    const saved = localStorage.getItem("viper-ai-campaign");
    if (saved) {
      const data = JSON.parse(saved);
      if (data.completed) {
        this.completedMissions = new Set(data.completed);
      }
    }
  }

  getMissions(): MissionDefinition[] {
    return [...CAMPAIGN];
  }

  getMission(id: string): MissionDefinition | undefined {
    return this.missions.get(id);
  }

  getCompletedMissions(): string[] {
    return Array.from(this.completedMissions);
  }

  getCurrentMission(): MissionDefinition | null {
    return this.currentMission;
  }

  getMissionState(): MissionState | null {
    return this.missionState;
  }

  startMission(id: string): { success: boolean; message: string; mission?: MissionDefinition } {
    const mission = this.missions.get(id);
    if (!mission) {
      return { success: false, message: `Mission "${id}" not found` };
    }

    this.currentMission = mission;
    this.missionStartTime = gameState.state.time;

    // Create mission state
    this.missionState = {
      id: mission.id,
      name: mission.name,
      currentObjective: mission.objectives[0]?.text || "",
      objectives: mission.objectives.map(o => ({
        id: o.id,
        text: o.text,
        completed: false,
        optional: o.optional || false,
      })),
      score: 0,
      timeRemaining: mission.parTime,
      bandits: [],
      allies: [],
    };

    // Set up loadout
    gameState.aircraft.loadout.missiles = mission.loadout.missiles.map(m => ({ ...m }));
    gameState.aircraft.loadout.bombs = mission.loadout.bombs.map(b => ({ ...b }));
    gameState.aircraft.loadout.flares = mission.loadout.flares;
    gameState.aircraft.loadout.gunRounds = 412;

    bus.emit(GameEvents.MISSION_START, { mission: mission.id });
    return {
      success: true,
      message: `Mission ${mission.number}: "${mission.name}" — ${mission.tagline}\n\n${mission.briefing}\n\nPlan:\n${mission.plan}`,
      mission,
    };
  }

  completeMission(): { success: boolean; message: string; score: number } {
    if (!this.currentMission || !this.missionState) {
      return { success: false, message: "No active mission", score: 0 };
    }

    const mission = this.currentMission;
    this.completedMissions.add(mission.id);

    // Save progress
    localStorage.setItem("viper-ai-campaign", JSON.stringify({
      completed: Array.from(this.completedMissions),
    }));

    // Calculate score
    const timeUsed = gameState.state.time - this.missionStartTime;
    const timeBonus = Math.max(0, mission.parTime - timeUsed) * 10;
    const score = 1000 + timeBonus;
    gameState.addScore(score);

    const completed = this.missionState.objectives.filter(o => o.completed).length;
    const total = this.missionState.objectives.length;

    bus.emit(GameEvents.MISSION_COMPLETE, { mission: mission.id, score });

    this.currentMission = null;
    this.missionState = null;

    return {
      success: true,
      message: `Mission Complete! "${mission.name}" — ${completed}/${total} objectives. Score: ${Math.round(score)}. Time: ${Math.round(timeUsed)}s (par: ${mission.parTime}s)`,
      score: Math.round(score),
    };
  }

  updateMissionState(updates: Partial<MissionState>): void {
    if (this.missionState) {
      Object.assign(this.missionState, updates);
    }
  }

  completeObjective(objectiveId: string): void {
    if (!this.missionState) return;
    const obj = this.missionState.objectives.find(o => o.id === objectiveId);
    if (obj) {
      obj.completed = true;
      // Update current objective to next incomplete
      const next = this.missionState.objectives.find(o => !o.completed && !o.optional);
      if (next) {
        this.missionState.currentObjective = next.text;
      }
      bus.emit(GameEvents.MISSION_OBJECTIVE, { objectiveId, completed: true });
    }
  }

  update(dt: number): void {
    if (!this.missionState || !this.currentMission) return;

    // Update time remaining
    const elapsed = gameState.state.time - this.missionStartTime;
    this.missionState.timeRemaining = Math.max(0, this.currentMission.parTime - elapsed);

    // Check for mission timeout
    if (this.missionState.timeRemaining <= 0) {
      bus.emit(GameEvents.MISSION_FAIL, { mission: this.currentMission.id, reason: "timeout" });
    }
  }

  reset(): void {
    this.currentMission = null;
    this.missionState = null;
  }
}

// CAMPAIGN is already exported above
