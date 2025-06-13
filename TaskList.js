import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform
} from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import NotificationService from './NotificationService';

const TaskList = ({ filterType = 'all', user, onNavigateToDay, selectedDate }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  
  // Navigation states for different views
  const [currentDate, setCurrentDate] = useState(() => selectedDate || new Date()); // For "today" view
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    return monday;
  }); // For "week" view
  const [currentMonth, setCurrentMonth] = useState(new Date()); // For "month" view

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
    const taskDate = new Date(date);
    return taskDate.toDateString() === currentDate.toDateString();
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

  const filterTasks = (allTasks) => {
    switch (filterType) {
      case 'today':
        return allTasks.filter(task => isToday(task.dueDate));
      case 'week':
        return allTasks.filter(task => isThisWeek(task.dueDate));
      case 'month':
        return allTasks.filter(task => isThisMonth(task.dueDate));
      default:
        return allTasks;
    }
  };

  const fetchTasks = () => {
    if (!user?.uid) {
      console.log('No user UID found');
      setLoading(false);
      return;
    }

    console.log('Fetching tasks for user:', user.uid);

    // Simplified query without orderBy to avoid index issues
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(tasksQuery, 
      (snapshot) => {
        console.log('Firestore snapshot received, docs count:', snapshot.docs.length);
        
        const fetchedTasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('Fetched tasks:', fetchedTasks);
        
        // Sort by createdAt in JavaScript instead of Firestore
        const sortedTasks = fetchedTasks.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA; // Descending order
        });
        
        const filteredTasks = filterTasks(sortedTasks);
        console.log('Filtered tasks for', filterType, ':', filteredTasks);
        
        setTasks(filteredTasks);
        setLoading(false);
        setRefreshing(false);
        
        // Schedule daily summary and check for overdue tasks (only for 'all' filter to avoid duplicates)
        if (filterType === 'all') {
          NotificationService.scheduleDailySummary(sortedTasks);
          NotificationService.sendOverdueNotification(sortedTasks);
        }
      },
      (error) => {
        console.error('Firestore error:', error);
        setLoading(false);
        setRefreshing(false);
        if (Platform.OS === 'web') {
          alert(`Error loading tasks: ${error.message}`);
        }
      }
    );

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchTasks();
    return () => unsubscribe && unsubscribe();
  }, [user?.uid, filterType, currentDate, currentWeekStart, currentMonth]);

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

  const toggleTaskStatus = async (taskId, currentStatus) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await updateDoc(taskRef, { status: newStatus });
      
      // Send congratulations notification when task is completed
      if (newStatus === 'completed') {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          await NotificationService.sendTaskCompletedNotification(task.title);
        }
      }
    } catch (error) {
      console.error('Error updating task:', error);
      if (Platform.OS === 'web') {
        alert('Error updating task');
      }
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      if (Platform.OS === 'web') {
        alert('Task deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      if (Platform.OS === 'web') {
        alert('Error deleting task');
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

  const getFilterTitle = () => {
    switch (filterType) {
      case 'today': 
        console.log('Current date in getFilterTitle:', currentDate);
        return currentDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'week': {
        const weekData = groupTasksByDay([]);
        return `${weekData.year} (Week ${weekData.weekNumber}) ${weekData.dateRange}`;
      }
      case 'month': return 'Month Tasks';
      default: return 'All Tasks';
    }
  };

  // Navigation header component
  const renderNavigationHeader = () => {
    if (filterType === 'all') return null;

    const isToday = () => {
      const today = new Date();
      switch (filterType) {
        case 'today':
          return currentDate.toDateString() === today.toDateString();
        case 'week':
          const currentDay = today.getDay();
          const thisWeekStart = new Date(today);
          thisWeekStart.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
          return currentWeekStart.toDateString() === thisWeekStart.toDateString();
        case 'month':
          return currentMonth.getMonth() === today.getMonth() && 
                 currentMonth.getFullYear() === today.getFullYear();
        default:
          return true;
      }
    };

    return (
      <View style={styles.navigationHeader}>
        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => {
            if (filterType === 'today') navigateDate('prev');
            else if (filterType === 'week') navigateWeek('prev');
            else if (filterType === 'month') navigateMonth('prev');
          }}
        >
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.todayButton}
          onPress={goToToday}
          disabled={isToday()}
        >
          <Text style={[styles.todayButtonText, isToday() && styles.todayButtonDisabled]}>
            {isToday() ? 'Current' : 'Today'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navButton}
          onPress={() => {
            if (filterType === 'today') navigateDate('next');
            else if (filterType === 'week') navigateWeek('next');
            else if (filterType === 'month') navigateMonth('next');
          }}
        >
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTask = ({ item }) => (
    <View style={[styles.taskCard, item.status === 'completed' && styles.completedTask]}>
      <View style={styles.taskHeader}>
        <Text style={[styles.taskTitle, item.status === 'completed' && styles.completedText]}>
          {item.title}
        </Text>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority}</Text>
        </View>
      </View>
      
      {item.description ? (
        <Text style={[styles.taskDescription, item.status === 'completed' && styles.completedText]}>
          {item.description}
        </Text>
      ) : null}
      
      <Text style={styles.taskDate}>Due: {formatDate(item.dueDate)}</Text>
      
      <View style={styles.taskActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => toggleTaskStatus(item.id, item.status)}
        >
          <Text style={styles.actionButtonText}>
            {item.status === 'completed' ? 'Mark Pending' : 'Mark Complete'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteTask(item.id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render task for weekly view (simpler version)
  const renderWeeklyTask = (task) => (
    <View key={task.id} style={[styles.weeklyTaskItem, task.status === 'completed' && styles.completedWeeklyTask]}>
      <View style={styles.weeklyTaskContent}>
        <Text style={[styles.weeklyTaskTitle, task.status === 'completed' && styles.completedText]}>
          {task.title}
        </Text>
        <View style={[styles.weeklyPriorityBadge, { backgroundColor: getPriorityColor(task.priority) }]}>
          <Text style={styles.weeklyPriorityText}>{task.priority}</Text>
        </View>
      </View>
      <View style={styles.weeklyTaskActions}>
        <TouchableOpacity 
          style={styles.weeklyActionButton}
          onPress={() => toggleTaskStatus(task.id, task.status)}
        >
          <Text style={styles.weeklyActionText}>
            {task.status === 'completed' ? '↩️' : '✅'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.weeklyActionButton}
          onPress={() => deleteTask(task.id)}
        >
          <Text style={styles.weeklyActionText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render day section for weekly view
  const renderDaySection = (dayData) => (
    <View key={dayData.dayName} style={styles.daySection}>
      <View style={[styles.dayHeader, dayData.isToday && styles.todayHeader]}>
        <Text style={[styles.dayName, dayData.isToday && styles.todayText]}>
          {dayData.dayName}
        </Text>
        <Text style={[styles.dayDate, dayData.isToday && styles.todayText]}>
          {dayData.date}
        </Text>
      </View>
      
      {dayData.tasks.length > 0 ? (
        <View style={styles.dayTasks}>
          {dayData.tasks.map(renderWeeklyTask)}
        </View>
      ) : (
        <View style={styles.emptyDay}>
          <Text style={styles.emptyDayText}>No tasks</Text>
        </View>
      )}
    </View>
  );

  // Render calendar day for monthly view
  const renderCalendarDay = (dayData, index) => {
    const taskCount = dayData.tasks.length;
    const maxTasksToShow = 3; // Maximum number of tasks to display
    const tasksToShow = dayData.tasks.slice(0, maxTasksToShow);
    const hasMoreTasks = taskCount > maxTasksToShow;

    const handleDayPress = () => {
      if (dayData.isCurrentMonth) {
        // Navigate to Day page with selected date
        console.log('Navigating to day:', dayData.fullDate);
        if (onNavigateToDay) {
          onNavigateToDay(dayData.fullDate);
        }
      }
    };

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.calendarDayWithTasks,
          dayData.isToday && styles.todayCalendarDay,
          !dayData.isCurrentMonth && styles.otherMonthDay
        ]}
        onPress={handleDayPress}
        disabled={!dayData.isCurrentMonth}
      >
        <Text style={[
          styles.calendarDayNumber,
          dayData.isToday && styles.todayCalendarText,
          !dayData.isCurrentMonth && styles.otherMonthText
        ]}>
          {dayData.date}
        </Text>
        
        {/* Task list */}
        {dayData.isCurrentMonth && (
          <View style={styles.calendarTaskList}>
            {tasksToShow.map((task, taskIndex) => (
              <Text 
                key={task.id} 
                style={[
                  styles.calendarTaskText,
                  task.status === 'completed' && styles.calendarCompletedTask
                ]}
                numberOfLines={1}
              >
                {task.title.length > 12 ? `${task.title.substring(0, 12)}...` : task.title}
              </Text>
            ))}
            {hasMoreTasks && (
              <Text style={styles.calendarMoreTasks}>
                +{taskCount - maxTasksToShow} more
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };



  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Loading tasks...</Text>
      </View>
    );
  }

  // For monthly view, show calendar
  if (filterType === 'month') {
    const calendarData = generateCalendar(tasks);
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return (
      <View style={styles.container}>
        <Text style={styles.header}>{calendarData.monthName} {calendarData.year}</Text>
        {renderNavigationHeader()}
        <Text style={styles.taskCount}>{tasks.length} task(s) this month</Text>
        
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Calendar Legend */}
          <View style={styles.calendarLegend}>
            <Text style={styles.legendText}>Tap dates to go to Day view</Text>
          </View>
          
          {/* Week Headers */}
          <View style={styles.weekHeaders}>
            {weekDays.map((day, index) => (
              <Text key={index} style={styles.weekHeaderText}>{day}</Text>
            ))}
          </View>
          
          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarData.calendar.map((dayData, index) => renderCalendarDay(dayData, index))}
          </View>
          
          {/* Calendar Legend */}
          <View style={styles.densityLegend}>
            <Text style={styles.legendTitle}>Calendar View:</Text>
            <Text style={styles.densityText}>• Each date shows up to 3 tasks</Text>
            <Text style={styles.densityText}>• Tap any date to view all tasks for that day</Text>
            <Text style={styles.densityText}>• Completed tasks are crossed out</Text>
          </View>
        </ScrollView>
        

      </View>
    );
  }

  // For weekly view, group tasks by day
  if (filterType === 'week') {
    const weeklyData = groupTasksByDay(tasks);
    
    return (
      <View style={styles.container}>
        <Text style={styles.header}>{getFilterTitle()}</Text>
        {renderNavigationHeader()}
        <Text style={styles.taskCount}>{tasks.length} task(s) this week</Text>
        
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.weeklyContainer}>
            {weeklyData.weekDays.map(renderDaySection)}
          </View>
        </ScrollView>
      </View>
    );
  }

  // For other views (all, today), use the original list view
  return (
    <View style={styles.container}>
      <Text style={styles.header}>{getFilterTitle()}</Text>
      {renderNavigationHeader()}
      <Text style={styles.taskCount}>{tasks.length} task(s)</Text>
      
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks found</Text>
            <Text style={styles.emptySubtext}>
              {filterType === 'today' && "No tasks due on this day"}
              {filterType === 'all' && "Create your first task!"}
            </Text>
          </View>
        )}
        contentContainerStyle={tasks.length === 0 ? styles.emptyListContainer : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  taskCount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  
  // Navigation header styles
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  todayButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  todayButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  todayButtonDisabled: {
    color: '#ccc',
  },
  
  // Week information styles
  weekInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  weekYear: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
  },
  weekNumber: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  weekDateRange: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedTask: {
    opacity: 0.7,
    backgroundColor: '#f0f0f0',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  taskDate: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  toggleButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  actionButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyListContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  
  // Weekly view styles
  weeklyContainer: {
    paddingBottom: 20,
  },
  daySection: {
    marginBottom: 20,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  todayHeader: {
    backgroundColor: '#007AFF',
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayDate: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  todayText: {
    color: '#fff',
  },
  dayTasks: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyDay: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  weeklyTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  completedWeeklyTask: {
    opacity: 0.6,
    backgroundColor: '#f8f9fa',
  },
  weeklyTaskContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklyTaskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  weeklyPriorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 12,
  },
  weeklyPriorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  weeklyTaskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weeklyActionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
  weeklyActionText: {
    fontSize: 16,
  },
  
  // Monthly calendar view styles
  calendarLegend: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  legendText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  weekHeaders: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarDay: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    position: 'relative',
  },
  calendarDayWithTasks: {
    width: '14.28%', // 100% / 7 days
    minHeight: 80,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    borderWidth: 0.5,
    borderColor: '#e0e0e0',
    position: 'relative',
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 4,
    backgroundColor: '#fafafa',
  },
  todayCalendarDay: {
    backgroundColor: '#007AFF',
    borderColor: '#0056b3',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  calendarDayNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  todayCalendarText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  otherMonthText: {
    color: '#999',
  },
  taskCountBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  densityLegend: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 20,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  densityItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  densityItem: {
    alignItems: 'center',
  },
  densityColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  densityText: {
    fontSize: 12,
    color: '#666',
  },
  
  // Calendar task list styles
  calendarTaskList: {
    flex: 1,
    width: '100%',
    alignItems: 'flex-start',
  },
  calendarTaskText: {
    fontSize: 9,
    color: '#333',
    textAlign: 'left',
    marginBottom: 1,
    paddingHorizontal: 1,
    width: '100%',
  },
  calendarCompletedTask: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  calendarMoreTasks: {
    fontSize: 8,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 1,
    textAlign: 'left',
    width: '100%',
  },
  

});

export default TaskList; 