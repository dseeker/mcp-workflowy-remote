# Review Prompt: MCP-First Design Philosophy Alignment

## TASK: Comprehensive ADR and Documentation Review

**Objective**: Review all ADRs, documentation, and system design to realign with the new **MCP-First Design Philosophy**.

### NEW DESIGN PHILOSOPHY

**Previous Approach (Library-First):**
- ❌ 1:1 function replication from Workflowy library to MCP
- ❌ API surface mirrors library capabilities directly
- ❌ Users must understand Workflowy's internal structure
- ❌ Complex multi-step operations require multiple MCP calls

**NEW Approach (MCP-First):**
- ✅ Design APIs for **user intent and workflows**, not library functions
- ✅ Single MCP calls accomplish complete user goals
- ✅ Hide Workflowy complexity behind intuitive interfaces
- ✅ Use library internally to orchestrate complex operations

### EXAMPLES OF MCP-FIRST THINKING

#### **Example 1: Project Planning Workflow**
```typescript
// OLD (Library-First): Multiple calls needed
create_node({ parentId: "root", name: "Q4 Planning" })
create_node({ parentId: "q4-id", name: "Sprint 1" }) 
create_node({ parentId: "q4-id", name: "Sprint 2" })
create_node({ parentId: "sprint1-id", name: "User Stories" })

// NEW (MCP-First): Single intent-driven call
create_project_structure({
  name: "Q4 Planning",
  template: "agile-sprints", // Built-in templates
  sprints: ["Sprint 1", "Sprint 2"],
  sections: ["User Stories", "Tasks", "Reviews"]
  // Internally: Creates full hierarchy in one operation
})
```

#### **Example 2: Content Organization**
```typescript
// OLD (Library-First): Manual hierarchy building
search_nodes({ query: "urgent" })
get_node_by_id({ nodeId: "...", includeFields: ["parentId"] })
move_node({ nodeId: "...", newParentId: "urgent-folder" })

// NEW (MCP-First): Intent-based organization
organize_by_priority({
  criteria: "urgent", 
  action: "collect_into_folder",
  folderName: "Urgent Items",
  // Internally: Search + analyze + create folder + move items
})
```

#### **Example 3: Weekly Review Workflow**
```typescript
// OLD (Library-First): Multiple operations
search_nodes({ query: "completed", includeFields: ["completedAt"] })
search_nodes({ query: "overdue" })
list_nodes({ includeFields: ["lastModifiedAt"] })

// NEW (MCP-First): Workflow-oriented
generate_weekly_review({
  startDate: "2023-12-25",
  endDate: "2023-12-31",
  // Returns: Comprehensive review with completed items, 
  //          overdue tasks, progress metrics, recommendations
})
```

### REVIEW INSTRUCTIONS

#### **1. ADR Review Criteria**

For each ADR in `/adr/*.md`, evaluate:

**A. Current Status Alignment**
- Is the ADR solving a real user workflow problem?
- Does it propose 1:1 library mapping or MCP-first design?
- Can the proposed operations be combined into more intuitive workflows?

**B. MCP-First Redesign Opportunities**
- What user intents does this ADR actually serve?
- How can multiple proposed operations be combined into single workflow operations?
- What Workflowy complexity can be hidden from users?

**C. Implementation Impact**
- Which ADRs become obsolete with MCP-first approach?
- Which ADRs need fundamental redesign?
- What new workflow-oriented ADRs should be created?

#### **2. Documentation Review Criteria**

For `docs/API.md`, `docs/ARCHITECTURE.md`, `ROADMAP.md`:

**A. User Intent Focus**
- Are we documenting tools or workflows?
- Do examples show library functions or user goals?
- Is the complexity appropriate for MCP users?

**B. Workflow Coverage**
- What are the top 10 user workflows with Workflowy?
- How many MCP calls does each workflow currently require?
- Which workflows can be simplified into single operations?

**C. Architecture Alignment**
- Does the architecture support workflow orchestration?
- Are we building tools or solutions?
- How do we balance simplicity with flexibility?

### SPECIFIC QUESTIONS TO ANSWER

#### **ADR Analysis Questions**

1. **Which current ADRs propose operations that should be combined?**
   - Example: ADR-003 (sharing) + ADR-004 (mirrors) → `setup_project_collaboration`?

2. **What user workflows are missing from current ADRs?**
   - Project setup and templates
   - Content organization and cleanup  
   - Review and reporting workflows
   - Bulk operations and maintenance

3. **Which proposed tools are too granular for MCP usage?**
   - Should `get_node_hierarchy` + `get_node_siblings` become `get_navigation_context`?
   - Should `share_node` + `set_permissions` become `setup_sharing`?

#### **Design Philosophy Questions**

4. **What are the top 5 Workflowy user workflows we should optimize for?**
   - How should these translate to MCP operations?

5. **How can we reduce cognitive load for AI assistants using our MCP?**
   - What information should be automatically included vs. requested?
   - Which operations should be atomic vs. composable?

6. **What Workflowy complexity should we abstract away?**
   - Priority management and sibling ordering
   - Authentication and session handling
   - Error recovery and retry logic
   - Token optimization and response management

### OUTPUT REQUIREMENTS

Provide a comprehensive analysis including:

1. **ADR-by-ADR Review**
   - Current status and relevance
   - MCP-first redesign recommendations
   - Proposed status changes (keep/merge/obsolete/redesign)

2. **New Workflow-Oriented ADRs Needed**
   - High-level user workflow operations
   - Multi-step orchestration capabilities
   - Template and automation systems

3. **Documentation Restructuring Plan**
   - Move from tool documentation to workflow documentation
   - Add user journey examples
   - Simplify complexity for MCP consumers

4. **Architecture Evolution Roadmap**
   - How to evolve from current tool-based to workflow-based architecture
   - Migration strategy for existing users
   - Implementation priority for workflow operations

5. **Concrete Next Steps**
   - Which ADRs to update/create first
   - What documentation needs immediate revision
   - Priority order for implementing workflow operations

### SUCCESS CRITERIA

By the end of this review, we should have:
- ✅ Clear understanding of which ADRs align with MCP-first philosophy
- ✅ Identification of workflow gaps in current design
- ✅ Concrete roadmap for evolving to workflow-oriented architecture
- ✅ Updated ADRs that reflect the new design philosophy
- ✅ Documentation that focuses on user workflows rather than technical operations

---

**IMPORTANT**: This review should fundamentally question our current approach and propose a more user-centric, workflow-oriented design that leverages the Workflowy library to deliver complete solutions rather than exposing granular operations.