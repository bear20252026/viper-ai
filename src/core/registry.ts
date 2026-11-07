/**
 * Tool Registry — the heart of the AI-native architecture.
 * 
 * Every game function is registered here as a named tool with a JSON Schema.
 * The AI receives the full tool list and can call any tool with structured
 * parameters — exactly like a human uses the game's UI/controls.
 * 
 * The same tools are also used by the game's own UI (menus, HUD, autopilot),
 * keyboard shortcuts, and scripted missions. One registry, all interfaces.
 */

import type { RegisteredTool, ToolSchema, ToolHandler, ToolContext, ToolResult } from "./types.js";

class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private categories: Map<string, Set<string>> = new Map();

  /**
   * Register a new tool. Every tool must have a unique name, a JSON-schema
   * description, and a handler function.
   */
  register(name: string, schema: ToolSchema, handler: ToolHandler, category = "general"): void {
    if (this.tools.has(name)) {
      console.warn(`[ToolRegistry] Tool "${name}" already registered, overwriting`);
    }
    this.tools.set(name, { schema, handler });
    
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
    }
    this.categories.get(category)!.add(name);
  }

  /**
   * Unregister a tool (e.g., when a system is unavailable).
   */
  unregister(name: string): void {
    this.tools.delete(name);
    for (const [cat, names] of this.categories) {
      names.delete(name);
    }
  }

  /**
   * Get a tool by name.
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Execute a tool by name with given parameters.
   */
  async execute(name: string, params: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `Unknown tool: ${name}` };
    }
    if (tool.schema.available && !tool.schema.available(ctx)) {
      return { success: false, error: `Tool "${name}" is not available in the current game state` };
    }
    try {
      return await tool.handler(params, ctx);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Get all tool schemas formatted for AI function-calling (OpenAI/Anthropic format).
   */
  getAIFunctions(ctx: ToolContext): AIFunction[] {
    const funcs: AIFunction[] = [];
    for (const [name, tool] of this.tools) {
      if (tool.schema.available && !tool.schema.available(ctx)) continue;
      funcs.push({
        name,
        description: tool.schema.description,
        parameters: this.toOpenAISchema(tool.schema.parameters),
      });
    }
    return funcs;
  }

  /**
   * Get tool count for display.
   */
  get count(): number {
    return this.tools.size;
  }

  /**
   * Get all registered tool names.
   */
  get names(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tools by category.
   */
  getByCategory(category: string): string[] {
    return Array.from(this.categories.get(category) || []);
  }

  /**
   * Convert internal parameter format to OpenAI function-calling schema.
   */
  private toOpenAISchema(params: Record<string, import("./types.js").ToolParameter>): OpenAISchema {
    const required: string[] = [];
    const properties: Record<string, unknown> = {};

    for (const [key, param] of Object.entries(params)) {
      if (param.required) required.push(key);
      const prop: Record<string, unknown> = {
        type: param.type,
        description: param.description,
      };
      if (param.enum) prop.enum = param.enum;
      if (param.items) prop.items = this.toOpenAISchema({ item: param.items }).properties.item;
      if (param.properties) {
        prop.properties = this.toOpenAISchema(param.properties).properties;
      }
      if (param.minimum !== undefined) prop.minimum = param.minimum;
      if (param.maximum !== undefined) prop.maximum = param.maximum;
      properties[key] = prop;
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }
}

interface OpenAISchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

interface AIFunction {
  name: string;
  description: string;
  parameters: OpenAISchema;
}

/** Singleton registry */
export const registry = new ToolRegistry();
export type { ToolContext };
