import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plus, Clock, CircleCheck as CheckCircle, Circle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { goalService } from '@/lib/goal-service';
import { Task } from '@/types/database.types';
import { BoltBadge } from '@/components/BoltBadge';

export default function TodayScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const todaysTasks = await goalService.getTodaysTasks();
      // Filter out tasks from paused or cancelled goals
      const activeTasks = todaysTasks.filter(task => 
        task.status === 'pending' || task.status === 'completed'
      );
      setTasks(activeTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      Alert.alert('Error', 'Failed to load today\'s tasks');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user && !authLoading) {
      loadTasks();
    }
  }, [user, authLoading]);

  const toggleTaskCompletion = async (taskId: number, currentStatus: boolean) => {
    try {
      await goalService.updateTaskStatus(taskId, !currentStatus);
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, is_completed: !currentStatus }
          : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const completedTasks = tasks.filter(task => task.is_completed);
  const pendingTasks = tasks.filter(task => !task.is_completed);
  const totalMinutes = tasks.reduce((sum, task) => sum + task.duration_minutes, 0);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <BoltBadge position="top-right" size={35} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <BoltBadge position="top-right" size={35} />
        <View style={styles.authPrompt}>
          <Text style={styles.authTitle}>Welcome to Momentum</Text>
          <Text style={styles.authSubtitle}>Sign in to start tracking your goals</Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.authButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BoltBadge position="top-right" size={35} />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning!</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{completedTasks.length}</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{tasks.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Progress Summary */}
        {tasks.length > 0 && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Clock size={16} color="#6b7280" />
              <Text style={styles.progressText}>
                {formatDuration(totalMinutes)} planned today
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(completedTasks.length / tasks.length) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressLabel}>
              {completedTasks.length} of {tasks.length} tasks completed
            </Text>
          </View>
        )}

        {/* Tasks List */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading tasks...</Text>
            </View>
          ) : tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <AlertCircle size={48} color="#9ca3af" />
              <Text style={styles.emptyTitle}>No tasks for today</Text>
              <Text style={styles.emptySubtitle}>
                Create a new goal to get started
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/onboarding')}
              >
                <Plus size={20} color="#3b82f6" />
                <Text style={styles.emptyButtonText}>Add Goal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {pendingTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskCard}
                  onPress={() => toggleTaskCompletion(task.id, task.is_completed)}
                >
                  <View style={styles.taskContent}>
                    <Circle size={24} color="#3b82f6" strokeWidth={2} />
                    <View style={styles.taskDetails}>
                      <Text style={styles.taskTitle}>{task.description}</Text>
                      <Text style={styles.taskDuration}>
                        {formatDuration(task.duration_minutes)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}

              {completedTasks.length > 0 && (
                <>
                  <Text style={styles.completedSectionTitle}>Completed</Text>
                  {completedTasks.map((task) => (
                    <TouchableOpacity
                      key={task.id}
                      style={[styles.taskCard, styles.completedTask]}
                      onPress={() => toggleTaskCompletion(task.id, task.is_completed)}
                    >
                      <View style={styles.taskContent}>
                        <CheckCircle size={24} color="#10b981" />
                        <View style={styles.taskDetails}>
                          <Text style={[styles.taskTitle, styles.completedTaskTitle]}>
                            {task.description}
                          </Text>
                          <Text style={styles.taskDuration}>
                            {formatDuration(task.duration_minutes)}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/onboarding')}
      >
        <Plus size={24} color="#ffffff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  authButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    paddingTop: 60, // Add space for the badge
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  tasksSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  completedSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  emptyButtonText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  completedTask: {
    backgroundColor: '#f8fafc',
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskDetails: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  completedTaskTitle: {
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  taskDuration: {
    fontSize: 12,
    color: '#9ca3af',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    backgroundColor: '#3b82f6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});