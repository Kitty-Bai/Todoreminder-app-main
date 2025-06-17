import NotificationService from '../NotificationService';
import * as Notifications from 'expo-notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
}));

// Mock Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios || obj.default),
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log
    console.error = jest.fn(); // Mock console.error
  });

  describe('requestPermissions', () => {
    test('should request notification permissions successfully', async () => {
      const { requestPermissionsAsync } = require('expo-notifications');
      requestPermissionsAsync.mockResolvedValueOnce({ granted: true });

      const result = await NotificationService.requestPermissions();

      expect(requestPermissionsAsync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle permission denial', async () => {
      const { requestPermissionsAsync } = require('expo-notifications');
      requestPermissionsAsync.mockResolvedValueOnce({ granted: false });

      const result = await NotificationService.requestPermissions();

      expect(result).toBe(false);
    });
  });

  describe('scheduleTaskReminder', () => {
    test('should schedule task reminder with valid due date', async () => {
      const { scheduleNotificationAsync } = require('expo-notifications');
      scheduleNotificationAsync.mockResolvedValueOnce('notification-id');

      const task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date(Date.now() + 3600000)
      };

      const result = await NotificationService.scheduleTaskReminder(task);

      expect(scheduleNotificationAsync).toHaveBeenCalled();
      expect(result).toBe('notification-id');
    });

    test('should not schedule reminder without due date', async () => {
      const task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test Description'
      };

      const result = await NotificationService.scheduleTaskReminder(task);

      expect(result).toBeNull();
    });
  });

  describe('sendTaskCompletedNotification', () => {
    test('should send completion notification', async () => {
      const { scheduleNotificationAsync } = require('expo-notifications');
      scheduleNotificationAsync.mockResolvedValueOnce('completion-id');

      const result = await NotificationService.sendTaskCompletedNotification('Test Task');

      expect(scheduleNotificationAsync).toHaveBeenCalled();
      expect(result).toBe('completion-id');
    });
  });

  describe('cancelTaskReminder', () => {
    test('should cancel notification successfully', async () => {
      const { cancelScheduledNotificationAsync } = require('expo-notifications');
      cancelScheduledNotificationAsync.mockResolvedValueOnce();

      await NotificationService.cancelTaskReminder('notification-id');

      expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-id');
    });
  });

  describe('scheduleSmartReminder', () => {
    test('should schedule smart reminder with different priorities', async () => {
      const mockNotificationId = 'smart-notification-789';
      Notifications.scheduleNotificationAsync.mockResolvedValueOnce(mockNotificationId);

      const task = {
        id: 'task-1',
        title: 'High Priority Task',
        priority: 'High',
        dueDate: new Date(Date.now() + 7200000) // 2 hours from now
      };

      const result = await NotificationService.scheduleSmartReminder(task);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
      expect(result).toBe(mockNotificationId);
    });

    test('should handle medium priority tasks', async () => {
      const mockNotificationId = 'smart-notification-medium';
      Notifications.scheduleNotificationAsync.mockResolvedValueOnce(mockNotificationId);

      const task = {
        id: 'task-2',
        title: 'Medium Priority Task',
        priority: 'Medium',
        dueDate: new Date(Date.now() + 86400000) // 24 hours from now
      };

      const result = await NotificationService.scheduleSmartReminder(task);

      expect(result).toBe(mockNotificationId);
    });

    test('should handle low priority tasks', async () => {
      const mockNotificationId = 'smart-notification-low';
      Notifications.scheduleNotificationAsync.mockResolvedValueOnce(mockNotificationId);

      const task = {
        id: 'task-3',
        title: 'Low Priority Task',
        priority: 'Low',
        dueDate: new Date(Date.now() + 172800000) // 48 hours from now
      };

      const result = await NotificationService.scheduleSmartReminder(task);

      expect(result).toBe(mockNotificationId);
    });
  });

  describe('setupNotificationHandlers', () => {
    test('should setup notification handlers', () => {
      const mockListener1 = { remove: jest.fn() };
      const mockListener2 = { remove: jest.fn() };
      
      Notifications.addNotificationReceivedListener.mockReturnValueOnce(mockListener1);
      Notifications.addNotificationResponseReceivedListener.mockReturnValueOnce(mockListener2);

      NotificationService.setupNotificationHandlers();

      expect(Notifications.setNotificationHandler).toHaveBeenCalledWith({
        handleNotification: expect.any(Function),
      });
      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalled();
      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
    });
  });

  describe('dailyProductivityReminder', () => {
    test('should schedule daily productivity reminder', async () => {
      const mockNotificationId = 'daily-reminder-123';
      Notifications.scheduleNotificationAsync.mockResolvedValueOnce(mockNotificationId);

      const result = await NotificationService.dailyProductivityReminder();

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: '🌟 Daily Productivity Check',
          body: 'How are your tasks going today? Open the app to stay on track!',
          data: {
            type: 'daily_reminder'
          }
        },
        trigger: {
          repeats: true,
          hour: 10,
          minute: 0
        }
      });
      expect(result).toBe(mockNotificationId);
    });
  });
}); 