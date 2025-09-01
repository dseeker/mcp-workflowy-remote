# ADR-006: Export/Import Functionality Implementation

## Status
**Status**: Proposed  
**Date**: 2025-08-29  
**Authors**: System Architect  
**Reviewers**: Development Team  

## Context and Problem Statement

Workflowy users frequently need to export their lists in different formats for sharing, backup, or integration with other tools. They also need intelligent import capabilities that understand the structure and context of their content. The current MCP server lacks compound operations that combine export/import with content analysis, context preservation, and smart formatting.

What architectural problem are we solving?
- **Context-Aware Export**: Simple exports lose important Workflowy context like mirrors, completion dates, hierarchy relationships
- **Smart Import Processing**: Imported content needs intelligent parsing to recreate appropriate list structures
- **Format Intelligence**: Different export contexts (backup vs sharing vs integration) need different levels of detail
- **Content Enhancement**: Exports could be enhanced with backlinks, metadata, and cross-references automatically

## Decision Drivers

* **Data Portability**: Enable users to export and use Workflowy data in external systems
* **Backup and Recovery**: Provide comprehensive backup solutions with selective restore
* **Format Compatibility**: Support standard formats (OPML, JSON, Plain Text, Markdown)
* **Selective Operations**: Enable filtered exports and targeted imports
* **Integration Workflows**: Support AI-driven content transformation and migration
* **Performance Efficiency**: Handle large document exports without token limits

## Considered Options

1. **Basic Export Only**: Simple export functionality without import capabilities
2. **Comprehensive Export/Import Suite**: Full bidirectional data exchange with multiple formats
3. **Format-Specific Implementation**: Focus on specific formats (OPML) with high fidelity
4. **Advanced Transformation Pipeline**: Include content transformation and filtering capabilities

## Decision Outcome

**Chosen option**: Comprehensive Export/Import Suite - Full bidirectional data exchange with multiple formats

### Positive Consequences

* **Complete Data Portability**: Users can seamlessly move data between platforms and systems
* **Robust Backup Solutions**: Comprehensive backup and selective restore capabilities
* **Enhanced Integration**: Support for diverse productivity tool ecosystems
* **AI-Powered Workflows**: Enable sophisticated content analysis and transformation
* **Future-Proof Architecture**: Extensible format support for emerging standards

### Negative Consequences

* **Implementation Complexity**: Multiple format support requires diverse parsing and generation logic
* **Quality Assurance**: Maintaining fidelity across different formats requires extensive testing
* **Performance Considerations**: Large exports may require streaming and optimization

## Pros and Cons of the Options

### Option 1: Basic Export Only

**Pros**:
* Simple implementation with minimal complexity
* Fast development timeline and deployment
* Lower maintenance overhead

**Cons**:
* Cannot restore or migrate data programmatically
* Limited utility for backup and recovery workflows
* Missing bidirectional integration capabilities

### Option 2: Comprehensive Export/Import Suite

**Pros**:
* Complete data portability and backup solutions
* Support for diverse integration workflows
* Bidirectional data exchange capabilities
* Extensible architecture for additional formats

**Cons**:
* Higher implementation complexity
* Multiple format parsers and generators to maintain
* Extensive testing required for format fidelity

### Option 3: Format-Specific Implementation

**Pros**:
* High fidelity for specific format (OPML)
* Standard compliance for outline processors
* Simpler implementation than multi-format approach

**Cons**:
* Limited format support restricts integration options
* Missing popular formats like Markdown and JSON
* Incomplete solution for diverse user workflows

### Option 4: Advanced Transformation Pipeline

**Pros**:
* Sophisticated content transformation capabilities
* Advanced filtering and processing options
* Enhanced AI integration for content analysis

**Cons**:
* Significant implementation overhead
* Complex transformation logic to maintain
* High token usage for advanced processing

## LLM Implementation Estimation

