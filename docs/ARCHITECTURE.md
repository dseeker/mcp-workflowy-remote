# Architecture Documentation

This document provides detailed architectural diagrams and system flow explanations for the Workflowy MCP server.

## Table of Contents

1. [System Overview](#system-overview)
2. [Dual Runtime Architecture](#dual-runtime-architecture)
3. [MCP Protocol Flow](#mcp-protocol-flow)
4. [Deployment Pipeline](#deployment-pipeline)
5. [Authentication & Security](#authentication--security)
6. [Data Flow](#data-flow)

## System Overview

The Workflowy MCP server is designed as a dual-runtime system that can operate both as a local Node.js server and as a remote Cloudflare Worker, providing flexible deployment options for different use cases.

```mermaid
graph TB
    subgraph "Client Applications"
        Claude[Claude Desktop/Code]
        ChatGPT[ChatGPT with MCP]
        Other[Other AI Assistants]
    end

    subgraph "MCP Transport Layer"
        HTTP[HTTP Transport]
        SSE[Server-Sent Events]
        Stdio[Stdio Transport]
    end

    subgraph "Deployment Options"
        Local[Local Node.js Server<br/>- FastMCP Framework<br/>- Stdio Protocol<br/>- Direct File System]
        Remote[Cloudflare Worker<br/>- Custom MCP Implementation<br/>- HTTP/SSE Protocol<br/>- Edge Computing]
    end

    subgraph "Workflowy API"
        WF[Workflowy Service<br/>- Authentication<br/>- Node Operations<br/>- Search & List]
    end

    Claude --> HTTP
    ChatGPT --> HTTP
    Other --> Stdio
    
    HTTP --> Remote
    SSE --> Remote
    Stdio --> Local
    
    Local --> WF
    Remote --> WF

    style Remote fill:#f96,stroke:#333,stroke-width:2px
    style Local fill:#9f6,stroke:#333,stroke-width:2px
    style WF fill:#69f,stroke:#333,stroke-width:2px
```

## Dual Runtime Architecture

The system supports two distinct deployment modes, each optimized for different scenarios:

```mermaid
graph LR
    subgraph "Local Runtime"
        direction TB
        LS[Local Server<br/>src/index.ts]
        FM[FastMCP Framework]
        NS[Node.js Runtime]
        
        LS --> FM
        FM --> NS
    end

    subgraph "Remote Runtime"
        direction TB
        CW[Cloudflare Worker<br/>src/worker.ts]
        MCP[Custom MCP Handler]
        WR[Workers Runtime]
        
        CW --> MCP
        MCP --> WR
    end

    subgraph "Shared Components"
        direction TB
        WT[Workflowy Tools<br/>src/tools/workflowy.ts]
        WC[Workflowy Client<br/>src/workflowy/client.ts]
        CFG[Configuration<br/>src/config.ts]
        
        WT --> WC
    end

    LS -.-> WT
    CW -.-> WT
    CW --> CFG
    
    style LS fill:#9f6,stroke:#333,stroke-width:2px
    style CW fill:#f96,stroke:#333,stroke-width:2px
    style WT fill:#ff9,stroke:#333,stroke-width:2px
```

### Local Runtime Features

- **FastMCP Framework**: Leverages the battle-tested FastMCP library for MCP protocol handling
- **Stdio Transport**: Direct stdin/stdout communication with AI clients
- **Full Node.js Environment**: Access to filesystem, environment variables, and native modules
- **Development Focus**: Ideal for development, testing, and local AI assistant integration

### Remote Runtime Features

- **Custom MCP Implementation**: Lightweight, purpose-built MCP protocol handler
- **HTTP/SSE Transport**: Web-standard protocols for maximum compatibility
- **Edge Computing**: Runs on Cloudflare's global edge network
- **Production Ready**: Built for scale, security, and reliability

## MCP Protocol Flow

The Model Context Protocol defines how AI assistants communicate with external tools. Here's how our implementation handles the protocol:

```mermaid
sequenceDiagram
    participant Client as AI Assistant
    participant Server as MCP Server
    participant WF as Workflowy API

    Note over Client,WF: Session Initialize
    Client->>Server: initialize(protocol_version, capabilities)
    Server->>Client: initialized(protocol_version, capabilities, server_info)

    Note over Client,WF: Tool Discovery
    Client->>Server: tools/list
    Server->>Client: tools[list_nodes, search_nodes, create_node, ...]

    Note over Client,WF: Tool Execution
    Client->>Server: tools/call(name: "search_nodes", args: {query: "project"})
    Server->>WF: authenticate(username, password)
    WF->>Server: session_token
    Server->>WF: search(query: "project", filters)
    WF->>Server: matching_nodes[]
    Server->>Client: tool_result(nodes_data)

    Note over Client,WF: Error Handling
    Client->>Server: tools/call(name: "invalid_tool")
    Server->>Client: error(method_not_found)

    Note over Client,WF: Session Management
    Client->>Server: notifications/cancelled(request_id)
    Server->>Client: ack
```

### Protocol Endpoints

**Local Server (Stdio)**
- Uses FastMCP's built-in protocol handling
- Messages exchanged via stdin/stdout JSON-RPC

**Remote Server (HTTP)**
- `POST /mcp` - Main MCP JSON-RPC endpoint
- `GET /sse` - Server-Sent Events for real-time communication
- `GET /health` - Health check (no auth required)

## Deployment Pipeline

The deployment pipeline uses GitHub Actions with semantic versioning and comprehensive testing:

```mermaid
graph TB
    subgraph "Source Control"
        PR[Pull Request]
        Main[Main Branch]
        Preview[Preview Branch]
    end

    subgraph "CI/CD Pipeline"
        Tests[Run Tests<br/>- Unit Tests<br/>- Integration Tests<br/>- Coverage Report]
        SemVer[Semantic Release<br/>- Analyze Commits<br/>- Generate Version<br/>- Update package.json<br/>- Create CHANGELOG.md]
        Build[Build Process<br/>- Build Worker<br/>- Bundle Assets<br/>- Generate Artifacts]
    end

    subgraph "Deployment Targets"
        Prod[Production Worker<br/>{worker-name}<br/>.{cloudflare-account}.workers.dev]
        PrevAlias[Preview Alias<br/>preview-{worker-name}<br/>.{cloudflare-account}.workers.dev]
        PRAlias[PR-Specific URL<br/>pr123-{worker-name}<br/>.{cloudflare-account}.workers.dev]
    end

    subgraph "Verification"
        Health[Health Check<br/>✅ Server Status]
        Version[Version Validation<br/>✅ Expected vs Deployed]
        Tools[Tool Validation<br/>✅ 8 Tools Available]
        Auth[Authentication Test<br/>✅ API Key Required]
        MCP[MCP Protocol Test<br/>✅ JSON-RPC Working]
    end

    PR --> Tests
    Main --> Tests
    Preview --> Tests

    Tests --> SemVer
    SemVer --> Build
    Build --> Prod
    Build --> PrevAlias
    Build --> PRAlias

    Prod --> Health
    PrevAlias --> Health
    PRAlias --> Health

    Health --> Version
    Version --> Tools
    Tools --> Auth
    Auth --> MCP

    style Prod fill:#f96,stroke:#333,stroke-width:2px
    style PrevAlias fill:#9f6,stroke:#333,stroke-width:2px
    style PRAlias fill:#69f,stroke:#333,stroke-width:2px
    style MCP fill:#6f9,stroke:#333,stroke-width:2px
```

### Version Management Flow

```mermaid
graph LR
    subgraph "Semantic Release Process"
        Commit[Git Commit<br/>feat: new feature]
        Analyze[Analyze Message<br/>→ Minor Version]
        Update[Update Files<br/>package.json<br/>CHANGELOG.md]
        Tag[Create Git Tag<br/>v1.2.0]
        Release[GitHub Release<br/>+ Release Notes]
    end

    subgraph "Deployment Sync"
        Pull[Git Pull<br/>Get Release Commit]
        Deploy[Worker Deployment<br/>Uses Updated Version]
        Verify[Version Verification<br/>✅ v1.2.0 = v1.2.0]
    end

    Commit --> Analyze
    Analyze --> Update
    Update --> Tag
    Tag --> Release
    Release --> Pull
    Pull --> Deploy
    Deploy --> Verify

    style Update fill:#ff9,stroke:#333,stroke-width:2px
    style Deploy fill:#f96,stroke:#333,stroke-width:2px
    style Verify fill:#6f9,stroke:#333,stroke-width:2px
```

## Authentication & Security

The system implements multi-tier security with environment-aware configuration:

```mermaid
graph TB
    subgraph "Client Request"
        Req[HTTP Request]
        Headers[Headers<br/>Authorization: Bearer key<br/>X-Workflowy-Username<br/>X-Workflowy-Password]
    end

    subgraph "Authentication Layers"
        API[API Key Validation<br/>Check ALLOWED_API_KEYS]
        CORS[CORS Policy<br/>Environment-based]
        Rate[Rate Limiting<br/>Production Only]
    end

    subgraph "Credential Sources"
        Client[Client Headers<br/>Most Secure]
        Env[Environment Variables<br/>Fallback]
        None[No Credentials<br/>Error]
    end

    subgraph "Workflowy Access"
        Auth[Workflowy Authentication]
        Session[Session Management]
        API_Call[API Operations]
    end

    Req --> Headers
    Headers --> API
    API -->|Valid| CORS
    API -->|Invalid| Reject[401 Unauthorized]
    CORS --> Rate
    Rate --> Client
    Client -->|Available| Auth
    Client -->|Missing| Env
    Env -->|Available| Auth
    Env -->|Missing| None
    None --> Error[Authentication Error]
    Auth --> Session
    Session --> API_Call

    style API fill:#f96,stroke:#333,stroke-width:2px
    style Client fill:#6f9,stroke:#333,stroke-width:2px
    style Reject fill:#f66,stroke:#333,stroke-width:2px
    style Error fill:#f66,stroke:#333,stroke-width:2px
```

### Security Configuration Matrix

| Environment | CORS Policy | Rate Limiting | Debug Logging | API Keys Required |
|-------------|-------------|---------------|---------------|-------------------|
| Production  | Restricted  | ✅ Enabled    | ❌ Disabled   | ✅ Required       |
| Staging     | Moderate    | ✅ Enabled    | ⚠️  Limited   | ✅ Required       |
| Development | Permissive  | ❌ Disabled   | ✅ Enabled    | ⚠️  Optional      |

## Data Flow

The data flow shows how information moves from AI assistants through the MCP server to Workflowy:

```mermaid
graph TB
    subgraph "AI Assistant"
        Query[User Query<br/>"Show my project notes"]
        Decision[Tool Selection<br/>search_nodes]
        Params[Parameters<br/>{query: "project", limit: 5}]
    end

    subgraph "MCP Server"
        Receive[Receive MCP Call<br/>tools/call]
        Validate[Validate Parameters<br/>Zod Schema]
        Auth[Authenticate<br/>API Key + Workflowy]
        Execute[Execute Tool<br/>workflowyTools.search_nodes]
    end

    subgraph "Workflowy Client"
        Login[Login to Workflowy<br/>Get Session Token]
        Search[Search API Call<br/>GET /search?q=project]
        Parse[Parse Response<br/>Extract Node Data]
        Filter[Apply Filters<br/>limit, maxDepth, preview]
    end

    subgraph "Response Processing"
        Format[Format Response<br/>MCP Tool Result]
        Return[Return to Assistant<br/>JSON-RPC Response]
        Present[Present to User<br/>Formatted Results]
    end

    Query --> Decision
    Decision --> Params
    Params --> Receive
    Receive --> Validate
    Validate --> Auth
    Auth --> Execute
    Execute --> Login
    Login --> Search
    Search --> Parse
    Parse --> Filter
    Filter --> Format
    Format --> Return
    Return --> Present

    style Query fill:#69f,stroke:#333,stroke-width:2px
    style Execute fill:#f96,stroke:#333,stroke-width:2px
    style Filter fill:#ff9,stroke:#333,stroke-width:2px
    style Present fill:#6f9,stroke:#333,stroke-width:2px
```

### Tool Parameter Processing

```mermaid
graph LR
    subgraph "Input Parameters"
        Raw[Raw Parameters<br/>From MCP Call]
        Schema[Zod Schema<br/>Validation]
        Clean[Cleaned Parameters<br/>Type-safe Object]
    end

    subgraph "Parameter Enhancement"
        Defaults[Apply Defaults<br/>maxDepth: 0<br/>includeFields: ["id", "name"]]
        Optimize[Optimization Logic<br/>Preview Truncation<br/>Field Filtering]
        Final[Final Parameters<br/>Ready for API]
    end

    subgraph "Workflowy API Call"
        Call[API Request<br/>With Parameters]
        Response[Raw Response<br/>Full Node Data]
        Process[Post-process<br/>Apply Filters]
    end

    Raw --> Schema
    Schema --> Clean
    Clean --> Defaults
    Defaults --> Optimize
    Optimize --> Final
    Final --> Call
    Call --> Response
    Response --> Process

    style Schema fill:#f96,stroke:#333,stroke-width:2px
    style Optimize fill:#ff9,stroke:#333,stroke-width:2px
    style Process fill:#6f9,stroke:#333,stroke-width:2px
```

## Performance Considerations

### Token Optimization

The system implements several strategies to minimize token usage and maximize performance:

```mermaid
graph TB
    subgraph "Input Optimization"
        Fields[Field Selection<br/>includeFields: ["id", "name"]]
        Depth[Depth Limiting<br/>maxDepth: 1]
        Limit[Result Limiting<br/>limit: 10]
        Preview[Content Preview<br/>preview: 100 chars]
    end

    subgraph "Processing Optimization"
        Early[Early Filtering<br/>At API Level]
        Batch[Batch Processing<br/>Multiple Nodes]
        Cache[Response Caching<br/>Worker Memory]
    end

    subgraph "Output Optimization"
        Minimal[Minimal Response<br/>Only Requested Fields]
        Truncate[Content Truncation<br/>"Long text becomes..."]
        Structure[Clean Structure<br/>Consistent Format]
    end

    Fields --> Early
    Depth --> Early
    Limit --> Early
    Preview --> Truncate

    Early --> Batch
    Batch --> Cache
    Cache --> Minimal
    Minimal --> Truncate
    Truncate --> Structure

    style Fields fill:#69f,stroke:#333,stroke-width:2px
    style Early fill:#f96,stroke:#333,stroke-width:2px
    style Minimal fill:#6f9,stroke:#333,stroke-width:2px
```

### Scalability Architecture

```mermaid
graph TB
    subgraph "Edge Distribution"
        CF[Cloudflare Edge<br/>200+ Locations]
        Cache[Edge Caching<br/>Static Responses]
        CDN[Global CDN<br/>Low Latency]
    end

    subgraph "Worker Resources"
        CPU[CPU Limits<br/>10ms per request]
        Memory[Memory Limits<br/>128MB]
        Duration[Duration Limits<br/>30 second max]
    end

    subgraph "Optimization Strategies"
        Minimal[Minimal Processing<br/>Fast Response Times]
        Async[Async Operations<br/>Non-blocking I/O]
        Error[Error Handling<br/>Graceful Degradation]
    end

    CF --> Cache
    Cache --> CDN
    CDN --> CPU
    CPU --> Memory
    Memory --> Duration
    Duration --> Minimal
    Minimal --> Async
    Async --> Error

    style CF fill:#f96,stroke:#333,stroke-width:2px
    style Minimal fill:#6f9,stroke:#333,stroke-width:2px
    style Error fill:#ff9,stroke:#333,stroke-width:2px
```

This architecture provides a robust, scalable, and secure foundation for integrating AI assistants with Workflowy, supporting both local development and production deployment scenarios.