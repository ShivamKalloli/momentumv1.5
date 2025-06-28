export interface Profile {
  id: string;
  persona_preference: string;
  created_at: string;
}

export interface Goal {
  id: number;
  owner_id: string;
  title: string;
  user_inputs: Record<string, any>;
  full_ai_plan: {
    ai_insights?: string;
    knowledge_gaps?: Array<{
      gap: string;
      resource_recommendation: string;
    }>;
    daily_plan?: Array<{
      day: number;
      tasks: Array<{
        description: string;
        estimated_duration_minutes: number;
      }>;
    }>;
  };
  duration_days: number;
  start_date: string;
  end_date?: string;
  status: string;
  created_at: string;
}

export interface Task {
  id: number;
  goal_id: number;
  owner_id: string;
  description: string;
  day_number: number;
  scheduled_date?: string;
  duration_minutes: number;
  is_completed: boolean;
  status: string;
  created_at: string;
}

export interface AIResponse {
  complexity: 'Simple Task' | 'Complex Goal';
  questions?: string[];
  plan?: {
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
  };
}