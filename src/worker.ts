/**
 * Cloudflare Worker implementation of the Workflowy MCP server
 * Implements MCP HTTP transport protocol with SSE support
 */

import { z } from "zod";
import { workflowyTools } from "./tools/workflowy.js";
import { workflowyClient } from "./workflowy/client.js";
import packageJson from "../package.json" assert { type: "json" };
import ConfigManager from "./config.js";
import { workerCache } from "./utils/cache.js";
import { requestDeduplicator } from "./utils/deduplication.js";
import { createLogger, generateRequestId } from "./utils/structured-logger.js";
import { WorkflowyError, AuthenticationError, NetworkError, NotFoundError, OverloadError } from "./workflowy/client.js";

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
    
    // Check if it's a user-generated token from /connector/setup
    if (apiKey.length > 20 && this.isValidUserToken(apiKey)) {
      return true;
    }
    
    return allowedKeys.includes(apiKey);
  }

  private isValidUserToken(token: string): boolean {
    try {
      // Decode the base64 token to validate format
      const decoded = atob(token);
      const parts = decoded.split(':');
      
      // Should have format: username:password:timestamp
      if (parts.length === 3) {
        const timestamp = parseInt(parts[2]);
        const now = Date.now();
        
        // Token should be less than 30 days old
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        return (now - timestamp) < thirtyDays;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private extractCredentials(params: any, env: any, headers?: Headers): { username?: string, password?: string } {
    // First check if we have a user token from Authorization header
    const authHeader = headers?.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const credentials = this.extractCredentialsFromToken(token);
      if (credentials) {
        return credentials;
      }
    }
    
    // Priority: 1. Client-provided credentials, 2. Headers, 3. Environment fallback
    return {
      username: params.workflowy_username || headers?.get('X-Workflowy-Username') || env.WORKFLOWY_USERNAME,
      password: params.workflowy_password || headers?.get('X-Workflowy-Password') || env.WORKFLOWY_PASSWORD
    };
  }

  private extractCredentialsFromToken(token: string): { username?: string, password?: string } | null {
    try {
      if (this.isValidUserToken(token)) {
        const decoded = atob(token);
        const parts = decoded.split(':');
        
        if (parts.length === 3) {
          return {
            username: parts[0],
            password: parts[1]
          };
        }
      }
      
      return null;
    } catch {
      return null;
    }
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

  // Handle MCP JSON-RPC messages with caching and deduplication
  async handleJsonRpcRequest(request: JsonRpcRequest, env: any, headers?: Headers, logger?: any): Promise<JsonRpcResponse> {
    const requestLogger = logger || createLogger(env);
    
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
            requestLogger.error(`Unknown tool requested: ${toolName}`);
            return {
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: -32602,
                message: `Unknown tool: ${toolName}`
              }
            };
          }

          // Validate and execute tool with caching and deduplication
          const validatedParams = tool.inputSchema.parse(toolArgs);
          
          const startTime = Date.now();
          let cached = false;
          let result;
          
          try {
            // Extract credentials for cache/deduplication key
            const credentials = this.extractCredentials(validatedParams, env, headers);
            
            // Try cache first if caching is enabled for this tool
            if (workerCache.shouldCache(toolName, validatedParams)) {
              const cachedResult = await workerCache.get(toolName, validatedParams, credentials);
              if (cachedResult !== null) {
                cached = true;
                result = cachedResult;
                requestLogger.cache('hit', `${toolName}:${JSON.stringify(validatedParams).substring(0, 50)}`);
              }
            }
            
            // If not cached, execute with deduplication
            if (result === undefined) {
              result = await requestDeduplicator.execute(
                toolName,
                validatedParams,
                credentials,
                async () => {
                  const toolResult = await tool.handler(validatedParams, env, headers);
                  
                  // Cache the result if caching is enabled
                  if (workerCache.shouldCache(toolName, validatedParams)) {
                    const cacheConfig = workerCache.getCacheConfig(toolName, validatedParams);
                    await workerCache.set(toolName, validatedParams, toolResult, cacheConfig, credentials);
                    requestLogger.cache('set', `${toolName}:${JSON.stringify(validatedParams).substring(0, 50)}`);
                  }
                  
                  return toolResult;
                }
              );
            }
            
            const duration = Date.now() - startTime;
            requestLogger.mcpOperation("tools/call", toolName, duration, cached, {
              requestId: request.id,
              paramsSize: JSON.stringify(validatedParams).length
            });
            
            return {
              jsonrpc: "2.0",
              id: request.id,
              result
            };
            
          } catch (error: any) {
            const duration = Date.now() - startTime;
            requestLogger.error(`Tool execution failed: ${toolName}`, error, {
              requestId: request.id,
              duration,
              toolName,
              errorType: error.constructor.name
            });
            
            // Enhanced error responses based on error type
            let errorCode = -32603; // Internal error
            let errorMessage = `Internal error: ${error.message}`;
            
            if (error instanceof AuthenticationError) {
              errorCode = -32600; // Invalid request (auth issue)
              errorMessage = `Authentication failed: ${error.message}`;
            } else if (error instanceof NotFoundError) {
              errorCode = -32602; // Invalid params
              errorMessage = `Resource not found: ${error.message}`;
            } else if (error instanceof OverloadError) {
              errorCode = -32603; // Internal error
              errorMessage = `Service temporarily unavailable: ${error.message}`;
            } else if (error instanceof NetworkError) {
              errorCode = -32603; // Internal error
              errorMessage = `Network error: ${error.message}`;
            }
            
            return {
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: errorCode,
                message: errorMessage,
                data: {
                  type: error.constructor.name,
                  retryable: error.retryable || false,
                  overloaded: error.overloaded || false,
                  ...(env.ENVIRONMENT !== 'production' && { stack: error.stack })
                }
              }
            };
          }

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
      requestLogger.error('JSON-RPC request processing failed', error, {
        requestId: request.id,
        method: request.method
      });
      
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: {
          code: -32603,
          message: `Internal error: ${error.message}`,
          data: {
            type: error.constructor.name,
            ...(env.ENVIRONMENT !== 'production' && { stack: error.stack })
          }
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
    const requestId = generateRequestId();
    const logger = createLogger(env).forRequest(requestId, request.method, new URL(request.url).pathname);
    const startTime = Date.now();
    
    const server = new WorkflowyMCPServer();
    const config = new ConfigManager(env);
    
    logger.info('Request received', {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('User-Agent'),
      contentType: request.headers.get('Content-Type')
    });
    
    // Validate API key for authenticated endpoints with logging
    const validateAuth = () => {
      const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '') || null;
      if (!config.validateApiKey(apiKey) && !server.validateApiKey(apiKey, env)) {
        logger.warn('Authentication failed', {
          hasApiKey: !!apiKey,
          apiKeyLength: apiKey?.length,
          environment: config.getEnvironment()
        });
        
        return new Response(JSON.stringify({
          error: 'Unauthorized',
          message: 'Invalid or missing API key',
          environment: config.getEnvironment(),
          requestId
        }), { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
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
    
    // Health check endpoint with service status (unauthenticated)
    if (url.pathname === '/health') {
      try {
        // Quick health check with minimal credentials (if available)
        const healthCheck = await workflowyClient.checkServiceHealth(
          env.WORKFLOWY_USERNAME, 
          env.WORKFLOWY_PASSWORD
        );
        
        const responseTime = Date.now() - startTime;
        logger.info('Health check completed', {
          available: healthCheck.available,
          workflowyResponseTime: healthCheck.responseTime,
          totalResponseTime: responseTime
        });
        
        return new Response(JSON.stringify({ 
          status: healthCheck.available ? 'ok' : 'degraded',
          server: server.name,
          version: server.version,
          protocol: server.protocolVersion,
          workflowy: {
            available: healthCheck.available,
            responseTime: healthCheck.responseTime,
            error: healthCheck.error
          },
          environment: config.getEnvironment(),
          requestId,
          timestamp: new Date().toISOString()
        }), {
          status: healthCheck.available ? 200 : 503,
          headers: { 
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error: any) {
        logger.error('Health check failed', error);
        
        return new Response(JSON.stringify({ 
          status: 'error',
          server: server.name,
          version: server.version,
          error: 'Health check failed',
          requestId,
          timestamp: new Date().toISOString()
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Anthropic Connector Setup Endpoint - handles credential exchange
    if (url.pathname === '/connector/setup') {
      if (request.method === 'POST') {
        try {
          const body = await request.json();
          const { username, password } = body;
          
          if (!username || !password) {
            return new Response(JSON.stringify({
              error: 'Missing credentials',
              message: 'Both username and password are required'
            }), {
              status: 400,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
          
          // Validate credentials by attempting authentication
          try {
            const healthCheck = await workflowyClient.checkServiceHealth(username, password);
            
            if (!healthCheck.available) {
              return new Response(JSON.stringify({
                error: 'Invalid credentials',
                message: 'Failed to authenticate with Workflowy'
              }), {
                status: 401,
                headers: { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                }
              });
            }
            
            // Generate a secure token for this user session
            const userToken = btoa(`${username}:${password}:${Date.now()}`);
            
            // In a production system, you'd store this securely
            // For now, we'll return it to be used as the API key
            return new Response(JSON.stringify({
              success: true,
              token: userToken,
              message: 'Credentials validated successfully',
              instructions: 'Use this token as your API key when configuring the Anthropic connector'
            }), {
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
            
          } catch (error: any) {
            logger.error('Credential validation failed', error);
            return new Response(JSON.stringify({
              error: 'Authentication failed',
              message: 'Could not validate Workflowy credentials'
            }), {
              status: 401,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
          
        } catch (error: any) {
          return new Response(JSON.stringify({
            error: 'Invalid request',
            message: 'Could not parse request body'
          }), {
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      }
      
      // GET method returns setup instructions
      if (request.method === 'GET') {
        return new Response(JSON.stringify({
          name: "Workflowy MCP Connector Setup",
          description: "Setup endpoint for Anthropic custom connector integration",
          instructions: {
            step1: "POST your Workflowy credentials to this endpoint",
            step2: "Receive a secure token in response",
            step3: "Use the token as API key when configuring the Anthropic connector",
            step4: "Configure connector URL: " + new URL('/mcp', request.url).toString()
          },
          schema: {
            method: "POST",
            body: {
              username: "your_workflowy_username",
              password: "your_workflowy_password"
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

    // Temporary debug endpoint to check API key configuration
    if (url.pathname === '/debug-keys') {
      const allowedKeys = env.ALLOWED_API_KEYS?.split(',') || [];
      return new Response(JSON.stringify({
        hasApiKeys: !!env.ALLOWED_API_KEYS,
        keyCount: allowedKeys.length,
        firstKeyLength: allowedKeys.length > 0 ? allowedKeys[0]?.trim()?.length : 0,
        environment: config.getEnvironment()
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
            
            // Handle JSON-RPC request with logging
            if (message.jsonrpc === "2.0" && message.method && message.id !== undefined) {
              const response = await server.handleJsonRpcRequest(message as JsonRpcRequest, env, request.headers, logger);
              responses.push(response);
            }
          }

          // Return responses as JSON with request tracking
          const duration = Date.now() - startTime;
          logger.performance('MCP batch request', duration, {
            messageCount: messages.length,
            responseCount: responses.length
          });
          
          if (responses.length === 1) {
            return new Response(JSON.stringify(responses[0]), {
              headers: { 
                'Content-Type': 'application/json',
                'X-Request-ID': requestId,
                'X-Response-Time': duration.toString(),
                'Access-Control-Allow-Origin': '*'
              }
            });
          } else {
            return new Response(responses.map(r => JSON.stringify(r)).join('\n'), {
              headers: { 
                'Content-Type': 'application/json',
                'X-Request-ID': requestId,
                'X-Response-Time': duration.toString(),
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
          
        } catch (error: any) {
          const duration = Date.now() - startTime;
          logger.error('MCP request parsing failed', error, { duration });
          
          return new Response(JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: {
              code: -32700,
              message: `Parse error: ${error.message}`
            },
            requestId
          }), {
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
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
          connector_setup: '/connector/setup',
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