import { db, auth } from './firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

// Debug tool: Check Firestore connection and data
export const debugFirestore = async () => {
  console.log('=== Firestore Debug Start ===');
  
  try {
    // 1. Check Authentication Status
    const currentUser = auth.currentUser;
    console.log('Current user:', currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email,
      isAnonymous: currentUser.isAnonymous
    } : 'Not logged in');
    
    if (!currentUser) {
      console.log('❌ User not logged in');
      return;
    }
    
    // 2. Check Network Connection
    console.log('🔍 Checking network connection...');
    
    // 3. Query all tasks for the user
    console.log('🔍 Querying user tasks...');
    const userTasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', currentUser.uid)
    );
    
    const querySnapshot = await getDocs(userTasksQuery);
    console.log('📊 Query results:', {
      userId: currentUser.uid,
      tasksCount: querySnapshot.size,
      tasks: querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    });
    
    if (querySnapshot.empty) {
      console.log('📝 No tasks found');
      
      // 4. Check if there are any tasks (without user filter)
      console.log('🔍 Checking all tasks in database...');
      const allTasksSnapshot = await getDocs(collection(db, 'tasks'));
      console.log('📊 Total tasks in database:', allTasksSnapshot.size);
      
      if (allTasksSnapshot.size > 0) {
        console.log('💡 Database has tasks, but none belong to the current user');
        // Display the userId of the first few tasks for debugging
        allTasksSnapshot.docs.slice(0, 3).forEach((doc, index) => {
          const data = doc.data();
          console.log(`Task ${index + 1}:`, {
            id: doc.id,
            userId: data.userId,
            title: data.title
          });
        });
      } else {
        console.log('💡 Database has no tasks');
      }
    } else {
      console.log('✅ Found user tasks:');
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`Task: ${data.title}`, {
          id: doc.id,
          dueDate: data.dueDate,
          priority: data.priority,
          status: data.status
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Debugging error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
  
  console.log('=== Firestore Debug End ===');
};

// Automatically run debugging (in development environment)
if (__DEV__) {
  // Delay execution to ensure authentication state has loaded
  setTimeout(() => {
    debugFirestore();
  }, 3000);
} 