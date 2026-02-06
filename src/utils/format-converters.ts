/**
 * Format conversion utilities for Workflowy data export
 */

export interface WorkflowyNode {
  id: string;
  name: string;
  note?: string;
  isCompleted?: boolean;
  children?: WorkflowyNode[];
  items?: WorkflowyNode[];
  fileAttachments?: FileAttachment[];
  s3File?: S3FileAttachment;
  [key: string]: any;
}

export interface S3FileAttachment {
  isFile: boolean;
  fileName: string;
  fileType: string;
  objectFolder: string;
  isAnimatedGIF?: boolean;
  imageOriginalWidth?: number;
  imageOriginalHeight?: number;
  imageOriginalPixels?: number;
}

export interface FileAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  url?: string;
  size?: number;
}

export interface FormatOptions {
  includeIds?: boolean;
}

// Common image file extensions and patterns
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)(\?.*)?$/i;
const DATA_URL_IMAGE = /^data:image\/(jpg|jpeg|png|gif|webp|svg\+xml|bmp|ico|tiff);base64,/i;

/**
 * Check if a URL is an image
 */
function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url) || DATA_URL_IMAGE.test(url);
}

/**
 * Extract image URLs from text and convert to markdown images
 * Returns the text with image URLs converted to markdown image syntax
 */
function processImageUrls(text: string): string {
  if (!text) return text;

  // Pattern to match URLs in text
  const urlPattern = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;

  return text.replace(urlPattern, (url) => {
    if (isImageUrl(url)) {
      return `![image](${url})`;
    }
    return url;
  });
}

/**
 * Strip HTML tags from text
 */
function stripHtml(text: string): string {
  if (!text) return text;
  return text.replace(/<[^>]+>/g, '');
}

/**
 * Convert file attachments to markdown
 */
