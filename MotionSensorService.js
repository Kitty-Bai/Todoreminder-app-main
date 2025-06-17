import { Accelerometer } from 'expo-sensors';
import { Platform } from 'react-native';

class MotionSensorService {
  static isListening = false;
  static shakeCallback = null;
  static subscription = null;
  static shakeThreshold = 2.5; // Adjust sensitivity
  static lastShakeTime = 0;
  static shakeDelay = 1000; // Minimum time between shakes (ms)

  /**
   * Initialize motion sensor service
   */
  static async initialize() {
    try {
      console.log('🏃‍♂️ Initializing Motion Sensor Service...');
      
      // Check if accelerometer is available
      const isAvailable = await Accelerometer.isAvailableAsync();
      
      if (isAvailable) {
        console.log('✅ Accelerometer is available');
        return true;
      } else {
        console.log('❌ Accelerometer not available on this device');
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing motion sensor:', error);
      return false;
    }
  }

  /**
   * Start listening for shake gestures
   */
  static startShakeDetection(callback) {
    try {
      if (this.isListening) {
        this.stopShakeDetection();
      }

      this.shakeCallback = callback;
      
      // Set update interval (100ms = 10 updates per second)
      Accelerometer.setUpdateInterval(100);
      
      // Start listening to accelerometer
      this.subscription = Accelerometer.addListener(this.handleAccelerometerData);
      this.isListening = true;
      
      console.log('👂 Started listening for shake gestures');
    } catch (error) {
      console.error('❌ Error starting shake detection:', error);
    }
  }

  /**
   * Stop listening for shake gestures
   */
  static stopShakeDetection() {
    try {
      if (this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }
      
      this.isListening = false;
      this.shakeCallback = null;
      
      console.log('🛑 Stopped listening for shake gestures');
    } catch (error) {
      console.error('❌ Error stopping shake detection:', error);
    }
  }

  /**
   * Handle accelerometer data and detect shake
   */
  static handleAccelerometerData = (data) => {
    try {
      const { x, y, z } = data;
      
      // Calculate acceleration magnitude
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      
      // Check if acceleration exceeds threshold
      if (acceleration > this.shakeThreshold) {
        const currentTime = Date.now();
        
        // Prevent multiple triggers in short time
        if (currentTime - this.lastShakeTime > this.shakeDelay) {
          this.lastShakeTime = currentTime;
          this.onShakeDetected();
        }
      }
    } catch (error) {
      console.error('❌ Error processing accelerometer data:', error);
    }
  };

  /**
   * Handle shake detection
   */
  static onShakeDetected() {
    try {
      console.log('📳 Shake detected!');
      
      if (this.shakeCallback && typeof this.shakeCallback === 'function') {
        this.shakeCallback();
      }
    } catch (error) {
      console.error('❌ Error handling shake detection:', error);
    }
  }

  /**
   * Check if motion sensors are available
   */
  static async isAvailable() {
    try {
      return await Accelerometer.isAvailableAsync();
    } catch (error) {
      console.error('❌ Error checking sensor availability:', error);
      return false;
    }
  }

  /**
   * Get motion sensor status
   */
  static getStatus() {
    return {
      isListening: this.isListening,
      hasCallback: !!this.shakeCallback,
      threshold: this.shakeThreshold,
      platform: Platform.OS
    };
  }

  /**
   * Adjust shake sensitivity
   */
  static setShakeSensitivity(threshold) {
    this.shakeThreshold = Math.max(1.0, Math.min(5.0, threshold));
    console.log(`📱 Shake sensitivity set to: ${this.shakeThreshold}`);
  }

  /**
   * Test shake functionality
   */
  static testShake() {
    console.log('🧪 Testing shake functionality...');
    this.onShakeDetected();
  }

  /**
   * Get current accelerometer reading (for debugging)
   */
  static async getCurrentReading() {
    try {
      return new Promise((resolve) => {
        const subscription = Accelerometer.addListener((data) => {
          subscription.remove();
          resolve(data);
        });
        
        // Timeout after 2 seconds
        setTimeout(() => {
          subscription.remove();
          resolve(null);
        }, 2000);
      });
    } catch (error) {
      console.error('❌ Error getting accelerometer reading:', error);
      return null;
    }
  }

  /**
   * Simple activity detection (experimental)
   */
  static detectActivity(data) {
    const { x, y, z } = data;
    const totalAcceleration = Math.sqrt(x * x + y * y + z * z);
    
    // Simple activity classification
    if (totalAcceleration < 0.5) {
      return 'stationary';
    } else if (totalAcceleration < 1.5) {
      return 'walking';
    } else if (totalAcceleration < 3.0) {
      return 'running';
    } else {
      return 'vigorous';
    }
  }
}

export default MotionSensorService; 