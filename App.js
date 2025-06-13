import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, View, Text, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from './AuthContext';
import AuthScreen from './AuthScreen';
import MainNavigator from './MainNavigator';
import NotificationService from './NotificationService';

const AppContent = () => {
  const { user, isLoading } = useAuth();

  // Initialize notifications when app starts
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const hasPermission = await NotificationService.requestPermissions();
        if (hasPermission) {
          console.log('✅ Notification system initialized successfully');
        } else {
          console.log('⚠️ Notification permissions denied');
        }
      } catch (error) {
        console.error('❌ Failed to initialize notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  const handleAuthSuccess = () => {
    console.log('Authentication successful');
  };

  const handleLogout = () => {
    console.log('User logged out');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {user ? (
        <MainNavigator user={user} onLogout={handleLogout} />
      ) : (
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
      )}
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});
