// AI Task Classifier - Simple keyword-based intelligence
class AITaskClassifier {
  // Keywords for different categories
  static categoryKeywords = {
    'Work': ['meeting', 'report', 'deadline', 'project', 'presentation', 'client', 'office', 'email', 'call', 'team'],
    'Study': ['exam', 'homework', 'research', 'learn', 'read', 'book', 'course', 'assignment', 'study', 'review'],
    'Family': ['birthday', 'dinner', 'visit', 'call', 'mom', 'dad', 'kids', 'family', 'home', 'anniversary'],
    'Personal': ['gym', 'exercise', 'doctor', 'appointment', 'shopping', 'clean', 'laundry', 'hobby', 'friend'],
    'Other': ['buy', 'fix', 'repair', 'maintenance', 'bill', 'payment', 'bank', 'insurance']
  };

  // Keywords for priority levels
  static priorityKeywords = {
    'High': ['urgent', 'important', 'asap', 'deadline', 'critical', 'emergency', 'immediately', 'today'],
    'Medium': ['soon', 'this week', 'next week', 'planned', 'schedule', 'remind'],
    'Low': ['someday', 'maybe', 'when free', 'optional', 'later', 'eventually']
  };

  // Time estimation keywords (in hours)
  static timeKeywords = {
    0.5: ['quick', 'fast', 'brief', 'short'],
    1: ['hour', '1h', 'simple'],
    2: ['couple hours', '2h', 'medium'],
    4: ['half day', 'morning', 'afternoon'],
    8: ['full day', 'all day', 'complex']
  };

  /**
   * Analyze task and suggest category, priority, and time
   */
  static analyzeTask(title, description = '') {
    const text = `${title} ${description}`.toLowerCase();
    
    return {
      suggestedCategory: this.suggestCategory(text),
      suggestedPriority: this.suggestPriority(text),
      estimatedTime: this.estimateTime(text),
      confidence: this.calculateConfidence(text)
    };
  }

  /**
   * Suggest category based on keywords
   */
  static suggestCategory(text) {
    let maxScore = 0;
    let suggestedCategory = 'Personal'; // default

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      const score = keywords.reduce((sum, keyword) => {
        return sum + (text.includes(keyword) ? 1 : 0);
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        suggestedCategory = category;
      }
    }

    return suggestedCategory;
  }

  /**
   * Suggest priority based on keywords
   */
  static suggestPriority(text) {
    for (const [priority, keywords] of Object.entries(this.priorityKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return priority;
        }
      }
    }
    return 'Medium'; // default
  }

  /**
   * Estimate completion time
   */
  static estimateTime(text) {
    for (const [hours, keywords] of Object.entries(this.timeKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          return parseFloat(hours);
        }
      }
    }
    return 1; // default 1 hour
  }

  /**
   * Calculate confidence score (0-100)
   */
  static calculateConfidence(text) {
    let matches = 0;
    let totalKeywords = 0;

    // Count all keyword matches
    for (const keywords of Object.values(this.categoryKeywords)) {
      totalKeywords += keywords.length;
      matches += keywords.reduce((sum, keyword) => {
        return sum + (text.includes(keyword) ? 1 : 0);
      }, 0);
    }

    for (const keywords of Object.values(this.priorityKeywords)) {
      totalKeywords += keywords.length;
      matches += keywords.reduce((sum, keyword) => {
        return sum + (text.includes(keyword) ? 1 : 0);
      }, 0);
    }

    const confidence = Math.min(100, (matches / Math.max(1, text.split(' ').length)) * 100);
    return Math.round(confidence);
  }

  /**
   * Generate smart suggestions for user
   */
  static generateSuggestions(title, description = '') {
    const analysis = this.analyzeTask(title, description);
    
    const suggestions = [];
    
    if (analysis.confidence > 20) {
      suggestions.push(`🤖 AI suggests: "${analysis.suggestedCategory}" category`);
    }
    
    if (analysis.suggestedPriority !== 'Medium') {
      suggestions.push(`⚡ Priority: ${analysis.suggestedPriority}`);
    }
    
    if (analysis.estimatedTime !== 1) {
      suggestions.push(`⏱️ Estimated time: ${analysis.estimatedTime} hour(s)`);
    }

    return {
      ...analysis,
      suggestions: suggestions.length > 0 ? suggestions : ['🤖 Enter more details for better suggestions']
    };
  }
}

export default AITaskClassifier; 