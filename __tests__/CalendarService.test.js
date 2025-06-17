import CalendarService from '../CalendarService';

// Mock expo-calendar
jest.mock('expo-calendar', () => ({
  requestCalendarPermissionsAsync: jest.fn(),
  getCalendarsAsync: jest.fn(),
  createEventAsync: jest.fn(),
  getEventsAsync: jest.fn(),
  EntityTypes: {
    EVENT: 'event'
  },
  CalendarType: {
    LOCAL: 'local'
  }
}));

describe('CalendarService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('requestPermissions', () => {
    test('should request calendar permissions successfully', async () => {
      const { requestCalendarPermissionsAsync } = require('expo-calendar');
      requestCalendarPermissionsAsync.mockResolvedValueOnce({ granted: true });

      const result = await CalendarService.requestPermissions();

      expect(requestCalendarPermissionsAsync).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    test('should handle permission denial', async () => {
      const { requestCalendarPermissionsAsync } = require('expo-calendar');
      requestCalendarPermissionsAsync.mockResolvedValueOnce({ granted: false });

      const result = await CalendarService.requestPermissions();

      expect(result).toBe(false);
    });

    test('should handle permission errors', async () => {
      const { requestCalendarPermissionsAsync } = require('expo-calendar');
      requestCalendarPermissionsAsync.mockRejectedValueOnce(new Error('Permission error'));

      const result = await CalendarService.requestPermissions();

      expect(result).toBe(false);
    });
  });

  describe('getCalendars', () => {
    test('should retrieve calendars successfully', async () => {
      const { getCalendarsAsync } = require('expo-calendar');
      const mockCalendars = [
        { id: '1', title: 'Personal', allowsModifications: true },
        { id: '2', title: 'Work', allowsModifications: true }
      ];
      getCalendarsAsync.mockResolvedValueOnce(mockCalendars);

      const result = await CalendarService.getCalendars();

      expect(getCalendarsAsync).toHaveBeenCalled();
      expect(result).toEqual(mockCalendars);
    });

    test('should handle calendar retrieval errors', async () => {
      const { getCalendarsAsync } = require('expo-calendar');
      getCalendarsAsync.mockRejectedValueOnce(new Error('Calendar error'));

      const result = await CalendarService.getCalendars();

      expect(result).toEqual([]);
    });
  });

  describe('createEvent', () => {
    test('should create calendar event successfully', async () => {
      const { createEventAsync } = require('expo-calendar');
      createEventAsync.mockResolvedValueOnce('event-123');

      const eventDetails = {
        title: 'Test Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
        notes: 'Test description'
      };

      const result = await CalendarService.createEvent('calendar-1', eventDetails);

      expect(createEventAsync).toHaveBeenCalledWith('calendar-1', eventDetails);
      expect(result).toBe('event-123');
    });

    test('should handle event creation errors', async () => {
      const { createEventAsync } = require('expo-calendar');
      createEventAsync.mockRejectedValueOnce(new Error('Event creation failed'));

      const eventDetails = {
        title: 'Test Event',
        startDate: new Date(),
        endDate: new Date()
      };

      const result = await CalendarService.createEvent('calendar-1', eventDetails);

      expect(result).toBeNull();
    });
  });

  describe('addTaskToCalendar', () => {
    test('should add task to calendar successfully', async () => {
      const { getCalendarsAsync, createEventAsync } = require('expo-calendar');
      const mockCalendars = [{ id: 'cal-1', title: 'Personal', allowsModifications: true }];
      getCalendarsAsync.mockResolvedValueOnce(mockCalendars);
      createEventAsync.mockResolvedValueOnce('event-456');

      const task = {
        id: 'task-1',
        title: 'Important Meeting',
        description: 'Quarterly review',
        dueDate: new Date('2024-01-15T14:00:00Z'),
        priority: 'High'
      };

      const result = await CalendarService.addTaskToCalendar(task);

      expect(createEventAsync).toHaveBeenCalled();
      expect(result).toBe('event-456');
    });

    test('should handle task without due date', async () => {
      const task = {
        id: 'task-1',
        title: 'No Due Date Task',
        description: 'This task has no due date'
      };

      const result = await CalendarService.addTaskToCalendar(task);

      expect(result).toBeNull();
    });

    test('should handle no available calendars', async () => {
      const { getCalendarsAsync } = require('expo-calendar');
      getCalendarsAsync.mockResolvedValueOnce([]);

      const task = {
        id: 'task-1',
        title: 'Test Task',
        dueDate: new Date()
      };

      const result = await CalendarService.addTaskToCalendar(task);

      expect(result).toBeNull();
    });
  });

  describe('getTodaysEvents', () => {
    test('should get today\'s events successfully', async () => {
      const { getCalendarsAsync, getEventsAsync } = require('expo-calendar');
      const mockCalendars = [{ id: 'cal-1' }];
      const mockEvents = [
        { id: 'event-1', title: 'Morning Meeting', startDate: new Date() },
        { id: 'event-2', title: 'Lunch', startDate: new Date() }
      ];
      
      getCalendarsAsync.mockResolvedValueOnce(mockCalendars);
      getEventsAsync.mockResolvedValueOnce(mockEvents);

      const result = await CalendarService.getTodaysEvents();

      expect(getEventsAsync).toHaveBeenCalled();
      expect(result).toEqual(mockEvents);
    });

    test('should handle events retrieval errors', async () => {
      const { getCalendarsAsync, getEventsAsync } = require('expo-calendar');
      const mockCalendars = [{ id: 'cal-1' }];
      
      getCalendarsAsync.mockResolvedValueOnce(mockCalendars);
      getEventsAsync.mockRejectedValueOnce(new Error('Events error'));

      const result = await CalendarService.getTodaysEvents();

      expect(result).toEqual([]);
    });
  });

  describe('getUpcomingEvents', () => {
    test('should get upcoming events within date range', async () => {
      const { getCalendarsAsync, getEventsAsync } = require('expo-calendar');
      const mockCalendars = [{ id: 'cal-1' }];
      const mockEvents = [
        { id: 'event-1', title: 'Tomorrow Meeting', startDate: new Date() }
      ];
      
      getCalendarsAsync.mockResolvedValueOnce(mockCalendars);
      getEventsAsync.mockResolvedValueOnce(mockEvents);

      const result = await CalendarService.getUpcomingEvents(7); // 7 days

      expect(getEventsAsync).toHaveBeenCalled();
      expect(result).toEqual(mockEvents);
    });
  });

  describe('createTaskDeadlineEvent', () => {
    test('should create deadline event with proper formatting', async () => {
      const { getCalendarsAsync, createEventAsync } = require('expo-calendar');
      const mockCalendars = [{ id: 'cal-1', allowsModifications: true }];
      getCalendarsAsync.mockResolvedValueOnce(mockCalendars);
      createEventAsync.mockResolvedValueOnce('deadline-event-789');

      const task = {
        id: 'task-1',
        title: 'Project Deadline',
        description: 'Final project submission',
        dueDate: new Date('2024-01-20T23:59:00Z'),
        priority: 'High'
      };

      const result = await CalendarService.createTaskDeadlineEvent(task);

      expect(createEventAsync).toHaveBeenCalled();
      expect(result).toBe('deadline-event-789');
    });
  });
}); 