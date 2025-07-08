import { supabase } from './supabase';
import { aiService } from './ai-service';
import { Goal, Task } from '../types/database.types';

export class GoalService {
  async createGoal(inputText: string, durationDays: number = 30): Promise<{
    isSimpleTask: boolean;
    questions?: string[];
    goal?: Goal;
  }> {
    console.log('🎯 Creating goal:', inputText, 'Duration:', durationDays);
    
    const complexity = await aiService.analyzeComplexity(inputText);
    console.log('📊 Goal complexity:', complexity);
    
    if (complexity === 'Simple Task') {
      // Create simple task directly
      const goal = await this.createSimpleTask(inputText);
      return { isSimpleTask: true, goal };
    } else {
      // Generate questions for complex goal
      const questions = await aiService.generateQuestions(inputText);
      return { isSimpleTask: false, questions };
    }
  }

  async createSimpleTask(taskDescription: string): Promise<Goal> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const today = new Date().toISOString().split('T')[0];
    
    console.log('📝 Creating simple task:', taskDescription);
    
    // Create goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({
        owner_id: user.id,
        title: taskDescription,
        duration_days: 1,
        start_date: today,
        end_date: today,
        status: 'active',
        user_inputs: {},
        full_ai_plan: {
          ai_insights: 'Simple task created and ready to complete!',
          knowledge_gaps: [],
          daily_plan: [{
            day: 1,
            tasks: [{
              description: taskDescription,
              estimated_duration_minutes: 30
            }]
          }]
        }
      })
      .select()
      .single();

    if (goalError) throw goalError;

    // Create task
    const { error: taskError } = await supabase
      .from('tasks')
      .insert({
        goal_id: goal.id,
        owner_id: user.id,
        description: taskDescription,
        day_number: 1,
        scheduled_date: today,
        duration_minutes: 30,
        status: 'pending'
      });

    if (taskError) throw taskError;

    console.log('✅ Simple task created successfully');
    return goal;
  }

  async createComplexGoal(
    goalTitle: string,
    durationDays: number,
    answers: Record<string, string>
  ): Promise<Goal> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    console.log('🧠 Creating complex goal with AI plan:', goalTitle);

    // Generate AI plan
    const plan = await aiService.generatePlan(goalTitle, durationDays, answers);
    
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays - 1);

    // Create goal
    const { data: goal, error: goalError } = await supabase
      .from('goals')
      .insert({
        owner_id: user.id,
        title: goalTitle,
        duration_days: durationDays,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        status: 'active',
        user_inputs: answers,
        full_ai_plan: plan
      })
      .select()
      .single();

    if (goalError) throw goalError;

    // Create tasks
    const tasks = plan.daily_plan.map((dayPlan, index) => {
      const taskDate = new Date(startDate);
      taskDate.setDate(taskDate.getDate() + index);
      
      return dayPlan.tasks.map(task => ({
        goal_id: goal.id,
        owner_id: user.id,
        description: task.description,
        day_number: dayPlan.day,
        scheduled_date: taskDate.toISOString().split('T')[0],
        duration_minutes: task.estimated_duration_minutes,
        status: 'pending'
      }));
    }).flat();

    const { error: tasksError } = await supabase
      .from('tasks')
      .insert(tasks);

    if (tasksError) throw tasksError;

    console.log('✅ Complex goal created with', tasks.length, 'tasks');
    return goal;
  }

  async getTodaysTasks(): Promise<Task[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const today = new Date().toISOString().split('T')[0];
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('owner_id', user.id)
      .eq('scheduled_date', today)
      .in('status', ['pending', 'completed']) // Only active tasks
      .order('created_at', { ascending: true });

    if (error) throw error;
    return tasks || [];
  }

  async updateTaskStatus(taskId: number, isCompleted: boolean): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ 
        is_completed: isCompleted,
        status: isCompleted ? 'completed' : 'pending'
      })
      .eq('id', taskId);

    if (error) throw error;
  }

  async getUserGoals(): Promise<Goal[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: goals, error } = await supabase
      .from('goals')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return goals || [];
  }

  async getGoalById(goalId: number): Promise<Goal | null> {
    const { data: goal, error } = await supabase
      .from('goals')
      .select('*')
      .eq('id', goalId)
      .single();

    if (error) return null;
    return goal;
  }

  async getTasksForGoal(goalId: number): Promise<Task[]> {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('goal_id', goalId)
      .order('day_number', { ascending: true });

    if (error) throw error;
    return tasks || [];
  }

  // Goal management methods
  async deleteGoal(goalId: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)
      .eq('owner_id', user.id);

    if (error) throw error;
  }

  async pauseGoal(goalId: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('goals')
      .update({ status: 'paused' })
      .eq('id', goalId)
      .eq('owner_id', user.id);

    if (error) throw error;

    // Update all pending tasks for this goal to paused
    const { error: tasksError } = await supabase
      .from('tasks')
      .update({ status: 'paused' })
      .eq('goal_id', goalId)
      .eq('owner_id', user.id)
      .eq('status', 'pending');

    if (tasksError) throw tasksError;
  }

  async resumeGoal(goalId: number): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('goals')
      .update({ status: 'active' })
      .eq('id', goalId)
      .eq('owner_id', user.id);

    if (error) throw error;

    // Update all paused tasks for this goal back to pending
    const { error: tasksError } = await supabase
      .from('tasks')
      .update({ status: 'pending' })
      .eq('goal_id', goalId)
      .eq('owner_id', user.id)
      .eq('status', 'paused');

    if (tasksError) throw tasksError;
  }

  async updateGoalStatus(goalId: number, status: 'active' | 'paused' | 'completed' | 'cancelled'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('goals')
      .update({ status })
      .eq('id', goalId)
      .eq('owner_id', user.id);

    if (error) throw error;

    // Update task statuses based on goal status
    let taskStatus = 'pending';
    if (status === 'paused') taskStatus = 'paused';
    else if (status === 'completed') taskStatus = 'completed';
    else if (status === 'cancelled') taskStatus = 'cancelled';

    const { error: tasksError } = await supabase
      .from('tasks')
      .update({ status: taskStatus })
      .eq('goal_id', goalId)
      .eq('owner_id', user.id)
      .neq('status', 'completed'); // Don't change already completed tasks

    if (tasksError) throw tasksError;
  }
}

export const goalService = new GoalService();