import { describe, test, expect, beforeEach, mock, spyOn, afterEach } from "bun:test";
import { WorkFlowy, Client } from 'workflowy';
import { workflowyClient, WorkflowyError, AuthenticationError, NetworkError, NotFoundError, OverloadError } from "../workflowy/client.js";

// Mock the workflowy library
const mockWorkFlowy = {
  getClient: mock(() => mockClient),
  getDocument: mock(() => mockDocument)
};

const mockClient = {
  login: mock(() => Promise.resolve({ success: true })),
  getTreeData: mock(() => Promise.resolve())
};

const mockChildNode = {
  id: 'child-node-1',
  name: 'Child Node',
  setName: mock(),
  setNote: mock(),
  toJson: mock(() => ({
    id: 'child-node-1',
    name: 'Child Node',
    note: '',
    isCompleted: false,
    items: []
  }))
};

const mockNode = {
  id: 'test-node-1',
  name: 'Test Node',
  note: 'Test note',
  isCompleted: false,
  items: [],
  toJson: mock(() => ({
    id: 'test-node-1',
    name: 'Test Node',
    note: 'Test note',
    isCompleted: false,
    items: []
  })),
  setName: mock(),
  setNote: mock(),
  setCompleted: mock(),
  createItem: mock(() => mockChildNode),
  delete: mock(),
  move: mock()
};

const mockParentNode = {
  id: 'parent-node-1',
  name: 'Parent Node',
  items: [mockNode],
  createItem: mock(() => mockChildNode),
  find: mock((callback) => mockNode)
};

const mockRootItems = [mockParentNode, mockNode];

const mockDocument = {
  root: {
    toJson: mock(() => ({ items: mockRootItems })),
    items: mockRootItems
  },
  isDirty: mock(() => true),
  save: mock(() => Promise.resolve())
};

// Mock the WorkFlowy constructor
mock.module('workflowy', () => ({
  WorkFlowy: mock().mockImplementation(() => mockWorkFlowy),
  Client: mock()
}));

// Mock environment variables
const originalEnv = process.env;

