import AITaskClassifier from '../AITaskClassifier';

describe('AITaskClassifier', () => {
  describe('analyzeTask', () => {
    test('should suggest Work category for work-related tasks', () => {
      const result = AITaskClassifier.analyzeTask('team meeting tomorrow', 'discuss project deadline');
      
      expect(result.suggestedCategory).toBe('Work');
      expect(result.suggestedPriority).toBe('High'); // contains 'deadline'
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should suggest Study category for study-related tasks', () => {
      const result = AITaskClassifier.analyzeTask('finish homework', 'read chapter 5 for exam');
      
      expect(result.suggestedCategory).toBe('Study');
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should suggest Family category for family-related tasks', () => {
      const result = AITaskClassifier.analyzeTask('call mom', 'birthday dinner at home');
      
      expect(result.suggestedCategory).toBe('Family');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('suggestPriority', () => {
    test('should suggest High priority for urgent tasks', () => {
      const priority = AITaskClassifier.suggestPriority('urgent meeting today asap');
      expect(priority).toBe('High');
    });

    test('should suggest Low priority for optional tasks', () => {
      const priority = AITaskClassifier.suggestPriority('maybe clean room someday when free');
      expect(priority).toBe('Low');
    });

    test('should default to Medium priority', () => {
      const priority = AITaskClassifier.suggestPriority('regular task with no priority keywords');
      expect(priority).toBe('Medium');
    });
  });

  describe('estimateTime', () => {
    test('should estimate 0.5 hours for quick tasks', () => {
      const time = AITaskClassifier.estimateTime('quick email reply');
      expect(time).toBe(0.5);
    });

    test('should estimate 8 hours for full day tasks', () => {
      const time = AITaskClassifier.estimateTime('complex all day workshop');
      expect(time).toBe(8);
    });

    test('should default to 1 hour', () => {
      const time = AITaskClassifier.estimateTime('regular task without time keywords');
      expect(time).toBe(1);
    });
  });

  describe('generateSuggestions', () => {
    test('should generate meaningful suggestions for detailed tasks', () => {
      const result = AITaskClassifier.generateSuggestions(
        'urgent team meeting', 
        'discuss project deadline and client presentation'
      );
      
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.includes('Work'))).toBe(true);
    });

    test('should provide default message for vague tasks', () => {
      const result = AITaskClassifier.generateSuggestions('task', '');
      
      expect(result.suggestions).toContain('🤖 Enter more details for better suggestions');
    });
  });

  describe('calculateConfidence', () => {
    test('should calculate confidence based on keyword matches', () => {
      const confidence1 = AITaskClassifier.calculateConfidence('meeting project deadline client');
      const confidence2 = AITaskClassifier.calculateConfidence('xyz abc def');
      
      expect(confidence1).toBeGreaterThan(confidence2);
      expect(confidence1).toBeLessThanOrEqual(100);
      expect(confidence2).toBeGreaterThanOrEqual(0);
    });
  });
}); 