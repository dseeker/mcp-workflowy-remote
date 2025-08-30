# ADR-008: Server State & Expansion Management Implementation

## Status
**Status**: Proposed  
**Date**: 2025-08-29  
**Authors**: System Architect  
**Reviewers**: Development Team  

## Context and Problem Statement

Workflowy's expansion state management is crucial for user experience, allowing users to control which parts of their document hierarchy are visible across different devices and sessions. The current MCP server lacks any expansion state management, preventing AI assistants from understanding or managing the visual presentation of hierarchical content.

What architectural problem are we solving?
- Missing cross-device expansion state synchronization
- No programmatic control over document presentation and focus
- Inability to manage large document navigation efficiently
- Lack of context-aware content presentation for AI interactions

## Decision Drivers

* **User Experience Consistency**: Maintain expansion state across devices and sessions
* **Navigation Efficiency**: Programmatic expansion control for large documents
* **AI Context Management**: Help AI understand document focus and presentation intent
* **Performance Optimization**: Efficient handling of expansion state for large hierarchies
* **Cross-Device Sync**: Seamless expansion state synchronization across platforms
* **Focus Management**: Support focused work on specific document sections

## Considered Options

1. **Basic Expansion Control**: Simple expand/collapse operations without synchronization
2. **Comprehensive State Management**: Full expansion state sync with cross-device support
3. **Local State Only**: Client-side expansion management without server persistence
4. **Advanced Focus Features**: Enhanced focus modes with automatic expansion management

## Decision Outcome

**Chosen option**: Comprehensive State Management - Full expansion state sync with cross-device support

### Positive Consequences

* **Consistent User Experience**: Expansion state maintained across all devices and sessions
* **Enhanced Navigation**: Programmatic control enables efficient large document management
* **AI-Assisted Focus**: AI can help users focus on relevant document sections
* **Performance Benefits**: Optimized presentation reduces cognitive load and improves performance
* **Cross-Platform Sync**: Seamless experience across web, mobile, and API interfaces

### Negative Consequences

* **State Complexity**: Managing expansion state across devices requires sophisticated synchronization
* **Storage Requirements**: Expansion state data adds to server storage requirements
* **Sync Overhead**: Additional synchronization operations for expansion state changes

## LLM Implementation Estimation

### Computational Requirements
| Metric | Estimation | Rationale |
|--------|------------|-----------|
| **Total Requests** | ~35 requests | State management and synchronization logic |
| **Input Tokens** | ~22,000 tokens | State management patterns, sync algorithms |
| **Output Tokens** | ~14,000 tokens | State management code, sync operations |
| **Processing Time** | ~60 minutes | State synchronization and management systems |
| **Model Size Required** | Medium-Large | State management algorithms and sync logic |
| **Context Window** | 20,000 tokens | Complex state management and sync analysis |

### Implementation Complexity Analysis
**Code Generation Scope**:
- **Lines of Code (LoC)**: ~400 lines estimated
- **File Modifications**: ~4 files to change
- **New Files**: ~2 new files (expansion manager, state sync handler)
- **Test Coverage**: ~25 test cases needed (including state sync scenarios)

### Key Changes Required
1. **expand_node operation** - Set expansion state for specific nodes - **Est: 1,800 tokens**
2. **collapse_node operation** - Set collapse state for specific nodes - **Est: 1,800 tokens**
3. **get_expanded_nodes** - List all expanded nodes in document - **Est: 2,000 tokens**
4. **sync_expansion_state** - Cross-device expansion state synchronization - **Est: 3,000 tokens**
5. **Focus management system** - Advanced focus modes and automatic expansion - **Est: 2,500 tokens**
6. **State persistence framework** - Efficient expansion state storage and retrieval - **Est: 2,500 tokens**

## Implementation Notes

### Expansion State Management Architecture

