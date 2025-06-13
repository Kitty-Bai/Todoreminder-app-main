import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

class CalendarService {
  static defaultCalendarId = null;

  // Initialize calendar service and request permissions
  static async initialize() {
    try {
      console.log('📅 Initializing Calendar Service...');
      
      // Request calendar permissions
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Calendar permissions granted');
        
        // Find or create default calendar
        await this.setupDefaultCalendar();
        return true;
      } else {
        console.log('❌ Calendar permissions denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing calendar service:', error);
      return false;
    }
  }

  // Setup default calendar for the app
  static async setupDefaultCalendar() {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      console.log(`📅 Found ${calendars.length} calendars on device`);

      // Try to find existing Todo Reminder calendar
      let todoCalendar = calendars.find(cal => cal.title === 'Todo Reminders');

      if (!todoCalendar) {
        // Create new calendar if it doesn't exist
        console.log('📅 Creating Todo Reminders calendar...');
        
        // Find the default calendar source
        const defaultCalendarSource = 
          Platform.OS === 'ios'
            ? calendars.find(cal => cal.source.name === 'Default')?.source ||
              calendars.find(cal => cal.source && cal.source.isLocalAccount)?.source
            : { isLocalAccount: true, name: 'Local Calendar' };

        if (defaultCalendarSource) {
          const calendarId = await Calendar.createCalendarAsync({
            title: 'Todo Reminders',
            color: '#007AFF',
            entityType: Calendar.EntityTypes.EVENT,
            sourceId: defaultCalendarSource.id,
            source: defaultCalendarSource,
            name: 'Todo Reminders',
            ownerAccount: 'personal',
            accessLevel: Calendar.CalendarAccessLevel.OWNER,
          });

          this.defaultCalendarId = calendarId;
          console.log('✅ Created Todo Reminders calendar:', calendarId);
        } else {
          // Fallback to first writable calendar
          const writableCalendar = calendars.find(cal => 
            cal.allowsModifications && 
            cal.accessLevel === Calendar.CalendarAccessLevel.OWNER
          );
          
          if (writableCalendar) {
            this.defaultCalendarId = writableCalendar.id;
            console.log('✅ Using existing calendar:', writableCalendar.title);
          }
        }
      } else {
        this.defaultCalendarId = todoCalendar.id;
        console.log('✅ Found existing Todo Reminders calendar');
      }

      return this.defaultCalendarId;
    } catch (error) {
      console.error('❌ Error setting up default calendar:', error);
      
      // Fallback: use first available calendar
      try {
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const fallbackCalendar = calendars.find(cal => cal.allowsModifications);
        if (fallbackCalendar) {
          this.defaultCalendarId = fallbackCalendar.id;
          console.log('✅ Using fallback calendar:', fallbackCalendar.title);
        }
      } catch (fallbackError) {
        console.error('❌ Fallback calendar setup failed:', fallbackError);
      }
      
      return null;
    }
  }

  // Get all calendars on device
  static async getCalendars() {
    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      console.log(`📅 Retrieved ${calendars.length} calendars`);
      
      return calendars.map(cal => ({
        id: cal.id,
        title: cal.title,
        color: cal.color,
        allowsModifications: cal.allowsModifications,
        isPrimary: cal.isPrimary || false
      }));
    } catch (error) {
      console.error('❌ Error fetching calendars:', error);
      return [];
    }
  }

  // Create calendar event for a task
  static async createTaskEvent(task) {
    try {
      if (!this.defaultCalendarId) {
        console.log('⚠️ No calendar available, initializing...');
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Calendar not accessible');
        }
      }

      console.log('📅 Creating calendar event for task:', task.title);

      // Parse task date and time
      const taskDate = new Date(task.dueDate);
      const [hours, minutes] = (task.dueTime || '09:00').split(':');
      
      const startDate = new Date(taskDate);
      startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1); // 1 hour duration

      // Create event details
      const eventDetails = {
        title: `📋 ${task.title}`,
        notes: `${task.description || 'No description'}\n\nPriority: ${task.priority}\nCreated by Todo Reminder App`,
        startDate: startDate,
        endDate: endDate,
        timeZone: 'GMT', // Use device timezone
        alarms: [
          { relativeOffset: -15, method: Calendar.AlarmMethod.ALERT }, // 15 minutes before
          { relativeOffset: -60, method: Calendar.AlarmMethod.ALERT }  // 1 hour before
        ]
      };

      const eventId = await Calendar.createEventAsync(this.defaultCalendarId, eventDetails);
      
      console.log('✅ Calendar event created successfully:', eventId);
      
      return {
        id: eventId,
        title: eventDetails.title,
        startDate: startDate,
        endDate: endDate,
        calendarId: this.defaultCalendarId
      };
    } catch (error) {
      console.error('❌ Error creating calendar event:', error);
      throw error;
    }
  }

  // Get events from calendar for date range
  static async getEvents(startDate, endDate) {
    try {
      if (!this.defaultCalendarId) {
        await this.initialize();
      }

      console.log(`📅 Fetching events from ${startDate.toDateString()} to ${endDate.toDateString()}`);

      const events = await Calendar.getEventsAsync(
        [this.defaultCalendarId],
        startDate,
        endDate
      );

      console.log(`📅 Found ${events.length} events in calendar`);
      
      return events.map(event => ({
        id: event.id,
        title: event.title,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate),
        notes: event.notes,
        alarms: event.alarms
      }));
    } catch (error) {
      console.error('❌ Error fetching calendar events:', error);
      return [];
    }
  }

  // Check for time conflicts
  static async checkTimeConflicts(taskDateTime, durationMinutes = 60) {
    try {
      const taskStart = new Date(taskDateTime);
      const taskEnd = new Date(taskStart.getTime() + durationMinutes * 60000);
      
      // Get events for the day
      const dayStart = new Date(taskStart);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(taskStart);  
      dayEnd.setHours(23, 59, 59, 999);
      
      const events = await this.getEvents(dayStart, dayEnd);
      
      // Filter for conflicts
      const conflicts = events.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        
        // Check for time overlap
        return (taskStart < eventEnd && taskEnd > eventStart);
      });
      
      if (conflicts.length > 0) {
        console.log(`⚠️ Found ${conflicts.length} time conflicts:`);
        conflicts.forEach(conflict => {
          console.log(`   - ${conflict.title} (${conflict.startDate.toLocaleTimeString()})`);
        });
      } else {
        console.log('✅ No time conflicts found');
      }
      
      return conflicts;
    } catch (error) {
      console.error('❌ Error checking conflicts:', error);
      return [];
    }
  }

  // Delete calendar event
  static async deleteEvent(eventId) {
    try {
      await Calendar.deleteEventAsync(eventId);
      console.log('✅ Calendar event deleted:', eventId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting calendar event:', error);
      return false;
    }
  }

  // Check if calendar permissions are granted
  static async hasPermissions() {
    try {
      const { status } = await Calendar.getCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('❌ Error checking calendar permissions:', error);
      return false;
    }
  }

  // Request calendar permissions
  static async requestPermissions() {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('❌ Error requesting calendar permissions:', error);
      return false;
    }
  }

  // Get calendar service status
  static async getStatus() {
    try {
      const hasPermissions = await this.hasPermissions();
      const calendars = hasPermissions ? await this.getCalendars() : [];
      
      return {
        hasPermissions,
        calendarCount: calendars.length,
        defaultCalendarId: this.defaultCalendarId,
        defaultCalendarSet: !!this.defaultCalendarId
      };
    } catch (error) {
      console.error('❌ Error getting calendar status:', error);
      return {
        hasPermissions: false,
        calendarCount: 0,
        defaultCalendarId: null,
        defaultCalendarSet: false
      };
    }
  }
}

export default CalendarService; 