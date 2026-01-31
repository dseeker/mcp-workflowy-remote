/**
 * Tests for export_to_file tool
 * Validates file export functionality with different formats and paths
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { convertToMarkdown, convertToPlainText } from "../utils/format-converters";

// Mock workflowy client
const mockWorkflowyClient = {
  getNodeById: async (id: string) => ({
    id,
    name: "Test Node",
    note: "Test note content",
    isCompleted: false,
    children: [
      {
        id: "child-1",
        name: "Child Node 1",
        isCompleted: true,
        children: []
      },
      {
        id: "child-2",
        name: "Child Node 2",
        note: "Child note",
        isCompleted: false,
        children: []
      }
    ]
  }),

  search: async (query: string) => [
    {
      id: "search-1",
      name: `Result for ${query}`,
      note: "Search result note",
      isCompleted: false,
      children: []
    },
    {
      id: "search-2",
      name: `Another result for ${query}`,
      isCompleted: true,
      children: []
    }
  ],

  getRootItems: async () => [
    {
      id: "root-1",
      name: "Root Node 1",
      isCompleted: false,
      children: [
        {
          id: "root-child-1",
          name: "Root Child 1",
          isCompleted: false,
          children: []
        }
      ]
    },
    {
      id: "root-2",
      name: "Root Node 2",
      note: "Root note",
      isCompleted: true,
      children: []
    }
  ]
};

// Create test tool that uses mock client
const createTestExportTool = (mockClient: any) => ({
  handler: async ({ filePath, query, nodeId, format = 'json', maxDepth, includeFields, username, password }:
      { filePath: string, query?: string, nodeId?: string, format?: 'json' | 'markdown' | 'txt', maxDepth?: number, includeFields?: string[], username?: string, password?: string }) => {
    try {
      // Validate file path
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);

      // Ensure directory exists
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });

      // Fetch data based on input
      let data;
      let dataDescription;

      if (nodeId) {
        data = await mockClient.getNodeById(nodeId, username, password, maxDepth, includeFields);
        dataDescription = `node ${nodeId}`;
      } else if (query) {
        data = await mockClient.search(query, username, password, undefined, maxDepth, includeFields);
        dataDescription = `search results for "${query}" (${Array.isArray(data) ? data.length : 1} nodes)`;
      } else {
        data = await mockClient.getRootItems(username, password, maxDepth, includeFields);
        dataDescription = `root nodes (${Array.isArray(data) ? data.length : 1} nodes)`;
      }

      // Convert to requested format
      let content: string;
      switch (format) {
        case 'markdown':
          content = convertToMarkdown(data);
          break;
        case 'txt':
          content = convertToPlainText(data);
          break;
        default:
          content = JSON.stringify(data, null, 2);
      }

      // Write to file
      await fs.writeFile(absolutePath, content, 'utf-8');

      const sizeKB = (content.length / 1024).toFixed(2);
      return {
        content: [{
          type: "text",
          text: `Successfully exported ${dataDescription} to:\n${absolutePath}\nSize: ${sizeKB} KB\nFormat: ${format}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `Error exporting to file: ${error.message}`
        }]
      };
    }
  }
});

describe("export_to_file tool", () => {
  let testDir: string;
  let exportTool: any;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `workflowy-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create test tool with mock client
    exportTool = createTestExportTool(mockWorkflowyClient);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test("exports node by ID to JSON format", async () => {
    const filePath = path.join(testDir, "node-export.json");

    const result = await exportTool.handler({
      filePath,
      nodeId: "test-node-123",
      format: "json"
    });

    // Verify success message
    expect(result.content[0].text).toContain("Successfully exported");
    expect(result.content[0].text).toContain(filePath);
    expect(result.content[0].text).toContain("json");

    // Verify file was created
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    // Verify file content
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);

    expect(data.id).toBe("test-node-123");
    expect(data.name).toBe("Test Node");
    expect(data.note).toBe("Test note content");
    expect(data.children).toHaveLength(2);
    expect(data.children[0].name).toBe("Child Node 1");
  });

  test("exports search results to JSON format", async () => {
    const filePath = path.join(testDir, "search-export.json");

    const result = await exportTool.handler({
      filePath,
      query: "test query",
      format: "json"
    });

    // Verify success message
    expect(result.content[0].text).toContain("search results for \"test query\"");
    expect(result.content[0].text).toContain("2 nodes");

    // Verify file content
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);

    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("Result for test query");
  });

  test("exports root nodes to JSON format", async () => {
    const filePath = path.join(testDir, "root-export.json");

    const result = await exportTool.handler({
      filePath,
      format: "json"
    });

    // Verify success message
    expect(result.content[0].text).toContain("root nodes");
    expect(result.content[0].text).toContain("2 nodes");

    // Verify file content
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);

    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("Root Node 1");
  });

  test("exports to Markdown format with checkboxes", async () => {
    const filePath = path.join(testDir, "export.md");

    const result = await exportTool.handler({
      filePath,
      nodeId: "test-node-123",
      format: "markdown"
    });

    // Verify success message
    expect(result.content[0].text).toContain("markdown");

    // Verify file content
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("- [ ] Test Node");
    expect(content).toContain("> Test note content");
    expect(content).toContain("- [x] Child Node 1");
    expect(content).toContain("- [ ] Child Node 2");
    expect(content).toContain("> Child note");
  });

  test("exports to plain text format", async () => {
    const filePath = path.join(testDir, "export.txt");

    const result = await exportTool.handler(
      {
        filePath,
        nodeId: "test-node-123",
        format: "txt"
      });

    // Verify success message
    expect(result.content[0].text).toContain("txt");

    // Verify file content
    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("Test Node");
    expect(content).toContain("Note: Test note content");
    expect(content).toContain("[✓] Child Node 1");
    expect(content).toContain("Child Node 2");
  });

  test("creates directory if it doesn't exist", async () => {
    const nestedDir = path.join(testDir, "nested", "deep", "path");
    const filePath = path.join(nestedDir, "export.json");

    await exportTool.handler(
      {
        filePath,
        nodeId: "test-node-123",
        format: "json"
      });

    // Verify directory was created
    const dirExists = await fs.access(nestedDir).then(() => true).catch(() => false);
    expect(dirExists).toBe(true);

    // Verify file was created
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });

  test("handles relative paths by converting to absolute", async () => {
    const relativePath = "test-export.json";

    const result = await exportTool.handler(
      {
        filePath: relativePath,
        nodeId: "test-node-123",
        format: "json"
      });

    // Verify absolute path is used
    expect(result.content[0].text).toContain(path.resolve(relativePath));
  });

  test("reports correct file size", async () => {
    const filePath = path.join(testDir, "size-test.json");

    const result = await exportTool.handler(
      {
        filePath,
        nodeId: "test-node-123",
        format: "json"
      });

    // Verify size is reported
    expect(result.content[0].text).toMatch(/Size: \d+\.\d+ KB/);

    // Verify actual file size matches
    const stats = await fs.stat(filePath);
    const actualSizeKB = (stats.size / 1024).toFixed(2);
    expect(result.content[0].text).toContain(`Size: ${actualSizeKB} KB`);
  });

  test("handles export errors gracefully", async () => {
    // Mock a client that throws an error
    const errorClient = {
      getNodeById: async () => {
        throw new Error("Node not found");
      }
    };

    // Create error tool with error client
    const errorTool = createTestExportTool(errorClient);

    const result = await errorTool.handler({
      filePath: path.join(testDir, "error.json"),
      nodeId: "nonexistent",
      format: "json"
    });

    expect(result.content[0].text).toContain("Error exporting to file");
    expect(result.content[0].text).toContain("Node not found");
  });

  test("exports with maxDepth parameter", async () => {
    const filePath = path.join(testDir, "depth-test.json");

    await exportTool.handler(
      {
        filePath,
        nodeId: "test-node-123",
        format: "json",
        maxDepth: 2
      });

    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);

    // Verify data structure
    expect(data.children).toBeDefined();
    expect(data.children.length).toBeGreaterThan(0);
  });

  test("exports with includeFields parameter for JSON", async () => {
    const filePath = path.join(testDir, "fields-test.json");

    await exportTool.handler(
      {
        filePath,
        nodeId: "test-node-123",
        format: "json",
        includeFields: ["id", "name", "isCompleted"]
      });

    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);

    // Fields should be present (mocked client returns all fields)
    expect(data.id).toBeDefined();
    expect(data.name).toBeDefined();
    expect(data.isCompleted).toBeDefined();
  });

  test("exports search results to Markdown format", async () => {
    const filePath = path.join(testDir, "search.md");

    await exportTool.handler(
      {
        filePath,
        query: "test",
        format: "markdown"
      });

    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("Result for test");
    expect(content).toContain("Another result for test");
    expect(content).toContain("- [ ]"); // Uncompleted item
    expect(content).toContain("- [x]"); // Completed item
  });

  test("exports root nodes to plain text format", async () => {
    const filePath = path.join(testDir, "root.txt");

    await exportTool.handler(
      {
        filePath,
        format: "txt"
      });

    const content = await fs.readFile(filePath, "utf-8");

    expect(content).toContain("Root Node 1");
    expect(content).toContain("Root Node 2");
    expect(content).toContain("[✓]"); // Completed marker
    expect(content).toContain("Note: Root note");
  });
});

describe("format converters", () => {
  test("convertToMarkdown handles nested children with proper indentation", async () => {
    const { convertToMarkdown } = await import("../utils/format-converters");

    const node = {
      id: "1",
      name: "Parent",
      isCompleted: false,
      children: [
        {
          id: "2",
          name: "Child 1",
          isCompleted: true,
          children: [
            {
              id: "3",
              name: "Grandchild",
              isCompleted: false,
              children: []
            }
          ]
        }
      ]
    };

    const result = convertToMarkdown(node);

    expect(result).toContain("- [ ] Parent");
    expect(result).toContain("  - [x] Child 1");
    expect(result).toContain("    - [ ] Grandchild");
  });

  test("convertToPlainText handles notes correctly", async () => {
    const { convertToPlainText } = await import("../utils/format-converters");

    const node = {
      id: "1",
      name: "Node with note",
      note: "This is a note",
      isCompleted: true,
      children: []
    };

    const result = convertToPlainText(node);

    expect(result).toContain("[✓] Node with note");
    expect(result).toContain("Note: This is a note");
  });

  test("format converters handle array of nodes", async () => {
    const { convertToMarkdown, convertToPlainText } = await import("../utils/format-converters");

    const nodes = [
      { id: "1", name: "Node 1", isCompleted: false, children: [] },
      { id: "2", name: "Node 2", isCompleted: true, children: [] }
    ];

    const markdown = convertToMarkdown(nodes);
    expect(markdown).toContain("- [ ] Node 1");
    expect(markdown).toContain("- [x] Node 2");

    const plainText = convertToPlainText(nodes);
    expect(plainText).toContain("Node 1");
    expect(plainText).toContain("[✓] Node 2");
  });
});
