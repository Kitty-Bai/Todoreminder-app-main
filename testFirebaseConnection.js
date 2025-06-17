import { db } from './firebaseConfig';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase Firestore connection...');
    
    // 1. 尝试创建测试任务
    console.log('Step 1: Creating test task...');
    const testTask = {
      title: 'Test Task',
      description: 'This is a test task',
      tag: 'Test',
      priority: 'Medium',
      dueDate: new Date().toISOString(),
      completed: false,
      createdAt: new Date().toISOString(),
      userId: 'test_user'
    };
    
    const docRef = await addDoc(collection(db, 'tasks'), testTask);
    console.log('✅ Test task created successfully with ID:', docRef.id);
    
    // 2. 尝试读取任务
    console.log('Step 2: Reading tasks...');
    const querySnapshot = await getDocs(collection(db, 'tasks'));
    console.log('✅ Read operation successful, found', querySnapshot.size, 'tasks');
    
    // 3. 显示所有任务
    querySnapshot.forEach((doc) => {
      console.log('Task:', doc.id, '=>', doc.data());
    });
    
    console.log('✅ All Firebase Firestore tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Firebase Firestore test failed:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
}; 