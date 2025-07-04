import AsyncStorage from '@react-native-async-storage/async-storage';

const TASKS_KEY = '@tasks';
const TAGS_KEY = '@tags';
const SETTINGS_KEY = '@settings';
const PENDING_TASKS_KEY = '@pending_tasks';
const PENDING_CHANGES_KEY = '@pending_changes';

class LocalStorageService {
  // Task methods
  static async getTasks() {
    try {
      const tasks = await AsyncStorage.getItem(TASKS_KEY);
      return tasks ? JSON.parse(tasks) : [];
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  }

  static async saveTasks(tasks) {
    try {
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  }

  static async addTask(task) {
    try {
      const tasks = await this.getTasks();
      await this.saveTasks([...tasks, task]);
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  static async updateTask(taskId, updatedTask) {
    try {
      const tasks = await this.getTasks();
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? { ...task, ...updatedTask } : task
      );
      await this.saveTasks(updatedTasks);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  static async deleteTask(taskId) {
    try {
      const tasks = await this.getTasks();
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      await this.saveTasks(updatedTasks);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Tag methods
  static async getTags() {
    try {
      const tags = await AsyncStorage.getItem(TAGS_KEY);
      return tags ? JSON.parse(tags) : ['Work', 'Study', 'Family', 'Personal', 'Other'];
    } catch (error) {
      console.error('Error getting tags:', error);
      return ['Work', 'Study', 'Family', 'Personal', 'Other'];
    }
  }

  static async saveTags(tags) {
    try {
      await AsyncStorage.setItem(TAGS_KEY, JSON.stringify(tags));
    } catch (error) {
      console.error('Error saving tags:', error);
    }
  }

  static async addTag(tag) {
    try {
      const tags = await this.getTags();
      if (!tags.includes(tag)) {
        await this.saveTags([...tags, tag]);
      }
    } catch (error) {
      console.error('Error adding tag:', error);
      throw error;
    }
  }

  static async deleteTag(tag) {
    try {
      const tags = await this.getTags();
      const updatedTags = tags.filter(t => t !== tag);
      await this.saveTags(updatedTags);
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  }

  // Settings related methods
  static async saveSettings(settings) {
    try {
      const jsonValue = JSON.stringify(settings);
      await AsyncStorage.setItem(SETTINGS_KEY, jsonValue);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  static async getSettings() {
    try {
      const jsonValue = await AsyncStorage.getItem(SETTINGS_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : {
        notifications: true,
        darkMode: false,
        defaultCategory: 'Work',
        defaultPriority: 'Medium'
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return {
        notifications: true,
        darkMode: false,
        defaultCategory: 'Work',
        defaultPriority: 'Medium'
      };
    }
  }

  // Sync related methods
  static async syncWithFirebase(tasks, categories, tags) {
    try {
      // Save all data locally
      await this.saveTasks(tasks);
      await this.saveTags(tags);
      return true;
    } catch (error) {
      console.error('Error syncing with Firebase:', error);
      return false;
    }
  }

  // Pending tasks methods
  static async getPendingTasks() {
    try {
      const tasks = await AsyncStorage.getItem(PENDING_TASKS_KEY);
      return tasks ? JSON.parse(tasks) : [];
    } catch (error) {
      console.error('Error getting pending tasks:', error);
      return [];
    }
  }

  static async addPendingTask(task) {
    try {
      const tasks = await this.getPendingTasks();
      await AsyncStorage.setItem(PENDING_TASKS_KEY, JSON.stringify([...tasks, task]));
    } catch (error) {
      console.error('Error adding pending task:', error);
      throw error;
    }
  }

  static async removePendingTask(taskId) {
    try {
      const tasks = await this.getPendingTasks();
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      await AsyncStorage.setItem(PENDING_TASKS_KEY, JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Error removing pending task:', error);
      throw error;
    }
  }

  // Pending changes methods
  static async getPendingChanges() {
    try {
      const changes = await AsyncStorage.getItem(PENDING_CHANGES_KEY);
      return changes ? JSON.parse(changes) : [];
    } catch (error) {
      console.error('Error getting pending changes:', error);
      return [];
    }
  }

  static async addPendingChange(change) {
    try {
      const changes = await this.getPendingChanges();
      await AsyncStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify([...changes, change]));
    } catch (error) {
      console.error('Error adding pending change:', error);
      throw error;
    }
  }

  static async removePendingChange(changeId) {
    try {
      const changes = await this.getPendingChanges();
      const updatedChanges = changes.filter(change => change.id !== changeId);
      await AsyncStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(updatedChanges));
    } catch (error) {
      console.error('Error removing pending change:', error);
      throw error;
    }
  }

  // Clear all data including pending tasks and changes
  static async clearAll() {
    try {
      await AsyncStorage.multiRemove([
        TASKS_KEY,
        TAGS_KEY,
        SETTINGS_KEY,
        PENDING_TASKS_KEY,
        PENDING_CHANGES_KEY
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  }
}

export default LocalStorageService; 