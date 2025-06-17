import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Platform
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebaseConfig';

const Statistics = ({ user }) => {
  const [stats, setStats] = useState({
    todayPending: 0,
    upcomingPending: 0,
    completed: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Helper functions for date filtering
  const isToday = (date) => {
    const today = new Date();
    const taskDate = new Date(date);
    return taskDate.toDateString() === today.toDateString();
  };

  const isUpcoming = (date) => {
    const today = new Date();
    const taskDate = new Date(date);
    return taskDate > today;
  };

  const calculateStats = (tasks) => {
    const todayPending = tasks.filter(task => 
      !task.completed && task.status !== 'completed' && isToday(task.dueDate)
    ).length;

    const upcomingPending = tasks.filter(task => 
      !task.completed && task.status !== 'completed' && isUpcoming(task.dueDate)
    ).length;

    const completed = tasks.filter(task => 
      task.completed || task.status === 'completed'
    ).length;

    const total = tasks.length;

    return {
      todayPending,
      upcomingPending,
      completed,
      total
    };
  };

  const fetchStats = () => {
    if (!user?.uid) {
      console.log('No user UID found for statistics');
      setLoading(false);
      return;
    }

    console.log('Fetching statistics for user:', user.uid);

    const tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(tasksQuery, 
      (snapshot) => {
        console.log('Statistics snapshot received, docs count:', snapshot.docs.length);
        
        const fetchedTasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const calculatedStats = calculateStats(fetchedTasks);
        console.log('Calculated stats:', calculatedStats);
        
        setStats(calculatedStats);
        setLoading(false);
        setRefreshing(false);
      },
      (error) => {
        console.error('Statistics Firestore error:', error);
        setLoading(false);
        setRefreshing(false);
        if (Platform.OS === 'web') {
          alert(`Error loading statistics: ${error.message}`);
        }
      }
    );

    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchStats();
    return () => unsubscribe && unsubscribe();
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const StatCard = ({ title, count, color, icon, description }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Text style={styles.statIcon}>{icon}</Text>
        <View style={styles.statInfo}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={styles.statDescription}>{description}</Text>
        </View>
      </View>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
    </View>
  );

  const ProgressBar = ({ label, current, total, color }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressText}>
            {current} / {total} ({percentage.toFixed(0)}%)
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${percentage}%`, backgroundColor: color }
            ]} 
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.header}>Task Statistics</Text>
      <Text style={styles.subHeader}>Overview of your task progress</Text>

      {/* Main Statistics Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Today"
          count={stats.todayPending}
          color="#ff9800"
          icon="📅"
          description="Pending tasks due today"
        />
        
        <StatCard
          title="Upcoming"
          count={stats.upcomingPending}
          color="#2196f3"
          icon="🔜"
          description="Pending future tasks"
        />
        
        <StatCard
          title="Completed"
          count={stats.completed}
          color="#4caf50"
          icon="✅"
          description="Finished tasks"
        />
        
        <StatCard
          title="Total"
          count={stats.total}
          color="#9c27b0"
          icon="📋"
          description="All tasks created"
        />
      </View>

      {/* Progress Sections */}
      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>Progress Overview</Text>
        
        <ProgressBar
          label="Tasks Completed"
          current={stats.completed}
          total={stats.total}
          color="#4caf50"
        />
        
        <ProgressBar
          label="Today's Tasks"
          current={stats.todayPending}
          total={stats.total}
          color="#ff9800"
        />
        
        <ProgressBar
          label="Upcoming Tasks"
          current={stats.upcomingPending}
          total={stats.total}
          color="#2196f3"
        />
      </View>

      {/* Summary */}
      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            You have {stats.todayPending > 0 ? `${stats.todayPending} task${stats.todayPending > 1 ? 's' : ''} due today` : 'no tasks due today'}.
          </Text>
          <Text style={styles.summaryText}>
            {stats.upcomingPending > 0 ? `${stats.upcomingPending} upcoming task${stats.upcomingPending > 1 ? 's' : ''} to complete.` : 'No upcoming tasks scheduled.'}
          </Text>
          <Text style={styles.summaryText}>
            Great job! You've completed {stats.completed} task{stats.completed !== 1 ? 's' : ''} so far.
          </Text>
        </View>
      </View>
    </ScrollView>
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
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: '48%',
    minWidth: 150,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  statCount: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  progressSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCard: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
});

export default Statistics; 