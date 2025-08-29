// Mock responses for testing Workflowy operations
export const mockWorkflowyResponses = {
  // Root level document structure with 3+ levels for depth testing
  rootDocument: {
    id: "Root",
    name: "",
    note: "",
    isCompleted: false,
    items: [
      {
        id: "root-node-1",
        name: "Project Management",
        note: "Main project tracking node",
        isCompleted: false,
        items: [
          {
            id: "child-1-1", 
            name: "Sprint Planning",
            note: "Weekly sprint planning tasks",
            isCompleted: false,
            items: [
              {
                id: "grandchild-1-1-1",
                name: "Sprint 1 Tasks",
                note: "First sprint detailed tasks",
                isCompleted: false,
                items: [
                  {
                    id: "great-grandchild-1-1-1-1",
                    name: "User Story 1",
                    note: "As a user I want to...",
                    isCompleted: true,
                    items: []
                  }
                ]
              },
              {
                id: "grandchild-1-1-2",
                name: "Sprint 2 Tasks", 
                note: "Second sprint planning",
                isCompleted: false,
                items: []
              }
            ]
          },
          {
            id: "child-1-2",
            name: "Code Reviews", 
            note: "Pending code reviews",
            isCompleted: true,
            items: [
              {
                id: "grandchild-1-2-1",
                name: "PR #123 Review",
                note: "Feature branch review",
                isCompleted: true,
                items: []
              }
            ]
          }
        ]
      },
      {
        id: "root-node-2",
        name: "Personal Goals",
        note: "2024 personal objectives",
        isCompleted: false,
        items: [
          {
            id: "child-2-1",
            name: "Learn TypeScript",
            note: "Deep dive into TS features",
            isCompleted: false,
            items: [
              {
                id: "grandchild-2-1-1",
                name: "Advanced Types",
                note: "Conditional types, mapped types",
                isCompleted: false,
                items: []
              },
              {
                id: "grandchild-2-1-2",
                name: "TypeScript Testing",
                note: "Jest with TypeScript setup",
                isCompleted: true,
                items: []
              }
            ]
          }
        ]
      },
      {
        id: "root-node-3",
        name: "Research Projects",
        note: "Various research topics",
        isCompleted: false,
        items: [
          {
            id: "child-3-1",
            name: "AI Development",
            note: "Machine learning research",
            isCompleted: false,
            items: []
          },
          {
            id: "child-3-2", 
            name: "Web Technologies",
            note: "Modern web framework research",
            isCompleted: false,
            items: []
          }
        ]
      }
    ]
  },
  
  // Search results for various queries with nested structures for depth testing
  searchResults: {
    typescript: [
      {
        id: "search-result-1",
        name: "TypeScript Tasks",
        note: "Learning objectives for TS",
        isCompleted: false,
        items: [
          {
            id: "ts-child-1",
            name: "Basic Types",
            note: "Learn primitive types",
            isCompleted: true,
            items: [
              {
                id: "ts-grandchild-1",
                name: "String and Number",
                note: "Basic type definitions",
                isCompleted: true,
                items: []
              }
            ]
          }
        ]
      },
      {
        id: "search-result-2", 
        name: "TypeScript Testing",
        note: "Unit test setup with TS",
        isCompleted: true,
        items: [
          {
            id: "ts-child-2",
            name: "Jest Configuration",
            note: "Set up Jest with TypeScript",
            isCompleted: true,
            items: []
          }
        ]
      },
      {
        id: "search-result-3", 
        name: "Advanced TypeScript",
        note: "Complex type patterns",
        isCompleted: false,
        items: []
      },
      {
        id: "search-result-4", 
        name: "TypeScript Compiler",
        note: "Understanding tsc options",
        isCompleted: false,
        items: []
      },
      {
        id: "search-result-5", 
        name: "TypeScript Libraries",
        note: "Popular TS libraries and tools",
        isCompleted: false,
        items: []
      }
    ],
    
    project: [
      {
        id: "root-node-1",
        name: "Project Management",
        note: "Main project tracking node",
        isCompleted: false,
        items: [
          {
            id: "proj-child-1",
            name: "Active Projects",
            note: "Currently active work",
            isCompleted: false,
            items: []
          }
        ]
      }
    ]
  }
};