### Computational Requirements
| Metric | Estimation | Rationale |
|--------|------------|-----------|
| **Total Requests** | ~45 requests | Multiple format parsers/generators and comprehensive testing |
| **Input Tokens** | ~28,000 tokens | Format specifications, parsing logic, test data analysis |
| **Output Tokens** | ~16,000 tokens | Parser/generator code, format conversion, testing |
| **Processing Time** | ~75 minutes | Multiple format implementations and validation |
| **Model Size Required** | Medium-Large | Format parsing and generation algorithms |
| **Context Window** | 24,000 tokens | Multiple format specifications and examples |

### Implementation Complexity Analysis
**Code Generation Scope**:
- **Lines of Code (LoC)**: ~700 lines estimated
- **File Modifications**: ~4 files to change
- **New Files**: ~3 new files (export manager, format converters, import validator)
- **Test Coverage**: ~40 test cases needed (including format validation scenarios)

**LLM Capability Requirements**:
- **Code Understanding**: High - Multiple format specifications and conversion algorithms
- **Architecture Design**: Medium - Export/import pipeline design  
- **Code Generation**: High - Format parsers, generators, and validation logic
- **Testing Strategy**: High - Format fidelity testing and edge case validation
- **Documentation**: High - Technical format specifications and usage examples

### Token Budget Breakdown
```
Phase 1 - Analysis & Planning
├── Format Specification Analysis: ~10,000 input tokens
├── Export/Import Architecture Design: ~2,500 output tokens
└── Format Conversion Planning: ~1,500 output tokens

Phase 2 - Implementation  
├── export_subtree Operation: ~2,500 output tokens
├── import_subtree Operation: ~3,000 output tokens
├── export_filtered Operation: ~2,000 output tokens
├── OPML Format Converter: ~2,500 output tokens
├── JSON Format Converter: ~1,500 output tokens
├── Markdown Format Converter: ~2,000 output tokens
└── Plain Text Converter: ~1,000 output tokens

Phase 3 - Testing & Validation
├── Format Fidelity Testing: ~3,500 output tokens
├── Large Document Testing: ~2,000 output tokens
├── Import Validation Testing: ~2,500 output tokens
├── Integration Export Testing: ~4,000 input + 1,500 output tokens
└── Documentation Updates: ~2,000 output tokens

Total Estimated: ~42,000 tokens
```

### Model Selection Criteria
| Task Type | Recommended Model | Context Requirement | Reasoning |
|-----------|------------------|-------------------|-----------|
| **Format Parser Design** | Medium-Large | 20K+ tokens | Complex format specification analysis |
| **Conversion Logic** | Medium-Large | 16K+ tokens | Multi-format conversion algorithms |
| **Validation Testing** | Medium | 12K+ tokens | Format fidelity and edge case testing |
| **Documentation** | Medium | 8K+ tokens | Technical format specifications |

### Risk Factors & Mitigation
**High Token Usage Scenarios**:
- Complex format conversion logic for maintaining fidelity across formats
- Comprehensive testing for large documents and edge cases
- Advanced filtering and transformation logic implementation

**Mitigation Strategies**:
- Use established format parsing libraries where available
- Implement streaming for large document processing
- Create reusable format conversion utilities
- Utilize existing Workflowy library methods (`toOpml()`, `toJson()`, `toPlainText()`)

## Implementation Notes

### Key Compound Operations Required

1. **export_with_context()** - Export with backlinks, mirrors, and relationships - **Est: 3,000 tokens**
2. **capture_structured_info()** - Parse and import unstructured text into organized lists - **Est: 3,500 tokens**  
3. **create_status_report()** - Generate formatted reports from list data - **Est: 2,800 tokens**
4. **smart_backup_export()** - Context-aware backup with restoration metadata - **Est: 2,500 tokens**
5. **import_with_intelligence()** - Smart parsing that recreates appropriate structures - **Est: 3,200 tokens**
6. **Comprehensive testing suite** - ~30 test cases for intelligent export/import - **Est: 3,000 tokens**

