import MotionSensorService from '../MotionSensorService';
import { Accelerometer } from 'expo-sensors';

describe('MotionSensorService', () => {
  beforeEach(() => {
    // Reset service state
    MotionSensorService.stopShakeDetection();
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    test('should initialize successfully when accelerometer is available', async () => {
      Accelerometer.isAvailableAsync.mockResolvedValue(true);

      const result = await MotionSensorService.initialize();

      expect(result).toBe(true);
      expect(Accelerometer.isAvailableAsync).toHaveBeenCalled();
    });

    test('should fail to initialize when accelerometer is not available', async () => {
      Accelerometer.isAvailableAsync.mockResolvedValue(false);

      const result = await MotionSensorService.initialize();

      expect(result).toBe(false);
    });

    test('should handle initialization errors', async () => {
      Accelerometer.isAvailableAsync.mockRejectedValue(new Error('Sensor error'));

      const result = await MotionSensorService.initialize();

      expect(result).toBe(false);
    });
  });

  describe('shake detection', () => {
    test('should start shake detection with callback', () => {
      const mockCallback = jest.fn();
      const mockSubscription = { remove: jest.fn() };
      Accelerometer.addListener.mockReturnValue(mockSubscription);

      MotionSensorService.startShakeDetection(mockCallback);

      expect(MotionSensorService.isListening).toBe(true);
      expect(MotionSensorService.shakeCallback).toBe(mockCallback);
      expect(Accelerometer.setUpdateInterval).toHaveBeenCalledWith(100);
      expect(Accelerometer.addListener).toHaveBeenCalled();
    });

    test('should stop shake detection', () => {
      const mockSubscription = { remove: jest.fn() };
      MotionSensorService.subscription = mockSubscription;
      MotionSensorService.isListening = true;

      MotionSensorService.stopShakeDetection();

      expect(mockSubscription.remove).toHaveBeenCalled();
      expect(MotionSensorService.isListening).toBe(false);
      expect(MotionSensorService.shakeCallback).toBe(null);
    });

    test('should detect shake when acceleration exceeds threshold', () => {
      const mockCallback = jest.fn();
      MotionSensorService.shakeCallback = mockCallback;
      MotionSensorService.lastShakeTime = 0; // Reset to allow shake

      // Simulate high acceleration data
      const highAccelerationData = { x: 3, y: 3, z: 3 }; // magnitude > threshold

      MotionSensorService.handleAccelerometerData(highAccelerationData);

      expect(mockCallback).toHaveBeenCalled();
    });

    test('should not detect shake when acceleration is below threshold', () => {
      const mockCallback = jest.fn();
      MotionSensorService.shakeCallback = mockCallback;

      // Simulate low acceleration data
      const lowAccelerationData = { x: 0.1, y: 0.1, z: 0.1 }; // magnitude < threshold

      MotionSensorService.handleAccelerometerData(lowAccelerationData);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    test('should prevent rapid shake triggers', () => {
      const mockCallback = jest.fn();
      MotionSensorService.shakeCallback = mockCallback;
      MotionSensorService.lastShakeTime = Date.now(); // Set recent shake time

      const highAccelerationData = { x: 3, y: 3, z: 3 };

      MotionSensorService.handleAccelerometerData(highAccelerationData);

      expect(mockCallback).not.toHaveBeenCalled(); // Should be prevented due to recent shake
    });
  });

  describe('utility methods', () => {
    test('should check sensor availability', async () => {
      Accelerometer.isAvailableAsync.mockResolvedValue(true);

      const isAvailable = await MotionSensorService.isAvailable();

      expect(isAvailable).toBe(true);
      expect(Accelerometer.isAvailableAsync).toHaveBeenCalled();
    });

    test('should get current status', () => {
      MotionSensorService.isListening = true;
      MotionSensorService.shakeCallback = jest.fn();
      MotionSensorService.shakeThreshold = 2.5;

      const status = MotionSensorService.getStatus();

      expect(status).toEqual({
        isListening: true,
        hasCallback: true,
        threshold: 2.5,
        platform: expect.any(String)
      });
    });

    test('should set shake sensitivity within bounds', () => {
      MotionSensorService.setShakeSensitivity(3.0);
      expect(MotionSensorService.shakeThreshold).toBe(3.0);

      // Test lower bound
      MotionSensorService.setShakeSensitivity(0.5);
      expect(MotionSensorService.shakeThreshold).toBe(1.0);

      // Test upper bound
      MotionSensorService.setShakeSensitivity(10.0);
      expect(MotionSensorService.shakeThreshold).toBe(5.0);
    });

    test('should test shake functionality', () => {
      const mockCallback = jest.fn();
      MotionSensorService.shakeCallback = mockCallback;

      MotionSensorService.testShake();

      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('activity detection', () => {
    test('should detect stationary activity', () => {
      const activity = MotionSensorService.detectActivity({ x: 0.1, y: 0.1, z: 0.1 });
      expect(activity).toBe('stationary');
    });

    test('should detect walking activity', () => {
      const activity = MotionSensorService.detectActivity({ x: 0.8, y: 0.8, z: 0.8 });
      expect(activity).toBe('walking');
    });

    test('should detect running activity', () => {
      const activity = MotionSensorService.detectActivity({ x: 1.5, y: 1.5, z: 1.5 });
      expect(activity).toBe('running');
    });

    test('should detect vigorous activity', () => {
      const activity = MotionSensorService.detectActivity({ x: 4, y: 4, z: 4 });
      expect(activity).toBe('vigorous');
    });
  });

  describe('getCurrentReading', () => {
    test('should get current accelerometer reading', async () => {
      const mockData = { x: 1, y: 2, z: 3 };
      let listenerCallback;
      
      Accelerometer.addListener.mockImplementation((callback) => {
        listenerCallback = callback;
        return { remove: jest.fn() };
      });

      // Start the async operation
      const readingPromise = MotionSensorService.getCurrentReading();
      
      // Trigger the callback
      if (listenerCallback) {
        listenerCallback(mockData);
      }

      const result = await readingPromise;
      expect(result).toEqual(mockData);
    });
  });
}); 