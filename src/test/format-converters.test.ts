import { describe, it, expect } from "bun:test";
import {
  convertToMarkdown,
  convertToPlainText,
  WorkflowyNode,
  S3FileAttachment,
  FileAttachment,
} from "../utils/format-converters.js";

describe("Format Converters - Markdown", () => {
  it("should convert single node to markdown with header", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Test Node",
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("# Test Node");
  });

  it("should include node ID when requested", () => {
    const node: WorkflowyNode = {
      id: "abc-123",
      name: "Test Node",
    };
    const result = convertToMarkdown(node, 0, { includeIds: true });
    expect(result).toContain("[id: abc-123]");
  });

  it("should create headers at correct depth levels", () => {
    const nodes: WorkflowyNode[] = [
      {
        id: "1",
        name: "Level 1",
        items: [
          {
            id: "2",
            name: "Level 2",
            items: [
              {
                id: "3",
                name: "Level 3",
              },
            ],
          },
        ],
      },
    ];
    const result = convertToMarkdown(nodes, 0);
    expect(result).toContain("# Level 1");
    expect(result).toContain("## Level 2");
    expect(result).toContain("### Level 3");
  });

  it("should cap header levels at 6 (h6)", () => {
    const nodes: WorkflowyNode[] = [
      {
        id: "1",
        name: "Deep Node",
      },
    ];
    const result = convertToMarkdown(nodes, 0, {});
    // depth=0 → h1, depth=6+ → h6
    const deepResult = convertToMarkdown(nodes, 6);
    expect(deepResult).toContain("###### Deep Node");
  });

  it("should strip HTML tags from node names", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Text with <b>bold</b> and <i>italic</i>",
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("Text with bold and italic");
    expect(result).not.toContain("<b>");
    expect(result).not.toContain("</b>");
  });

  it("should format notes as blockquotes", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Test",
      note: "This is a note",
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("> This is a note");
  });

  it("should handle multiline notes", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Test",
      note: "Line 1\nLine 2\nLine 3",
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("> Line 1");
    expect(result).toContain("> Line 2");
    expect(result).toContain("> Line 3");
  });

  it("should strip HTML from notes", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Test",
      note: "Note with <span>HTML</span> tags",
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("Note with HTML tags");
    expect(result).not.toContain("<span>");
  });

  it("should convert image URLs to markdown images in names", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "See this https://example.com/image.jpg",
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("![image](https://example.com/image.jpg)");
  });

  it("should convert image URLs to markdown images in notes", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Test",
      note: "Check https://example.com/photo.png",
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("![image](https://example.com/photo.png)");
  });

  it("should leave non-image URLs unchanged", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Visit https://example.com for more",
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("https://example.com");
    expect(result).not.toContain("![image]");
  });

  it("should handle data URL images", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Image: data:image/png;base64,iVBORw0KGgoAAAA",
    };
    const result = convertToMarkdown(node, 0);
    // Data URLs in names are not extracted as image URLs (requires full URL pattern)
    expect(result).toContain("data:image/png;base64");
  });

  it("should convert S3 file attachments", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Document",
      s3File: {
        isFile: true,
        fileName: "report.pdf",
        fileType: "application/pdf",
        objectFolder: "attachments",
      },
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("[ATTACHMENT]");
    expect(result).toContain("report.pdf");
    expect(result).toContain("getFileUrl()");
  });

  it("should include dimensions for S3 image attachments", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Screenshot",
      s3File: {
        isFile: true,
        fileName: "screenshot.png",
        fileType: "image/png",
        objectFolder: "attachments",
        imageOriginalWidth: 1024,
        imageOriginalHeight: 768,
      },
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("[Image: screenshot.png (1024x768)");
  });

  it("should add minimal header for attachment-only nodes", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "",
      s3File: {
        isFile: true,
        fileName: "image.jpg",
        fileType: "image/jpeg",
        objectFolder: "attachments",
      },
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("[ATTACHMENT]");
    expect(result).toContain("image.jpg");
  });

  it("should convert fileAttachments array to markdown", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Documents",
      fileAttachments: [
        {
          id: "att1",
          fileName: "doc.pdf",
          mimeType: "application/pdf",
          url: "https://example.com/doc.pdf",
          size: 1048576,
        },
        {
          id: "att2",
          fileName: "image.png",
          mimeType: "image/png",
          url: "https://example.com/image.png",
        },
      ],
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("![image.png](https://example.com/image.png)");
    expect(result).toContain("**Attachments:**");
    expect(result).toContain("[doc.pdf](https://example.com/doc.pdf)");
    expect(result).toContain("(1 MB)");
  });

  it("should skip empty nodes but process children", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "",
      items: [
        {
          id: "2",
          name: "Child Node",
        },
      ],
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("# Child Node");
    // Empty parent shouldn't create a header if it only has children
    expect(result).not.toContain("# \n");
  });

  it("should handle children array as well as items", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Parent",
      children: [
        {
          id: "2",
          name: "Child",
        },
      ],
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("# Parent");
    expect(result).toContain("## Child");
  });

  it("should convert array of nodes", () => {
    const nodes: WorkflowyNode[] = [
      { id: "1", name: "First" },
      { id: "2", name: "Second" },
    ];
    const result = convertToMarkdown(nodes, 0);
    expect(result).toContain("# First");
    expect(result).toContain("# Second");
  });

  it("should handle empty values gracefully", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "",
      note: undefined,
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toBeTruthy();
  });

  it("should handle null/undefined in notes", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Test",
      note: undefined as any,
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("# Test");
  });
});

