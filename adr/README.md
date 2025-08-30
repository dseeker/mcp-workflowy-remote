# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records that document important design decisions made during the development of the Workflowy MCP server.

## What are ADRs?

Architecture Decision Records (ADRs) are documents that capture important architectural decisions made along with their context and consequences. They help track the evolution of the system and provide historical context for future developers.

## ADR Index

### Phase 0: Foundation
- **[ADR-001: Critical Missing Operations Implementation](ADR-001-critical-missing-operations.md)**
  - Implements delete_node, move_node, and get_node_by_id operations
  - Status: ✅ **Completed**

- **[ADR-010: Authentication Strategy](ADR-010-authentication-strategy.md)**
  - API Keys vs OAuth for Remote MCP Server authentication
  - Status: ✅ **Completed**

- **[ADR-011: Preview and Production Environments](ADR-011-staging-preview-environments.md)**
  - Branch-based deployment with Cloudflare Workers versioning
  - Status: ✅ **Completed**

### Phase 1: Enhanced Operations
- **[ADR-002: Enhanced Navigation and Structure Operations](ADR-002-enhanced-navigation-operations.md)**
  - Advanced navigation capabilities and hierarchy traversal
  - Status: 📋 **Planned**

- **[ADR-003: Sharing and Collaboration Features](ADR-003-sharing-collaboration-features.md)**
  - Node sharing and permission management
  - Status: 📋 **Planned**

- **[ADR-004: Mirror/Reference System Implementation](ADR-004-mirror-reference-system.md)**
  - Cross-references and mirror node functionality
  - Status: 📋 **Planned**

### Phase 2: Advanced Features
- **[ADR-005: Batch and Advanced Operations Implementation](ADR-005-batch-advanced-operations.md)**
  - Bulk operations and advanced node manipulation
  - Status: 📋 **Planned**

- **[ADR-006: Export/Import Functionality Implementation](ADR-006-export-import-functionality.md)**
  - Data export and import capabilities
  - Status: 📋 **Planned**

- **[ADR-007: Real-time & Sync Features Implementation](ADR-007-realtime-sync-features.md)**
  - Real-time synchronization and live updates
  - Status: 📋 **Planned**

### Phase 3: System Enhancement
- **[ADR-008: Server State & Expansion Management Implementation](ADR-008-server-state-expansion-management.md)**
  - Server state management and expansion tracking
  - Status: 📋 **Planned**

- **[ADR-009: Analytics & Metadata Implementation](ADR-009-analytics-metadata.md)**
  - Analytics and metadata collection features
  - Status: 📋 **Planned**

## ADR Template

New ADRs should use the **[ADR Template](ADR-TEMPLATE.md)** to maintain consistency across all decision records.

## Implementation Progress

- **Phase 0**: ✅ 3/3 Complete (Foundation established)
- **Phase 1**: 📋 0/3 Complete (Enhanced operations)  
- **Phase 2**: 📋 0/3 Complete (Advanced features)
- **Phase 3**: 📋 0/2 Complete (System enhancement)

See **[docs/COVERAGE-ANALYSIS.md](../docs/COVERAGE-ANALYSIS.md)** for detailed coverage analysis and implementation roadmap.