/**
 * Environment-specific configuration for Workflowy MCP server
 * Based on Cloudflare MCP best practices
 */

export interface ServerConfig {
  environment: 'preview' | 'production';
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
  };
  auth: {
    requireApiKey: boolean;
    allowedKeys: string[];
    oauth?: {
      enabled: boolean;
      providers: string[];
    };
  };
  features: {
    sse: boolean;
    jsonRpc: boolean;
    legacyRest: boolean;
  };
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
  };
}

export class ConfigManager {
  private config: ServerConfig;

  constructor(env: any) {
    this.config = this.buildConfig(env);
  }

  private buildConfig(env: any): ServerConfig {
    const environment = this.detectEnvironment(env);
    
    return {
      environment,
      cors: this.getCorsConfig(environment),
      auth: this.getAuthConfig(env, environment),
      features: this.getFeatureConfig(environment),
      rateLimit: this.getRateLimitConfig(environment)
    };
  }

  private detectEnvironment(env: any): 'preview' | 'production' {
    // Check explicit environment variable
    if (env.ENVIRONMENT) {
      const envLower = env.ENVIRONMENT.toLowerCase();
      return envLower === 'preview' ? 'preview' : 'production';
    }

    // Check for preview indicators
    if (env.DEBUG === 'true' || !env.ALLOWED_API_KEYS || env.ALLOWED_API_KEYS.includes('test-key')) {
      return 'preview';
    }

    // Default to production
    return 'production';
  }

  private getCorsConfig(environment: string) {
    switch (environment) {
      case 'preview':
        return {
          allowedOrigins: [
            'https://claude.ai',
            'https://console.anthropic.com',
            'http://localhost:*'
          ],
          allowedMethods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
          allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
        };
      case 'production':
      default:
        return {
          allowedOrigins: [
            'https://claude.ai',
            'https://console.anthropic.com'
          ],
          allowedMethods: ['GET', 'POST', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
        };
    }
  }

  private getAuthConfig(env: any, environment: string) {
    const allowedKeys = env.ALLOWED_API_KEYS ? 
      env.ALLOWED_API_KEYS.split(',').map((key: string) => key.trim()) : 
      [];

    return {
      requireApiKey: environment === 'production' || allowedKeys.length > 0,
      allowedKeys,
      oauth: {
        enabled: false, // TODO: Implement OAuth support
        providers: []
      }
    };
  }

  private getFeatureConfig(environment: string) {
    return {
      sse: true, // Enable SSE in all environments
      jsonRpc: true, // Enable JSON-RPC in all environments
      legacyRest: environment !== 'production' // Disable legacy REST in production
    };
  }

  private getRateLimitConfig(environment: string) {
    switch (environment) {
      case 'preview':
        return {
          enabled: true,
          requestsPerMinute: 100
        };
      case 'production':
      default:
        return {
          enabled: true,
          requestsPerMinute: 60
        };
    }
  }

  public getConfig(): ServerConfig {
    return this.config;
  }

  public isFeatureEnabled(feature: keyof ServerConfig['features']): boolean {
    return this.config.features[feature];
  }

  public shouldRequireAuth(): boolean {
    return this.config.auth.requireApiKey;
  }

  public getEnvironment(): string {
    return this.config.environment;
  }

  public getCorsHeaders(): Record<string, string> {
    const cors = this.config.cors;
    return {
      'Access-Control-Allow-Origin': cors.allowedOrigins.join(', '),
      'Access-Control-Allow-Methods': cors.allowedMethods.join(', '),
      'Access-Control-Allow-Headers': cors.allowedHeaders.join(', ')
    };
  }

  public validateApiKey(apiKey: string | null): boolean {
    if (!this.shouldRequireAuth()) {
      return true; // Auth not required in development
    }

    if (!apiKey) {
      return false;
    }

    // Allow test key in non-production environments
    if (this.config.environment !== 'production' && apiKey === 'test-key') {
      return true;
    }

    return this.config.auth.allowedKeys.includes(apiKey);
  }
}

export default ConfigManager;