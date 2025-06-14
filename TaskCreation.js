import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Switch
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc } from 'firebase/firestore';
import MockAuthService from './MockAuthService';
import { db } from './firebaseConfig';
import NotificationService from './NotificationService';
import CalendarService from './CalendarService';

const TaskCreation = ({ user, onLogout }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [dueTime, setDueTime] = useState(new Date());
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('Work');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [calendarPermission, setCalendarPermission] = useState(false);
  const [timeEnabled, setTimeEnabled] = useState(true);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatType, setRepeatType] = useState('daily');

  const categories = ['Work', 'Study', 'Family', 'Personal', 'Other'];
  const repeatTypes = ['daily', 'weekly', 'monthly', 'yearly'];

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    console.log('Attempting to save task...', {
      user: user.uid,
      email: user.email,
      title: title.trim()
    });

    try {
      if (!user || !user.uid) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const docRef = await addDoc(collection(db, 'tasks'), {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate.toISOString(),
        dueTime: timeEnabled ? dueTime.toISOString() : null,
        priority: priority,
        category: category,
        status: 'pending',
        userId: user.uid,
        userEmail: user.email,
        createdAt: new Date().toISOString(),
        repeat: repeatEnabled ? repeatType : null
      });

      console.log('Task saved successfully with ID:', docRef.id);
      
      const taskForNotification = {
        id: docRef.id,
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate.toISOString().split('T')[0],
        dueTime: dueTime.toISOString().split('T')[1],
        priority: priority,
        category: category
      };
      
      const notificationId = await NotificationService.scheduleTaskReminder(taskForNotification);
      if (notificationId) {
        console.log('✅ Notification scheduled for task:', title.trim());
      }
      
      if (calendarEnabled && calendarPermission) {
        try {
          const calendarEvent = await CalendarService.createTaskEvent({
            title: title.trim(),
            description: description.trim(),
            dueDate: dueDate.toISOString().split('T')[0],
            dueTime: dueTime.toISOString().split('T')[1],
            priority: priority,
            category: category
          });
          console.log('✅ Task added to device calendar:', calendarEvent.id);
        } catch (error) {
          console.error('⚠️ Could not add to device calendar:', error);
        }
      }
      
      if (Platform.OS === 'web') {
        alert('✅ Success! Task created successfully with reminder set!');
      } else {
        Alert.alert('Success', 'Task created successfully!\nReminder notification scheduled 15 minutes before due time.');
      }
      
      setTitle('');
      setDescription('');
      setDueDate(new Date());
      setDueTime(new Date());
      setPriority('Medium');
      setCategory('Work');
      setTimeEnabled(true);
      setRepeatEnabled(false);
      setRepeatType('daily');
      
    } catch (error) {
      console.error('Detailed error adding task:', {
        code: error.code,
        message: error.message,
        details: error
      });
      
      if (error.code === 'permission-denied') {
        Alert.alert('Error', 'Permission denied. Please check Firestore security rules.');
      } else if (error.code === 'unauthenticated') {
        Alert.alert('Error', 'User not authenticated. Please login again.');
      } else {
        Alert.alert('Error', `Failed to create task: ${error.message}`);
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await MockAuthService.signOut();
              onLogout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ],
    );
  };

  const testNotification = async () => {
    console.log('🧪 Testing notification...');
    const hasPermission = await NotificationService.requestPermissions();
    if (hasPermission) {
      await NotificationService.sendTaskCompletedNotification('Test Task');
    }
  };

  const initializeCalendar = async () => {
    try {
      console.log('📅 Initializing calendar...');
      const initialized = await CalendarService.initialize();
      if (initialized) {
        setCalendarPermission(true);
        setCalendarEnabled(true);
        console.log('✅ Calendar initialized successfully');
        Alert.alert('Success', 'Calendar access granted! Tasks will be added to your device calendar.');
      } else {
        Alert.alert('Calendar Access', 'Calendar permission is required to add tasks to your device calendar.');
      }
    } catch (error) {
      console.error('❌ Calendar initialization failed:', error);
      Alert.alert('Error', 'Failed to initialize calendar access');
    }
  };

  const checkCalendarConflicts = async () => {
    if (!calendarPermission) {
      Alert.alert('Calendar Access Required', 'Please enable calendar access first.');
      return;
    }

    try {
      const taskDateTime = `${dueDate.toISOString().split('T')[0]} ${dueTime.toISOString().split('T')[1]}`;
      const conflicts = await CalendarService.checkTimeConflicts(taskDateTime);
      
      if (conflicts.length > 0) {
        const conflictList = conflicts.map(event => 
          `- ${event.title} (${event.startDate.toLocaleTimeString()})`
        ).join('\n');
        
        Alert.alert(
          'Time Conflicts Found',
          `The following events conflict with your task time:\n\n${conflictList}\n\nWould you like to proceed anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Proceed', onPress: () => console.log('User chose to proceed') }
          ]
        );
      } else {
        Alert.alert('No Conflicts', '✅ No time conflicts found in your calendar');
      }
    } catch (error) {
      console.error('❌ Error checking conflicts:', error);
      Alert.alert('Error', 'Failed to check calendar conflicts');
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString();
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header with user info and logout */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.header}>Create New Task</Text>
          <Text style={styles.userInfo}>Welcome, {user.email}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      {/* Title Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Task Title *</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter task title"
          multiline={false}
        />
      </View>

      {/* Description Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.textInput, styles.multilineInput]}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter task description"
          multiline={true}
        />
      </View>

      {/* Category Buttons */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryContainer}>
          {categories.slice(0, 4).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                category === cat && styles.categoryButtonActive
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[
                styles.categoryButtonText,
                category === cat && styles.categoryButtonTextActive
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.categoryContainer}>
          <TouchableOpacity
            style={[
              styles.categoryButton,
              category === 'Other' && styles.categoryButtonActive
            ]}
            onPress={() => setCategory('Other')}
          >
            <Text style={[
              styles.categoryButtonText,
              category === 'Other' && styles.categoryButtonTextActive
            ]}>
              Other
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Due Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text>{dueDate.toLocaleDateString()}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDueDate(selectedDate);
              }
            }}
          />
        )}
      </View>

      <View style={styles.timeContainer}>
        <View style={styles.timeHeader}>
          <Text style={styles.label}>Due Time</Text>
          <Switch
            value={timeEnabled}
            onValueChange={setTimeEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={timeEnabled ? '#2196F3' : '#f4f3f4'}
          />
        </View>
        
        {timeEnabled && (
          <>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text>{dueTime.toLocaleTimeString()}</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={dueTime}
                mode="time"
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    setDueTime(selectedTime);
                  }
                }}
              />
            )}
          </>
        )}
      </View>

      <View style={styles.repeatContainer}>
        <View style={styles.repeatHeader}>
          <Text style={styles.label}>Repeat</Text>
          <Switch
            value={repeatEnabled}
            onValueChange={setRepeatEnabled}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={repeatEnabled ? '#2196F3' : '#f4f3f4'}
          />
        </View>
        
        {repeatEnabled && (
          <View style={styles.categoryContainer}>
            {repeatTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.categoryButton,
                  repeatType === type && styles.categoryButtonActive
                ]}
                onPress={() => setRepeatType(type)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  repeatType === type && styles.categoryButtonTextActive
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Priority Buttons */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.categoryContainer}>
          {['High', 'Medium', 'Low'].map((pri) => (
            <TouchableOpacity
              key={pri}
              style={[
                styles.categoryButton,
                priority === pri && styles.categoryButtonActive
              ]}
              onPress={() => setPriority(pri)}
            >
              <Text style={[
                styles.categoryButtonText,
                priority === pri && styles.categoryButtonTextActive
              ]}>
                {pri}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={checkCalendarConflicts}
        >
          <Text style={styles.buttonText}>Save Task</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  picker: {
    height: 50,
    width: '100%',
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  button: {
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    alignItems: 'center',
    width: '80%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  categoryButtonActive: {
    backgroundColor: '#2196F3',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  timeContainer: {
    marginBottom: 15,
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  repeatContainer: {
    marginBottom: 15,
  },
  repeatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
});

export default TaskCreation; 