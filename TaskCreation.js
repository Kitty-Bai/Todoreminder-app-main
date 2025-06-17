import React, { useState, useEffect } from 'react';
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
import { db, auth } from './firebaseConfig';
import NotificationService from './NotificationService';
import CalendarService from './CalendarService';
import LocalStorageService from './LocalStorageService';
import FirebaseService from './FirebaseService';
import AITaskClassifier from './AITaskClassifier';
import LocationService from './LocationService';
import MotionSensorService from './MotionSensorService';

const TaskCreation = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTag, setSelectedTag] = useState('Work');
  const [dueDate, setDueDate] = useState(new Date());
  const [dueTime, setDueTime] = useState(new Date());
  const [timeEnabled, setTimeEnabled] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeat, setRepeat] = useState('daily');
  const [priority, setPriority] = useState('Medium');
  const [tags] = useState(['Work', 'Study', 'Family', 'Personal', 'Other']);
  
  // AI and sensor states
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to create tasks');
      return;
    }

    const newTask = {
      title: title.trim(),
      description: description.trim(),
      tag: selectedTag,
      priority,
      dueDate: dueDate.toISOString(),
      dueTime: timeEnabled ? dueTime.toISOString() : null,
      repeat: repeatEnabled ? repeat : null,
      completed: false,
      createdAt: new Date().toISOString(),
      userId: currentUser.uid
    };

    try {
      // Save to Firebase
      const taskId = await FirebaseService.addTask(newTask);
      console.log('Task saved successfully with ID:', taskId);
      
      // Save to local storage
      await LocalStorageService.addTask({ ...newTask, id: taskId });
      
      // Show success message
      Alert.alert('Success', 'Task saved successfully', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation && typeof navigation.goBack === 'function') {
              navigation.goBack();
            } else {
              console.log('Navigation not available, task saved but cannot return to previous screen');
            }
          }
        }
      ]);
    } catch (error) {
      console.error('Error saving task:', error);
      Alert.alert('Error', 'Failed to save task');
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

  // AI Smart Suggestions
  const generateAISuggestions = () => {
    if (!title.trim()) {
      Alert.alert('AI Suggestion', 'Please enter a task title first');
      return;
    }

    try {
      const analysis = AITaskClassifier.generateSuggestions(title, description);
      setAiSuggestions(analysis.suggestions);
      setShowAiSuggestions(true);

      // Auto-apply suggestions if confidence is high
      if (analysis.confidence > 40) {
        setSelectedTag(analysis.suggestedCategory);
        setPriority(analysis.suggestedPriority);
      }

      Alert.alert(
        '🤖 AI Analysis Complete',
        `Confidence: ${analysis.confidence}%\nSuggested Category: ${analysis.suggestedCategory}\nSuggested Priority: ${analysis.suggestedPriority}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('AI suggestion error:', error);
      Alert.alert('Error', 'Failed to generate AI suggestions');
    }
  };

  // Location Services
  const enableLocationReminder = async () => {
    try {
      const initialized = await LocationService.initialize();
      if (initialized) {
        const location = await LocationService.getCurrentLocation();
        setCurrentLocation(location);
        setLocationEnabled(true);
        Alert.alert('Location Enabled', `Current location: ${location?.address || 'Location obtained'}`);
      } else {
        Alert.alert('Location Error', 'Failed to enable location services. Please check your permissions.');
      }
    } catch (error) {
      console.error('Location initialization error:', error);
      Alert.alert('Error', 'Failed to initialize location services');
    }
  };

  // Initialize motion sensor for shake-to-add
  useEffect(() => {
    const initializeMotionSensor = async () => {
      try {
        const isAvailable = await MotionSensorService.initialize();
        if (isAvailable) {
          MotionSensorService.startShakeDetection(() => {
            Alert.alert(
              '📳 Shake Detected!',
              'Quick add a new task?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Add Task', onPress: () => {
                  setTitle('Quick Task');
                  setDescription('Added via shake gesture');
                }}
              ]
            );
          });
        }
      } catch (error) {
        console.error('Motion sensor initialization error:', error);
      }
    };

    initializeMotionSensor();

    // Cleanup on unmount
    return () => {
      MotionSensorService.stopShakeDetection();
    };
  }, []);

  const checkCalendarConflicts = async () => {
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

      {/* AI Smart Features */}
      <View style={styles.smartFeaturesContainer}>
        <Text style={styles.smartFeaturesTitle}>🤖 Smart Features</Text>
        <View style={styles.smartButtonsRow}>
          <TouchableOpacity 
            style={styles.smartButton}
            onPress={generateAISuggestions}
          >
            <Text style={styles.smartButtonText}>🎯 AI Suggest</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.smartButton, locationEnabled && styles.smartButtonActive]}
            onPress={enableLocationReminder}
          >
            <Text style={[styles.smartButtonText, locationEnabled && styles.smartButtonTextActive]}>
              📍 Location
            </Text>
          </TouchableOpacity>
        </View>
        
        {showAiSuggestions && aiSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>AI Suggestions:</Text>
            {aiSuggestions.map((suggestion, index) => (
              <Text key={index} style={styles.suggestionText}>• {suggestion}</Text>
            ))}
          </View>
        )}
        
        {currentLocation && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>📍 {currentLocation.address}</Text>
          </View>
        )}
      </View>

      {/* Tag Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Tag</Text>
        <View style={styles.tagContainer}>
          {tags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagButton,
                selectedTag === tag && styles.tagButtonActive
              ]}
              onPress={() => setSelectedTag(tag)}
            >
              <Text style={[
                styles.tagButtonText,
                selectedTag === tag && styles.tagButtonTextActive
              ]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Priority Buttons */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityContainer}>
          <TouchableOpacity
            style={[
              styles.priorityButton,
              priority === 'High' && styles.priorityButtonActive
            ]}
            onPress={() => setPriority('High')}
          >
            <Text style={[
              styles.priorityButtonText,
              priority === 'High' && styles.priorityButtonTextActive
            ]}>
              High
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.priorityButton,
              priority === 'Medium' && styles.priorityButtonActive
            ]}
            onPress={() => setPriority('Medium')}
          >
            <Text style={[
              styles.priorityButtonText,
              priority === 'Medium' && styles.priorityButtonTextActive
            ]}>
              Medium
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.priorityButton,
              priority === 'Low' && styles.priorityButtonActive
            ]}
            onPress={() => setPriority('Low')}
          >
            <Text style={[
              styles.priorityButtonText,
              priority === 'Low' && styles.priorityButtonTextActive
            ]}>
              Low
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Due Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <Text>{dueDate.toLocaleDateString()}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
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
              onPress={() => setShowTimePicker(!showTimePicker)}
            >
              <Text>{dueTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                value={dueTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setDueTime(selectedTime);
                  }
                }}
              />
            )}
          </>
        )}
      </View>

      {/* Repeat Input */}
      <View style={styles.inputContainer}>
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
          <View style={styles.repeatContainer}>
            <TouchableOpacity
              style={[
                styles.repeatButton,
                repeat === 'daily' && styles.repeatButtonActive
              ]}
              onPress={() => setRepeat('daily')}
            >
              <Text style={[
                styles.repeatButtonText,
                repeat === 'daily' && styles.repeatButtonTextActive
              ]}>
                Daily
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.repeatButton,
                repeat === 'weekly' && styles.repeatButtonActive
              ]}
              onPress={() => setRepeat('weekly')}
            >
              <Text style={[
                styles.repeatButtonText,
                repeat === 'weekly' && styles.repeatButtonTextActive
              ]}>
                Weekly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.repeatButton,
                repeat === 'monthly' && styles.repeatButtonActive
              ]}
              onPress={() => setRepeat('monthly')}
            >
              <Text style={[
                styles.repeatButtonText,
                repeat === 'monthly' && styles.repeatButtonTextActive
              ]}>
                Monthly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.repeatButton,
                repeat === 'yearly' && styles.repeatButtonActive
              ]}
              onPress={() => setRepeat('yearly')}
            >
              <Text style={[
                styles.repeatButtonText,
                repeat === 'yearly' && styles.repeatButtonTextActive
              ]}>
                Yearly
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
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
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  tagButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  tagButtonActive: {
    backgroundColor: '#007AFF',
  },
  tagButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  tagButtonTextActive: {
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
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  repeatButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 4,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  repeatButtonActive: {
    backgroundColor: '#007AFF',
  },
  repeatButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  repeatButtonTextActive: {
    color: '#fff',
  },
  repeatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  priorityButtonActive: {
    backgroundColor: '#007AFF',
  },
  priorityButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  priorityButtonTextActive: {
    color: '#fff',
  },
  // Smart Features Styles
  smartFeaturesContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  smartFeaturesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  smartButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  smartButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#2196f3',
    minWidth: 100,
    alignItems: 'center',
  },
  smartButtonActive: {
    backgroundColor: '#2196f3',
  },
  smartButtonText: {
    color: '#2196f3',
    fontWeight: '600',
    fontSize: 12,
  },
  smartButtonTextActive: {
    color: '#fff',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  locationContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ff9800',
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});

export default TaskCreation; 