```typescript
interface ExpansionState {
  nodeId: string;
  expanded: boolean;
  timestamp: Date;
  deviceId: string;
  sessionId?: string;
}

interface FocusMode {
  id: string;
  name: string;
  expandedNodes: string[];
  collapsedNodes: string[];
  autoExpansionRules?: ExpansionRule[];
}

interface ExpansionRule {
  condition: 'depth' | 'pattern' | 'completion' | 'recent';
  parameters: any;
  action: 'expand' | 'collapse';
}

class ExpansionManager {
  async expandNode(nodeId: string, recursive: boolean = false): Promise<ExpansionResult> {
    const node = await this.getNode(nodeId);
    
    // Set expansion state
    await this.setExpansionState(nodeId, true);
    
    if (recursive && node.items) {
      // Recursively expand all children
      const childExpansions = await Promise.all(
        node.items.map(child => this.expandNode(child.id, true))
      );
      
      return {
        nodeId,
        expanded: true,
        childrenExpanded: childExpansions.length,
        recursive
      };
    }
    
    // Sync expansion state across devices
    await this.syncExpansionState(nodeId, true);
    
    return {
      nodeId,
      expanded: true,
      recursive: false
    };
  }

  async getExpandedNodes(includeImplicit: boolean = false): Promise<ExpansionState[]> {
    const explicitlyExpanded = await this.getExplicitExpansionStates();
    
    if (!includeImplicit) {
      return explicitlyExpanded;
    }
    
    // Include implicitly expanded nodes (parents of expanded children)
    const implicitlyExpanded = await this.calculateImplicitExpansions(explicitlyExpanded);
    
    return [...explicitlyExpanded, ...implicitlyExpanded];
  }

  async syncExpansionState(deviceId?: string): Promise<SyncResult> {
    const localState = await this.getLocalExpansionState();
    const serverState = await this.getServerExpansionState(deviceId);
    
    // Merge expansion states with conflict resolution
    const mergedState = await this.mergeExpansionStates(localState, serverState);
    
    // Apply merged state to document
    await this.applyExpansionState(mergedState);
    
    // Push changes to server
    await this.pushExpansionState(mergedState);
    
    return {
      localChanges: localState.length,
      serverChanges: serverState.length,
      conflicts: mergedState.conflicts?.length || 0,
      synced: true
    };
  }
}
```

### Advanced Focus Management

```typescript
class FocusManager {
  async createFocusMode(
    name: string, 
    targetNodes: string[], 
    rules?: ExpansionRule[]
  ): Promise<FocusMode> {
    // Collapse all nodes first
    await this.collapseAllNodes();
    
    // Expand target nodes and their paths
    const expandedNodes = [];
    for (const nodeId of targetNodes) {
      const pathToRoot = await this.getPathToRoot(nodeId);
      await this.expandPath(pathToRoot);
      expandedNodes.push(...pathToRoot);
    }
    
    // Apply automatic expansion rules if provided
    if (rules) {
      const autoExpanded = await this.applyExpansionRules(rules);
      expandedNodes.push(...autoExpanded);
    }
    
    const focusMode: FocusMode = {
      id: this.generateId(),
      name,
      expandedNodes: [...new Set(expandedNodes)],
      collapsedNodes: [],
      autoExpansionRules: rules
    };
    
    await this.saveFocusMode(focusMode);
    return focusMode;
  }

  async applyExpansionRules(rules: ExpansionRule[]): Promise<string[]> {
    const expandedNodes: string[] = [];
    
    for (const rule of rules) {
      const matchingNodes = await this.findNodesMatchingRule(rule);
      
      for (const node of matchingNodes) {
        if (rule.action === 'expand') {
          await this.expandNode(node.id);
          expandedNodes.push(node.id);
        } else {
          await this.collapseNode(node.id);
        }
      }
    }
    
    return expandedNodes;
  }
}
```

### Migration Strategy

1. **Step 1: Basic expansion operations** - expand_node and collapse_node - **Est: 8 requests, 6,000 tokens**
2. **Step 2: State management** - get_expanded_nodes and state persistence - **Est: 10 requests, 7,500 tokens**
3. **Step 3: Cross-device sync** - sync_expansion_state implementation - **Est: 12 requests, 9,000 tokens**
4. **Step 4: Advanced focus modes** - Focus management and automatic expansion rules - **Est: 15 requests, 10,500 tokens**

### Performance Optimization Strategies

**State Management Optimizations**:
- Use delta compression for expansion state changes
- Implement lazy loading for large expansion state collections
- Cache frequently accessed expansion states
- Use efficient diff algorithms for state synchronization

**Cross-Device Sync Optimizations**:
- Batch expansion state changes for efficient synchronization
- Use timestamp-based conflict resolution for concurrent changes
- Implement incremental sync for large documents
- Optimize network usage with compression and delta sync

## Links and References

* [ADR-007: Real-time & Sync Features](ADR-007-realtime-sync-features.md)
* [ROADMAP.md - Phase 7 Server State & Expansion](../ROADMAP.md#phase-7-server-state--expansion-advanced)
* [Workflowy Expansion State Documentation](https://workflowy.com/features/focus)
* [State Management Patterns](https://redux.js.org/understanding/thinking-in-redux/three-principles)

## Alternatives Considered

**Alternative 1: Client-Side Only State**
- Manage expansion state only on client side
- **Rejected**: Doesn't provide cross-device synchronization

**Alternative 2: Simple Boolean State**
- Basic expanded/collapsed state without advanced features
- **Rejected**: Missing advanced focus management capabilities

**Alternative 3: Real-time State Sync**
- Live synchronization of expansion state changes
- **Future Enhancement**: May be added with WebSocket support

---

**Expansion State Implementation Priority**:
- Cross-device synchronization is essential for user experience
- State management must be efficient for large documents
- Focus modes should support advanced workflow scenarios
- All state operations must be thoroughly tested for consistency