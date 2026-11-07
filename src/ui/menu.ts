/**
 * Menu — main menu overlay with mode selection.
 */

import { bus, GameEvents } from "../core/events.js";

export type GameMode = "free" | "dogfight" | "campaign" | "carrier" | "landing";

export class Menu {
  private element: HTMLElement;
  private buttons: NodeListOf<HTMLButtonElement>;
  private visible = false;
  private onModeSelect: ((mode: GameMode) => void) | null = null;

  constructor() {
    this.element = document.getElementById("menu")!;
    this.buttons = this.element.querySelectorAll(".menu-btn");

    this.buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-mode") as GameMode;
        if (mode && this.onModeSelect) {
          this.onModeSelect(mode);
        }
      });
    });
  }

  setModeSelectHandler(handler: (mode: GameMode) => void): void {
    this.onModeSelect = handler;
  }

  show(): void {
    this.element.classList.remove("hidden");
    this.visible = true;
  }

  hide(): void {
    this.element.classList.add("hidden");
    this.visible = false;
  }

  get isVisible(): boolean {
    return this.visible;
  }
}
