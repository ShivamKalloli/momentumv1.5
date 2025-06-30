import { supabase } from './supabase';

export interface QuestionnaireResponse {
  questions: string[];
}

export interface PlanResponse {
  ai_insights: string;
  knowledge_gaps: Array<{
    gap: string;
    resource_recommendation: string;
  }>;
  daily_plan: Array<{
    day: number;
    tasks: Array<{
      description: string;
      estimated_duration_minutes: number;
    }>;
  }>;
}

class AIService {
  private async callAIFunction(functionName: string, payload: any) {
    try {
      console.log(`🚀 Calling AI function: ${functionName}`);
      console.log('📤 Payload:', JSON.stringify(payload, null, 2));
      
      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log(`📥 AI function ${functionName} response:`, { 
        hasData: !!data, 
        hasError: !!error,
        errorMessage: error?.message,
        data: data ? JSON.stringify(data).substring(0, 200) + '...' : null
      });
      
      if (error) {
        console.error(`❌ Supabase function error for ${functionName}:`, error);
        throw new Error(`AI service error: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('No response received from AI service');
      }
      
      // Check if the response contains debug info (indicates AI worked or used intelligent fallback)
      if (data.debug) {
        console.log(`🔍 Debug info for ${functionName}:`, data.debug);
      }
      
      // Check if AI actually worked vs fallback
      if (data.debug?.includes('AI') && !data.debug?.includes('fallback')) {
        console.log(`✅ ${functionName}: AI successfully processed request`);
      } else {
        console.log(`⚠️ ${functionName}: Using fallback (AI may not be working)`);
      }
      
      return data;
    } catch (error: any) {
      console.error(`💥 Failed to call AI function ${functionName}:`, error);
      
      // Handle AbortError (timeout)
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. The AI service is taking too long to respond. Please try again.');
      }
      
      // Re-throw the error for the calling function to handle
      throw error;
    }
  }

  async analyzeComplexity(inputText: string): Promise<'Simple Task' | 'Complex Goal'> {
    try {
      console.log('🔍 Analyzing complexity for:', inputText);
      const response = await this.callAIFunction('analyze-complexity', {
        input_text: inputText.trim()
      });
      
      console.log('✅ Complexity analysis result:', response.complexity);
      
      if (!response.complexity || !['Simple Task', 'Complex Goal'].includes(response.complexity)) {
        throw new Error('Invalid complexity response from AI');
      }
      
      return response.complexity;
    } catch (error) {
      console.error('❌ Error analyzing complexity:', error);
      
      // Enhanced fallback logic with better classification
      const text = inputText.toLowerCase().trim();
      
      // Simple task indicators
      const simpleKeywords = [
        'call', 'email', 'send', 'buy', 'order', 'book', 'schedule',
        'remind', 'text', 'message', 'pick up', 'drop off', 'pay',
        'check', 'review', 'update', 'fix', 'clean', 'organize',
        'submit', 'download', 'upload', 'install', 'delete'
      ];
      
      // Complex goal indicators
      const complexKeywords = [
        'learn', 'master', 'achieve', 'build', 'create', 'develop',
        'improve', 'plan', 'start', 'launch', 'study', 'practice',
        'train', 'prepare', 'establish', 'design', 'become',
        'understand', 'explore', 'discover', 'research'
      ];
      
      // Time indicators suggest complexity
      const timeIndicators = ['days', 'weeks', 'months', 'year', 'daily', 'weekly', 'monthly'];
      const hasTimeIndicator = timeIndicators.some(indicator => text.includes(indicator));
      
      // Check for keywords
      const hasSimpleKeywords = simpleKeywords.some(keyword => text.includes(keyword));
      const hasComplexKeywords = complexKeywords.some(keyword => text.includes(keyword));
      
      // Decision logic
      if (hasSimpleKeywords && !hasComplexKeywords && !hasTimeIndicator && text.length < 50) {
        console.log('📝 Fallback classification: Simple Task');
        return 'Simple Task';
      } else if (hasComplexKeywords || hasTimeIndicator || text.length > 100) {
        console.log('📝 Fallback classification: Complex Goal');
        return 'Complex Goal';
      } else {
        // Default based on length and structure
        const result = text.length < 30 && !text.includes(' to ') ? 'Simple Task' : 'Complex Goal';
        console.log('📝 Fallback classification:', result);
        return result;
      }
    }
  }

  async generateQuestions(goalTitle: string): Promise<string[]> {
    try {
      console.log('❓ Generating questions for goal:', goalTitle);
      const response = await this.callAIFunction('generate-questions', {
        goal_title: goalTitle.trim()
      });
      
      console.log('✅ Generated questions:', response.questions?.length, 'questions');
      
      if (!Array.isArray(response.questions) || response.questions.length === 0) {
        throw new Error('Invalid questions response from AI');
      }
      
      return response.questions;
    } catch (error) {
      console.error('❌ Error generating questions:', error);
      
      // Enhanced fallback questions based on goal type
      const goal = goalTitle.toLowerCase();
      
      if (goal.includes('learn') || goal.includes('study')) {
        if (goal.includes('language')) {
          return [
            'What is your current level in this language?',
            'How much time can you dedicate to practice daily?',
            'Do you prefer structured courses or self-study?',
            'What specific skills do you want to focus on most (speaking, writing, reading)?'
          ];
        } else if (goal.includes('code') || goal.includes('program')) {
          return [
            'What is your programming experience level?',
            'Which programming language interests you most?',
            'Do you have a specific project in mind?',
            'How much time can you dedicate to coding daily?'
          ];
        } else {
          return [
            'What is your current knowledge level in this area?',
            'How much time can you dedicate to learning daily?',
            'What learning resources do you prefer?',
            'What specific outcome do you want to achieve?'
          ];
        }
      } else if (goal.includes('fitness') || goal.includes('workout') || goal.includes('run')) {
        return [
          'What is your current fitness level?',
          'How many days per week can you exercise?',
          'Do you have access to a gym or equipment?',
          'What is your main motivation for this goal?'
        ];
      } else if (goal.includes('business') || goal.includes('startup')) {
        return [
          'What is your relevant experience in this area?',
          'What resources or budget do you have available?',
          'What is your target timeline for initial results?',
          'Who is your target audience or market?'
        ];
      } else {
        return [
          'What is your current experience level with this goal?',
          'How much time can you realistically dedicate daily?',
          'What resources or support do you have available?',
          'How will you measure success and stay motivated?'
        ];
      }
    }
  }

  async generatePlan(
    goalTitle: string, 
    durationDays: number, 
    answers: Record<string, string>
  ): Promise<PlanResponse> {
    try {
      console.log('📋 Generating plan for:', goalTitle, 'Duration:', durationDays, 'days');
      const response = await this.callAIFunction('generate-plan', {
        goal_title: goalTitle.trim(),
        duration_days: durationDays,
        answers_to_questions: answers
      });
      
      console.log('✅ Generated plan with', response.plan?.daily_plan?.length, 'days');
      
      if (!response.plan || !response.plan.daily_plan || !Array.isArray(response.plan.daily_plan)) {
        throw new Error('Invalid plan response from AI');
      }
      
      return response.plan;
    } catch (error) {
      console.error('❌ Error generating plan:', error);
      
      // Enhanced fallback plan
      return this.generateFallbackPlan(goalTitle, durationDays, answers);
    }
  }

  private generateFallbackPlan(goalTitle: string, durationDays: number, answers: Record<string, string>): PlanResponse {
    console.log('📝 Generating fallback plan for:', goalTitle);
    
    const goal = goalTitle.toLowerCase();
    const answerValues = Object.values(answers).join(' ').toLowerCase();
    
    // Determine experience level and time commitment from answers
    const isBeginnerLevel = answerValues.includes('beginner') || answerValues.includes('no experience') || answerValues.includes('never');
    const hasLimitedTime = answerValues.includes('30 minutes') || answerValues.includes('limited') || answerValues.includes('busy');
    
    const phases = Math.ceil(durationDays / 3);
    const daily_plan = [];
    
    for (let day = 1; day <= durationDays; day++) {
      const phase = Math.ceil(day / phases);
      const tasks = [];
      
      if (phase === 1) { // Learning phase
        tasks.push({
          description: isBeginnerLevel 
            ? `Learn the basics of ${goalTitle}` 
            : `Review fundamentals and plan approach for ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 30 : 45
        });
        if (!hasLimitedTime) {
          tasks.push({
            description: 'Research resources and create action plan',
            estimated_duration_minutes: 15
          });
        }
      } else if (phase === 2) { // Practice phase
        tasks.push({
          description: `Practice key skills for ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 45 : 60
        });
        tasks.push({
          description: 'Track progress and adjust approach',
          estimated_duration_minutes: 15
        });
      } else { // Application phase
        tasks.push({
          description: `Apply knowledge and work on ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 60 : 90
        });
        tasks.push({
          description: 'Share progress and get feedback',
          estimated_duration_minutes: 15
        });
      }
      
      daily_plan.push({ day, tasks });
    }

    return {
      ai_insights: `Your ${durationDays}-day plan for "${goalTitle}" is structured in three phases: learning, practicing, and applying. ${isBeginnerLevel ? 'Starting with fundamentals will build a strong foundation.' : 'Building on your existing knowledge will accelerate progress.'} Stay consistent and adapt as you learn.`,
      knowledge_gaps: [
        {
          gap: 'Understanding the fundamentals',
          resource_recommendation: 'Research authoritative books, courses, or online resources in this area'
        },
        {
          gap: 'Practical application skills',
          resource_recommendation: 'Find hands-on projects or exercises to practice what you learn'
        },
        {
          gap: 'Community and mentorship',
          resource_recommendation: 'Join online communities, forums, or find mentors in this field'
        }
      ],
      daily_plan
    };
  }
}

export const aiService = new AIService();