import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from './firebaseConfig';

// Create a single instance of the service
const authService = {
  // Register a new user
  async register(email, password) {
    try {
      console.log('Firebase: Attempting to register user:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Firebase: Registration successful:', userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error('Firebase: Error registering user:', error);
      throw error;
    }
  },

  // Sign in user
  async login(email, password) {
    try {
      console.log('Firebase: Attempting to login user:', email);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase: Login successful:', userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error('Firebase: Error signing in:', error);
      throw error;
    }
  },

  // Send password reset email
  async resetPassword(email) {
    try {
      console.log('Firebase: Sending password reset email to:', email);
      await sendPasswordResetEmail(auth, email);
      console.log('Firebase: Password reset email sent successfully');
    } catch (error) {
      console.error('Firebase: Error sending password reset email:', error);
      throw error;
    }
  },

  // Resend verification email
  async resendVerificationEmail() {
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        console.log('Firebase: Verification email resent successfully');
      }
    } catch (error) {
      console.error('Firebase: Error resending verification email:', error);
      throw error;
    }
  },

  // Sign out user
  async logout() {
    try {
      await signOut(auth);
      console.log('Firebase: Logout successful');
    } catch (error) {
      console.error('Firebase: Error signing out:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }
};

export default authService; 