### Intelligent Export/Import Architecture

**Context-Aware Export Operation**:
```typescript
async export_with_context({
  nodeId: "research-notes",
  includeBacklinks: true,
  expandMirrors: true,
  format: "markdown"
}): Promise<EnhancedExportResult> {
  // Internally orchestrates:
  // 1. get_node_by_id() with full depth
  // 2. search_nodes() to find all items that reference this node
  // 3. resolve_mirror() for any mirror items to get original content
  // 4. export_subtree() with enhanced content including backlinks
  
  const mainContent = await this.getNodeById(nodeId, { maxDepth: -1 });
  const backlinks = await this.findBacklinksTo(nodeId);
  const mirrorContent = await this.resolveMirrorReferences(mainContent);
  
  const enhancedContent = this.mergeContentWithContext(
    mainContent, 
    backlinks, 
    mirrorContent
  );
  
  return {
    content: enhancedContent.toMarkdown(),
    metadata: {
      backlinksFound: backlinks.length,
      mirrorsExpanded: mirrorContent.length,
      exportDate: new Date()
    }
  };
}

interface ImportOptions {
  format?: ExportFormat; // Auto-detect if not specified
  targetParentId: string;
  preserveStructure: boolean;
  conflictResolution: 'skip' | 'merge' | 'replace';
  validateStructure: boolean;
}
```

**Format Converter Implementation**:
```typescript
abstract class FormatConverter {
  abstract export(node: WorkflowyNode, options: ExportOptions): Promise<string>;
  abstract import(content: string, options: ImportOptions): Promise<ImportResult>;
  abstract validate(content: string): ValidationResult;
}

class OPMLConverter extends FormatConverter {
  async export(node: WorkflowyNode, options: ExportOptions): Promise<string> {
    // Use native Workflowy toOpml() method with filtering
    const filteredNode = this.applyFilters(node, options);
    return filteredNode.toOpml();
  }

  async import(content: string, options: ImportOptions): Promise<ImportResult> {
    const validation = this.validate(content);
    if (!validation.valid) {
      throw new Error(`Invalid OPML: ${validation.errors.join(', ')}`);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    return this.parseOPMLStructure(doc, options);
  }

  validate(content: string): ValidationResult {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/xml');
      
      // Validate OPML structure
      const opml = doc.querySelector('opml');
      if (!opml) return { valid: false, errors: ['Missing OPML root element'] };
      
      const head = doc.querySelector('head title');
      const body = doc.querySelector('body');
      if (!body) return { valid: false, errors: ['Missing OPML body element'] };
      
      return { valid: true, errors: [] };
    } catch (error) {
      return { valid: false, errors: [error.message] };
    }
  }
}
```

### Advanced Export Features

**Filtered Export Implementation**:
```typescript
async exportFiltered(
  nodeId: string,
  criteria: FilterCriteria,
  format: ExportFormat
): Promise<ExportResult> {
  const rootNode = await this.getNode(nodeId);
  
  // Apply filtering criteria
  const filteredNode = await this.applyFilters(rootNode, criteria);
  
  // Convert to specified format
  const converter = this.getFormatConverter(format);
  const exportContent = await converter.export(filteredNode, {
    format,
    includeCompleted: criteria.includeCompleted,
    includeNotes: criteria.includeNotes,
    maxDepth: criteria.maxDepth
  });
  
  return {
    nodeId,
    format,
    content: exportContent,
    nodeCount: this.countNodes(filteredNode),
    exportedAt: new Date(),
    criteria
  };
}

interface FilterCriteria {
  includeCompleted?: boolean;
  includeNotes?: boolean;
  dateRange?: { from: Date; to: Date };
  pattern?: string | RegExp;
  maxDepth?: number;
  minDepth?: number;
}
```

### Import Validation and Conflict Resolution

