/**
 * HUD — heads-up display overlay showing flight data.
 * Updates in real-time from the game state.
 */

import { bus, GameEvents } from "../core/events.js";
import { gameState } from "../core/state.js";

export class HUD {
  private element: HTMLElement;
  private speedEl: HTMLElement;
  private altEl: HTMLElement;
  private hdgEl: HTMLElement;
  private throttleEl: HTMLElement;
  private infoEl: HTMLElement;
  private visible = false;

  constructor() {
    this.element = document.getElementById("hud")!;
    this.speedEl = document.getElementById("hud-speed")!;
    this.altEl = document.getElementById("hud-alt")!;
    this.hdgEl = document.getElementById("hud-hdg")!;
    this.throttleEl = document.getElementById("hud-throttle")!;
    this.infoEl = document.getElementById("hud-info")!;

    // Update on aircraft state change
    bus.on(GameEvents.AIRCRAFT_UPDATE, () => this.update());
    bus.on(GameEvents.UI_HUD_UPDATE, () => this.update());
  }

  show(): void {
    this.element.classList.remove("hidden");
    this.visible = true;
    this.update();
  }

  hide(): void {
    this.element.classList.add("hidden");
    this.visible = false;
  }

  update(): void {
    if (!this.visible) return;
    const a = gameState.aircraft;
    const speedKts = Math.round(a.speed * 1.94384);
    const altFt = Math.round(a.altitude * 3.28084);
    const hdg = Math.round(a.heading);
    const thr = Math.round(a.throttle * 100);

    this.speedEl.textContent = `${speedKts} KTS`;
    this.altEl.textContent = `${altFt.toLocaleString()} FT`;
    this.hdgEl.textContent = `${hdg.toString().padStart(3, "0")}°`;
    this.throttleEl.textContent = `THR ${thr}%${a.afterburner ? " AB" : ""}`;

    // Info line
    const info = [
      a.onGround ? "GROUND" : a.stalled ? "STALL" : `${Math.round(a.gForce)}G`,
      a.gearDown ? "GEAR DN" : "",
      a.flaps > 0 ? `FLAPS ${Math.round(a.flaps * 100)}%` : "",
      a.speedBrake ? "SPD BRK" : "",
      `M ${a.mach.toFixed(2)}`,
    ].filter(Boolean).join(" | ");
    this.infoEl.textContent = info;
  }
}