function fileAttachmentsToMarkdown(attachments: FileAttachment[] | undefined): string {
  if (!attachments || attachments.length === 0) return '';

  const imageAttachments = attachments.filter(att => 
    att.mimeType?.startsWith('image/') || isImageUrl(att.url || att.fileName)
  );

  const nonImageAttachments = attachments.filter(att => 
    !att.mimeType?.startsWith('image/') && !isImageUrl(att.url || att.fileName)
  );

  let result = '';

  // Add image attachments as markdown images
  if (imageAttachments.length > 0) {
    result += '\n' + imageAttachments.map(att => {
      const url = att.url || att.fileName;
      return `![${att.fileName}](${url})`;
    }).join('\n') + '\n';
  }

  // Add non-image attachments as links
  if (nonImageAttachments.length > 0) {
    result += '\n**Attachments:**\n' + nonImageAttachments.map(att => {
      const url = att.url || att.fileName;
      const size = att.size ? ` (${formatFileSize(att.size)})` : '';
      return `- [${att.fileName}](${url})${size}`;
    }).join('\n') + '\n';
  }

  return result;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Convert S3 file attachment to markdown representation
 * Note: The actual URL needs to be fetched separately via getFileUrl
 */
function s3FileToMarkdown(s3File: S3FileAttachment | undefined, nodeId: string): string {
  if (!s3File || !s3File.isFile) return '';
  
  const isImage = s3File.fileType?.startsWith('image/');
  const dimensions = s3File.imageOriginalWidth && s3File.imageOriginalHeight 
    ? ` (${s3File.imageOriginalWidth}x${s3File.imageOriginalHeight})`
    : '';
  
  if (isImage) {
    // For images, show a placeholder indicating an image needs to be fetched
    return `\n[ATTACHMENT] [Image: ${s3File.fileName}${dimensions} - Use getFileUrl() to retrieve]\n`;
  } else {
    // For other files, show as attachment
    return `\n[ATTACHMENT] [File: ${s3File.fileName} - Use getFileUrl() to retrieve]\n`;
  }
}

/**
 * Convert Workflowy nodes to Markdown format with headers based on hierarchy
 */
export function convertToMarkdown(
  data: WorkflowyNode | WorkflowyNode[],
  depth: number = 0,
  options: FormatOptions = {}
): string {
  const nodes = Array.isArray(data) ? data : [data];

  return nodes.map(node => {
    const idSuffix = options.includeIds ? ` [id: ${node.id}]` : '';
    
    // Generate header based on depth (max 6 levels for markdown headers)
    const headerLevel = Math.min(depth + 1, 6);
    const headerPrefix = '#'.repeat(headerLevel);
    
    // Process name - strip HTML and convert image URLs
    const cleanName = stripHtml(node.name || '');
    const processedName = processImageUrls(cleanName);
    
    // Skip empty nodes but still process children
    let result = '';
    if (cleanName.trim() || !hasVisibleChildren(node)) {
      result = `${headerPrefix} ${processedName}${idSuffix}\n\n`;
    }

    if (node.note) {
      // Strip HTML from note
      const cleanNote = stripHtml(node.note);
      // Process image URLs in note
      const processedNote = processImageUrls(cleanNote);
      // Format note as a blockquote for better visual separation
      const noteLines = processedNote.split('\n');
      const formattedNote = noteLines.map(line => `> ${line}`).join('\n');
      result += `${formattedNote}\n\n`;
    }

    // Add file attachments if present (always show, even if node name is empty)
    const attachmentsMarkdown = fileAttachmentsToMarkdown(node.fileAttachments);
    if (attachmentsMarkdown) {
      result += attachmentsMarkdown + '\n';
    }
    
    // Add S3 file attachments if present (always show, even if node name is empty)
    if (node.s3File) {
      // If result is empty (no name, no children header), add a minimal header
      if (!result.trim()) {
        result = `${headerPrefix} [Attachment]${idSuffix}\n\n`;
      }
      result += s3FileToMarkdown(node.s3File, node.id);
    }

    const childNodes = node.children || node.items;
    if (childNodes && childNodes.length > 0) {
      result += convertToMarkdown(childNodes, depth + 1, options);
    }

    return result;
  }).join('');
}

/**
 * Check if a node has visible children (with non-empty names)
 */
function hasVisibleChildren(node: WorkflowyNode): boolean {
  const childNodes = node.children || node.items;
  if (!childNodes || childNodes.length === 0) return false;
  
  return childNodes.some(child => {
    const hasName = child.name && stripHtml(child.name).trim().length > 0;
    const hasNote = child.note && stripHtml(child.note).trim().length > 0;
    return hasName || hasNote || hasVisibleChildren(child);
  });
}

/**
 * Convert Workflowy nodes to plain text format
 */
export function convertToPlainText(
  data: WorkflowyNode | WorkflowyNode[],
  depth: number = 0,
  options: FormatOptions = {}
): string {
  const nodes = Array.isArray(data) ? data : [data];
  const indent = '  '.repeat(depth);

  return nodes.map(node => {
    const completedMark = node.isCompleted ? '[X] ' : '';
    const idSuffix = options.includeIds ? ` [id: ${node.id}]` : '';
    
    // Strip HTML from name
    const cleanName = stripHtml(node.name || '');
    
    let result = `${indent}${completedMark}${cleanName}${idSuffix}\n`;

    if (node.note) {
      const cleanNote = stripHtml(node.note);
      result += `${indent}  Note: ${cleanNote}\n`;
    }

    // Add file attachments reference in plain text
    if (node.fileAttachments && node.fileAttachments.length > 0) {
      result += `${indent}  Attachments: ${node.fileAttachments.map(a => a.fileName).join(', ')}\n`;
    }

    const childNodes = node.children || node.items;
    if (childNodes && childNodes.length > 0) {
      result += convertToPlainText(childNodes, depth + 1, options);
    }

    return result;
  }).join('');
}
