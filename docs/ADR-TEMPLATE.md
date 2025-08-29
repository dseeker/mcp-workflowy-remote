# ADR-XXX: [Short title describing the decision]

## Status
**Status**: [Proposed | Accepted | Rejected | Superseded | Deprecated]  
**Date**: YYYY-MM-DD  
**Authors**: [List of authors]  
**Reviewers**: [List of reviewers if applicable]  

## Context and Problem Statement
<!-- Describe the architectural problem we need to solve. Include any relevant background information, constraints, or requirements that led to this decision point. -->

What architectural problem are we solving?

## Decision Drivers
<!-- List the key factors that influence this decision -->

* [Factor 1: e.g., Performance requirements]
* [Factor 2: e.g., Security constraints]
* [Factor 3: e.g., Maintainability concerns]
* [Factor 4: e.g., AI/LLM capability requirements]
* [Factor 5: e.g., Token budget constraints]

## Considered Options
<!-- List all the options that were considered -->

1. **Option 1**: [Brief description]
2. **Option 2**: [Brief description]
3. **Option 3**: [Brief description]

## Decision Outcome
<!-- State the decision that was made -->

**Chosen option**: [Option X] - [Brief rationale]

### Positive Consequences
<!-- List the positive outcomes expected from this decision -->

* [Positive consequence 1]
* [Positive consequence 2]
* [Positive consequence 3]

### Negative Consequences
<!-- List any negative trade-offs or risks -->

* [Negative consequence 1]
* [Negative consequence 2]
* [Mitigation strategy for negative consequence]

## Pros and Cons of the Options

### Option 1: [Name]

<!-- Optional: brief description of the option -->

**Pros**:
* [Pro 1]
* [Pro 2]
* [Pro 3]

**Cons**:
* [Con 1]
* [Con 2]
* [Con 3]

### Option 2: [Name]

**Pros**:
* [Pro 1]
* [Pro 2]

**Cons**:
* [Con 1]
* [Con 2]

### Option 3: [Name]

**Pros**:
* [Pro 1]
* [Pro 2]

**Cons**:
* [Con 1]
* [Con 2]

## LLM Implementation Estimation
<!-- AI-based effort estimation using LLM metrics instead of human time -->

### Computational Requirements
| Metric | Estimation | Rationale |
|--------|------------|-----------|
| **Total Requests** | ~X requests | Based on iterative development cycles |
| **Input Tokens** | ~X,XXX tokens | Code reading, documentation, context |
| **Output Tokens** | ~X,XXX tokens | Generated code, responses, analysis |
| **Processing Time** | ~X minutes | Model inference + I/O operations |
| **Model Size Required** | [Small/Medium/Large] | Complexity of reasoning required |
| **Context Window** | X,XXX tokens | Maximum context needed simultaneously |

### Implementation Complexity Analysis
**Code Generation Scope**:
- **Lines of Code (LoC)**: ~XXX lines estimated
- **File Modifications**: ~X files to change
- **New Files**: ~X files to create
- **Test Coverage**: ~XX test cases needed

**LLM Capability Requirements**:
- **Code Understanding**: [Low/Medium/High] - Reading existing codebase
- **Architecture Design**: [Low/Medium/High] - System design decisions  
- **Code Generation**: [Low/Medium/High] - Writing new implementations
- **Testing Strategy**: [Low/Medium/High] - Test planning and creation
- **Documentation**: [Low/Medium/High] - Technical writing needs

### Token Budget Breakdown
```
Phase 1 - Analysis & Planning
├── Codebase Reading: ~X,XXX input tokens
├── Architecture Planning: ~XXX output tokens
└── Decision Documentation: ~XXX output tokens

Phase 2 - Implementation  
├── Code Generation: ~X,XXX output tokens
├── Refactoring: ~XXX input + XXX output tokens
└── Integration: ~XXX input + XXX output tokens

Phase 3 - Testing & Validation
├── Test Generation: ~XXX output tokens
├── Debugging: ~XXX input + XXX output tokens
└── Documentation: ~XXX output tokens

Total Estimated: ~XX,XXX tokens
```

### Model Selection Criteria
| Task Type | Recommended Model | Context Requirement | Reasoning |
|-----------|------------------|-------------------|-----------|
| **Code Reading** | Medium (70B+) | 8K+ tokens | Complex codebase analysis |
| **Architecture Design** | Large (100B+) | 16K+ tokens | System-wide reasoning |
| **Code Generation** | Medium-Large | 8K-32K tokens | Implementation details |
| **Testing** | Medium | 4K-8K tokens | Test case generation |
| **Documentation** | Medium | 8K-16K tokens | Technical writing |

### Risk Factors & Mitigation
**High Token Usage Scenarios**:
- Complex refactoring across multiple files
- Large codebase context requirements  
- Multiple iteration cycles for optimization
- Extensive testing and validation

**Mitigation Strategies**:
- Break work into smaller, focused chunks
- Use incremental development approach
- Leverage existing patterns and templates
- Implement caching for repeated contexts

## Implementation Notes
<!-- Technical details about how to implement this decision -->

### Key Changes Required
1. [Change 1 with code examples if applicable] - **Est: XXX tokens**
2. [Change 2 with file locations] - **Est: XXX tokens**  
3. [Change 3 with configuration updates] - **Est: XXX tokens**

### Migration Strategy
<!-- If this changes existing functionality -->

1. [Step 1: e.g., Implement new feature behind feature flag] - **Est: XXX requests, XXX tokens**
2. [Step 2: e.g., Test in staging environment] - **Est: XXX requests, XXX tokens**
3. [Step 3: e.g., Gradual rollout to production] - **Est: XXX requests, XXX tokens**
4. [Step 4: e.g., Remove old implementation] - **Est: XXX requests, XXX tokens**

## Links and References
<!-- Links to external resources, RFCs, documentation, etc. -->

* [Link to relevant documentation]
* [Link to external standards or specifications]
* [Link to related ADRs: ADR-XXX]
* [Link to GitHub issues or discussions]

## Alternatives Considered
<!-- More detailed analysis of rejected options, if space allows -->

<!-- This section can include more detailed technical analysis, benchmarking results, or prototype findings that informed the decision -->

---

**Template Notes**:
- Replace XXX with the sequential ADR number (001, 002, etc.)
- Remove any sections that aren't relevant to your specific ADR
- Keep ADRs focused and concise - aim for 1-3 pages maximum
- Update status as the decision evolves through the process
- Link related ADRs to show decision dependencies and evolution

**LLM Estimation Guidelines**:
- Use concrete token estimates based on similar past work
- Factor in context switching costs between different files/concepts
- Account for iterative refinement cycles in token budgets
- Consider model limitations when estimating context requirements
- Update estimates based on actual token usage in similar projects
- Document assumptions behind token calculations for future reference

**Token Estimation Reference Ranges**:
- **Simple function**: 50-200 output tokens
- **Complex class**: 200-800 output tokens  
- **Configuration file**: 100-500 output tokens
- **Test suite**: 300-1000 output tokens
- **Documentation page**: 500-2000 output tokens
- **Architecture analysis**: 1000-5000 input tokens
- **Full file reading**: 100-3000 input tokens (depends on file size)