describe('Workflowy Client Tests', () => {
  beforeEach(() => {
    // Clear mock call history
    mockWorkFlowy.getClient.mockClear();
    mockWorkFlowy.getDocument.mockClear();
    mockClient.login.mockClear();
    mockClient.getTreeData.mockClear();
    mockDocument.isDirty.mockClear();
    mockDocument.save.mockClear();
    mockDocument.root.toJson.mockClear();
    mockNode.toJson.mockClear();
    mockNode.setName.mockClear();
    mockNode.setNote.mockClear();
    mockNode.setCompleted.mockClear();
    mockNode.createItem.mockClear();
    mockNode.delete.mockClear();
    mockNode.move.mockClear();
    mockChildNode.toJson.mockClear();
    mockChildNode.setName.mockClear();
    mockChildNode.setNote.mockClear();
    mockParentNode.createItem.mockClear();
    
    // Reset mock implementations
    mockWorkFlowy.getClient.mockReturnValue(mockClient);
    mockWorkFlowy.getDocument.mockReturnValue(mockDocument);
    mockClient.login.mockResolvedValue({ success: true });
    mockClient.getTreeData.mockResolvedValue(undefined);
    mockDocument.isDirty.mockReturnValue(true);
    mockDocument.save.mockResolvedValue(undefined);
    mockDocument.root.toJson.mockReturnValue({ items: mockRootItems });
    mockNode.toJson.mockReturnValue({
      id: 'test-node-1',
      name: 'Test Node',
      note: 'Test note',
      isCompleted: false,
      items: []
    });
    mockChildNode.toJson.mockReturnValue({
      id: 'child-node-1',
      name: 'Child Node',
      note: '',
      isCompleted: false,
      items: []
    });
    mockParentNode.createItem.mockReturnValue(mockChildNode);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Authentication', () => {
    test('should authenticate successfully with provided credentials', async () => {
      const username = 'test@example.com';
      const password = 'testpassword';

      const result = await workflowyClient.getRootItems(username, password);
      
      expect(WorkFlowy).toHaveBeenCalledWith(username, password);
      expect(mockClient.login).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should use environment variables when no credentials provided', async () => {
      process.env.WORKFLOWY_USERNAME = 'env@example.com';
      process.env.WORKFLOWY_PASSWORD = 'envpassword';

      await workflowyClient.getRootItems();
      
      expect(WorkFlowy).toHaveBeenCalledWith('env@example.com', 'envpassword');
    });

    test('should throw AuthenticationError when credentials are missing', async () => {
      delete process.env.WORKFLOWY_USERNAME;
      delete process.env.WORKFLOWY_PASSWORD;

      await expect(workflowyClient.getRootItems()).rejects.toThrow(AuthenticationError);
      await expect(workflowyClient.getRootItems()).rejects.toThrow('Workflowy credentials not provided');
    });

    test('should throw AuthenticationError when login fails', async () => {
      mockClient.login.mockResolvedValue({ success: false });

      await expect(workflowyClient.getRootItems('user', 'pass')).rejects.toThrow(AuthenticationError);
      await expect(workflowyClient.getRootItems('user', 'pass')).rejects.toThrow('authentication failed');
    });

    test('should handle network errors during authentication', async () => {
      const networkError = new Error('Network timeout');
      networkError.code = 'ETIMEDOUT';
      mockClient.login.mockRejectedValue(networkError);

      await expect(workflowyClient.getRootItems('user', 'pass')).rejects.toThrow(NetworkError);
    });

    test('should handle rate limiting during authentication', async () => {
      const rateLimitError = new Error('Rate limited');
      rateLimitError.status = 429;
      mockClient.login.mockRejectedValue(rateLimitError);

      await expect(workflowyClient.getRootItems('user', 'pass')).rejects.toThrow(OverloadError);
    });
  });

  describe('Get Root Items', () => {
    test('should get root items successfully', async () => {
      const result = await workflowyClient.getRootItems('user', 'pass');
      
      expect(mockWorkFlowy.getDocument).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
    });

    test('should apply field filtering', async () => {
      const result = await workflowyClient.getRootItems('user', 'pass', 0, ['id', 'name']);
      
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).not.toHaveProperty('note');
    });

    test('should apply preview length truncation', async () => {
      mockDocument.root.toJson.mockReturnValue({
        items: [{
          id: 'test-1',
          name: 'This is a very long name that should be truncated',
          note: 'Short note',
          isCompleted: false,
          items: []
        }]
      });

      const result = await workflowyClient.getRootItems('user', 'pass', 0, ['id', 'name'], 20);
      
      expect(result[0].name).toBe('This is a very long ...');
    });

    test('should handle depth control', async () => {
      const nestedMockData = {
        items: [{
          id: 'parent',
          name: 'Parent',
          items: [{
            id: 'child',
            name: 'Child',
            items: [{
              id: 'grandchild',
              name: 'Grandchild',
              items: []
            }]
          }]
        }]
      };
      
      mockDocument.root.toJson.mockReturnValue(nestedMockData);

      const result = await workflowyClient.getRootItems('user', 'pass', 2);
      
      expect(result[0].items).toBeDefined();
      expect(result[0].items[0].items).toBeDefined();
    });
  });

  describe('Get Child Items', () => {
    test('should get child items successfully', async () => {
      const parentId = 'parent-node-1';
      
      const result = await workflowyClient.getChildItems(parentId, 'user', 'pass');
      
      expect(result).toBeDefined();
    });

    test('should throw NotFoundError for non-existent parent', async () => {
      const nonExistentId = 'non-existent-parent';
      
      await expect(workflowyClient.getChildItems(nonExistentId, 'user', 'pass')).rejects.toThrow(NotFoundError);
    });
  });

  describe('Search', () => {
    test('should search nodes successfully', async () => {
      const result = await workflowyClient.search('Test', 'user', 'pass', 10);
      
      expect(mockWorkFlowy.getDocument).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('should limit search results', async () => {
      const result = await workflowyClient.search('Test', 'user', 'pass', 5);
      
      // Result should be limited by the search algorithm
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle case-insensitive search', async () => {
      const result = await workflowyClient.search('test', 'user', 'pass');
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Create Node', () => {
    test('should create node successfully', async () => {
      const parentId = 'parent-node-1';
      const name = 'New Node';
      const description = 'New description';

      const nodeId = await workflowyClient.createNode(parentId, name, description, 'user', 'pass');
      
      expect(mockChildNode.setName).toHaveBeenCalledWith(name);
      expect(mockChildNode.setNote).toHaveBeenCalledWith(description);
      expect(mockDocument.save).toHaveBeenCalled();
    });

    test('should create node without description', async () => {
      const parentId = 'parent-node-1';
      const name = 'New Node';

      await workflowyClient.createNode(parentId, name, undefined, 'user', 'pass');
      
      expect(mockChildNode.setName).toHaveBeenCalledWith(name);
      expect(mockChildNode.setNote).not.toHaveBeenCalled();
    });

    test('should throw NotFoundError for non-existent parent', async () => {
      const nonExistentParent = 'non-existent';
      
      await expect(workflowyClient.createNode(nonExistentParent, 'New Node', undefined, 'user', 'pass')).rejects.toThrow(NotFoundError);
    });
  });

  describe('Update Node', () => {
    test('should update node name and description', async () => {
      const nodeId = 'test-node-1';
      const newName = 'Updated Name';
      const newDescription = 'Updated description';

      await workflowyClient.updateNode(nodeId, newName, newDescription, 'user', 'pass');
      
      expect(mockNode.setName).toHaveBeenCalledWith(newName);
      expect(mockNode.setNote).toHaveBeenCalledWith(newDescription);
      expect(mockDocument.save).toHaveBeenCalled();
    });

    test('should update only name when description not provided', async () => {
      const nodeId = 'test-node-1';
      const newName = 'Updated Name';

      await workflowyClient.updateNode(nodeId, newName, undefined, 'user', 'pass');
      
      expect(mockNode.setName).toHaveBeenCalledWith(newName);
      expect(mockNode.setNote).not.toHaveBeenCalled();
    });

    test('should throw NotFoundError for non-existent node', async () => {
      const nonExistentId = 'non-existent';
      
      await expect(workflowyClient.updateNode(nonExistentId, 'New Name', undefined, 'user', 'pass')).rejects.toThrow(NotFoundError);
    });
  });

  describe('Delete Node', () => {
    test('should delete node successfully', async () => {
      const nodeId = 'test-node-1';

      await workflowyClient.deleteNode(nodeId, 'user', 'pass');
      
      expect(mockNode.delete).toHaveBeenCalled();
      expect(mockDocument.save).toHaveBeenCalled();
    });

    test('should throw NotFoundError for non-existent node', async () => {
      const nonExistentId = 'non-existent';
      
      await expect(workflowyClient.deleteNode(nonExistentId, 'user', 'pass')).rejects.toThrow(NotFoundError);
    });
  });

  describe('Toggle Complete', () => {
    test('should mark node as completed', async () => {
      const nodeId = 'test-node-1';

      await workflowyClient.toggleComplete(nodeId, true, 'user', 'pass');
      
      expect(mockNode.setCompleted).toHaveBeenCalledWith();
      expect(mockDocument.save).toHaveBeenCalled();
    });

    test('should mark node as incomplete', async () => {
      const nodeId = 'test-node-1';

      await workflowyClient.toggleComplete(nodeId, false, 'user', 'pass');
      
      expect(mockNode.setCompleted).toHaveBeenCalledWith(false);
      expect(mockDocument.save).toHaveBeenCalled();
    });
  });

  describe('Move Node', () => {
    test('should move node successfully', async () => {
      const nodeId = 'test-node-1';
      const newParentId = 'parent-node-1';
      const priority = 0;

      await workflowyClient.moveNode(nodeId, newParentId, priority, 'user', 'pass');
      
      expect(mockNode.move).toHaveBeenCalledWith(mockParentNode, priority);
      expect(mockDocument.save).toHaveBeenCalled();
    });
  });

  describe('Get Node By ID', () => {
    test('should get node by ID successfully', async () => {
      const nodeId = 'test-node-1';

      const result = await workflowyClient.getNodeById(nodeId, 'user', 'pass');
      
      expect(result).toHaveProperty('id', nodeId);
      expect(result).toHaveProperty('name', 'Test Node');
    });

    test('should throw error for non-existent node', async () => {
      const nonExistentId = 'non-existent';
      
      await expect(workflowyClient.getNodeById(nonExistentId, 'user', 'pass')).rejects.toThrow('not found');
    });
  });

  describe('Service Health Check', () => {
    test('should return available when service is healthy', async () => {
      // Add a small delay to simulate network timing
      mockClient.login.mockResolvedValue(new Promise(resolve => 
        setTimeout(() => resolve({ success: true }), 1)
      ));
      
      const result = await workflowyClient.checkServiceHealth('user', 'pass');
      
      expect(result.available).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    test('should return unavailable when service fails', async () => {
      mockClient.login.mockRejectedValue(new Error('Service unavailable'));
      
      const result = await workflowyClient.checkServiceHealth('user', 'pass');
      
      expect(result.available).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Error Enhancement', () => {
    test('should enhance network errors correctly', async () => {
      const networkError = new Error('Connection failed');
      networkError.code = 'ECONNREFUSED';
      mockClient.login.mockRejectedValue(networkError);

      await expect(workflowyClient.getRootItems('user', 'pass')).rejects.toThrow(NetworkError);
    });

    test('should enhance authentication errors correctly', async () => {
      const authError = new Error('Unauthorized');
      authError.status = 401;
      mockClient.login.mockRejectedValue(authError);

      await expect(workflowyClient.getRootItems('user', 'pass')).rejects.toThrow(AuthenticationError);
    });

    test('should enhance overload errors correctly', async () => {
      const overloadError = new Error('Too many requests');
      overloadError.status = 429;
      mockClient.login.mockRejectedValue(overloadError);

      await expect(workflowyClient.getRootItems('user', 'pass')).rejects.toThrow(OverloadError);
    });

    test('should enhance not found errors correctly', async () => {
      const notFoundError = new Error('Resource not found');
      notFoundError.status = 404;
      mockWorkFlowy.getDocument.mockRejectedValue(notFoundError);

      await expect(workflowyClient.getRootItems('user', 'pass')).rejects.toThrow(NotFoundError);
    });
  });
});