import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification behavior for mobile platforms
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

class NotificationService {
  
  // Request notification permissions
  static async requestPermissions() {
    try {
      if (Platform.OS === 'web') {
        // Web browser notification permissions
        if ('Notification' in window) {
          console.log('🔍 Current permission status:', Notification.permission);
          
          if (Notification.permission === 'granted') {
            console.log('✅ Web notification permissions already granted');
            return true;
          } else if (Notification.permission === 'denied') {
            console.log('🚫 Web notification permissions denied by user');
            alert('Notifications are blocked!\n\nTo enable notifications:\n1. Click the 🔒 or 🛈 icon in your address bar\n2. Set notifications to "Allow"\n3. Refresh the page');
            return false;
          } else {
            // Permission is 'default', ask for permission
            console.log('🤔 Requesting notification permission...');
            const permission = await Notification.requestPermission();
            console.log('📋 Permission request result:', permission);
            
            if (permission === 'granted') {
              console.log('✅ Web notification permissions granted');
              // Test notification
              setTimeout(() => {
                this.showWebNotification('🎉 Notifications Enabled!', 'You will now receive task reminders and updates.');
              }, 1000);
              return true;
            } else {
              console.log('⚠️ Web notification permissions denied');
              return false;
            }
          }
        } else {
          console.log('❌ Web notifications not supported');
          alert('Your browser does not support notifications');
          return false;
        }
      } else if (Device.isDevice) {
        // Mobile device notification permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notification!');
          return false;
        }
        
        console.log('✅ Mobile notification permissions granted');
        return true;
      } else {
        console.log('Must use physical device for Push Notifications');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Schedule a task reminder notification
  static async scheduleTaskReminder(task) {
    try {
      const { title, description, dueDate, dueTime, id } = task;
      
      // Parse due date and time
      const taskDateTime = new Date(`${dueDate} ${dueTime || '09:00'}`);
      const now = new Date();
      
      // Don't schedule notifications for past tasks
      if (taskDateTime <= now) {
        console.log('Task is in the past, skipping notification');
        return null;
      }
      
      // Schedule notification 15 minutes before due time
      const reminderTime = new Date(taskDateTime.getTime() - 15 * 60 * 1000);
      
      // Don't schedule if reminder time is in the past
      if (reminderTime <= now) {
        console.log('Reminder time is in the past, skipping notification');
        return null;
      }
      
      if (Platform.OS === 'web') {
        // Web: Use setTimeout for scheduling (limited functionality)
        const timeUntilReminder = reminderTime.getTime() - now.getTime();
        if (timeUntilReminder > 0) {
          setTimeout(() => {
            this.showWebNotification('📋 Task Reminder', `"${title}" is due in 15 minutes`);
          }, timeUntilReminder);
          
          console.log(`⏰ Web notification scheduled for task "${title}" at ${reminderTime.toLocaleString()}`);
          return `web-${id}-${Date.now()}`;
        }
      } else {
        // Mobile: Use Expo notifications
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📋 Task Reminder',
            body: `"${title}" is due in 15 minutes`,
            data: { taskId: id, type: 'task_reminder' },
            sound: true,
          },
          trigger: {
            date: reminderTime,
          },
        });
        
        console.log(`📱 Mobile notification scheduled for task "${title}" at ${reminderTime.toLocaleString()}`);
        return notificationId;
      }
      
      return null;
      
    } catch (error) {
      console.error('Error scheduling task reminder:', error);
      return null;
    }
  }

  // Schedule daily summary notification
  static async scheduleDailySummary(tasks = []) {
    try {
      if (Platform.OS === 'web') {
        // Web: Limited daily summary support
        console.log('📅 Daily summary not fully supported on web (browser limitations)');
        return null;
      }
      
      // Cancel existing daily summary
      await this.cancelDailySummary();
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0); // 8:00 AM tomorrow
      
      const todayTasks = tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        const today = new Date();
        return taskDate.toDateString() === today.toDateString() && task.status !== 'completed';
      });
      
      let body = '';
      if (todayTasks.length === 0) {
        body = 'No tasks scheduled for today. Great job staying organized! 🎉';
      } else {
        body = `You have ${todayTasks.length} task${todayTasks.length > 1 ? 's' : ''} for today. Stay focused! 💪`;
      }
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🌅 Good Morning!',
          body: body,
          data: { type: 'daily_summary' },
          sound: true,
        },
        trigger: {
          date: tomorrow,
        },
      });
      
      console.log(`📅 Daily summary scheduled for ${tomorrow.toLocaleString()}`);
      return notificationId;
      
    } catch (error) {
      console.error('Error scheduling daily summary:', error);
      return null;
    }
  }

  // Send immediate congratulations notification
  static async sendTaskCompletedNotification(taskTitle) {
    try {
      if (Platform.OS === 'web') {
        this.showWebNotification('🎉 Task Completed!', `Great job completing "${taskTitle}"!`);
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎉 Task Completed!',
            body: `Great job completing "${taskTitle}"!`,
            data: { type: 'task_completed' },
            sound: true,
          },
          trigger: null, // Send immediately
        });
      }
      
      console.log(`✅ Completion notification sent for task: ${taskTitle}`);
    } catch (error) {
      console.error('Error sending completion notification:', error);
    }
  }

  // Send overdue task notification
  static async sendOverdueNotification(tasks) {
    try {
      const overdueTasks = tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        const today = new Date();
        return taskDate < today && task.status !== 'completed';
      });
      
      if (overdueTasks.length === 0) return;
      
      let body = '';
      if (overdueTasks.length === 1) {
        body = `"${overdueTasks[0].title}" is overdue. Don't forget to complete it! ⏰`;
      } else {
        body = `You have ${overdueTasks.length} overdue tasks. Time to catch up! 📝`;
      }
      
      if (Platform.OS === 'web') {
        this.showWebNotification('⚠️ Overdue Tasks', body);
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Overdue Tasks',
            body: body,
            data: { type: 'overdue_tasks' },
            sound: true,
          },
          trigger: null, // Send immediately
        });
      }
      
      console.log(`⚠️ Overdue notification sent for ${overdueTasks.length} tasks`);
    } catch (error) {
      console.error('Error sending overdue notification:', error);
    }
  }

  // Cancel a specific notification
  static async cancelNotification(notificationId) {
    try {
      if (Platform.OS === 'web') {
        console.log(`🌐 Web notification cancellation not supported: ${notificationId}`);
        return;
      }
      
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log(`📱 Notification ${notificationId} cancelled`);
      }
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  // Cancel daily summary
  static async cancelDailySummary() {
    try {
      if (Platform.OS === 'web') {
        console.log('🌐 Web daily summary cancellation not supported');
        return;
      }
      
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const dailySummaryNotifications = scheduledNotifications.filter(
        notification => notification.content.data?.type === 'daily_summary'
      );
      
      for (const notification of dailySummaryNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
      
      console.log('📅 Daily summary notifications cancelled');
    } catch (error) {
      console.error('Error cancelling daily summary:', error);
    }
  }

  // Cancel all task-related notifications
  static async cancelAllTaskNotifications() {
    try {
      if (Platform.OS === 'web') {
        console.log('🌐 Web task notification cancellation not supported');
        return;
      }
      
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === 'task_reminder') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      
      console.log('📱 All task notifications cancelled');
    } catch (error) {
      console.error('Error cancelling task notifications:', error);
    }
  }

  // Get all scheduled notifications (for debugging)
  static async getScheduledNotifications() {
    try {
      if (Platform.OS === 'web') {
        console.log('📋 Scheduled notifications not available on web');
        return [];
      }
      
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Scheduled notifications:', notifications);
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Web notification helper
  static showWebNotification(title, body) {
    try {
      // Detailed permission checking
      if (!('Notification' in window)) {
        console.log('❌ Browser does not support notifications');
        alert('Your browser does not support notifications');
        return null;
      }

      console.log('🔍 Current notification permission:', Notification.permission);
      
      if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
          body: body,
          icon: '/favicon.ico', // You can add your app icon here
          badge: '/favicon.ico',
          tag: 'todo-reminder',
          requireInteraction: false,
          silent: false
        });

        // Auto close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);

        console.log(`🌐 Web notification shown: ${title}`);
        return notification;
      } else if (Notification.permission === 'denied') {
        console.log('🚫 Notifications are blocked. Please enable them in browser settings.');
        alert('Notifications are blocked!\n\nTo enable notifications:\n1. Click the 🔒 or 🛈 icon in your address bar\n2. Allow notifications for this site\n3. Refresh the page');
        return null;
      } else {
        console.log('⚠️ Notification permission not granted. Current status:', Notification.permission);
        alert('Notifications not enabled. Please allow notifications when prompted or check browser settings.');
        return null;
      }
    } catch (error) {
      console.error('Error showing web notification:', error);
      alert(`Notification error: ${error.message}`);
      return null;
    }
  }
}

export default NotificationService; 