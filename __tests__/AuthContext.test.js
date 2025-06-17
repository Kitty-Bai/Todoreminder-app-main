import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import AuthService from '../AuthService';

// Mock AuthService
jest.mock('../AuthService', () => ({
  onAuthStateChanged: jest.fn(),
}));

// Test component that uses the auth context
const TestComponent = () => {
  const { user, isLoading } = useAuth();
  return (
    <>
      <Text testID="user-status">
        {isLoading ? 'loading' : user ? 'authenticated' : 'not-authenticated'}
      </Text>
      <Text testID="user-uid">{user?.uid || 'no-user'}</Text>
    </>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  describe('AuthProvider', () => {
    test('should provide initial loading state', () => {
      const mockUnsubscribe = jest.fn();
      AuthService.onAuthStateChanged.mockReturnValueOnce(mockUnsubscribe);

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(getByTestId('user-status')).toHaveTextContent('loading');
      expect(AuthService.onAuthStateChanged).toHaveBeenCalled();
    });

    test('should update user state when auth state changes', async () => {
      const mockUser = { uid: 'user-123', email: 'test@test.com' };
      const mockUnsubscribe = jest.fn();
      
      // Mock the callback function passed to onAuthStateChanged
      let authStateCallback;
      AuthService.onAuthStateChanged.mockImplementation((callback) => {
        authStateCallback = callback;
        return mockUnsubscribe;
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Initially loading
      expect(getByTestId('user-status')).toHaveTextContent('loading');

      // Simulate auth state change to authenticated user
      authStateCallback(mockUser);

      await waitFor(() => {
        expect(getByTestId('user-status')).toHaveTextContent('authenticated');
        expect(getByTestId('user-uid')).toHaveTextContent('user-123');
      });
    });

    test('should handle user logout', async () => {
      const mockUnsubscribe = jest.fn();
      
      let authStateCallback;
      AuthService.onAuthStateChanged.mockImplementation((callback) => {
        authStateCallback = callback;
        return mockUnsubscribe;
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Simulate auth state change to no user (logout)
      authStateCallback(null);

      await waitFor(() => {
        expect(getByTestId('user-status')).toHaveTextContent('not-authenticated');
        expect(getByTestId('user-uid')).toHaveTextContent('no-user');
      });
    });

    test('should cleanup auth listener on unmount', () => {
      const mockUnsubscribe = jest.fn();
      AuthService.onAuthStateChanged.mockReturnValueOnce(mockUnsubscribe);

      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    test('should log auth state changes', async () => {
      const mockUser = { uid: 'user-456', email: 'another@test.com' };
      const mockUnsubscribe = jest.fn();
      
      let authStateCallback;
      AuthService.onAuthStateChanged.mockImplementation((callback) => {
        authStateCallback = callback;
        return mockUnsubscribe;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Simulate auth state changes
      authStateCallback(mockUser);
      authStateCallback(null);

      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith('Auth state changed in AuthContext:', 'user-456');
        expect(console.log).toHaveBeenCalledWith('Auth state changed in AuthContext:', 'none');
      });
    });
  });

  describe('useAuth hook', () => {
    test('should throw error when used outside AuthProvider', () => {
      // Mock console.error to prevent test output noise
      const originalError = console.error;
      console.error = jest.fn();

      const TestComponentOutsideProvider = () => {
        try {
          useAuth();
          return <Text>Should not reach here</Text>;
        } catch (error) {
          return <Text testID="error">{error.message}</Text>;
        }
      };

      const { getByTestId } = render(<TestComponentOutsideProvider />);

      expect(getByTestId('error')).toHaveTextContent('useAuth must be used within an AuthProvider');

      // Restore console.error
      console.error = originalError;
    });

    test('should provide auth context values', () => {
      const mockUnsubscribe = jest.fn();
      AuthService.onAuthStateChanged.mockReturnValueOnce(mockUnsubscribe);

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Should have access to context values
      expect(getByTestId('user-status')).toBeDefined();
      expect(getByTestId('user-uid')).toBeDefined();
    });
  });
}); 