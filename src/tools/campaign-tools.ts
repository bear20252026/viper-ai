/**
 * Campaign Tools — AI-callable tools for mission/campaign management.
 * The AI can start missions, check objectives, and track progress.
 */

import { registry } from "../core/registry.js";
import { CAMPAIGN } from "../engine/campaign.js";
import type { CampaignSystem } from "../engine/campaign.js";

let campaignSystem: CampaignSystem | null = null;

export function setCampaignSystem(system: CampaignSystem): void {
  campaignSystem = system;
}

function str(params: Record<string, unknown>, key: string, def = ""): string {
  return typeof params[key] === "string" ? params[key] as string : def;
}

export function registerCampaignTools(): void {
  // ─── List Campaign Missions ──────────────────────────────────────

  registry.register("list_campaign_missions", {
    name: "list_campaign_missions",
    description: "List all 12 campaign missions with their names, difficulty, and completion status.",
    parameters: {},
  }, () => {
    const missions = CAMPAIGN.map(m => ({
      id: m.id,
      number: m.number,
      name: m.name,
      tagline: m.tagline,
      difficulty: m.difficulty,
      environment: m.environment,
      time_of_day: m.timeOfDay,
      completed: campaignSystem?.getCompletedMissions().includes(m.id) ?? false,
    }));
    return {
      success: true,
      data: missions,
      message: `Campaign: ${campaignSystem?.getCompletedMissions().length ?? 0}/${CAMPAIGN.length} missions complete`,
    };
  }, "campaign");

  // ─── Get Mission Briefing ────────────────────────────────────────

  registry.register("get_mission_briefing", {
    name: "get_mission_briefing",
    description: "Get the full briefing for a campaign mission including situation, plan, objectives, and loadout.",
    parameters: {
      mission_id: { type: "string", description: "Mission ID", required: true, enum: CAMPAIGN.map(m => m.id) },
    },
  }, (params, _ctx) => {
    const id = str(params, "mission_id");
    const mission = CAMPAIGN.find(m => m.id === id);
    if (!mission) {
      return { success: false, error: `Unknown mission: ${id}` };
    }
    return {
      success: true,
      data: {
        id: mission.id,
        number: mission.number,
        name: mission.name,
        tagline: mission.tagline,
        briefing: mission.briefing,
        situation: mission.situation,
        plan: mission.plan,
        environment: mission.environment,
        time_of_day: mission.timeOfDay,
        weather: mission.weather,
        aircraft: mission.aircraft,
        loadout: mission.loadout,
        objectives: mission.objectives,
        par_time: mission.parTime,
        difficulty: mission.difficulty,
        achievements: mission.achievements,
      },
      message: `Mission ${mission.number}: "${mission.name}" — ${mission.tagline}\nDifficulty: ${mission.difficulty} | Par time: ${mission.parTime}s`,
    };
  }, "campaign");

  // ─── Start Campaign Mission ─────────────────────────────────────

  registry.register("start_campaign_mission", {
    name: "start_campaign_mission",
    description: "Start a campaign mission. This sets up the aircraft, loadout, environment, weather, and objectives for the selected mission.",
    parameters: {
      mission_id: { type: "string", description: "Mission ID to start", required: true, enum: CAMPAIGN.map(m => m.id) },
    },
  }, (params, _ctx) => {
    const id = str(params, "mission_id");
    const result = campaignSystem?.startMission(id);
    if (!result) return { success: false, error: "Campaign system not initialized" };
    return result;
  }, "campaign");

  // ─── Get Active Mission ──────────────────────────────────────────

  registry.register("get_active_mission", {
    name: "get_active_mission",
    description: "Get the currently active campaign mission, its objectives, and progress.",
    parameters: {},
  }, () => {
    const mission = campaignSystem?.getCurrentMission();
    const state = campaignSystem?.getMissionState();
    if (!mission || !state) {
      return { success: true, data: null, message: "No active campaign mission" };
    }
    return {
      success: true,
      data: {
        id: mission.id,
        name: mission.name,
        number: mission.number,
        objectives: state.objectives,
        current_objective: state.currentObjective,
        time_remaining: Math.round(state.timeRemaining ?? 0),
        score: state.score,
      },
      message: `Active mission: "${mission.name}" (${state.objectives.filter(o => o.completed).length}/${state.objectives.length} objectives, ${Math.round(state.timeRemaining ?? 0)}s remaining)`,
    };
  }, "campaign");

  // ─── Complete Mission ────────────────────────────────────────────

  registry.register("complete_mission", {
    name: "complete_mission",
    description: "Mark the current campaign mission as complete and calculate your score.",
    parameters: {},
  }, () => {
    const result = campaignSystem?.completeMission();
    if (!result) return { success: false, error: "Campaign system not initialized" };
    return result;
  }, "campaign");

  // ─── Get Campaign Progress ───────────────────────────────────────

  registry.register("get_campaign_progress", {
    name: "get_campaign_progress",
    description: "Get your overall campaign progress: completed missions, total score, and next available mission.",
    parameters: {},
  }, () => {
    const completed = campaignSystem?.getCompletedMissions() ?? [];
    const total = CAMPAIGN.length;
    const nextMission = CAMPAIGN.find(m => !completed.includes(m.id));
    return {
      success: true,
      data: {
        completed: completed.length,
        total,
        percent: Math.round((completed.length / total) * 100),
        next_mission: nextMission ? { id: nextMission.id, name: nextMission.name, number: nextMission.number } : null,
        completed_ids: completed,
      },
      message: `Campaign progress: ${completed.length}/${total} missions (${Math.round((completed.length / total) * 100)}%)${nextMission ? `. Next: Mission ${nextMission.number} "${nextMission.name}"` : ". Campaign complete!"}`,
    };
  }, "campaign");
}
