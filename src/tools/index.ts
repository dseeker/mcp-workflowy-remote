import { workflowyTools } from "./workflowy.js";
import { zodToJsonSchema } from "zod-to-json-schema";
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
    console.log(`Registering tool: ${name}`);
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
    inputSchema: zodToJsonSchema(z.object(tool.inputSchema))
  }));
  return { tools };
}