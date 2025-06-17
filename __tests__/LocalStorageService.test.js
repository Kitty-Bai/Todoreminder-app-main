import LocalStorageService from '../LocalStorageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage for each test
beforeEach(() => {
  AsyncStorage.clear();
});

describe('LocalStorageService', () => {
  describe('Task operations', () => {
    test('should save and retrieve tasks', async () => {
      const testTasks = [
        { id: '1', title: 'Test Task 1', description: 'First test task' },
        { id: '2', title: 'Test Task 2', description: 'Second test task' }
      ];

      await LocalStorageService.saveTasks(testTasks);
      const retrievedTasks = await LocalStorageService.getTasks();

      expect(retrievedTasks).toEqual(testTasks);
    });

    test('should return empty array when no tasks exist', async () => {
      const tasks = await LocalStorageService.getTasks();
      expect(tasks).toEqual([]);
    });

    test('should add a new task', async () => {
      const newTask = { id: '1', title: 'New Task', description: 'Test description' };
      
      await LocalStorageService.addTask(newTask);
      const tasks = await LocalStorageService.getTasks();

      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toEqual(newTask);
    });

    test('should update an existing task', async () => {
      const initialTask = { id: '1', title: 'Initial Task', status: 'pending' };
      const updatedTask = { id: '1', title: 'Updated Task', status: 'completed' };

      await LocalStorageService.saveTasks([initialTask]);
      await LocalStorageService.updateTask('1', updatedTask);
      
      const tasks = await LocalStorageService.getTasks();
      expect(tasks[0]).toEqual(updatedTask);
    });

    test('should delete a task', async () => {
      const tasks = [
        { id: '1', title: 'Task 1' },
        { id: '2', title: 'Task 2' }
      ];

      await LocalStorageService.saveTasks(tasks);
      await LocalStorageService.deleteTask('1');
      
      const remainingTasks = await LocalStorageService.getTasks();
      expect(remainingTasks).toHaveLength(1);
      expect(remainingTasks[0].id).toBe('2');
    });
  });

  describe('Tag operations', () => {
    test('should save and retrieve tags', async () => {
      const testTags = ['Work', 'Personal', 'Urgent'];

      await LocalStorageService.saveTags(testTags);
      const retrievedTags = await LocalStorageService.getTags();

      expect(retrievedTags).toEqual(testTags);
    });

    test('should return default tags when none exist', async () => {
      const tags = await LocalStorageService.getTags();
      const expectedDefaultTags = ['Work', 'Study', 'Family', 'Personal', 'Other'];
      
      expect(tags).toEqual(expectedDefaultTags);
    });

    test('should add a new tag', async () => {
      const initialTags = ['Work', 'Personal'];
      await LocalStorageService.saveTags(initialTags);
      
      await LocalStorageService.addTag('Urgent');
      const tags = await LocalStorageService.getTags();

      expect(tags).toContain('Urgent');
      expect(tags).toHaveLength(3);
    });

    test('should not add duplicate tags', async () => {
      const initialTags = ['Work', 'Personal'];
      await LocalStorageService.saveTags(initialTags);
      
      await LocalStorageService.addTag('Work'); // Duplicate
      const tags = await LocalStorageService.getTags();

      expect(tags).toHaveLength(2); // Should remain 2
    });
  });

  describe('Settings operations', () => {
    test('should save and retrieve settings', async () => {
      const testSettings = {
        notifications: false,
        darkMode: true,
        defaultCategory: 'Personal',
        defaultPriority: 'High'
      };

      await LocalStorageService.saveSettings(testSettings);
      const retrievedSettings = await LocalStorageService.getSettings();

      expect(retrievedSettings).toEqual(testSettings);
    });

    test('should return default settings when none exist', async () => {
      const settings = await LocalStorageService.getSettings();
      const expectedDefaults = {
        notifications: true,
        darkMode: false,
        defaultCategory: 'Work',
        defaultPriority: 'Medium'
      };

      expect(settings).toEqual(expectedDefaults);
    });
  });

  describe('Error handling', () => {
    test('should handle AsyncStorage errors gracefully', async () => {
      // Mock AsyncStorage to throw an error
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      const tasks = await LocalStorageService.getTasks();
      expect(tasks).toEqual([]); // Should return empty array on error
    });

    test('should handle save errors gracefully', async () => {
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Save error'));

      // Should not throw error
      await expect(LocalStorageService.saveTasks([{ id: '1', title: 'Test' }])).resolves.toBeUndefined();
    });
  });
}); 