**Import Validation System**:
```typescript
class ImportValidator {
  async validateImport(
    content: string,
    format: ExportFormat,
    targetParent: string
  ): Promise<ValidationResult> {
    const converter = this.getFormatConverter(format);
    const formatValidation = converter.validate(content);
    
    if (!formatValidation.valid) {
      return formatValidation;
    }
    
    // Additional validation
    const structureValidation = await this.validateStructure(content, format);
    const permissionValidation = await this.validatePermissions(targetParent);
    
    return this.combineValidationResults([
      formatValidation,
      structureValidation,
      permissionValidation
    ]);
  }

  async resolveConflicts(
    importData: ParsedImportData,
    existingNodes: WorkflowyNode[],
    resolution: ConflictResolution
  ): Promise<ConflictResolutionResult> {
    const conflicts: ImportConflict[] = [];
    const resolutions: ConflictAction[] = [];
    
    for (const importNode of importData.nodes) {
      const existing = existingNodes.find(n => 
        n.name === importNode.name || n.id === importNode.id
      );
      
      if (existing) {
        const conflict: ImportConflict = {
          importNode,
          existingNode: existing,
          conflictType: this.determineConflictType(importNode, existing)
        };
        
        conflicts.push(conflict);
        resolutions.push(await this.resolveConflict(conflict, resolution));
      }
    }
    
    return { conflicts, resolutions };
  }
}
```

### Migration Strategy

1. **Step 1: Export framework** - Basic export with OPML support - **Est: 10 requests, 8,000 tokens**
2. **Step 2: Multiple format support** - JSON, Markdown, Plain Text converters - **Est: 12 requests, 9,500 tokens**
3. **Step 3: Import functionality** - Format detection and import validation - **Est: 15 requests, 11,000 tokens**
4. **Step 4: Filtered export** - Advanced filtering and selective export - **Est: 10 requests, 7,500 tokens**
5. **Step 5: Optimization and testing** - Performance optimization and comprehensive testing - **Est: 8 requests, 6,000 tokens**

### Performance Optimization Strategies

**Large Document Handling**:
- Implement streaming export for documents with 1000+ nodes
- Use pagination for large import operations
- Add progress tracking for long-running export/import operations
- Implement partial export/import with resume capabilities

**Memory Management**:
- Stream processing for large format conversions
- Lazy loading for large imported document structures
- Efficient memory usage for format parsing and generation
- Garbage collection optimization for large operations

## Links and References

* [ADR-001: Critical Missing Operations](ADR-001-critical-missing-operations.md)
* [ADR-002: Enhanced Navigation Operations](ADR-002-enhanced-navigation-operations.md)
* [ADR-003: Sharing and Collaboration Features](ADR-003-sharing-collaboration-features.md)
* [ADR-004: Mirror/Reference System](ADR-004-mirror-reference-system.md)
* [ADR-005: Batch and Advanced Operations](ADR-005-batch-advanced-operations.md)
* [ROADMAP.md - Phase 5 Export & Import](../ROADMAP.md#phase-5-export--import-medium-priority)
* [OPML Specification](http://opml.org/spec2.opml)
* [JSON Schema Specification](https://json-schema.org/)
* [CommonMark Markdown Specification](https://commonmark.org/)

## Alternatives Considered

**Alternative 1: Cloud-Based Format Conversion**
- Use external services for format conversion
- **Rejected**: Creates external dependencies and potential security issues

**Alternative 2: Plugin-Based Format Architecture**
- Extensible plugin system for custom format support
- **Future Enhancement**: May be considered for community-contributed formats

**Alternative 3: Real-time Export Streaming**
- Live export streaming for very large documents
- **Partial Adoption**: Will be implemented for large document optimization

---

**Export/Import Implementation Priority**:
- Format fidelity must be maintained across all supported formats
- Import validation is mandatory to prevent document corruption
- Large document handling should use streaming to avoid memory issues
- Comprehensive testing must include round-trip validation (export → import → verify)