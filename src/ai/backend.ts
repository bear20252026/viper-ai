/**
 * AI Backend — connects to a custom AI API endpoint.
 * Uses OpenAI-compatible function-calling format.
 * The AI receives the full tool list and game state, then returns
 * tool calls that are executed with the same authority as player input.
 */

import { registry } from "../core/registry.js";
import { gameState } from "../core/state.js";
import { bus, GameEvents } from "../core/events.js";
import type { ToolContext, GameState } from "../core/types.js";

export interface AIConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface AIResponse {
  message?: ChatMessage;
  message2?: ChatMessage;
  toolCalls?: ToolCall[];
  error?: string;
}

/** Default system prompt — the AI's identity and instructions */
const DEFAULT_SYSTEM_PROMPT = `You are VIPER AI, an AI copilot embedded in a flight simulator. You have full control over the aircraft and all game systems through a set of tools. You can:

- Control the aircraft: throttle, pitch, roll, yaw, gear, flaps, speed brake
- Navigate: set headings, altitudes, speeds, navigate to waypoints
- Manage weapons: fire missiles, drop bombs, fire guns, deploy flares
- Change the world: switch environments, weather, time of day, wind
- Monitor status: check aircraft state, bandits, loadout, score

You have the same authority as a human player. Use the tools to fulfill the user's requests. When the user asks you to do something, break it down into tool calls. You can make multiple tool calls in sequence for complex maneuvers.

Always respond in a helpful, concise manner. When executing tool calls, briefly explain what you're doing. If a tool call fails, explain why and suggest alternatives.

Available aircraft: F-16C Viper (default), F-35C, F/A-18E, F-14B, MiG-29, Su-57.
Available environments: nellis, hill, keywest, fallon, miramar, edwards, elmendorf, carrier.`;

export class AIBackend {
  private config: AIConfig;
  private messages: ChatMessage[] = [];
  isProcessing = false;

  constructor(config: Partial<AIConfig> = {}) {
    this.config = {
      apiUrl: config.apiUrl || "",
      apiKey: config.apiKey || "",
      model: config.model || "gpt-4o-mini",
      systemPrompt: config.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1024,
    };

    // Initialize with system message
    if (this.config.systemPrompt) {
      this.messages.push({ role: "system", content: this.config.systemPrompt });
    }
  }

  /** Update configuration */
  updateConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  get isConfigured(): boolean {
    return !!this.config.apiUrl && !!this.config.apiKey;
  }

  /** Get current tool context for the game */
  private getToolContext(): ToolContext {
    return gameState.getToolContext();
  }

  /** Convert registry tools to OpenAI function format */
  private getFunctions(): Record<string, unknown>[] {
    const ctx = this.getToolContext();
    const funcs = registry.getAIFunctions(ctx);
    return funcs.map(f => ({
      type: "function",
      function: {
        name: f.name,
        description: f.description,
        parameters: f.parameters,
      },
    }));
  }

  /** Send a user message and get AI response with tool calls */
  async chat(userMessage: string): Promise<AIResponse> {
    if (!this.isConfigured) {
      return { error: "AI not configured. Please set API URL and key in settings." };
    }

    this.messages.push({ role: "user", content: userMessage });

    try {
      const response = await fetch(this.config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: this.messages,
          tools: this.getFunctions(),
          tool_choice: "auto",
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { error: `API error (${response.status}): ${errText}` };
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      if (!choice) {
        return { error: "No response from AI" };
      }

      const message: ChatMessage = choice.message;
      this.messages.push(message);

      // Execute tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        const results = await this.executeToolCalls(message.tool_calls);
        
        // Add tool results to messages
        for (let i = 0; i < message.tool_calls.length; i++) {
          const call = message.tool_calls[i];
          const result = results[i];
          this.messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: call.function.name,
            content: JSON.stringify(result),
          });
        }

        // Get final response from AI after tool execution
        const followUp = await this.getFollowUpResponse();
        return {
          message: message,
          toolCalls: message.tool_calls,
          message2: followUp.message,
        };
      }

      return { message };
    } catch (err) {
      return { error: `Request failed: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /** Execute a batch of tool calls */
  private async executeToolCalls(calls: ToolCall[]): Promise<unknown[]> {
    const ctx = this.getToolContext();
    const results: unknown[] = [];

    for (const call of calls) {
      const name = call.function.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        results.push({ success: false, error: "Invalid arguments" });
        continue;
      }

      bus.emit(GameEvents.AI_TOOL_CALL, { name, args });
      const result = await registry.execute(name, args, ctx);
      results.push(result);
      bus.emit(GameEvents.AI_RESPONSE, { name, result });
    }

    return results;
  }

  /** Get a follow-up response after tool execution */
  private async getFollowUpResponse(): Promise<AIResponse> {
    if (!this.isConfigured) return { error: "Not configured" };

    try {
      const response = await fetch(this.config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: this.messages,
          tools: this.getFunctions(),
          tool_choice: "auto",
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        }),
      });

      if (!response.ok) return { error: `API error (${response.status})` };

      const data = await response.json();
      const choice = data.choices?.[0];
      if (!choice) return { error: "No response" };

      const message: ChatMessage = choice.message;
      this.messages.push(message);

      return { message };
    } catch (err) {
      return { error: String(err) };
    }
  }

  /** Clear conversation history */
  clearHistory(): void {
    this.messages = this.config.systemPrompt
      ? [{ role: "system", content: this.config.systemPrompt }]
      : [];
  }

  /** Get message count */
  get messageCount(): number {
    return this.messages.length;
  }
}
