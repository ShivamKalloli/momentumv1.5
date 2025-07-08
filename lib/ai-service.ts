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
      
      // Validate environment variables
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error('Missing Supabase environment variables');
      }
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log(`📥 AI function ${functionName} response:`, { 
        hasData: !!data, 
        hasError: !!error,
        errorMessage: error?.message,
        aiPowered: data?.ai_powered
      });
      
      if (error) {
        console.error(`❌ Supabase function error for ${functionName}:`, error);
        throw new Error(`Edge Function error: ${error.message}`);
      }
      
      if (!data) {
        console.warn(`⚠️ No data received from ${functionName}`);
        throw new Error('No response from AI service');
      }
      
      // Check if AI actually worked
      if (!data.ai_powered) {
        console.warn(`⚠️ ${functionName}: AI not available, function used fallback`);
        // Don't throw error for fallback responses, just log the warning
        console.log(`✅ ${functionName}: Using fallback analysis`);
      }
      
      if (data.ai_powered) {
        console.log(`✅ ${functionName}: Successfully used Gemini AI`);
      }
      return data;
    } catch (error: any) {
      console.error(`💥 Failed to call AI function ${functionName}:`, error);
      // Only mention Gemini API key if it's actually a Gemini-related error
      if (error.message.includes('Gemini') || error.message.includes('API key')) {
        throw new Error(`AI service failed: ${error.message}. Please check your Gemini API key and try again.`);
      } else {
        throw new Error(`AI service failed: ${error.message}`);
      }
    }
  }

  async analyzeComplexity(inputText: string): Promise<'Simple Task' | 'Complex Goal'> {
    if (!inputText || typeof inputText !== 'string' || inputText.trim().length === 0) {
      throw new Error('Goal description is required');
    }

    try {
      console.log('🔍 Analyzing complexity for:', inputText);
      const response = await this.callAIFunction('analyze-complexity', {
        input_text: inputText.trim()
      });
      
      console.log('✅ Complexity analysis result:', response.complexity);
      
      if (!response.complexity || !['Simple Task', 'Complex Goal'].includes(response.complexity)) {
        throw new Error('Invalid response from AI service');
      }
      
      return response.complexity;
    } catch (error) {
      console.error('❌ AI complexity analysis failed:', error);
      throw new Error(`Failed to analyze goal complexity: ${error.message}`);
    }
  }

  async generateQuestions(goalTitle: string): Promise<string[]> {
    if (!goalTitle || typeof goalTitle !== 'string' || goalTitle.trim().length === 0) {
      throw new Error('Goal title is required');
    }

    try {
      console.log('❓ Generating questions for goal:', goalTitle);
      const response = await this.callAIFunction('generate-questions', {
        goal_title: goalTitle.trim()
      });
      
      console.log('✅ Generated questions:', response.questions?.length, 'questions');
      
      if (!Array.isArray(response.questions) || response.questions.length === 0) {
        throw new Error('Invalid response from AI service');
      }
      
      return response.questions;
    } catch (error) {
      console.error('❌ AI question generation failed:', error);
      throw new Error(`Failed to generate questions: ${error.message}`);
    }
  }

  async generatePlan(
    goalTitle: string, 
    durationDays: number, 
    answers: Record<string, string>
  ): Promise<PlanResponse> {
    if (!goalTitle || typeof goalTitle !== 'string' || goalTitle.trim().length === 0) {
      throw new Error('Goal title is required');
    }

    if (!durationDays || durationDays < 1) {
      throw new Error('Duration must be at least 1 day');
    }

    if (!answers || typeof answers !== 'object' || Object.keys(answers).length === 0) {
      throw new Error('Answers are required');
    }

    try {
      console.log('📋 Generating plan for:', goalTitle, 'Duration:', durationDays, 'days');
      const response = await this.callAIFunction('generate-plan', {
        goal_title: goalTitle.trim(),
        duration_days: durationDays,
        answers_to_questions: answers
      });
      
      console.log('✅ Generated plan with', response.plan?.daily_plan?.length, 'days');
      
      if (!response.plan || !response.plan.daily_plan || !Array.isArray(response.plan.daily_plan)) {
        throw new Error('Invalid response from AI service');
      }
      
      return response.plan;
    } catch (error) {
      console.error('❌ AI plan generation failed:', error);
      throw new Error(`Failed to generate plan: ${error.message}`);
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing AI service connection...');
      
      // Check environment variables
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('❌ Missing Supabase environment variables');
        return false;
      }
      
      const response = await this.callAIFunction('test-function', {});
      return response.success === true;
    } catch (error) {
      console.error('❌ AI service connection test failed:', error);
      return false;
    }
  }
}

export const aiService = new AIService();