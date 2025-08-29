/**
 * Cloudflare Worker implementation of the Workflowy MCP server
 * Implements MCP HTTP transport protocol with SSE support
 */

import { z } from "zod";
import { workflowyTools } from "./tools/workflowy.js";
import { workflowyClient } from "./workflowy/client.js";
import packageJson from "../package.json" assert { type: "json" };
import ConfigManager from "./config.js";

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
  version = packageJson.version;
  protocolVersion = "2024-11-05";

  // Tool definitions adapted from FastMCP tools
  tools: { [key: string]: { description: string, inputSchema: z.ZodSchema, handler: (params: any, env: any, headers?: Headers) => Promise<any> } } = {};

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

  private extractCredentials(params: any, env: any, headers?: Headers): { username?: string, password?: string } {
    // Priority: 1. Client-provided credentials, 2. Headers, 3. Environment fallback
    return {
      username: params.workflowy_username || headers?.get('X-Workflowy-Username') || env.WORKFLOWY_USERNAME,
      password: params.workflowy_password || headers?.get('X-Workflowy-Password') || env.WORKFLOWY_PASSWORD
    };
  }

  private createEnvHandler(fastmcpHandler: Function) {
    return async (params: any, env: any, headers?: Headers) => {
      // Extract credentials from params, headers, or environment
      const credentials = this.extractCredentials(params, env, headers);
      
      // Remove credentials from params to avoid passing to Workflowy API
      const { workflowy_username, workflowy_password, ...toolParams } = params;
      
      // Merge tool params with credentials for FastMCP handler
      const fastmcpParams = { ...toolParams, ...credentials };
      // FastMCP handlers expect (params, client) signature
      return fastmcpHandler(fastmcpParams, workflowyClient);
    };
  }

  // Handle MCP JSON-RPC messages
  async handleJsonRpcRequest(request: JsonRpcRequest, env: any, headers?: Headers): Promise<JsonRpcResponse> {
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
          const result = await tool.handler(validatedParams, env, headers);
          
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
  // Handle Server-Sent Events for MCP communication
  async handleSSE(request: Request, server: WorkflowyMCPServer, env: any): Promise<Response> {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Send initial connection event
    await writer.write(encoder.encode('data: {"type":"connection","status":"connected"}\n\n'));

    // Handle incoming messages from the request body
    if (request.body) {
      const reader = request.body.getReader();
      
      const processMessages = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = new TextDecoder().decode(value);
            const messages = text.split('\n').filter(line => line.trim());

            for (const messageText of messages) {
              try {
                const message = JSON.parse(messageText);
                
                if (message.jsonrpc === "2.0" && message.method && message.id !== undefined) {
                  const response = await server.handleJsonRpcRequest(message as JsonRpcRequest, env, request.headers);
                  
                  // Send response via SSE
                  const sseData = `data: ${JSON.stringify(response)}\n\n`;
                  await writer.write(encoder.encode(sseData));
                }
              } catch (error: any) {
                // Send error via SSE
                const errorResponse = {
                  jsonrpc: "2.0",
                  id: null,
                  error: {
                    code: -32700,
                    message: `Parse error: ${error.message}`
                  }
                };
                const sseData = `data: ${JSON.stringify(errorResponse)}\n\n`;
                await writer.write(encoder.encode(sseData));
              }
            }
          }
        } catch (error: any) {
          console.error('SSE processing error:', error);
        } finally {
          await writer.close();
        }
      };

      // Process messages in background
      processMessages();
    }

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      }
    });
  },

  async fetch(request: Request, env: any): Promise<Response> {
    const server = new WorkflowyMCPServer();
    const config = new ConfigManager(env);
    
    // Validate API key for authenticated endpoints
    const validateAuth = () => {
      const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || null;
      if (!config.validateApiKey(apiKey)) {
        return new Response(JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
          environment: config.getEnvironment()
        }), { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...config.getCorsHeaders()
          }
        });
      }
      return null;
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: config.getCorsHeaders()
      });
    }

    const url = new URL(request.url);
    
    // Server-Sent Events endpoint for MCP communication (authenticated)
    if (url.pathname === '/sse') {
      const authError = validateAuth();
      if (authError) return authError;

      // Handle SSE connection
      if (request.headers.get('Accept') === 'text/event-stream') {
        return this.handleSSE(request, server, env);
      }
      
      return new Response('SSE endpoint requires text/event-stream Accept header', {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
    
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
              const response = await server.handleJsonRpcRequest(message as JsonRpcRequest, env, request.headers);
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
      const serverConfig = config.getConfig();
      
      return new Response(JSON.stringify({
        name: server.name,
        version: server.version,
        protocol: server.protocolVersion,
        environment: config.getEnvironment(),
        description: "Workflowy MCP Server - Remote deployment on Cloudflare Workers",
        endpoints: {
          mcp: '/mcp',
          ...(config.isFeatureEnabled('sse') && { sse: '/sse (Server-Sent Events)' }),
          health: '/health',
          ...(config.isFeatureEnabled('legacyRest') && { tools: '/tools (legacy)' })
        },
        features: [
          ...(config.isFeatureEnabled('jsonRpc') ? ['MCP JSON-RPC'] : []),
          ...(config.isFeatureEnabled('sse') ? ['Server-Sent Events'] : []),
          'HTTP Headers Auth',
          'API Key Auth',
          'Environment-specific Configuration'
        ],
        security: {
          authRequired: config.shouldRequireAuth(),
          rateLimit: serverConfig.rateLimit.enabled,
          cors: serverConfig.cors.allowedOrigins.length < 5 ? 'Restricted' : 'Open'
        }
      }), {
        headers: { 
          'Content-Type': 'application/json',
          ...config.getCorsHeaders()
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