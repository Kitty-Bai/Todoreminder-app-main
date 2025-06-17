import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from './firebaseConfig';

class FirebaseService {
  // Add a new task
  static async addTask(task) {
    try {
      const docRef = await addDoc(collection(db, 'tasks'), task);
      console.log('Task added with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  }

  // Get all tasks
  static async getTasks() {
    try {
      const querySnapshot = await getDocs(collection(db, 'tasks'));
      const tasks = [];
      querySnapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      return tasks;
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw error;
    }
  }

  // Update a task
  static async updateTask(taskId, updatedData) {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, updatedData);
      console.log('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  // Delete a task
  static async deleteTask(taskId) {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      console.log('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // Get tasks by tag
  static async getTasksByTag(tag) {
    try {
      const q = query(collection(db, 'tasks'), where('tag', '==', tag));
      const querySnapshot = await getDocs(q);
      const tasks = [];
      querySnapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      return tasks;
    } catch (error) {
      console.error('Error getting tasks by tag:', error);
      throw error;
    }
  }
}

export default FirebaseService; 