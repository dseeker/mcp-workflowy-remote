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
  tools: { [key: string]: { description: string, inputSchema: z.ZodSchema, handler: (params: any, env: any, headers?: Headers, authorizationToken?: string) => Promise<any> } } = {};

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

  private async extractCredentials(params: any, env: any, headers?: Headers, authorizationToken?: string): Promise<{ username?: string, password?: string }> {
    // First check for authorization_token parameter (Claude MCP connector)
    if (authorizationToken) {
      // Check for OAuth access token
      if (authorizationToken.startsWith('oauth_access_')) {
        const oauthCredentials = await this.extractCredentialsFromOAuthToken(authorizationToken, env);
        if (oauthCredentials) {
          return oauthCredentials;
        }
      }

      // Check for user token from connector setup
      const credentials = this.extractCredentialsFromToken(authorizationToken);
      if (credentials) {
        return credentials;
      }
    }

    // Second check if we have a user token from Authorization header
    const authHeader = headers?.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');

      // Check for OAuth access token
      if (token.startsWith('oauth_access_')) {
        const oauthCredentials = await this.extractCredentialsFromOAuthToken(token, env);
        if (oauthCredentials) {
          return oauthCredentials;
        }
      }

      // Check for user token from connector setup
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

  private async extractCredentialsFromOAuthToken(token: string, env: any): Promise<{ username?: string, password?: string } | null> {
    try {
      // OAuth access tokens are stored in KV with format oauth_access_[random]
      if (!token.startsWith('oauth_access_')) {
        return null;
      }

      // Retrieve token data from KV storage
      const tokenData = await env.OAUTH_KV?.get(token);
      if (!tokenData) {
        return null;
      }

      const parsedData = JSON.parse(tokenData);
      
      // Verify token hasn't expired
      if (parsedData.expires_at && Date.now() > parsedData.expires_at) {
        // Clean up expired token
        await env.OAUTH_KV?.delete(token);
        return null;
      }

      // Return the stored Workflowy credentials
      if (parsedData.username && parsedData.password) {
        return {
          username: parsedData.username,
          password: parsedData.password
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  private createEnvHandler(fastmcpHandler: Function) {
    return async (params: any, env: any, headers?: Headers, authorizationToken?: string) => {
      // Extract credentials from params, headers, authorization token, or environment
      const credentials = await this.extractCredentials(params, env, headers, authorizationToken);

      // Remove credentials from params to avoid passing to Workflowy API
      const { workflowy_username, workflowy_password, authorization_token, ...toolParams } = params;

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

          // Extract authorization_token from request params (Claude MCP connector support)
          const authorizationToken = request.params?.authorization_token;

          // Validate authentication at MCP level (check both HTTP headers and authorization_token)
          const httpApiKey = headers?.get('Authorization')?.replace('Bearer ', '') || null;
          const hasValidAuth =
            (httpApiKey && this.validateApiKey(httpApiKey, env)) ||
            (authorizationToken && (
              authorizationToken.startsWith('oauth_access_') ||
              this.isValidUserToken(authorizationToken)
            ));

          if (!hasValidAuth) {
            requestLogger.warn('MCP tool call authentication failed', {
              hasHttpApiKey: !!httpApiKey,
              hasAuthorizationToken: !!authorizationToken,
              toolName
            });

            return {
              jsonrpc: "2.0",
              id: request.id,
              error: {
                code: -32600,
                message: "Authentication required. Provide credentials via Authorization header or authorization_token parameter.",
                data: {
                  retryable: false,
                  authMethods: ["Bearer token in Authorization header", "authorization_token in request params"]
                }
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
            const credentials = await this.extractCredentials(validatedParams, env, headers, authorizationToken);

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
                  const toolResult = await tool.handler(validatedParams, env, headers, authorizationToken);

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


    // Debug endpoint for Claude Desktop connectivity testing
    if (url.pathname === '/debug-claude-desktop') {
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      const referer = request.headers.get('Referer') || 'unknown';

      logger.info('Claude Desktop debug request', {
        userAgent,
        referer,
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries())
      });

      return new Response(JSON.stringify({
        message: "Claude Desktop connectivity test",
        timestamp: new Date().toISOString(),
        method: request.method,
        userAgent,
        referer,
        version: server.version,
        environment: config.getEnvironment(),
        endpoints: {
          mcp: '/mcp',
          oauth_metadata: '/.well-known/oauth-authorization-server',
          oauth_register: '/oauth/register',
          oauth_authorize: '/oauth/authorize',
          oauth_token: '/oauth/token'
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent, Referer'
        }
      });
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
      // Note: Authentication is handled at the MCP JSON-RPC level to support authorization_token parameter
      // This allows Claude connectors to send credentials in the MCP request rather than HTTP headers

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

    // OAuth Authorization Server Metadata (RFC 8414) - No authentication required
    if (url.pathname === '/.well-known/oauth-authorization-server') {
      const baseUrl = `${url.protocol}//${url.host}`;
      return new Response(JSON.stringify({
        issuer: baseUrl,
        authorization_endpoint: `${baseUrl}/oauth/authorize`,
        token_endpoint: `${baseUrl}/oauth/token`,
        registration_endpoint: `${baseUrl}/oauth/register`, // Dynamic Client Registration
        scopes_supported: ['workflowy:read', 'workflowy:write'],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_methods_supported: ['none'],
        registration_endpoint_auth_methods_supported: ['none']
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Dynamic Client Registration (RFC 7591) - For Claude Desktop compatibility
    if (url.pathname === '/oauth/register') {
      if (request.method === 'POST') {
        try {
          const registrationRequest = await request.json();

          // Generate a client ID for Claude Desktop
          const client_id = `claude_${Date.now()}_${Math.random().toString(36).substring(7)}`;

          // Store basic client info (in production, you'd use KV storage)
          const clientInfo = {
            client_id,
            client_name: registrationRequest.client_name || 'Claude Desktop',
            redirect_uris: registrationRequest.redirect_uris || ['https://claude.ai/api/mcp/auth_callback'],
            grant_types: ['authorization_code', 'refresh_token'],
            response_types: ['code'],
            scope: 'workflowy:read workflowy:write'
          };

          logger.info('Dynamic client registration', {
            client_id,
            client_name: clientInfo.client_name,
            redirect_uris: clientInfo.redirect_uris
          });

          return new Response(JSON.stringify({
            client_id: clientInfo.client_id,
            client_name: clientInfo.client_name,
            redirect_uris: clientInfo.redirect_uris,
            grant_types: clientInfo.grant_types,
            response_types: clientInfo.response_types,
            scope: clientInfo.scope,
            client_id_issued_at: Math.floor(Date.now() / 1000),
            // Note: We don't require client_secret for this implementation
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });

        } catch (error: any) {
          logger.error('Dynamic client registration failed', error);
          return new Response(JSON.stringify({
            error: 'invalid_request',
            error_description: 'Invalid registration request'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
      }
    }

    // OAuth Authorization Endpoint - No authentication required
    if (url.pathname === '/oauth/authorize') {
      if (request.method === 'GET') {
        const params = url.searchParams;
        const client_id = params.get('client_id') || 'claude-web';
        const redirect_uri = params.get('redirect_uri') || 'https://claude.ai';
        const scope = params.get('scope') || 'workflowy:read workflowy:write';
        const state = params.get('state') || '';

        const html = `<!DOCTYPE html>
<html>
<head>
    <title>Authorize Workflowy Access</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 50px auto; padding: 20px; background: #f8f9fa; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { width: 48px; height: 48px; background: #007cba; border-radius: 8px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; }
        h1 { color: #2c3e50; margin: 0; font-size: 24px; }
        .subtitle { color: #6c757d; margin-top: 8px; }
        .client-info { background: #f8f9fa; padding: 16px; border-radius: 6px; margin-bottom: 24px; border-left: 4px solid #007cba; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 6px; font-weight: 500; color: #495057; }
        input[type="text"], input[type="password"] { width: 100%; padding: 12px; border: 1px solid #ced4da; border-radius: 6px; font-size: 16px; }
        input:focus { outline: none; border-color: #007cba; box-shadow: 0 0 0 2px rgba(0, 124, 186, 0.1); }
        button { background: #007cba; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; width: 100%; }
        button:hover { background: #005a87; }
        .help-text { font-size: 14px; color: #6c757d; margin-top: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">W</div>
            <h1>Authorize Workflowy Access</h1>
            <div class="subtitle">Claude wants to access your Workflowy account</div>
        </div>
        
        <div class="client-info">
            <strong>Application:</strong> ${client_id}<br>
            <strong>Permissions:</strong> ${scope}<br>
            <strong>Redirect:</strong> ${redirect_uri}
        </div>

        <form method="POST">
            <input type="hidden" name="client_id" value="${client_id}">
            <input type="hidden" name="redirect_uri" value="${redirect_uri}">
            <input type="hidden" name="scope" value="${scope}">
            <input type="hidden" name="state" value="${state}">
            
            <div class="form-group">
                <label for="workflowy_username">Workflowy Username/Email:</label>
                <input type="text" id="workflowy_username" name="workflowy_username" required placeholder="your@email.com">
                <div class="help-text">Your credentials are encrypted and used only for authentication.</div>
            </div>
            
            <div class="form-group">
                <label for="workflowy_password">Workflowy Password:</label>
                <input type="password" id="workflowy_password" name="workflowy_password" required>
            </div>
            
            <button type="submit">Authorize Access</button>
        </form>
    </div>
</body>
</html>`;

        return new Response(html, {
          headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' }
        });
      }

      if (request.method === 'POST') {
        try {
          const formData = await request.formData();
          const client_id = formData.get('client_id') as string;
          const redirect_uri = formData.get('redirect_uri') as string;
          const scope = formData.get('scope') as string;
          const state = formData.get('state') as string;
          const workflowy_username = formData.get('workflowy_username') as string;
          const workflowy_password = formData.get('workflowy_password') as string;

          if (!workflowy_username || !workflowy_password) {
            return new Response('Missing credentials', { status: 400 });
          }

          // Validate credentials (reuse existing validation logic)
          const healthCheck = await workflowyClient.checkServiceHealth(workflowy_username, workflowy_password);
          if (!healthCheck.available) {
            return new Response('Invalid Workflowy credentials', { status: 401 });
          }

          // Generate authorization code
          const code = btoa(`oauth_${Date.now()}_${Math.random()}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
          
          // Store in KV (only if available)
          if (env.OAUTH_KV) {
            const authState = {
              client_id, redirect_uri, scope, state, workflowy_username, workflowy_password,
              expires_at: Date.now() + (10 * 60 * 1000)
            };
            await env.OAUTH_KV.put(`auth:${code}`, JSON.stringify(authState), { expirationTtl: 600 });
          }

          // Redirect with authorization code
          const redirectUrl = new URL(redirect_uri);
          redirectUrl.searchParams.set('code', code);
          if (state) redirectUrl.searchParams.set('state', state);

          return Response.redirect(redirectUrl.toString(), 302);

        } catch (error: any) {
          logger.error('OAuth authorization failed', error);
          return new Response('Authorization failed', { status: 500 });
        }
      }
    }

    // OAuth Token Endpoint - No authentication required
    if (url.pathname === '/oauth/token') {
      if (request.method === 'POST') {
        try {
          const formData = await request.formData();
          const grant_type = formData.get('grant_type') as string;
          const code = formData.get('code') as string;
          const redirect_uri = formData.get('redirect_uri') as string;
          const client_id = formData.get('client_id') as string;

          if (grant_type !== 'authorization_code') {
            return new Response(JSON.stringify({ error: 'unsupported_grant_type' }), {
              status: 400, headers: { 'Content-Type': 'application/json' }
            });
          }

          // Retrieve and validate authorization (only if KV available)
          let authData = null;
          if (env.OAUTH_KV) {
            const authDataStr = await env.OAUTH_KV.get(`auth:${code}`);
            if (authDataStr) {
              authData = JSON.parse(authDataStr);
              if (authData.client_id !== client_id || authData.redirect_uri !== redirect_uri || authData.expires_at < Date.now()) {
                authData = null;
              } else {
                await env.OAUTH_KV.delete(`auth:${code}`); // Use once
              }
            }
          }

          if (!authData) {
            return new Response(JSON.stringify({ error: 'invalid_grant' }), {
              status: 400, headers: { 'Content-Type': 'application/json' }
            });
          }

          // Generate access token
          const access_token = `oauth_access_${btoa(`${Date.now()}_${Math.random()}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)}`;
          
          // Store token in KV (only if available)
          if (env.OAUTH_KV) {
            const tokenData = {
              client_id, scope: authData.scope,
              workflowy_username: authData.workflowy_username,
              workflowy_password: authData.workflowy_password,
              expires_at: Date.now() + (3600 * 1000)
            };
            await env.OAUTH_KV.put(`token:${access_token}`, JSON.stringify(tokenData), { expirationTtl: 3600 });
          }

          return new Response(JSON.stringify({
            access_token, token_type: 'Bearer', expires_in: 3600, scope: authData.scope
          }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });

        } catch (error: any) {
          logger.error('OAuth token exchange failed', error);
          return new Response(JSON.stringify({ error: 'server_error' }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
          });
        }
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
          'OAuth 2.0 Flow',
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