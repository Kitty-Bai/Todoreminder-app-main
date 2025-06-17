import FirebaseService from '../FirebaseService';

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
}));

// Mock Firebase config
jest.mock('../firebaseConfig', () => ({
  db: {},
  auth: { currentUser: null }
}));

describe('FirebaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('addTask', () => {
    test('should add task successfully', async () => {
      const { collection, addDoc } = require('firebase/firestore');
      const mockDocRef = { id: 'task-123' };
      
      collection.mockReturnValueOnce('tasks-collection');
      addDoc.mockResolvedValueOnce(mockDocRef);

      const task = {
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date(),
        priority: 'High'
      };

      const result = await FirebaseService.addTask('user-123', task);

      expect(collection).toHaveBeenCalled();
      expect(addDoc).toHaveBeenCalledWith('tasks-collection', {
        ...task,
        userId: 'user-123',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(result).toBe('task-123');
    });

    test('should handle add task errors', async () => {
      const { collection, addDoc } = require('firebase/firestore');
      const mockError = new Error('Firestore error');
      
      collection.mockReturnValueOnce('tasks-collection');
      addDoc.mockRejectedValueOnce(mockError);

      const task = { title: 'Test Task' };

      const result = await FirebaseService.addTask('user-123', task);

      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Error adding task:', mockError);
    });
  });

  describe('getTasks', () => {
    test('should retrieve tasks successfully', async () => {
      const { collection, query, where, orderBy, getDocs } = require('firebase/firestore');
      const mockSnapshot = {
        docs: [
          { id: 'task-1', data: () => ({ title: 'Task 1', priority: 'High' }) },
          { id: 'task-2', data: () => ({ title: 'Task 2', priority: 'Low' }) }
        ]
      };
      
      collection.mockReturnValueOnce('tasks-collection');
      query.mockReturnValueOnce('query-result');
      where.mockReturnValueOnce('where-clause');
      orderBy.mockReturnValueOnce('order-clause');
      getDocs.mockResolvedValueOnce(mockSnapshot);

      const result = await FirebaseService.getTasks('user-123');

      expect(getDocs).toHaveBeenCalledWith('query-result');
      expect(result).toEqual([
        { id: 'task-1', title: 'Task 1', priority: 'High' },
        { id: 'task-2', title: 'Task 2', priority: 'Low' }
      ]);
    });

    test('should handle get tasks errors', async () => {
      const { collection, query, where, orderBy, getDocs } = require('firebase/firestore');
      const mockError = new Error('Network error');
      
      collection.mockReturnValueOnce('tasks-collection');
      query.mockReturnValueOnce('query-result');
      where.mockReturnValueOnce('where-clause');
      orderBy.mockReturnValueOnce('order-clause');
      getDocs.mockRejectedValueOnce(mockError);

      const result = await FirebaseService.getTasks('user-123');

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error getting tasks:', mockError);
    });
  });

  describe('updateTask', () => {
    test('should update task successfully', async () => {
      const { doc, updateDoc } = require('firebase/firestore');
      
      doc.mockReturnValueOnce('task-doc-ref');
      updateDoc.mockResolvedValueOnce();

      const updates = { title: 'Updated Task', priority: 'Medium' };

      const result = await FirebaseService.updateTask('task-123', updates);

      expect(doc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalledWith('task-doc-ref', {
        ...updates,
        updatedAt: expect.any(Date)
      });
      expect(result).toBe(true);
    });

    test('should handle update task errors', async () => {
      const { doc, updateDoc } = require('firebase/firestore');
      const mockError = new Error('Update failed');
      
      doc.mockReturnValueOnce('task-doc-ref');
      updateDoc.mockRejectedValueOnce(mockError);

      const result = await FirebaseService.updateTask('task-123', { title: 'Updated' });

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error updating task:', mockError);
    });
  });

  describe('deleteTask', () => {
    test('should delete task successfully', async () => {
      const { doc, deleteDoc } = require('firebase/firestore');
      
      doc.mockReturnValueOnce('task-doc-ref');
      deleteDoc.mockResolvedValueOnce();

      const result = await FirebaseService.deleteTask('task-123');

      expect(doc).toHaveBeenCalled();
      expect(deleteDoc).toHaveBeenCalledWith('task-doc-ref');
      expect(result).toBe(true);
    });

    test('should handle delete task errors', async () => {
      const { doc, deleteDoc } = require('firebase/firestore');
      const mockError = new Error('Delete failed');
      
      doc.mockReturnValueOnce('task-doc-ref');
      deleteDoc.mockRejectedValueOnce(mockError);

      const result = await FirebaseService.deleteTask('task-123');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error deleting task:', mockError);
    });
  });

  describe('getTasksByCategory', () => {
    test('should retrieve tasks by category', async () => {
      const { collection, query, where, getDocs } = require('firebase/firestore');
      const mockSnapshot = {
        docs: [
          { id: 'task-1', data: () => ({ title: 'Work Task', category: 'Work' }) }
        ]
      };
      
      collection.mockReturnValueOnce('tasks-collection');
      query.mockReturnValueOnce('query-result');
      where.mockReturnValueOnce('where-clause');
      getDocs.mockResolvedValueOnce(mockSnapshot);

      const result = await FirebaseService.getTasksByCategory('user-123', 'Work');

      expect(result).toEqual([
        { id: 'task-1', title: 'Work Task', category: 'Work' }
      ]);
    });
  });

  describe('syncUserData', () => {
    test('should sync user data successfully', async () => {
      const { collection, addDoc } = require('firebase/firestore');
      
      collection.mockReturnValueOnce('users-collection');
      addDoc.mockResolvedValueOnce({ id: 'sync-123' });

      const userData = {
        displayName: 'Test User',
        email: 'test@test.com',
        preferences: { theme: 'dark' }
      };

      const result = await FirebaseService.syncUserData('user-123', userData);

      expect(addDoc).toHaveBeenCalledWith('users-collection', {
        ...userData,
        userId: 'user-123',
        lastSync: expect.any(Date)
      });
      expect(result).toBe(true);
    });

    test('should handle sync errors', async () => {
      const { collection, addDoc } = require('firebase/firestore');
      const mockError = new Error('Sync failed');
      
      collection.mockReturnValueOnce('users-collection');
      addDoc.mockRejectedValueOnce(mockError);

      const result = await FirebaseService.syncUserData('user-123', {});

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith('Error syncing user data:', mockError);
    });
  });
}); 