import { workflowyTools } from "./workflowy.js";
import { toJsonSchema } from "@valibot/to-json-schema";
import { z } from "zod";
import { FastMCP } from "fastmcp";
// Central tool registry
export const toolRegistry: Record<string, any> = {
  ...workflowyTools,
  // Add more tool categories here
};

// Helper to register tools with MCP server
export function registerTools(server: FastMCP): void {
  Object.entries(toolRegistry).forEach(([name, tool]) => {
    server.addTool({
      name,
      description: tool.description,
      parameters: z.object(tool.inputSchema),
      annotations: tool.annotations,
      execute: tool.handler
      });
  });
}

// Helper to get tool definitions for API
export function getToolDefinitionsForAPI(): { tools: any[] } {
  const tools = Object.entries(toolRegistry).map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: toJsonSchema(z.object(tool.inputSchema))
  }));
  return { tools };
}