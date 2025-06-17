import * as Location from 'expo-location';
import { Platform } from 'react-native';

class LocationService {
  static currentLocation = null;
  static hasPermissions = false;

  /**
   * Initialize location service and request permissions
   */
  static async initialize() {
    try {
      console.log('📍 Initializing Location Service...');
      
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        this.hasPermissions = true;
        console.log('✅ Location permissions granted');
        
        // Get current location
        await this.getCurrentLocation();
        return true;
      } else {
        console.log('❌ Location permissions denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error initializing location service:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  static async getCurrentLocation() {
    try {
      if (!this.hasPermissions) {
        console.log('⚠️ Location permissions not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: await this.getAddressFromCoords(location.coords)
      };

      console.log('📍 Current location obtained:', this.currentLocation.address);
      return this.currentLocation;
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      return null;
    }
  }

  /**
   * Get address from coordinates
   */
  static async getAddressFromCoords(coords) {
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (address && address.length > 0) {
        const addr = address[0];
        return `${addr.street || ''} ${addr.city || ''} ${addr.region || ''}`.trim();
      }
      return 'Unknown location';
    } catch (error) {
      console.error('❌ Error getting address:', error);
      return 'Location unavailable';
    }
  }

  /**
   * Check if location services are available
   */
  static async isLocationEnabled() {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('❌ Error checking location services:', error);
      return false;
    }
  }

  /**
   * Get location status for display
   */
  static async getStatus() {
    try {
      const hasServices = await this.isLocationEnabled();
      const hasPermissions = await this.hasPermissions;
      
      let status = 'disabled';
      if (hasServices && hasPermissions) {
        status = 'enabled';
      } else if (hasServices) {
        status = 'permission_needed';
      }

      return {
        hasServices,
        hasPermissions,
        status,
        currentLocation: this.currentLocation
      };
    } catch (error) {
      console.error('❌ Error getting location status:', error);
      return {
        hasServices: false,
        hasPermissions: false,
        status: 'error',
        currentLocation: null
      };
    }
  }

  /**
   * Add location context to task
   */
  static addLocationToTask(task) {
    if (this.currentLocation) {
      return {
        ...task,
        location: {
          ...this.currentLocation,
          createdAt: new Date().toISOString()
        }
      };
    }
    return task;
  }

  /**
   * Simple location-based reminder logic
   */
  static createLocationReminder(task, reminderLocation) {
    // This is a simplified version - in a full implementation,
    // you would use geofencing APIs
    console.log(`📍 Location reminder created for task: ${task.title}`);
    console.log(`📍 Reminder location: ${reminderLocation}`);
    
    return {
      taskId: task.id,
      reminderLocation,
      createdAt: new Date().toISOString(),
      active: true
    };
  }

  /**
   * Check permissions status
   */
  static async checkPermissions() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.hasPermissions = status === 'granted';
      return this.hasPermissions;
    } catch (error) {
      console.error('❌ Error checking location permissions:', error);
      return false;
    }
  }

  /**
   * Request permissions
   */
  static async requestPermissions() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      this.hasPermissions = status === 'granted';
      return this.hasPermissions;
    } catch (error) {
      console.error('❌ Error requesting location permissions:', error);
      return false;
    }
  }
}

export default LocationService; 