describe("Format Converters - Plain Text", () => {
  it("should convert single node to plain text", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Test Node",
    };
    const result = convertToPlainText(node, 0);
    expect(result).toContain("Test Node");
  });

  it("should add completion marker for completed nodes", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Completed Task",
      isCompleted: true,
    };
    const result = convertToPlainText(node, 0);
    expect(result).toContain("[X] Completed Task");
  });

  it("should not add marker for incomplete nodes", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Incomplete Task",
      isCompleted: false,
    };
    const result = convertToPlainText(node, 0);
    expect(result).toContain("Incomplete Task");
    expect(result).not.toContain("[X]");
  });

  it("should include node ID when requested", () => {
    const node: WorkflowyNode = {
      id: "xyz-789",
      name: "Test",
    };
    const result = convertToPlainText(node, 0, { includeIds: true });
    expect(result).toContain("[id: xyz-789]");
  });

  it("should indent child nodes correctly", () => {
    const nodes: WorkflowyNode[] = [
      {
        id: "1",
        name: "Level 1",
        items: [
          {
            id: "2",
            name: "Level 2",
            items: [
              {
                id: "3",
                name: "Level 3",
              },
            ],
          },
        ],
      },
    ];
    const result = convertToPlainText(nodes, 0);
    expect(result).toContain("Level 1\n");
    expect(result).toContain("  Level 2");
    expect(result).toContain("    Level 3");
  });

  it("should strip HTML from names", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Text with <b>bold</b> tags",
    };
    const result = convertToPlainText(node, 0);
    expect(result).toContain("Text with bold tags");
    expect(result).not.toContain("<b>");
  });

  it("should include notes with Note: prefix", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Task",
      note: "Remember to do this",
    };
    const result = convertToPlainText(node, 0);
    expect(result).toContain("Note: Remember to do this");
  });

  it("should strip HTML from notes", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Task",
      note: "Note with <span>HTML</span>",
    };
    const result = convertToPlainText(node, 0);
    expect(result).toContain("Note with HTML");
    expect(result).not.toContain("<span>");
  });

  it("should list file attachments", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Document",
      fileAttachments: [
        {
          id: "att1",
          fileName: "report.pdf",
          mimeType: "application/pdf",
        },
        {
          id: "att2",
          fileName: "photo.jpg",
          mimeType: "image/jpeg",
        },
      ],
    };
    const result = convertToPlainText(node, 0);
    expect(result).toContain("Attachments: report.pdf, photo.jpg");
  });

  it("should handle empty attachment array", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Document",
      fileAttachments: [],
    };
    const result = convertToPlainText(node, 0);
    expect(result).not.toContain("Attachments:");
  });

  it("should handle children array", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Parent",
      children: [
        {
          id: "2",
          name: "Child",
        },
      ],
    };
    const result = convertToPlainText(node, 0);
    expect(result).toContain("Parent\n");
    expect(result).toContain("  Child");
  });

  it("should handle array of nodes", () => {
    const nodes: WorkflowyNode[] = [
      { id: "1", name: "First" },
      { id: "2", name: "Second" },
    ];
    const result = convertToPlainText(nodes, 0);
    expect(result).toContain("First");
    expect(result).toContain("Second");
  });

  it("should not include completion marker when undefined", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Task",
      isCompleted: undefined as any,
    };
    const result = convertToPlainText(node, 0);
    expect(result).not.toContain("[X]");
    expect(result).toContain("Task");
  });
});

