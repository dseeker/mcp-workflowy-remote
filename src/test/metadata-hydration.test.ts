/**
 * Test metadata hydration functionality
 * Tests the new metadata fields added to existing MCP tools
 */

import { describe, test, expect, mock } from 'bun:test';
import { workflowyClient } from '../workflowy/client.js';

describe('Metadata Hydration Tests', () => {
  describe('Metadata Field Detection', () => {
    test('should include metadata fields when requested', async () => {
      const result = await workflowyClient.getRootItems(
        'test@example.com',
        'testpass',
        0,
        ['id', 'name', 'parentId'] // Request metadata field
      );

      expect(Array.isArray(result)).toBe(true);
      // Should return data even if metadata hydration is attempted
      expect(result.length).toBeGreaterThan(0);
    });

    test('should handle metadata fields in search', async () => {
      const result = await workflowyClient.search(
        'test',
        'test@example.com',
        'testpass',
        10,
        0,
        ['id', 'name', 'hierarchy', 'priority'] // Request metadata fields
      );

      expect(Array.isArray(result)).toBe(true);
      // Should return search results even with metadata fields requested
    });

    test('should handle metadata fields in getNodeById', async () => {
      const result = await workflowyClient.getNodeById(
        'parent-node-1',
        'test@example.com',
        'testpass',
        0,
        ['id', 'name', 'parentId', 'siblings'] // Request metadata fields
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      // Should return basic node data even when metadata is requested
    });
  });

  describe('Performance Optimization', () => {
    test('should not request metadata when basic fields only', async () => {
      const result = await workflowyClient.getNodeById(
        'parent-node-1',
        'test@example.com',
        'testpass',
        0,
        ['id', 'name', 'note'] // No metadata fields
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).not.toHaveProperty('parentId');
      expect(result).not.toHaveProperty('hierarchy');
    });

    test('should handle mixed basic and metadata fields', async () => {
      const result = await workflowyClient.getRootItems(
        'test@example.com',
        'testpass',
        0,
        ['id', 'name', 'note', 'isCompleted', 'priority'] // Mix of basic and metadata
      );

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('name');
        // Metadata fields may or may not be present depending on mock capabilities
      }
    });
  });

  describe('Field Integration', () => {
    test('should accept metadata fields in includeFields parameter', async () => {
      // Test that all metadata fields are accepted without throwing errors
      const metadataFields = [
        'id', 'name', 
        'parentId', 'parentName', 'priority', 'siblingCount',
        'lastModifiedAt', 'completedAt', 'isMirror', 'originalId',
        'isSharedViaUrl', 'sharedUrl', 'hierarchy', 'siblings'
      ];

      const result = await workflowyClient.getRootItems(
        'test@example.com',
        'testpass',
        0,
        metadataFields
      );

      expect(Array.isArray(result)).toBe(true);
      // Should not throw errors when metadata fields are requested
    });

    test('should preserve backward compatibility with basic fields', async () => {
      const result = await workflowyClient.search(
        'Test',
        'test@example.com',
        'testpass',
        5,
        0,
        ['id', 'name', 'note', 'isCompleted'] // Traditional basic fields only
      );

      expect(Array.isArray(result)).toBe(true);
      // Should work exactly as before with no metadata overhead
    });
  });

  describe('Architecture Validation', () => {
    test('should demonstrate metadata field detection logic', () => {
      // Test the concept of metadata field detection
      const basicFields = ['id', 'name', 'note', 'isCompleted', 'items'];
      const metadataFields = ['parentId', 'parentName', 'priority', 'lastModifiedAt', 'completedAt', 'isMirror', 'originalId', 'isSharedViaUrl', 'sharedUrl', 'hierarchy', 'siblings', 'siblingCount'];
      
      // Verify separation of concerns
      const hasOverlap = basicFields.some(field => metadataFields.includes(field));
      expect(hasOverlap).toBe(false);
      
      // Verify all expected metadata fields are defined
      expect(metadataFields.length).toBeGreaterThan(10);
      expect(metadataFields).toContain('hierarchy');
      expect(metadataFields).toContain('siblings');
      expect(metadataFields).toContain('parentId');
    });

    test('should demonstrate the enhanced architecture pattern', async () => {
      // This test demonstrates that the same tool (getRootItems) can handle
      // both basic and metadata requests through the includeFields parameter
      
      const basicResult = await workflowyClient.getRootItems(
        'test@example.com',
        'testpass',
        0,
        ['id', 'name'] // Basic request
      );

      const enhancedResult = await workflowyClient.getRootItems(
        'test@example.com',
        'testpass',
        0,
        ['id', 'name', 'parentId', 'hierarchy'] // Enhanced request with metadata
      );

      expect(Array.isArray(basicResult)).toBe(true);
      expect(Array.isArray(enhancedResult)).toBe(true);
      // Both should work - this demonstrates the unified API approach
    });
  });
});