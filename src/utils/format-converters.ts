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
  [key: string]: any;
}

export interface FormatOptions {
  includeIds?: boolean;
}

/**
 * Convert Workflowy nodes to Markdown format
 */
export function convertToMarkdown(
  data: WorkflowyNode | WorkflowyNode[],
  depth: number = 0,
  options: FormatOptions = {}
): string {
  const nodes = Array.isArray(data) ? data : [data];
  const indent = '  '.repeat(depth);

  return nodes.map(node => {
    const idSuffix = options.includeIds ? ` [id: ${node.id}]` : '';
    let result = `${indent}- ${node.name}${idSuffix}\n`;

    if (node.note) {
      result += `${indent}  > ${node.note}\n`;
    }

    const childNodes = node.children || node.items;
    if (childNodes && childNodes.length > 0) {
      result += convertToMarkdown(childNodes, depth + 1, options);
    }

    return result;
  }).join('');
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
    const completedMark = node.isCompleted ? '[✓] ' : '';
    const idSuffix = options.includeIds ? ` [id: ${node.id}]` : '';
    let result = `${indent}${completedMark}${node.name}${idSuffix}\n`;

    if (node.note) {
      result += `${indent}  Note: ${node.note}\n`;
    }

    const childNodes = node.children || node.items;
    if (childNodes && childNodes.length > 0) {
      result += convertToPlainText(childNodes, depth + 1, options);
    }

    return result;
  }).join('');
}
