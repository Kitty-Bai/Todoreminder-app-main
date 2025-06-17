import { db, auth } from './firebaseConfig';
import { collection, getDocs, query, where } from 'firebase/firestore';

// 调试工具：检查Firestore连接和数据
export const debugFirestore = async () => {
  console.log('=== Firestore 调试开始 ===');
  
  try {
    // 1. 检查认证状态
    const currentUser = auth.currentUser;
    console.log('当前用户:', currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName
    } : '未登录');
    
    if (!currentUser) {
      console.log('❌ 用户未登录');
      return;
    }
    
    // 2. 检查网络连接
    console.log('🔍 检查网络连接...');
    
    // 3. 查询用户的所有任务
    console.log('🔍 查询用户任务...');
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('userId', '==', currentUser.uid));
    
    const querySnapshot = await getDocs(q);
    console.log('📊 查询结果:', {
      size: querySnapshot.size,
      empty: querySnapshot.empty
    });
    
    if (querySnapshot.empty) {
      console.log('📝 没有找到任务数据');
      
      // 4. 检查是否有任何任务（不过滤用户）
      console.log('🔍 检查数据库中的所有任务...');
      const allTasksSnapshot = await getDocs(collection(db, 'tasks'));
      console.log('📊 数据库中的所有任务数量:', allTasksSnapshot.size);
      
      if (allTasksSnapshot.size > 0) {
        console.log('💡 数据库中有任务，但没有属于当前用户的任务');
        // 显示前几个任务的userId用于调试
        allTasksSnapshot.docs.slice(0, 3).forEach((doc, index) => {
          const data = doc.data();
          console.log(`任务 ${index + 1}:`, {
            id: doc.id,
            userId: data.userId,
            title: data.title
          });
        });
      } else {
        console.log('💡 数据库中没有任何任务');
      }
    } else {
      console.log('✅ 找到用户任务:');
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`任务: ${data.title}`, {
          id: doc.id,
          dueDate: data.dueDate,
          priority: data.priority,
          status: data.status
        });
      });
    }
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
  
  console.log('=== Firestore 调试结束 ===');
};

// 自动运行调试（在开发环境中）
if (__DEV__) {
  // 延迟执行，确保认证状态已经加载
  setTimeout(() => {
    debugFirestore();
  }, 3000);
} 