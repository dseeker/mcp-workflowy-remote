import { workflowyTools } from "./workflowy.js";
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
      parameters: tool.parameters,
      annotations: tool.annotations,
      execute: tool.handler
    });
  });
}

