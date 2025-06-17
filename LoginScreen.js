import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AuthService from './AuthService';

const LoginScreen = () => {
  const navigation = useNavigation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      console.log(`Attempting ${isLogin ? 'login' : 'registration'} with:`, { email });

      if (showResetPassword) {
        await AuthService.resetPassword(resetEmail);
        Alert.alert(
          'Password Reset',
          'A password reset link has been sent to your email.',
          [{ text: 'OK', onPress: () => setShowResetPassword(false) }]
        );
        return;
      }

      if (isLogin) {
        const user = await AuthService.login(email, password);
        console.log('Login successful:', user);
      } else {
        const user = await AuthService.register(email, password);
        console.log('Registration successful:', user);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        {/* App Name Header */}
        <View style={styles.appHeader}>
          <Text style={styles.appName}>To Do Reminder</Text>
          <Text style={styles.appTagline}>Stay Organized, Stay Productive</Text>
        </View>
        
        <Text style={styles.title}>{showResetPassword ? 'Reset Password' : (isLogin ? 'Login' : 'Register')}</Text>
        
        {showResetPassword ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.button}
              onPress={handleAuth}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.switchButton}
              onPress={() => setShowResetPassword(false)}
            >
              <Text style={styles.switchButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TouchableOpacity 
              style={styles.button}
              onPress={handleAuth}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Please wait...' : (isLogin ? 'Login' : 'Register')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchButtonText}>
                {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
              </Text>
            </TouchableOpacity>
            {isLogin && (
              <TouchableOpacity 
                style={styles.switchButton}
                onPress={() => setShowResetPassword(true)}
              >
                <Text style={styles.switchButtonText}>Forgot Password?</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 15,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 15,
  },
  appHeader: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default LoginScreen; 