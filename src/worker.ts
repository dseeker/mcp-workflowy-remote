/**
 * Cloudflare Worker implementation of the Workflowy MCP server
 * Based on Cloudflare's MCP Agent pattern
 */

import { z } from "zod";
import { workflowyTools } from "./tools/workflowy.js";
import { workflowyClient } from "./workflowy/client.js";

// Simplified MCP server implementation for Cloudflare Workers
class WorkflowyMCPServer {
  name = "workflowy-remote";
  version = "0.1.3";

  // Tool definitions adapted from FastMCP tools
  tools: { [key: string]: { description: string, inputSchema: z.ZodSchema, handler: (params: any, env: any, request?: Request) => Promise<any> } } = {};

  constructor() {
    // Convert FastMCP tools to Cloudflare Worker format
    Object.entries(workflowyTools).forEach(([toolName, tool]) => {
      this.tools[toolName] = {
        description: tool.description,
        inputSchema: this.getInputSchema(toolName, tool),
        handler: this.createEnvHandler(tool.handler)
      };
    });
  }

  private getInputSchema(toolName: string, tool: any): z.ZodSchema {
    // If tool has inputSchema, convert it. Otherwise provide fallback schemas
    if (tool.inputSchema) {
      return z.object(tool.inputSchema);
    }
    
    // Fallback schemas for tools missing inputSchema (like create_node)
    const fallbackSchemas: Record<string, z.ZodSchema> = {
      create_node: z.object({
        parentId: z.string().describe("ID of the parent node"),
        name: z.string().describe("Name/title for the new node"),
        description: z.string().optional().describe("Description/note for the new node")
      })
    };
    
    return fallbackSchemas[toolName] || z.object({});
  }

  private validateApiKey(apiKey: string | null, env: any): boolean {
    if (!apiKey) return false;
    
    // Check against environment allowlist (comma-separated API keys)
    const allowedKeys = env.ALLOWED_API_KEYS?.split(',') || [];
    return allowedKeys.includes(apiKey);
  }

  private extractCredentials(params: any, env: any): { username?: string, password?: string } {
    // Priority: 1. Client-provided credentials, 2. Environment fallback
    return {
      username: params.workflowy_username || env.WORKFLOWY_USERNAME,
      password: params.workflowy_password || env.WORKFLOWY_PASSWORD
    };
  }

  private createEnvHandler(fastmcpHandler: Function) {
    return async (params: any, env: any, request?: Request) => {
      // Extract and validate API key from request headers
      const apiKey = request?.headers.get('Authorization')?.replace('Bearer ', '');
      if (!this.validateApiKey(apiKey, env)) {
        return {
          content: [{
            type: "text",
            text: "Error: Unauthorized - Invalid or missing API key"
          }]
        };
      }

      // Extract credentials (client-provided or environment)
      const credentials = this.extractCredentials(params, env);
      
      // Remove credentials from params to avoid passing to Workflowy API
      const { workflowy_username, workflowy_password, ...toolParams } = params;
      
      // Merge tool params with credentials for FastMCP handler
      const fastmcpParams = { ...toolParams, ...credentials };
      // FastMCP handlers expect (params, client) signature
      return fastmcpHandler(fastmcpParams, workflowyClient);
    };
  }
}

// Cloudflare Worker fetch handler
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const server = new WorkflowyMCPServer();
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        server: server.name,
        version: server.version 
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // List available tools
    if (url.pathname === '/tools') {
      const toolList = Object.entries(server.tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: tool.inputSchema._def
      }));
      
      return new Response(JSON.stringify({ tools: toolList }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Handle tool execution
    if (request.method === 'POST' && url.pathname.startsWith('/tools/')) {
      try {
        const toolName = url.pathname.split('/tools/')[1];
        const tool = server.tools[toolName as keyof typeof server.tools];
        
        if (!tool) {
          return new Response(JSON.stringify({ error: `Tool '${toolName}' not found` }), {
            status: 404,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }

        const params = await request.json();
        
        // Validate input parameters
        const validatedParams = tool.inputSchema.parse(params);
        
        // Execute the tool with request for authentication
        const result = await tool.handler(validatedParams, env, request);
        
        return new Response(JSON.stringify(result), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error: any) {
        return new Response(JSON.stringify({ 
          error: `Error executing tool: ${error.message}` 
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Default response for root path
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: server.name,
        version: server.version,
        description: "Workflowy MCP Server - Remote deployment on Cloudflare Workers",
        endpoints: {
          health: '/health',
          tools: '/tools',
          execute: '/tools/{tool_name}'
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};