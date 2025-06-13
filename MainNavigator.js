import React, { useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MockAuthService from './MockAuthService';

import TaskList from './TaskList';
import TaskCreation from './TaskCreation';
import Statistics from './Statistics';
import APIStatus from './APIStatus';

const Tab = createBottomTabNavigator();

const MainNavigator = ({ user, onLogout }) => {
  const navigationRef = useRef();

  const handleLogout = async () => {
    try {
      await MockAuthService.signOut();
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Function to navigate to Day view with specific date
  const navigateToDay = (date) => {
    if (navigationRef.current) {
      // Navigate to the Today (Day) tab with params
      navigationRef.current.navigate('Today', { selectedDate: date });
    }
  };

  // Header component with user info and logout
  const Header = ({ title }) => (
    <View style={styles.header}>
      <View>
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
    <View style={styles.container}>
      <Header title="All Tasks" />
      <TaskList filterType="all" user={user} />
    </View>
  );

  const TodayTasksScreen = ({ route }) => {
    const selectedDate = route?.params?.selectedDate;
    
    return (
      <View style={styles.container}>
        <Header title="Day" />
        <TaskList 
          filterType="today" 
          user={user} 
          selectedDate={selectedDate}
        />
      </View>
    );
  };

  const WeekTasksScreen = () => (
    <View style={styles.container}>
      <Header title="Week" />
      <TaskList filterType="week" user={user} />
    </View>
  );

  const MonthTasksScreen = () => (
    <View style={styles.container}>
      <Header title="Month" />
      <TaskList filterType="month" user={user} onNavigateToDay={navigateToDay} />
    </View>
  );

  const CreateTaskScreen = () => (
    <View style={styles.container}>
      <TaskCreation user={user} onLogout={onLogout} />
    </View>
  );

  const StatisticsScreen = () => (
    <View style={styles.container}>
      <Header title="Statistics" />
      <Statistics user={user} />
    </View>
  );

  const APIStatusScreen = () => (
    <View style={styles.container}>
      <Header title="API Status" />
      <APIStatus />
    </View>
  );

  return (
    <NavigationContainer ref={navigationRef}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#666',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
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
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 50, // Account for status bar
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
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
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
});

export default MainNavigator; 