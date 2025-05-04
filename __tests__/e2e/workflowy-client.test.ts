import { workflowyClient } from '../../src/workflowy/client.js';

// These tests require valid Workflowy credentials to be set in environment variables:
// WORKFLOWY_USERNAME and WORKFLOWY_PASSWORD

describe('Workflowy Client E2E Tests', () => {
  // Setup - initialize the client before running tests
  // Test that we can get root items from Workflowy
  test('should retrieve root items from Workflowy', async () => {
    const rootItems = await workflowyClient.getRootItems();

    // Verify we got some data back
    expect(rootItems).toBeDefined();
    expect(Array.isArray(rootItems)).toBe(true);

    // Log the number of root items found (useful for debugging)
    console.log(`Found ${rootItems.length} root items in Workflowy`);

    // If there are items, check their structure
    if (rootItems.length > 0) {
      const firstItem = rootItems[0];
      expect(firstItem).toHaveProperty('id');
      expect(firstItem).toHaveProperty('name');

      // Log the first item for verification
      console.log('First root item:', {
        id: firstItem.id,
        name: firstItem.name,
        completed: firstItem.completed
      });
    }
  }, 15000); // Increase timeout to 15 seconds for API call

  // Test that we can search for specific items
  test('should search for items with a specific term', async () => {
    // Replace 'test' with a search term that's likely to exist in your Workflowy
    const searchTerm = 'test';
    const searchResults = await workflowyClient.search(searchTerm);

    console.log(`Found ${searchResults.length} items containing '${searchTerm}'`);

    // If there are results, check their structure
    if (searchResults.length > 0) {
      const firstResult = searchResults[0];
      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('name');
      expect(firstResult.name).toContain(searchTerm);

      // Log the first result for verification
      console.log('First search result:', {
        id: firstResult.id,
        name: firstResult.name
      });
    }
  }, 15000); // Increase timeout to 15 seconds for API call

  // Test that we can get child items for a parent node
  test('should retrieve child items for a parent node', async () => {
    // First get the root items
    const rootItems = await workflowyClient.getRootItems();

    // Skip the test if there are no root items
    if (rootItems.length === 0) {
      console.log('No root items found, skipping child items test');
      return;
    }

    // Get the first root item's ID
    const parentId = rootItems[0].id;

    // Get children of the first root item
    const childItems = await workflowyClient.getChildItems(parentId);

    console.log(`Found ${childItems.length} child items for parent ${rootItems[0].name}`);

    // Check that the returned data is an array
    expect(Array.isArray(childItems)).toBe(true);

    // If there are child items, check their structure
    if (childItems.length > 0) {
      const firstChild = childItems[0];
      expect(firstChild).toHaveProperty('id');
      expect(firstChild).toHaveProperty('name');
      expect(firstChild.parentId).toBe(parentId);

      // Log the first child for verification
      console.log('First child item:', {
        id: firstChild.id,
        name: firstChild.name,
        parentId: firstChild.parentId
      });
    }
  }, 15000); // Increase timeout to 15 seconds for API call
});