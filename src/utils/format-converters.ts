/**
 * Format conversion utilities for Workflowy data export
 */

export interface WorkflowyNode {
  id: string;
  name: string;
  note?: string;
  isCompleted?: boolean;
  children?: WorkflowyNode[];
  [key: string]: any;
}

/**
 * Convert Workflowy nodes to Markdown format
 */
export function convertToMarkdown(data: WorkflowyNode | WorkflowyNode[], depth: number = 0): string {
  const nodes = Array.isArray(data) ? data : [data];
  const indent = '  '.repeat(depth);

  return nodes.map(node => {
    const checkbox = node.isCompleted !== undefined
      ? (node.isCompleted ? '- [x] ' : '- [ ] ')
      : '- ';

    let result = `${indent}${checkbox}${node.name}\n`;

    if (node.note) {
      result += `${indent}  > ${node.note}\n`;
    }

    if (node.children && node.children.length > 0) {
      result += convertToMarkdown(node.children, depth + 1);
    }

    return result;
  }).join('');
}

/**
 * Convert Workflowy nodes to plain text format
 */
export function convertToPlainText(data: WorkflowyNode | WorkflowyNode[], depth: number = 0): string {
  const nodes = Array.isArray(data) ? data : [data];
  const indent = '  '.repeat(depth);

  return nodes.map(node => {
    const completedMark = node.isCompleted ? '[✓] ' : '';
    let result = `${indent}${completedMark}${node.name}\n`;

    if (node.note) {
      result += `${indent}  Note: ${node.note}\n`;
    }

    if (node.children && node.children.length > 0) {
      result += convertToPlainText(node.children, depth + 1);
    }

    return result;
  }).join('');
}
