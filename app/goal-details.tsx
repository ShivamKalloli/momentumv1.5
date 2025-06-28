import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, Target, CircleCheck as CheckCircle, Circle, Book, Lightbulb } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { goalService } from '@/lib/goal-service';
import { Goal, Task } from '@/types/database.types';

export default function GoalDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoalDetails = async () => {
    try {
      setLoading(true);
      const goalId = parseInt(id as string);
      const [goalData, tasksData] = await Promise.all([
        goalService.getGoalById(goalId),
        goalService.getTasksForGoal(goalId)
      ]);
      
      setGoal(goalData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error loading goal details:', error);
      Alert.alert('Error', 'Failed to load goal details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && id) {
      loadGoalDetails();
    }
  }, [user, id]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const groupTasksByDay = () => {
    const grouped: Record<number, Task[]> = {};
    tasks.forEach(task => {
      if (!grouped[task.day_number]) {
        grouped[task.day_number] = [];
      }
      grouped[task.day_number].push(task);
    });
    return grouped;
  };

  const getProgressPercentage = (): number => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.is_completed);
    return (completedTasks.length / tasks.length) * 100;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading goal details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Goal not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const groupedTasks = groupTasksByDay();
  const progressPercentage = getProgressPercentage();
  const completedTasks = tasks.filter(task => task.is_completed).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton} 
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goal Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Goal Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          
          <View style={styles.goalStats}>
            <View style={styles.statItem}>
              <Calendar size={16} color="#6b7280" />
              <Text style={styles.statText}>
                {formatDate(goal.start_date)} - {goal.end_date ? formatDate(goal.end_date) : 'Ongoing'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Clock size={16} color="#6b7280" />
              <Text style={styles.statText}>{goal.duration_days} days</Text>
            </View>
            <View style={styles.statItem}>
              <Target size={16} color="#6b7280" />
              <Text style={styles.statText}>
                {completedTasks} of {tasks.length} tasks completed
              </Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progressPercentage)}% complete
            </Text>
          </View>
        </View>

        {/* AI Insights */}
        {goal.full_ai_plan.ai_insights && (
          <View style={styles.insightsCard}>
            <View style={styles.cardHeader}>
              <Lightbulb size={20} color="#f59e0b" />
              <Text style={styles.cardTitle}>AI Insights</Text>
            </View>
            <Text style={styles.insightsText}>
              {goal.full_ai_plan.ai_insights}
            </Text>
          </View>
        )}

        {/* Knowledge Gaps */}
        {goal.full_ai_plan.knowledge_gaps && goal.full_ai_plan.knowledge_gaps.length > 0 && (
          <View style={styles.gapsCard}>
            <View style={styles.cardHeader}>
              <Book size={20} color="#8b5cf6" />
              <Text style={styles.cardTitle}>Recommended Resources</Text>
            </View>
            {goal.full_ai_plan.knowledge_gaps.map((gap, index) => (
              <View key={index} style={styles.gapItem}>
                <Text style={styles.gapTitle}>{gap.gap}</Text>
                <Text style={styles.gapResource}>{gap.resource_recommendation}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Daily Plan */}
        <View style={styles.planCard}>
          <View style={styles.cardHeader}>
            <Calendar size={20} color="#3b82f6" />
            <Text style={styles.cardTitle}>Daily Plan</Text>
          </View>
          
          {Object.entries(groupedTasks)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([dayNumber, dayTasks]) => (
              <View key={dayNumber} style={styles.daySection}>
                <Text style={styles.dayTitle}>Day {dayNumber}</Text>
                {dayTasks.map((task) => (
                  <View key={task.id} style={styles.taskItem}>
                    <View style={styles.taskContent}>
                      {task.is_completed ? (
                        <CheckCircle size={20} color="#10b981" />
                      ) : (
                        <Circle size={20} color="#6b7280" strokeWidth={2} />
                      )}
                      <View style={styles.taskDetails}>
                        <Text style={[
                          styles.taskDescription,
                          task.is_completed && styles.completedTask
                        ]}>
                          {task.description}
                        </Text>
                        <Text style={styles.taskDuration}>
                          {formatDuration(task.duration_minutes)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  overviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
    lineHeight: 28,
  },
  goalStats: {
    gap: 8,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  progressSection: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  insightsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gapsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  insightsText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  gapItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  gapTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  gapResource: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  daySection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  taskItem: {
    marginBottom: 8,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  taskDetails: {
    flex: 1,
  },
  taskDescription: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 20,
  },
  completedTask: {
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  taskDuration: {
    fontSize: 12,
    color: '#9ca3af',
  },
});