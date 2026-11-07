/**
 * AI Panel UI — chat interface, tool call visualization, quick commands.
 * The AI panel is the primary interface between the user and the AI copilot.
 */

import { bus, GameEvents } from "../core/events.js";
import type { AIBackend } from "../ai/backend.js";
import { registry } from "../core/registry.js";

export class AIPanel {
  private panel: HTMLElement;
  private messages: HTMLElement;
  private input: HTMLTextAreaElement;
  private sendBtn: HTMLButtonElement;
  private toggleBtn: HTMLElement;
  private backend: AIBackend;
  private isCollapsed = false;

  constructor(backend: AIBackend) {
    this.backend = backend;
    this.panel = document.getElementById("ai-panel")!;
    this.messages = document.getElementById("ai-messages")!;
    this.input = document.getElementById("ai-input") as HTMLTextAreaElement;
    this.sendBtn = document.getElementById("ai-send") as HTMLButtonElement;
    this.toggleBtn = document.getElementById("ai-toggle")!;

    this.setupEventListeners();
    this.setupQuickCommands();
    this.addMessage("system", "AI Copilot initialized. Type a command or use quick actions above.");
    this.addMessage("ai", "Hello! I'm your AI copilot. I can control the aircraft, manage weapons, change weather, and more. What would you like to do?");
  }

  private setupEventListeners(): void {
    // Toggle collapse
    this.toggleBtn.addEventListener("click", () => {
      this.isCollapsed = !this.isCollapsed;
      this.panel.classList.toggle("collapsed", this.isCollapsed);
      this.toggleBtn.textContent = this.isCollapsed ? "+" : "−";
    });

    // Send button
    this.sendBtn.addEventListener("click", () => this.send());

    // Enter to send, Shift+Enter for newline
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });

    // Auto-resize textarea
    this.input.addEventListener("input", () => {
      this.input.style.height = "auto";
      this.input.style.height = Math.min(this.input.scrollHeight, 120) + "px";
    });

    // Listen for AI events
    bus.on(GameEvents.AI_TOOL_CALL, (data) => {
      const { name, args } = data as { name: string; args: Record<string, unknown> };
      this.addToolCall(name, args);
    });

    bus.on(GameEvents.AI_RESPONSE, (data) => {
      const { name, result } = data as { name: string; result: { success: boolean; message?: string } };
      if (result.message) {
        this.addToolResult(name, result.success, result.message);
      }
    });
  }

  private setupQuickCommands(): void {
    const quickContainer = document.getElementById("ai-quick")!;
    quickContainer.querySelectorAll(".quick-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const cmd = btn.getAttribute("data-cmd");
        if (cmd) this.handleQuickCommand(cmd);
      });
    });
  }

  private handleQuickCommand(cmd: string): void {
    const commands: Record<string, string> = {
      status: "What's my current aircraft status?",
      takeoff: "Configure for takeoff and begin rolling",
      land: "Configure the aircraft for landing",
      weather: "What's the current weather and time of day?",
      weapons: "Show my current loadout and available weapons",
      autopilot: "Set level flight and maintain current heading",
      livery: "Show my current livery and list available paint schemes",
      campaign: "Show my campaign progress and available missions",
      settings: "Open AI settings",
    };
    if (cmd === "settings") {
      document.getElementById("settings-panel")!.classList.add("show");
      return;
    }
    const text = commands[cmd];
    if (text) {
      this.input.value = text;
      this.send();
    }
  }

  private async send(): Promise<void> {
    const text = this.input.value.trim();
    if (!text || this.backend.isProcessing) return;

    this.input.value = "";
    this.input.style.height = "auto";
    this.addMessage("user", text);
    this.sendBtn.disabled = true;
    this.backend.isProcessing = true;

    // Show typing indicator
    const typingEl = this.addMessage("ai", "...", true);

    try {
      const response = await this.backend.chat(text);
      typingEl.remove();

      if (response.error) {
        this.addMessage("system", `Error: ${response.error}`);
      } else if (response.message2?.content) {
        this.addMessage("ai", response.message2.content);
      } else if (response.message?.content) {
        this.addMessage("ai", response.message.content);
      }
    } catch (err) {
      typingEl.remove();
      this.addMessage("system", `Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.sendBtn.disabled = false;
      this.backend.isProcessing = false;
    }
  }

  /** Add a message bubble */
  addMessage(role: "ai" | "user" | "system", text: string, isTyping = false): HTMLElement {
    const el = document.createElement("div");
    el.className = `msg ${role}`;
    if (isTyping) {
      el.innerHTML = `<span style="opacity:0.5">thinking...</span>`;
    } else {
      el.textContent = text;
    }
    const time = document.createElement("div");
    time.className = "msg-time";
    time.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    el.appendChild(time);
    this.messages.appendChild(el);
    this.messages.scrollTop = this.messages.scrollHeight;
    return el;
  }

  /** Add a tool call visualization */
  addToolCall(name: string, args: Record<string, unknown>): void {
    const el = document.createElement("div");
    el.className = "msg tool";
    const argsStr = Object.entries(args)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
      .join(", ");
    el.innerHTML = `<span class="tool-name">⚡ ${name}</span>(<span class="tool-args">${argsStr}</span>)`;
    const time = document.createElement("div");
    time.className = "msg-time";
    time.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    el.appendChild(time);
    this.messages.appendChild(el);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  /** Add a tool result */
  addToolResult(name: string, success: boolean, message: string): void {
    const el = document.createElement("div");
    el.className = "msg tool";
    el.style.borderColor = success ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)";
    el.innerHTML = `<span class="tool-name" style="color:${success ? "#10b981" : "#ef4444"}">${success ? "✓" : "✗"} ${name}</span> → ${message}`;
    const time = document.createElement("div");
    time.className = "msg-time";
    time.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    el.appendChild(time);
    this.messages.appendChild(el);
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  /** Show/hide panel */
  show(): void {
    this.panel.style.display = "flex";
  }

  hide(): void {
    this.panel.style.display = "none";
  }
}
