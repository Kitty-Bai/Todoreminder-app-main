import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform,
  TextInput,
  ActivityIndicator,
  AppState
} from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';
import NotificationService from './NotificationService';
import LocalStorageService from './LocalStorageService';
import { auth } from './firebaseConfig';
import NetInfo from '@react-native-community/netinfo';

const TaskList = ({ filterType = 'all', user, onNavigateToDay, selectedDate }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tags, setTags] = useState([]);
  const [appState, setAppState] = useState(AppState.currentState);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState([]);

  // Navigation states for different views
  const [currentDate, setCurrentDate] = useState(() => selectedDate || new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    return monday;
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Add network state listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('Connection type:', state.type);
      console.log('Is connected?', state.isConnected);
      setIsOnline(state.isConnected);
      if (state.isConnected) {
        syncPendingChanges();
      }
    });

    // Check initial network state
    NetInfo.fetch().then(state => {
      console.log('Initial network state:', state.isConnected);
      setIsOnline(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // App state monitoring
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('App has come to the foreground!');
        syncPendingChanges();
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState]);

  // Sync pending changes when app becomes active
  const syncPendingChanges = async () => {
    try {
      const pendingChanges = await LocalStorageService.getPendingChanges();
      if (pendingChanges.length === 0) return;
      
      console.log('🔄 Syncing pending changes:', pendingChanges.length);
      
      for (const change of pendingChanges) {
        try {
          switch (change.type) {
            case 'update':
              await updateDoc(doc(db, 'tasks', change.taskId), change.data);
              break;
            case 'delete':
              await deleteDoc(doc(db, 'tasks', change.taskId));
              break;
          }
          await LocalStorageService.removePendingChange(change.id);
          console.log(`✅ Synced change for task ${change.taskId}`);
        } catch (error) {
          console.error(`❌ Failed to sync change for task ${change.taskId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error syncing pending changes:', error);
    }
  };

  // Load data from local storage
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        // Only load from local storage if we're offline
        if (!navigator.onLine) {
          console.log('Device is offline, loading from local storage');
          const localTasks = await LocalStorageService.getTasks();
          const localTags = await LocalStorageService.getTags();
          
          if (localTasks.length > 0) {
            console.log('Loading tasks from local storage:', localTasks.length);
            setTasks(localTasks);
          }
          if (localTags.length > 0) {
            setTags(localTags);
          }
        } else {
          console.log('Device is online, skipping local storage load');
        }
      } catch (error) {
        console.error('Error loading local data:', error);
      }
    };

    loadLocalData();
  }, []);

  // Update currentDate when selectedDate prop changes
  useEffect(() => {
    if (selectedDate && filterType === 'today') {
      console.log('Setting selected date from route params:', selectedDate);
      const newDate = new Date(selectedDate);
      console.log('New date object:', newDate);
      setCurrentDate(newDate);
    }
  }, [selectedDate, filterType]);

  // Helper functions for date filtering
  const isToday = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  const isThisWeek = (date) => {
    const taskDate = new Date(date);
    
    // Use the current selected week start
    const monday = new Date(currentWeekStart);
    monday.setHours(0, 0, 0, 0);
    
    // Get Sunday as end of week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return taskDate >= monday && taskDate <= sunday;
  };

  // Helper function to get week number
  const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  // Helper function to format date range for week
  const getWeekDateRange = (monday, sunday) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const startMonth = monthNames[monday.getMonth()];
    const endMonth = monthNames[sunday.getMonth()];
    const startDate = monday.getDate();
    const endDate = sunday.getDate();
    
    if (monday.getMonth() === sunday.getMonth()) {
      // Same month: "Jun 9 - 15"
      return `${startMonth} ${startDate} - ${endDate}`;
    } else {
      // Different months: "May 30 - Jun 5"
      return `${startMonth} ${startDate} - ${endMonth} ${endDate}`;
    }
  };

  // Helper function to generate calendar for monthly view
  const generateCalendar = (tasks) => {
    const today = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Get first day of month and last day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get day of week for first day (0=Sunday, 1=Monday, etc.)
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // Calculate previous month days to show
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDaysToShow = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Monday = 0
    
    const calendar = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    // Add previous month days (grayed out)
    for (let i = prevMonthDaysToShow; i > 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i + 1);
      calendar.push({
        date: prevMonthLastDay - i + 1,
        fullDate: date,
        isCurrentMonth: false,
        isToday: false,
        tasks: []
      });
    }
    
    // Add current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayTasks = tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.toDateString() === date.toDateString();
      });
      
      calendar.push({
        date: day,
        fullDate: date,
        isCurrentMonth: true,
        isToday: date.toDateString() === today.toDateString(),
        tasks: dayTasks
      });
    }
    
    // Add next month days to complete the grid (6 weeks = 42 days)
    const remainingDays = 42 - calendar.length;
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      calendar.push({
        date: day,
        fullDate: date,
        isCurrentMonth: false,
        isToday: false,
        tasks: []
      });
    }
    
    return {
      calendar,
      monthName: monthNames[month],
      year,
      month: month + 1
    };
  };

  // Helper function to group tasks by day for weekly view
  const groupTasksByDay = (tasks) => {
    const today = new Date();
    const monday = new Date(currentWeekStart);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const weekDays = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      
      const dayTasks = tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.toDateString() === date.toDateString();
      });
      
      weekDays.push({
        dayName: dayNames[i],
        date: date.getDate(),
        fullDate: date,
        tasks: dayTasks,
        isToday: date.toDateString() === today.toDateString()
      });
    }
    
          return {
        weekDays,
        monday,
        sunday,
        year: monday.getFullYear(),
        weekNumber: getWeekNumber(monday),
        dateRange: getWeekDateRange(monday, sunday)
      };
  };

  const isThisMonth = (date) => {
    const taskDate = new Date(date);
    return taskDate.getMonth() === currentMonth.getMonth() && taskDate.getFullYear() === currentMonth.getFullYear();
  };

  const processTasksData = (tasks, filterType, selectedDate) => {
    // First filter by date
    let filteredTasks = tasks;
    
    if ((filterType === 'day' || filterType === 'today') && selectedDate) {
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      filteredTasks = tasks.filter(task => {
        const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
        return taskDate === selectedDateStr;
      });
    } else if (filterType === 'today' && !selectedDate) {
      // For today view without specific date, show tasks for current date
      const todayStr = currentDate.toISOString().split('T')[0];
      filteredTasks = tasks.filter(task => {
        const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
        return taskDate === todayStr;
      });
    }

    // Then group by tags
    const groupedTasks = filteredTasks.reduce((groups, task) => {
      const tag = task.tag || 'No Tag';
      if (!groups[tag]) {
        groups[tag] = [];
      }
      groups[tag].push(task);
      return groups;
    }, {});

    // Convert grouped tasks to array format
    return Object.entries(groupedTasks).map(([tag, tasks]) => ({
      tag,
      data: tasks
    }));
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchTasks();
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log('No user logged in');
        setTasks([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('Fetching tasks for user:', currentUser.uid);
      
      const tasksRef = collection(db, 'tasks');
      const q = query(
        tasksRef,
        where('userId', '==', currentUser.uid)
      );

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          try {
            const tasksList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Sort tasks by dueDate in memory
            const sortedTasks = tasksList.sort((a, b) => {
              const dateA = new Date(a.dueDate);
              const dateB = new Date(b.dueDate);
              return dateA - dateB;
            });

            console.log('Firestore snapshot received, docs count:', snapshot.docs.length);
            console.log('Fetched tasks:', sortedTasks);
            setTasks(sortedTasks);
          } catch (error) {
            console.error('Error processing tasks:', error);
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        }, 
        (error) => {
          console.error('Error fetching tasks:', error);
          setLoading(false);
          setRefreshing(false);
        }
      );

      return () => {
        console.log('Cleaning up tasks subscription');
        unsubscribe();
      };
    } catch (error) {
      console.error('Error in fetchTasks:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Add useEffect for initial load
  useEffect(() => {
    console.log('Initial load of tasks');
    const unsubscribe = fetchTasks();
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        console.log('Cleaning up tasks subscription');
        unsubscribe();
      }
    };
  }, [user?.uid]); // Add user.uid as dependency

  // Add useEffect for date change
  useEffect(() => {
    if (filterType === 'day') {
      console.log('Date changed, refetching tasks for:', currentDate);
      const unsubscribe = fetchTasks();
      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          console.log('Cleaning up tasks subscription for date change');
          unsubscribe();
        }
      };
    }
  }, [currentDate, filterType, user?.uid]); // Add user.uid as dependency

  // Navigation functions
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction) => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const goToToday = () => {
    console.log('goToToday called! Resetting date to today');
    const today = new Date();
    setCurrentDate(today);
    
    // Set current week start to this week
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    setCurrentWeekStart(monday);
    
    // Set current month
    setCurrentMonth(today);
  };

  // Modified toggleTaskStatus to handle offline state
  const toggleTaskStatus = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const updateData = { 
        status: newStatus,
        completed: newStatus === 'completed',
        updatedAt: new Date().toISOString()
      };

      // Optimistically update UI
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, ...updateData }
            : task
        )
      );

      if (!isOnline) {
        // Store in local storage
        await LocalStorageService.updateTask(taskId, updateData);
        // Add to pending sync queue
        setPendingSync(prev => [...prev, {
          type: 'update',
          taskId,
          data: updateData,
          timestamp: Date.now()
        }]);
        console.log('📱 Task status updated locally, will sync when online');
      } else {
        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, updateData);
        
        // Send notification only when completing task
        if (newStatus === 'completed') {
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            await NotificationService.sendTaskCompletedNotification(task.title);
          }
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      // Revert optimistic update on error
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId 
            ? { ...task, status: currentStatus, completed: currentStatus === 'completed' }
            : task
        )
      );
      if (Platform.OS === 'web') {
        alert('Error updating task: ' + error.message);
      }
    }
  };

  // Modified deleteTask to handle offline state
  const deleteTask = async (taskId) => {
    try {
      // Optimistically remove from UI
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));

      if (!isOnline) {
        // Store in local storage
        await LocalStorageService.deleteTask(taskId);
        // Add to pending sync queue
        setPendingSync(prev => [...prev, {
          type: 'delete',
          taskId,
          timestamp: Date.now()
        }]);
        console.log('📱 Task deleted locally, will sync when online');
      } else {
        await deleteDoc(doc(db, 'tasks', taskId));
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      // Revert optimistic deletion on error
      const deletedTask = tasks.find(t => t.id === taskId);
      if (deletedTask) {
        setTasks(prevTasks => [...prevTasks, deletedTask]);
      }
      if (Platform.OS === 'web') {
        alert('Error deleting task: ' + error.message);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return '#ff4444';
      case 'Medium': return '#ff9800';
      case 'Low': return '#4caf50';
      default: return '#666';
    }
  };

  const getTagIcon = (tagName) => {
    const tag = tagName.toLowerCase();
    switch (tag) {
      case 'work':
        return '💼';
      case 'family':
        return '👨‍👩‍👧‍👦';
      case 'study':
        return '📚';
      case 'health':
        return '💪';
      case 'personal':
        return '👤';
      case 'shopping':
        return '🛒';
      case 'travel':
        return '✈️';
      case 'finance':
        return '💰';
      case 'entertainment':
      case 'hobby':
        return '🎮';
      case 'home':
        return '🏠';
      case 'sport':
      case 'sports':
        return '⚽';
      case 'food':
        return '🍽️';
      case 'project':
        return '📋';
      case 'meeting':
        return '🤝';
      case 'appointment':
        return '📅';
      case 'no tag':
        return '📝';
      default:
        return '📌';
    }
  };

  const getFilterTitle = () => {
    switch (filterType) {
      case 'today':
        return 'Today\'s Tasks';
      case 'week':
        return 'This Week\'s Tasks';
      case 'month':
        return 'This Month\'s Tasks';
      default:
        return 'All Tasks';
    }
  };

  // Navigation header component
  const renderNavigationHeader = () => {
    // Only show navigation header for specific filter types that need it
    if (filterType === 'today' && onNavigateToDay) {
      return (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.navigationHeader}
        >
          {[...Array(7)].map((_, index) => {
            const date = new Date();
            date.setDate(date.getDate() + index);
            const isSelected = selectedDate && 
              date.toDateString() === selectedDate.toDateString();
            
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateButton,
                  isSelected && styles.selectedDateButton
                ]}
                onPress={() => onNavigateToDay(date)}
              >
                <Text style={[
                  styles.dateButtonText,
                  isSelected && styles.selectedDateButtonText
                ]}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
                <Text style={[
                  styles.dateButtonText,
                  isSelected && styles.selectedDateButtonText
                ]}>
                  {date.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      );
    }
    return null;
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionIcon}>{getTagIcon(item.tag)}</Text>
          <Text style={styles.sectionHeader}>{item.tag}</Text>
        </View>
        {item.data.map((task) => (
          <View key={task.id} style={styles.taskItem}>
            <View style={styles.taskContent}>
              <Text style={[
                styles.taskTitle,
                task.status === 'completed' && styles.completedText
              ]}>
                {task.title}
              </Text>
              <Text style={[
                styles.taskDescription,
                task.status === 'completed' && styles.completedText
              ]} numberOfLines={2}>
                {task.description}
              </Text>
              <View style={styles.taskMeta}>
                <Text style={[
                  styles.taskDate,
                  task.status === 'completed' && styles.completedText
                ]}>
                  {new Date(task.dueDate).toLocaleDateString()}
                </Text>
                <Text style={[
                  styles.taskPriority,
                  { color: getPriorityColor(task.priority) },
                  task.status === 'completed' && styles.completedText
                ]}>
                  {task.priority}
                </Text>
              </View>
              <View style={styles.taskActions}>
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    task.status === 'completed' ? styles.disabledButton : styles.completeButton
                  ]}
                  onPress={() => toggleTaskStatus(task.id, task.status)}
                  disabled={task.status === 'completed'}
                >
                  <Text style={[
                    styles.actionButtonText,
                    task.status === 'completed' && styles.disabledButtonText
                  ]}>
                    Complete
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteTask(task.id)}
                >
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Add date navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const formatDateDisplay = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Update the render method to include date navigation
  const renderDateNavigation = () => {
    if (filterType !== 'today') return null;

    return (
      <View style={styles.dateNavigationContainer}>
        <TouchableOpacity 
          style={styles.dateNavButton} 
          onPress={goToPreviousDay}
        >
          <Text style={styles.dateNavButtonText}>{'<'}</Text>
        </TouchableOpacity>
        
        <Text style={styles.dateDisplay}>
          {formatDateDisplay(currentDate)}
        </Text>
        
        <TouchableOpacity 
          style={styles.dateNavButton} 
          onPress={goToNextDay}
        >
          <Text style={styles.dateNavButtonText}>{'>'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handlePrevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
    console.log('Previous week:', {
      oldDate: currentDate.toISOString(),
      newDate: newDate.toISOString()
    });
  };

  const handleNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
    console.log('Next week:', {
      oldDate: currentDate.toISOString(),
      newDate: newDate.toISOString()
    });
  };

  const renderWeekNavigation = () => {
    if (filterType !== 'week') return null;

    // Calculate week range for display
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    console.log('Week navigation:', {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      currentDate: currentDate.toISOString()
    });

    return (
      <View style={styles.dateNavigationContainer}>
        <TouchableOpacity 
          style={styles.dateNavButton} 
          onPress={handlePrevWeek}
        >
          <Text style={styles.dateNavButtonText}>{'<'}</Text>
        </TouchableOpacity>
        
        <Text style={styles.dateDisplay}>
          {`${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
        </Text>
        
        <TouchableOpacity 
          style={styles.dateNavButton} 
          onPress={handleNextWeek}
        >
          <Text style={styles.dateNavButtonText}>{'>'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Add function to get all days in the current week
  const getDaysInWeek = (startDate) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Add function to format day display
  const formatDayDisplay = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Update the renderWeekView function
  const renderWeekView = () => {
    // Get the start of the week (Sunday)
    const weekStart = new Date(currentDate);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Generate array of dates for the week
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });

    // Group tasks by day
    const tasksByDay = weekDates.map(date => {
      const dayTasks = tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === date.getTime();
      });

      return {
        date,
        tasks: dayTasks
      };
    });

    return (
      <View style={styles.weekContainer}>
        {tasksByDay.map(({ date, tasks }, index) => (
          <View 
            key={index} 
            style={[
              styles.dayRow,
              isToday(date) && styles.todayRow
            ]}
          >
            <View style={styles.dateColumn}>
              <Text style={[
                styles.weekdayText,
                isToday(date) && styles.todayText
              ]}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>
              <Text style={[
                styles.dateText,
                isToday(date) && styles.todayText
              ]}>
                {date.getDate()}
              </Text>
            </View>
            <ScrollView 
              horizontal 
              style={styles.tasksScrollView}
              showsHorizontalScrollIndicator={false}
            >
              {tasks.length > 0 ? (
                tasks.map(task => (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.weekTaskItem,
                      { borderLeftColor: getPriorityColor(task.priority) }
                    ]}
                    onPress={() => toggleTaskStatus(task.id, task.status)}
                  >
                    <Text style={[
                      styles.weekTaskTitle,
                      task.status === 'completed' && styles.completedText
                    ]} numberOfLines={1}>
                      {task.title}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noTasksText}>No tasks</Text>
              )}
            </ScrollView>
          </View>
        ))}
      </View>
    );
  };

  // Add month navigation functions
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  // Add function to get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    // Create array of days
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  // Add function to render month view
  const renderMonthView = () => {
    if (filterType !== 'month') return null;

    const days = getDaysInMonth(currentMonth);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Use original tasks instead of filtered ones for month view
    const monthTasks = tasks.filter(task => {
      const taskDate = new Date(task.dueDate);
      return taskDate.getMonth() === currentMonth.getMonth() && 
             taskDate.getFullYear() === currentMonth.getFullYear();
    });

    return (
      <View style={styles.monthContainer}>
        {/* Month navigation */}
        <View style={styles.monthNavigation}>
          <TouchableOpacity 
            style={styles.monthNavButton} 
            onPress={goToPreviousMonth}
          >
            <Text style={styles.monthNavButtonText}>{'<'}</Text>
          </TouchableOpacity>
          
          <Text style={styles.monthTitle}>
            {currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          
          <TouchableOpacity 
            style={styles.monthNavButton} 
            onPress={goToNextMonth}
          >
            <Text style={styles.monthNavButtonText}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Week day headers */}
        <View style={styles.weekDaysHeader}>
          {weekDays.map((day, index) => (
            <Text key={index} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {days.map((date, index) => {
            const dayTasks = date ? monthTasks.filter(task => {
              const taskDate = new Date(task.dueDate);
              taskDate.setHours(0, 0, 0, 0);
              const cellDate = new Date(date);
              cellDate.setHours(0, 0, 0, 0);
              return taskDate.getTime() === cellDate.getTime();
            }) : [];

            return (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.calendarCell,
                  !date && styles.emptyCell,
                  date && isToday(date) && styles.todayCell
                ]}
                onPress={() => date && dayTasks.length > 0 && console.log('Day pressed:', date, 'Tasks:', dayTasks.length)}
                disabled={!date || dayTasks.length === 0}
              >
                {date && (
                  <>
                    <Text style={[
                      styles.calendarDate,
                      isToday(date) && styles.todayText
                    ]}>
                      {date.getDate()}
                    </Text>
                    {dayTasks.length > 0 && (
                      <View style={styles.cellTasks}>
                        {dayTasks.slice(0, 3).map(task => (
                          <View 
                            key={task.id} 
                            style={[
                              styles.cellTask, 
                              { 
                                backgroundColor: task.status === 'completed' 
                                  ? '#cccccc' 
                                  : getPriorityColor(task.priority) 
                              }
                            ]}
                          >
                            <Text style={[
                              styles.cellTaskText,
                              task.status === 'completed' && styles.completedText
                            ]} numberOfLines={1}>
                              {task.title}
                            </Text>
                          </View>
                        ))}
                        {dayTasks.length > 3 && (
                          <Text style={styles.moreTasksText}>
                            +{dayTasks.length - 3} more
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Update the render method
  return (
    <View style={styles.container}>
      {renderDateNavigation()}
      {renderWeekNavigation()}
      {filterType === 'month' ? renderMonthView() : (
        <>
          {renderNavigationHeader()}
          {filterType === 'week' ? renderWeekView() : (
            <FlatList
              data={processTasksData(tasks, filterType, selectedDate)}
              keyExtractor={(item) => item.tag}
              renderItem={renderItem}
              refreshing={refreshing}
              onRefresh={onRefresh}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    paddingBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
  },
  navigationHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  dateButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    minWidth: 60,
  },
  selectedDateButton: {
    backgroundColor: '#007AFF',
  },
  dateButtonText: {
    color: '#000',
  },
  selectedDateButtonText: {
    color: '#fff',
  },
  taskItem: {
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  taskContent: {
    flex: 1,
    width: '100%',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskDate: {
    fontSize: 12,
    color: '#999',
  },
  taskPriority: {
    fontSize: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    color: '#fff',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  disabledButtonText: {
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateNavigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  dateNavButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 40,
    alignItems: 'center',
  },
  dateNavButtonText: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  dateDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  weekContainer: {
    flex: 1,
    padding: 10,
  },
  dayRow: {
    flexDirection: 'row',
    marginBottom: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    height: 70,
  },
  dateColumn: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#eee',
    paddingRight: 8,
    height: '100%',
  },
  weekdayText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tasksScrollView: {
    flex: 1,
    marginLeft: 10,
    height: '100%',
  },
  noTasksText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    padding: 10,
  },
  monthContainer: {
    flex: 1,
    padding: 4,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  monthNavButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    minWidth: 40,
    alignItems: 'center',
  },
  monthNavButtonText: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    marginBottom: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 2,
    flex: 1,
  },
  calendarCell: {
    width: '14.28%',
    height: 110,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'flex-start',
    backgroundColor: '#fff',
  },
  emptyCell: {
    backgroundColor: '#f8f9fa',
  },
  todayCell: {
    backgroundColor: '#f0f7ff',
  },
  calendarDate: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  cellTasks: {
    flex: 1,
  },
  cellTask: {
    padding: 2,
    borderRadius: 3,
    marginBottom: 2,
    minHeight: 16,
    justifyContent: 'center',
  },
  cellTaskText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  moreTasksText: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
    marginTop: 1,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  todayRow: {
    backgroundColor: '#f0f7ff',
  },
  todayText: {
    color: '#2196f3',
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButton: {
    padding: 10,
    marginHorizontal: 10,
  },
  navButtonText: {
    fontSize: 20,
    color: '#2196f3',
    fontWeight: 'bold',
  },
  weekRangeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  weekTaskItem: {
    minWidth: 100,
    maxWidth: 130,
    marginRight: 6,
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 6,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  weekTaskTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
});

export default TaskList; 