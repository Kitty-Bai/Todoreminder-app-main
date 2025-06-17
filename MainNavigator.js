import React, { useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TaskList from './TaskList';
import TaskCreation from './TaskCreation';
import Statistics from './Statistics';
import APIStatus from './APIStatus';
import AuthService from './AuthService';

const Tab = createBottomTabNavigator();

const MainTabs = ({ user, onLogout }) => {
  const navigationRef = useRef();

  const handleLogout = async () => {
    try {
      await AuthService.logout();
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Function to navigate to Day view with specific date
  const navigateToDay = (date) => {
    if (navigationRef.current) {
      navigationRef.current.navigate('Today', { selectedDate: date });
    }
  };

  // Header component with user info and logout
  const Header = ({ title }) => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.userInfo}>Welcome, {user.email}</Text>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  // Screen components with headers
  const AllTasksScreen = () => (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <Header title="All Tasks" />
        <View style={styles.contentContainer}>
          <TaskList filterType="all" user={user} />
        </View>
      </View>
    </SafeAreaView>
  );

  const TodayTasksScreen = ({ route }) => {
    const selectedDate = route?.params?.selectedDate;
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <Header title="Day" />
          <View style={styles.contentContainer}>
            <TaskList 
              filterType="today" 
              user={user} 
              selectedDate={selectedDate}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  };

  const WeekTasksScreen = () => (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <Header title="Week" />
        <View style={styles.contentContainer}>
          <TaskList filterType="week" user={user} />
        </View>
      </View>
    </SafeAreaView>
  );

  const MonthTasksScreen = () => (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <Header title="Month" />
        <View style={styles.contentContainer}>
          <TaskList filterType="month" user={user} onNavigateToDay={navigateToDay} />
        </View>
      </View>
    </SafeAreaView>
  );

  const CreateTaskScreen = () => (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <TaskCreation user={user} onLogout={onLogout} />
      </View>
    </SafeAreaView>
  );

  const StatisticsScreen = () => (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <Header title="Statistics" />
        <View style={styles.contentContainer}>
          <Statistics user={user} />
        </View>
      </View>
    </SafeAreaView>
  );

  const APIStatusScreen = () => (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.container}>
        <Header title="API Status" />
        <View style={styles.contentContainer}>
          <APIStatus />
        </View>
      </View>
    </SafeAreaView>
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="AllTasks" 
        component={AllTasksScreen}
        options={{
          tabBarLabel: 'All Tasks',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>📋</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Today" 
        component={TodayTasksScreen}
        options={{
          tabBarLabel: 'Day',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>📅</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Week" 
        component={WeekTasksScreen}
        options={{
          tabBarLabel: 'Week',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>🗓️</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Month" 
        component={MonthTasksScreen}
        options={{
          tabBarLabel: 'Month',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>📆</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Statistics" 
        component={StatisticsScreen}
        options={{
          tabBarLabel: 'Statistics',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>📊</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateTaskScreen}
        options={{
          tabBarLabel: 'Create',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>➕</Text>
          ),
        }}
      />
      <Tab.Screen 
        name="APIStatus" 
        component={APIStatusScreen}
        options={{
          tabBarLabel: 'APIs',
          tabBarIcon: ({ color }) => (
            <Text style={[styles.tabIcon, { color }]}>🔧</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  userInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  logoutText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 24,
  },
});

export default MainTabs; 