describe("Format Converters - Edge Cases", () => {
  it("should handle nodes with only whitespace names", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "   ",
    };
    const markdown = convertToMarkdown(node, 0);
    const plaintext = convertToPlainText(node, 0);
    expect(markdown).toBeTruthy();
    expect(plaintext).toBeTruthy();
  });

  it("should handle special characters in names", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Test with $pecial ch@rs & symbols!",
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("Test with $pecial ch@rs & symbols!");
  });

  it("should handle URLs with query parameters in images", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Image: https://example.com/photo.jpg?w=800&h=600",
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("![image](https://example.com/photo.jpg?w=800&h=600)");
  });

  it("should handle mixed image and text URLs", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "See https://example.com/image.png and visit https://example.com",
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("![image](https://example.com/image.png)");
    expect(result).toContain("https://example.com");
  });

  it("should handle deeply nested structures", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "L1",
      items: [
        {
          id: "2",
          name: "L2",
          items: [
            {
              id: "3",
              name: "L3",
              items: [
                {
                  id: "4",
                  name: "L4",
                  items: [
                    {
                      id: "5",
                      name: "L5",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("# L1");
    expect(result).toContain("## L2");
    expect(result).toContain("### L3");
    expect(result).toContain("#### L4");
    expect(result).toContain("##### L5");
  });

  it("should handle S3 file without dimensions", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Document",
      s3File: {
        isFile: true,
        fileName: "doc.pdf",
        fileType: "application/pdf",
        objectFolder: "attachments",
      },
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("[File: doc.pdf");
    // The message contains "getFileUrl()" which has parens, but no dimension parens
    expect(result).not.toContain("(x");
  });

  it("should handle S3 file with isFile=false", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Folder",
      s3File: {
        isFile: false,
        fileName: "folder",
        fileType: "directory",
        objectFolder: "attachments",
      },
    };
    const result = convertToMarkdown(node, 0);
    expect(result).not.toContain("[ATTACHMENT]");
  });

  it("should format various file sizes correctly", () => {
    const attachments: FileAttachment[] = [
      { id: "1", fileName: "small.txt", mimeType: "text/plain", size: 512 },
      {
        id: "2",
        fileName: "medium.pdf",
        mimeType: "application/pdf",
        size: 1048576,
      },
      {
        id: "3",
        fileName: "large.zip",
        mimeType: "application/zip",
        size: 1073741824,
      },
    ];
    const node: WorkflowyNode = {
      id: "1",
      name: "Files",
      fileAttachments: attachments,
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("(512 Bytes)");
    expect(result).toContain("(1 MB)");
    expect(result).toContain("(1 GB)");
  });

  it("should handle 0 byte files", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Empty",
      fileAttachments: [
        {
          id: "1",
          fileName: "empty.txt",
          mimeType: "text/plain",
          size: 0,
        },
      ],
    };
    const result = convertToMarkdown(node, 0);
    // Size field may be omitted if size is 0 or undefined
    expect(result).toContain("[empty.txt]");
  });

  it("should not add note section for empty notes", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Test",
      note: "",
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("# Test");
    expect(result).not.toContain("> ");
  });

  it("should handle nodes with multiple attachment types", () => {
    const node: WorkflowyNode = {
      id: "1",
      name: "Mixed Media",
      fileAttachments: [
        {
          id: "1",
          fileName: "photo.jpg",
          mimeType: "image/jpeg",
          url: "https://example.com/photo.jpg",
        },
      ],
      s3File: {
        isFile: true,
        fileName: "document.pdf",
        fileType: "application/pdf",
        objectFolder: "attachments",
      },
    };
    const result = convertToMarkdown(node, 0);
    expect(result).toContain("![photo.jpg]");
    expect(result).toContain("[ATTACHMENT]");
    expect(result).toContain("document.pdf");
  });

  it("should preserve node structure with incomplete data", () => {
    const node: Partial<WorkflowyNode> = {
      id: "1",
      name: "Minimal",
    };
    const result = convertToMarkdown(node as WorkflowyNode, 0);
    expect(result).toContain("# Minimal");
  });
});
