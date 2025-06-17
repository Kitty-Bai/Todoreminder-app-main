import AuthService from '../AuthService';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

// Mock Firebase auth functions
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendEmailVerification: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

// Mock firebase config
jest.mock('../firebaseConfig', () => ({
  auth: {
    currentUser: null
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Mock console.log
    console.error = jest.fn(); // Mock console.error
  });

  describe('register', () => {
    test('should register user successfully', async () => {
      const mockUser = { uid: '123', email: 'test@test.com' };
      const mockUserCredential = { user: mockUser };
      
      createUserWithEmailAndPassword.mockResolvedValueOnce(mockUserCredential);

      const result = await AuthService.register('test@test.com', 'password123');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        auth, 
        'test@test.com', 
        'password123'
      );
      expect(result).toEqual(mockUser);
      expect(console.log).toHaveBeenCalledWith('Firebase: Attempting to register user:', 'test@test.com');
      expect(console.log).toHaveBeenCalledWith('Firebase: Registration successful:', '123');
    });

    test('should handle registration errors', async () => {
      const mockError = new Error('Registration failed');
      createUserWithEmailAndPassword.mockRejectedValueOnce(mockError);

      await expect(AuthService.register('test@test.com', 'password123'))
        .rejects.toThrow('Registration failed');
      
      expect(console.error).toHaveBeenCalledWith('Firebase: Error registering user:', mockError);
    });
  });

  describe('login', () => {
    test('should login user successfully', async () => {
      const mockUser = { uid: '456', email: 'test@test.com' };
      const mockUserCredential = { user: mockUser };
      
      signInWithEmailAndPassword.mockResolvedValueOnce(mockUserCredential);

      const result = await AuthService.login('test@test.com', 'password123');

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        auth, 
        'test@test.com', 
        'password123'
      );
      expect(result).toEqual(mockUser);
      expect(console.log).toHaveBeenCalledWith('Firebase: Attempting to login user:', 'test@test.com');
      expect(console.log).toHaveBeenCalledWith('Firebase: Login successful:', '456');
    });

    test('should handle login errors', async () => {
      const mockError = new Error('Invalid credentials');
      signInWithEmailAndPassword.mockRejectedValueOnce(mockError);

      await expect(AuthService.login('test@test.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
      
      expect(console.error).toHaveBeenCalledWith('Firebase: Error signing in:', mockError);
    });
  });

  describe('resetPassword', () => {
    test('should send password reset email successfully', async () => {
      sendPasswordResetEmail.mockResolvedValueOnce();

      await AuthService.resetPassword('test@test.com');

      expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, 'test@test.com');
      expect(console.log).toHaveBeenCalledWith('Firebase: Password reset email sent successfully');
    });

    test('should handle password reset errors', async () => {
      const mockError = new Error('Email not found');
      sendPasswordResetEmail.mockRejectedValueOnce(mockError);

      await expect(AuthService.resetPassword('nonexistent@test.com'))
        .rejects.toThrow('Email not found');
      
      expect(console.error).toHaveBeenCalledWith('Firebase: Error sending password reset email:', mockError);
    });
  });

  describe('logout', () => {
    test('should logout user successfully', async () => {
      signOut.mockResolvedValueOnce();

      await AuthService.logout();

      expect(signOut).toHaveBeenCalledWith(auth);
      expect(console.log).toHaveBeenCalledWith('Firebase: Logout successful');
    });

    test('should handle logout errors', async () => {
      const mockError = new Error('Logout failed');
      signOut.mockRejectedValueOnce(mockError);

      await expect(AuthService.logout()).rejects.toThrow('Logout failed');
      expect(console.error).toHaveBeenCalledWith('Firebase: Error signing out:', mockError);
    });
  });

  describe('resendVerificationEmail', () => {
    test('should resend verification email when user exists', async () => {
      const mockUser = { uid: '123', email: 'test@test.com' };
      auth.currentUser = mockUser;
      sendEmailVerification.mockResolvedValueOnce();

      await AuthService.resendVerificationEmail();

      expect(sendEmailVerification).toHaveBeenCalledWith(mockUser);
      expect(console.log).toHaveBeenCalledWith('Firebase: Verification email resent successfully');
    });

    test('should not send email when no user is logged in', async () => {
      auth.currentUser = null;

      await AuthService.resendVerificationEmail();

      expect(sendEmailVerification).not.toHaveBeenCalled();
    });

    test('should handle verification email errors', async () => {
      const mockUser = { uid: '123', email: 'test@test.com' };
      auth.currentUser = mockUser;
      const mockError = new Error('Verification failed');
      sendEmailVerification.mockRejectedValueOnce(mockError);

      await expect(AuthService.resendVerificationEmail()).rejects.toThrow('Verification failed');
      expect(console.error).toHaveBeenCalledWith('Firebase: Error resending verification email:', mockError);
    });
  });

  describe('getCurrentUser', () => {
    test('should return current user', () => {
      const mockUser = { uid: '123', email: 'test@test.com' };
      auth.currentUser = mockUser;

      const result = AuthService.getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    test('should return null when no user is logged in', () => {
      auth.currentUser = null;

      const result = AuthService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('onAuthStateChanged', () => {
    test('should setup auth state listener', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      onAuthStateChanged.mockReturnValueOnce(mockUnsubscribe);

      const unsubscribe = AuthService.onAuthStateChanged(mockCallback);

      expect(onAuthStateChanged).toHaveBeenCalledWith(auth, mockCallback);
      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });
}); 