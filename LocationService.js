import * as Location from 'expo-location';
import { Platform } from 'react-native';

class LocationService {
  static currentLocation = null;
  static hasPermissions = false;

  /**
   * Check if location permissions are granted
   */
  static async checkPermissionStatus() {
    try {
      const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
      console.log('📍 Current location permission status:', foregroundStatus);
      return foregroundStatus;
    } catch (error) {
      console.error('❌ Error checking location permission status:', error);
      return 'error';
    }
  }

  /**
   * Request location permissions with proper error handling
   */
  static async requestLocationPermission() {
    try {
      console.log('📍 Requesting location permission...');
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      console.log('📍 Permission request result:', { status, canAskAgain });
      
      if (status === 'granted') {
        this.hasPermissions = true;
        return { success: true, status };
      }
      
      return {
        success: false,
        status,
        canAskAgain,
        error: 'Permission denied'
      };
    } catch (error) {
      console.error('❌ Error requesting location permission:', error);
      return {
        success: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Initialize location service with enhanced error handling
   */
  static async initialize() {
    try {
      console.log('📍 Initializing Location Service...');
      
      // Check if location services are enabled
      const servicesEnabled = await this.isLocationEnabled();
      if (!servicesEnabled) {
        console.log('❌ Location services are disabled');
        return {
          success: false,
          error: 'SERVICES_DISABLED',
          message: 'Location services are disabled on your device'
        };
      }

      // Check current permission status
      const currentStatus = await this.checkPermissionStatus();
      console.log('📍 Current permission status:', currentStatus);

      if (currentStatus === 'granted') {
        this.hasPermissions = true;
        const location = await this.getCurrentLocation();
        return {
          success: true,
          status: currentStatus,
          location
        };
      }

      // Request permission if not granted
      const permissionResult = await this.requestLocationPermission();
      if (permissionResult.success) {
        const location = await this.getCurrentLocation();
        return {
          success: true,
          status: 'granted',
          location
        };
      }

      return {
        success: false,
        error: 'PERMISSION_DENIED',
        status: permissionResult.status,
        canAskAgain: permissionResult.canAskAgain,
        message: 'Location permission was denied'
      };

    } catch (error) {
      console.error('❌ Error initializing location service:', error);
      return {
        success: false,
        error: 'INITIALIZATION_ERROR',
        message: error.message
      };
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