/**
 * Cloudflare Worker implementation of the Workflowy MCP server
 * Implements MCP HTTP transport protocol (2025-03-26 spec)
 */

import { z } from "zod";
import { workflowyTools } from "./tools/workflowy.js";
import { workflowyClient } from "./workflowy/client.js";

// MCP JSON-RPC message types
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: any;
}

// MCP server implementation for Cloudflare Workers
class WorkflowyMCPServer {
  name = "workflowy-remote";
  version = "0.1.3";
  protocolVersion = "2024-11-05";

  // Tool definitions adapted from FastMCP tools
  tools: { [key: string]: { description: string, inputSchema: z.ZodSchema, handler: (params: any, env: any) => Promise<any> } } = {};

  constructor() {
    // Convert FastMCP tools to MCP format
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
    
    // For local development, allow test-key
    if (apiKey === 'test-key' && !env.ALLOWED_API_KEYS) {
      return true;
    }
    
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
    return async (params: any, env: any) => {
      // Extract credentials (environment only for now)
      const credentials = this.extractCredentials(params, env);
      
      // Remove credentials from params to avoid passing to Workflowy API
      const { workflowy_username, workflowy_password, ...toolParams } = params;
      
      // Merge tool params with credentials for FastMCP handler
      const fastmcpParams = { ...toolParams, ...credentials };
      // FastMCP handlers expect (params, client) signature
      return fastmcpHandler(fastmcpParams, workflowyClient);
    };
  }

  // Handle MCP JSON-RPC messages
  async handleJsonRpcRequest(request: JsonRpcRequest, env: any): Promise<JsonRpcResponse> {
    try {
      switch (request.method) {
        case "initialize":
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              protocolVersion: this.protocolVersion,
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: this.name,
                version: this.version
              }
            }
          };

        case "tools/list":
          const toolList = Object.entries(this.tools).map(([name, tool]) => ({
            name,
            description: tool.description,
            inputSchema: this.convertZodToJsonSchema(tool.inputSchema)
          }));
          
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: { tools: toolList }
          };

        case "tools/call":
          const { name: toolName, arguments: toolArgs } = request.params;
          const tool = this.tools[toolName];
          
          if (!tool) {
            return {
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: -32602,
                message: `Unknown tool: ${toolName}`
              }
            };
          }

          // Validate and execute tool
          const validatedParams = tool.inputSchema.parse(toolArgs);
          const result = await tool.handler(validatedParams, env);
          
          return {
            jsonrpc: "2.0",
            id: request.id,
            result
          };

        default:
          return {
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`
            }
          };
      }
    } catch (error: any) {
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`,
          data: error.stack
        }
      };
    }
  }

  // Convert Zod schema to JSON Schema for MCP
  private convertZodToJsonSchema(zodSchema: z.ZodSchema): any {
    // Simple conversion - in practice you'd want a proper zod-to-json-schema library
    if (zodSchema instanceof z.ZodObject) {
      const shape = zodSchema._def.shape();
      const properties: any = {};
      const required: string[] = [];

      Object.entries(shape).forEach(([key, schema]: [string, any]) => {
        properties[key] = { type: "string" }; // Simplified
        if (!schema.isOptional()) {
          required.push(key);
        }
      });

      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined
      };
    }
    
    return { type: "object" };
  }
}

// Cloudflare Worker fetch handler implementing MCP HTTP transport
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const server = new WorkflowyMCPServer();
    
    // Validate API key for authenticated endpoints
    const validateAuth = () => {
      const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || null;
      if (!server.validateApiKey(apiKey, env)) {
        return new Response('Unauthorized', { 
          status: 401,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      return null;
    };

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
    
    // Health check endpoint (unauthenticated)
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        server: server.name,
        version: server.version,
        protocol: server.protocolVersion
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // MCP endpoint - implements MCP HTTP transport protocol
    if (url.pathname === '/mcp') {
      // Validate authentication for MCP endpoint
      const authError = validateAuth();
      if (authError) return authError;

      if (request.method === 'POST') {
        try {
          const body = await request.text();
          
          // Handle both single messages and batched messages
          const messages = body.trim().split('\n').filter(line => line.trim());
          const responses: JsonRpcResponse[] = [];

          for (const messageText of messages) {
            const message = JSON.parse(messageText);
            
            // Handle JSON-RPC request
            if (message.jsonrpc === "2.0" && message.method && message.id !== undefined) {
              const response = await server.handleJsonRpcRequest(message as JsonRpcRequest, env);
              responses.push(response);
            }
          }

          // Return responses as JSON
          if (responses.length === 1) {
            return new Response(JSON.stringify(responses[0]), {
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          } else {
            return new Response(responses.map(r => JSON.stringify(r)).join('\n'), {
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
          
        } catch (error: any) {
          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32700,
              message: `Parse error: ${error.message}`
            }
          }), {
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      }

      // GET method for MCP endpoint (for session resumption)
      if (request.method === 'GET') {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
          params: {
            protocolVersion: server.protocolVersion,
            serverInfo: {
              name: server.name,
              version: server.version
            }
          }
        }), {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Legacy REST endpoints for backward compatibility (authenticated)
    const authError = validateAuth();
    if (authError) return authError;

    // List available tools (legacy)
    if (url.pathname === '/tools') {
      const toolList = Object.entries(server.tools).map(([name, tool]) => ({
        name,
        description: tool.description,
        inputSchema: server.convertZodToJsonSchema(tool.inputSchema)
      }));
      
      return new Response(JSON.stringify({ tools: toolList }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Default response for root path
    if (url.pathname === '/') {
      return new Response(JSON.stringify({
        name: server.name,
        version: server.version,
        protocol: server.protocolVersion,
        description: "Workflowy MCP Server - Remote deployment on Cloudflare Workers",
        endpoints: {
          mcp: '/mcp',
          health: '/health',
          tools: '/tools (legacy)'
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response('Not Found', { 
      status: 404,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};