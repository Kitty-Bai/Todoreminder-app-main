import { OptimizedTaskItem, lazyComponentLoader, optimizedFirebaseQueries, memoryOptimizations, sensorOptimizations } from '../performance-improvements';
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

describe('Performance Optimizations', () => {
  describe('OptimizedTaskItem', () => {
    it('should memoize component and prevent unnecessary re-renders', () => {
      const task = { id: '1', priority: 'high', dueDate: new Date() };
      const onPress = jest.fn();
      const onToggle = jest.fn();

      const { rerender } = render(
        <OptimizedTaskItem 
          task={task}
          onPress={onPress}
          onToggle={onToggle}
        />
      );

      // Component should not re-render with same props
      const prevRenderCount = OptimizedTaskItem.render.mock.calls.length;
      rerender(
        <OptimizedTaskItem
          task={task}
          onPress={onPress} 
          onToggle={onToggle}
        />
      );
      expect(OptimizedTaskItem.render.mock.calls.length).toBe(prevRenderCount);
    });
  });

  describe('Firebase Query Optimization', () => {
    it('should create optimized query with compound indexes', () => {
      const query = optimizedFirebaseQueries.getTasksByUserAndStatus('user1', 'active');
      expect(query).toEqual({
        query: 'users/{userId}/tasks',
        where: [
          ['userId', '==', 'user1'],
          ['status', '==', 'active']
        ],
        orderBy: [['createdAt', 'desc']],
        limit: 50
      });
    });

    it('should create batch updates correctly', () => {
      const tasks = [
        { id: '1', title: 'Task 1' },
        { id: '2', title: 'Task 2' }
      ];
      const batchOps = optimizedFirebaseQueries.batchUpdateTasks(tasks);
      expect(batchOps).toHaveLength(2);
      expect(batchOps[0]).toEqual({
        operation: 'update',
        ref: 'tasks/1',
        data: tasks[0]
      });
    });
  });

  describe('Memory Management', () => {
    it('should cleanup listeners correctly', () => {
      const mockListener1 = jest.fn();
      const mockListener2 = jest.fn();
      memoryOptimizations.cleanupListeners([mockListener1, mockListener2]);
      expect(mockListener1).toHaveBeenCalled();
      expect(mockListener2).toHaveBeenCalled();
    });

    it('should optimize image loading configuration', () => {
      const imageConfig = memoryOptimizations.optimizeImageLoading('test.jpg');
      expect(imageConfig).toEqual({
        uri: 'test.jpg',
        cache: 'force-cache',
        priority: 'low'
      });
    });
  });

  describe('Lazy Loading', () => {
    it('should load components lazily', async () => {
      const mockComponent = { default: () => null };
      jest.mock('../components/TestComponent', () => mockComponent);
      
      const component = await lazyComponentLoader('TestComponent');
      expect(component).toBe(mockComponent.default);
    });
  });

  describe('Sensor Optimizations', () => {
    describe('Motion Sensor', () => {
      it('should configure motion sensor with correct sampling rates', () => {
        const config = sensorOptimizations.motionSensor.configureMotionSensor('high');
        expect(config).toEqual({
          samplingRate: 100,
          batchSize: 10,
          powerSaveMode: false
        });
      });

      it('should process batched motion data correctly', () => {
        const motionData = [
          { x: 1, y: 1, z: 1, timestamp: 100 },
          { x: 2, y: 2, z: 2, timestamp: 200 }
        ];
        const processed = sensorOptimizations.motionSensor.processBatchedMotionData(motionData);
        expect(processed).toEqual({
          x: 3,
          y: 3,
          z: 3,
          timestamp: 200
        });
      });
    });

    describe('Location Services', () => {
      it('should configure location tracking with correct accuracy', () => {
        const config = sensorOptimizations.locationServices.configureLocationTracking('high');
        expect(config).toEqual({
          enableHighAccuracy: true,
          distanceFilter: 5,
          interval: 1000
        });
      });

      it('should batch location updates correctly', () => {
        const locations = [
          { lat: 1, lng: 1 },
          { lat: 2, lng: 2 },
          { lat: 3, lng: 3 }
        ];
        const batched = sensorOptimizations.locationServices.batchLocationUpdates(locations, 2);
        expect(batched).toHaveLength(2);
        expect(batched[0]).toHaveLength(2);
      });
    });

    describe('Camera', () => {
      it('should optimize camera settings for scanning', () => {
        const settings = sensorOptimizations.camera.optimizeCameraForScanning();
        expect(settings).toEqual({
          resolution: '1280x720',
          frameRate: 30,
          autoFocus: 'on',
          whiteBalance: 'auto',
          flashMode: 'auto'
        });
      });

      it('should process camera frames efficiently', () => {
        const frameData = {
          resolution: '1280x720',
          format: 'jpeg'
        };
        const processed = sensorOptimizations.camera.processFrameEfficiently(frameData);
        expect(processed).toMatchObject({
          processed: true,
          resolution: '1280x720',
          format: 'jpeg'
        });
        expect(processed.timestamp).toBeDefined();
      });
    });
  });
}); 