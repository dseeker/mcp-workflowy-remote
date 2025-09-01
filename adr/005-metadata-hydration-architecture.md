# ADR-005: Metadata Hydration Architecture

**Status**: Accepted  
**Date**: 2025-08-31  
**Deciders**: Development Team

## Context

The MCP Workflowy server initially provided basic node data (id, name, note, isCompleted) through existing tools like `search_nodes`, `list_nodes`, and `get_node_by_id`. Users needed additional metadata such as parent information, hierarchy paths, sibling relationships, timestamps, and sharing status for enhanced workflows like breadcrumb navigation, position awareness, and audit trails.

### Problem Statement

How to extend the existing MCP tools to provide rich metadata without:
1. Creating duplicate tools that serve similar purposes
2. Impacting performance when metadata isn't needed
3. Breaking backward compatibility
4. Increasing API surface complexity

## Decision

We decided to implement **metadata hydration via enhanced `includeFields`** parameter rather than creating separate metadata-specific MCP tools.

### Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MCP Tool      │    │  Client Method   │    │  Workflowy API  │
│                 │    │                  │    │                 │
│ includeFields:  │───▶│ Detect metadata  │───▶│ List objects    │
│ ['id', 'name',  │    │ fields requested │    │ with full props │
│  'parentId',    │    │                  │    │                 │
│  'hierarchy']   │    │ Hydrate if needed│    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Enhanced Field Categories

**Basic Fields** (existing):
- `id`, `name`, `note`, `isCompleted`, `items`

**Metadata Fields** (new):
- **Parent Info**: `parentId`, `parentName`
- **Position**: `priority`, `siblingCount`
- **Timestamps**: `lastModifiedAt`, `completedAt`
- **Mirrors**: `isMirror`, `originalId`
- **Sharing**: `isSharedViaUrl`, `sharedUrl`
- **Navigation**: `hierarchy`, `siblings`

### Implementation Details

1. **Field Detection**: `isMetadataField()` method identifies which fields require hydration
2. **Conditional Hydration**: Only fetch Workflowy List objects when metadata fields are requested
3. **Error Resilience**: Metadata hydration failures log warnings but don't break responses
4. **Performance Logging**: `metadataHydrated` flag tracks when hydration occurs

## Alternatives Considered

### Alternative 1: Separate MCP Tools
Create dedicated tools like `get_node_details`, `get_node_hierarchy`, `get_node_siblings`.

**Pros**: 
- Clear separation of concerns
- Explicit tool purposes

**Cons**: 
- API proliferation (8 tools → 11+ tools)
- Duplicate functionality
- Users must learn multiple similar tools
- Inconsistent field selection patterns

### Alternative 2: Always Include All Metadata
Hydrate all metadata fields by default in every response.

**Pros**: 
- Simplest implementation
- No conditional logic needed

**Cons**: 
- Performance impact for simple use cases
- Larger response payloads
- Potential token limit issues
- Unnecessary API calls

### Alternative 3: Separate Metadata Endpoint
Create a single `get_metadata` tool that takes nodeId and returns all metadata.

**Pros**: 
- Single metadata source
- Clear caching boundaries

**Cons**: 
- Requires two API calls for complete data
- Complicates caching strategies
- Less intuitive user experience

## Benefits

### 1. **Single Source of Truth**
```typescript
// One tool handles all needs
search_nodes({
  query: "project",
  includeFields: ['name', 'parentName', 'hierarchy', 'priority']
  // Returns complete objects with navigation context
})
```

### 2. **Backward Compatibility**
Existing usage continues unchanged:
```typescript
// Still works exactly as before
list_nodes({ includeFields: ['id', 'name'] })
```

### 3. **Performance Optimization**
```typescript
// No metadata overhead when not needed
list_nodes() // Basic fields only, no Workflowy List objects accessed

// Metadata only when requested
list_nodes({ includeFields: ['name', 'hierarchy'] }) // Triggers hydration
```

### 4. **Comprehensive Metadata**
Users can request exactly the metadata they need:
```typescript
get_node_by_id({
  nodeId: "123",
  includeFields: ['name', 'note', 'hierarchy', 'siblings', 'lastModifiedAt']
})
```

## Implementation Impact

### Code Changes
- **Client Methods**: All data-fetching methods support metadata hydration
- **Field Filtering**: Enhanced `createFilteredNode()` with async metadata support
- **Tool Schemas**: Updated descriptions document all available fields
- **Testing**: Comprehensive test coverage for metadata scenarios

### Performance Characteristics
- **No Metadata**: No performance impact (same as before)
- **With Metadata**: Additional Workflowy List object access, logged for monitoring
- **Memory**: Workflowy List objects only retained during hydration

### Monitoring
```json
{
  "metadataHydrated": true,
  "includeFields": "name,parentId,hierarchy",
  "performance": "metadata access time tracked"
}
```

## Consequences

### Positive
- ✅ Clean, unified API - no tool duplication
- ✅ Pay-for-what-you-use performance model
- ✅ Rich metadata available when needed
- ✅ Backward compatible
- ✅ Extensible for future metadata fields

### Negative
- ❌ Slightly more complex field detection logic
- ❌ Async metadata hydration adds complexity
- ❌ Error handling for metadata failures

### Risks and Mitigations
- **Risk**: Metadata hydration errors break responses
  - **Mitigation**: Graceful error handling, partial responses with warnings
- **Risk**: Performance impact with large datasets
  - **Mitigation**: Performance logging, token optimization integration
- **Risk**: Complex field validation
  - **Mitigation**: Comprehensive test coverage, clear documentation

## Future Extensions

This architecture supports easy addition of new metadata fields:

1. Add field to `isMetadataField()` list
2. Implement hydration logic in `hydrateMetadataFields()`
3. Update tool schema descriptions
4. Add test coverage

**Potential Future Fields**:
- `createdBy`, `modifiedBy` (user attribution)
- `tags` (if Workflowy adds tagging)
- `permissions` (detailed sharing permissions)
- `statistics` (child count, completion rate)

## Compliance

- ✅ **MCP Protocol**: Standard `includeFields` parameter pattern
- ✅ **REST Best Practices**: Field selection, optional inclusion
- ✅ **Performance**: Pay-for-what-you-use model
- ✅ **Testing**: 14 new tests covering metadata scenarios
- ✅ **Documentation**: Clear field categorization and examples

## Conclusion

The metadata hydration architecture successfully extends the MCP Workflowy server capabilities without introducing tool proliferation or breaking changes. It provides a clean, performant, and extensible foundation for rich metadata access that scales with user needs.

**Next Phase**: This enhancement completes Phase 1 of the roadmap, providing the navigation and metadata capabilities originally planned across multiple separate tools in a more elegant, unified architecture.