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
        throw new Error(`AI_SERVICE_ERROR: ${error.message}`);
      }
      
      if (!data) {
        console.warn(`⚠️ No data received from ${functionName}`);
        throw new Error('NO_DATA_RECEIVED');
      }
      
      // Log AI vs fallback usage
      if (data.ai_powered) {
        console.log(`✅ ${functionName}: Using Gemini AI`);
      } else {
        console.log(`⚠️ ${functionName}: Using fallback logic`);
      }
      
      return data;
    } catch (error: any) {
      console.error(`💥 Failed to call AI function ${functionName}:`, error);
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
      console.error('❌ AI complexity analysis failed:', error);
      throw error;
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
      console.error('❌ AI question generation failed:', error);
      throw error;
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
      console.error('❌ AI plan generation failed:', error);
      throw error;
    }
  }
}

export const aiService = new AIService();