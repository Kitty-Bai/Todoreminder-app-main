import React, { useEffect } from 'react';
import { SafeAreaView, StatusBar, View, Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './AuthContext';
import LoginScreen from './LoginScreen';
import MainTabs from './MainNavigator';
import NotificationService from './NotificationService';
import { testFirebaseConnection } from './testFirebaseConnection';

const Stack = createStackNavigator();

const AppContent = () => {
  const { user, isLoading } = useAuth();

  // Initialize notifications and test Firebase connection when app starts
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Test Firebase connection
        console.log('Testing Firebase connection...');
        const isConnected = await testFirebaseConnection();
        console.log('Firebase connection test result:', isConnected);

        // Initialize notifications
        const hasPermission = await NotificationService.requestPermissions();
        if (hasPermission) {
          console.log('✅ Notification system initialized successfully');
        } else {
          console.log('⚠️ Notification permissions denied');
        }
      } catch (error) {
        console.error('❌ Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

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
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main">
            {(props) => <MainTabs {...props} user={user} onLogout={() => {}} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});

export default App;
