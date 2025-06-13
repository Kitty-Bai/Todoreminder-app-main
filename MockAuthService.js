// Mock Authentication Service for Expo Go testing
// This bypasses Firebase Auth compatibility issues

class MockAuthService {
  static currentUser = null;
  static listeners = [];

  // Mock user object
  static createMockUser(email) {
    return {
      uid: 'mock_user_' + Date.now(),
      email: email,
      displayName: email.split('@')[0],
      emailVerified: true,
      isAnonymous: false,
      providerId: 'mock',
      providerData: [],
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString()
      }
    };
  }

  // Mock login
  static async signInWithEmailAndPassword(email, password) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('🔐 Mock Auth: Signing in user:', email);
        this.currentUser = this.createMockUser(email);
        this.notifyListeners();
        resolve({
          user: this.currentUser
        });
      }, 1000); // Simulate network delay
    });
  }

  // Mock registration
  static async createUserWithEmailAndPassword(email, password) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('🔐 Mock Auth: Creating user:', email);
        this.currentUser = this.createMockUser(email);
        this.notifyListeners();
        resolve({
          user: this.currentUser
        });
      }, 1000); // Simulate network delay
    });
  }

  // Mock logout
  static async signOut() {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('🔐 Mock Auth: Signing out user');
        this.currentUser = null;
        this.notifyListeners();
        resolve();
      }, 500);
    });
  }

  // Mock auth state listener
  static onAuthStateChanged(callback) {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners of auth state changes
  static notifyListeners() {
    this.listeners.forEach(callback => {
      callback(this.currentUser);
    });
  }

  // Get current user
  static getCurrentUser() {
    return this.currentUser;
  }
}

export default MockAuthService; 