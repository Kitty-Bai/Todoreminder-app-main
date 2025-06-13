import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import MockAuthService from './MockAuthService';
import NotificationService from './NotificationService';
import CalendarService from './CalendarService';

const APIStatus = () => {
  const [authStatus, setAuthStatus] = useState({
    connected: false,
    user: null,
    provider: 'Firebase Auth'
  });
  
  const [notificationStatus, setNotificationStatus] = useState({
    connected: false,
    permission: 'unknown',
    platform: Platform.OS
  });

  const [calendarStatus, setCalendarStatus] = useState({
    connected: false,
    hasPermissions: false,
    calendarCount: 0,
    provider: 'Expo Calendar'
  });

  useEffect(() => {
    checkAllAPIs();
  }, []);

  const checkAllAPIs = async () => {
    // Check Authentication API
    const user = MockAuthService.getCurrentUser();
    setAuthStatus({
      connected: !!user,
      user: user,
      provider: 'Mock Auth (Demo)'
    });

    // Check Notification API
    const hasNotificationPermission = await NotificationService.requestPermissions();
    setNotificationStatus({
      connected: hasNotificationPermission,
      permission: hasNotificationPermission ? 'granted' : 'denied',
      platform: Platform.OS
    });

    // Check Calendar API
    const calendarStatusInfo = await CalendarService.getStatus();
    setCalendarStatus({
      connected: calendarStatusInfo.hasPermissions,
      hasPermissions: calendarStatusInfo.hasPermissions,
      calendarCount: calendarStatusInfo.calendarCount,
      provider: 'Expo Calendar'
    });
  };

  const testNotificationAPI = async () => {
    try {
      const hasPermission = await NotificationService.requestPermissions();
      if (hasPermission) {
        await NotificationService.sendTaskCompletedNotification('API Test Task');
        Alert.alert('Success', '✅ Notification API test successful!');
      } else {
        Alert.alert('Error', '❌ Notification permission required');
      }
    } catch (error) {
      Alert.alert('Error', `❌ Notification API test failed: ${error.message}`);
    }
  };

  const testCalendarAPI = async () => {
    try {
      // First, ensure we have permissions
      const hasPermission = await CalendarService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Error', '❌ Calendar permission required');
        return;
      }

      // Initialize calendar service
      const initialized = await CalendarService.initialize();
      if (initialized) {
        setCalendarStatus(prev => ({ ...prev, connected: true, hasPermissions: true }));
      }

      // Get calendars and test functionality
      const calendars = await CalendarService.getCalendars();
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      const events = await CalendarService.getEvents(today, tomorrow);
      
      Alert.alert(
        'Calendar API Test',
        `✅ Calendar API working!\n\n📅 Found ${calendars.length} calendars on device\n📋 Found ${events.length} events for today/tomorrow`
      );
    } catch (error) {
      Alert.alert('Error', `❌ Calendar API test failed: ${error.message}`);
    }
  };

  const connectCalendar = async () => {
    try {
      const initialized = await CalendarService.initialize();
      if (initialized) {
        setCalendarStatus(prev => ({ ...prev, connected: true, hasPermissions: true }));
        Alert.alert('Success', '✅ Calendar access granted successfully!');
        
        // Refresh status
        await checkAllAPIs();
      } else {
        Alert.alert('Error', '❌ Failed to get calendar access');
      }
    } catch (error) {
      Alert.alert('Error', `❌ Calendar connection failed: ${error.message}`);
    }
  };



  const getStatusIcon = (connected) => connected ? '✅' : '❌';
  const getStatusText = (connected) => connected ? 'Connected' : 'Disconnected';
  const getStatusColor = (connected) => connected ? '#4CAF50' : '#F44336';

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>🔧 API Integration Status</Text>
      <Text style={styles.subtitle}>University Project - 3 Required APIs</Text>

      {/* Authentication API Status */}
      <View style={styles.apiCard}>
        <View style={styles.apiHeader}>
          <Text style={styles.apiTitle}>🔐 Authentication API</Text>
          <Text style={[styles.status, { color: getStatusColor(authStatus.connected) }]}>
            {getStatusIcon(authStatus.connected)} {getStatusText(authStatus.connected)}
          </Text>
        </View>
        
        <View style={styles.apiDetails}>
          <Text style={styles.detailText}>Provider: {authStatus.provider}</Text>
          {authStatus.user && (
            <>
              <Text style={styles.detailText}>User: {authStatus.user.email}</Text>
              <Text style={styles.detailText}>UID: {authStatus.user.uid}</Text>
            </>
          )}
          <Text style={styles.featureText}>
            ✓ Email/Password Authentication{'\n'}
            ✓ User Registration & Login{'\n'}
            ✓ Session Management{'\n'}
            ✓ Secure User Data Storage
          </Text>
        </View>
      </View>

      {/* Notification API Status */}
      <View style={styles.apiCard}>
        <View style={styles.apiHeader}>
          <Text style={styles.apiTitle}>🔔 Notification API</Text>
          <Text style={[styles.status, { color: getStatusColor(notificationStatus.connected) }]}>
            {getStatusIcon(notificationStatus.connected)} {getStatusText(notificationStatus.connected)}
          </Text>
        </View>
        
        <View style={styles.apiDetails}>
          <Text style={styles.detailText}>Platform: {notificationStatus.platform}</Text>
          <Text style={styles.detailText}>Permission: {notificationStatus.permission}</Text>
          <Text style={styles.detailText}>
            Provider: {Platform.OS === 'web' ? 'Browser Notification API' : 'Expo Notifications'}
          </Text>
          <Text style={styles.featureText}>
            ✓ Task Reminder Notifications{'\n'}
            ✓ Task Completion Celebrations{'\n'}
            ✓ Daily Summary Notifications{'\n'}
            ✓ Overdue Task Alerts{'\n'}
            ✓ Cross-Platform Support
          </Text>
        </View>
        
        <TouchableOpacity style={styles.testButton} onPress={testNotificationAPI}>
          <Text style={styles.testButtonText}>🧪 Test Notification API</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar API Status */}
      <View style={styles.apiCard}>
        <View style={styles.apiHeader}>
          <Text style={styles.apiTitle}>📅 Calendar API</Text>
          <Text style={[styles.status, { color: getStatusColor(calendarStatus.connected) }]}>
            {getStatusIcon(calendarStatus.connected)} {getStatusText(calendarStatus.connected)}
          </Text>
        </View>
        
        <View style={styles.apiDetails}>
          <Text style={styles.detailText}>Provider: {calendarStatus.provider}</Text>
          <Text style={styles.detailText}>Platform: {Platform.OS}</Text>
          <Text style={styles.detailText}>Permissions: {calendarStatus.hasPermissions ? 'Granted' : 'Not granted'}</Text>
          <Text style={styles.detailText}>Device Calendars: {calendarStatus.calendarCount}</Text>
          <Text style={styles.featureText}>
            ✓ Device Calendar Access{'\n'}
            ✓ Event Creation & Management{'\n'}
            ✓ Time Conflict Detection{'\n'}
            ✓ Calendar Permissions{'\n'}
            ✓ Native Mobile Integration
          </Text>
        </View>
        
        <View style={styles.buttonContainer}>
          {!calendarStatus.connected && (
            <TouchableOpacity style={styles.connectButton} onPress={connectCalendar}>
              <Text style={styles.connectButtonText}>📱 Enable Calendar</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.testButton} onPress={testCalendarAPI}>
            <Text style={styles.testButtonText}>🧪 Test Calendar API</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Overall Status Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📊 Project API Requirements</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Authentication API:</Text>
          <Text style={[styles.summaryStatus, { color: getStatusColor(authStatus.connected) }]}>
            {authStatus.connected ? 'COMPLETE' : 'INCOMPLETE'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Notification API:</Text>
          <Text style={[styles.summaryStatus, { color: getStatusColor(notificationStatus.connected) }]}>
            {notificationStatus.connected ? 'COMPLETE' : 'INCOMPLETE'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Calendar API:</Text>
          <Text style={[styles.summaryStatus, { color: getStatusColor(calendarStatus.connected) }]}>
            {calendarStatus.connected ? 'COMPLETE' : 'INCOMPLETE'}
          </Text>
        </View>
        
        <View style={styles.projectStatus}>
          <Text style={styles.projectStatusText}>
            {authStatus.connected && notificationStatus.connected && calendarStatus.connected ? 
              '🎉 All APIs: 3/3 Successfully Implemented!\n✅ University Project Requirements Complete!' : 
              `⚠️ API Progress: ${[authStatus.connected, notificationStatus.connected, calendarStatus.connected].filter(Boolean).length}/3 APIs Complete`
            }
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={checkAllAPIs}>
        <Text style={styles.refreshButtonText}>🔄 Refresh API Status</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  apiCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  apiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  apiTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  apiDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  testButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  connectButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  summaryStatus: {
    fontSize: 16,
    fontWeight: '600',
  },
  projectStatus: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  projectStatusText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default APIStatus; 