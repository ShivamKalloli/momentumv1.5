import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Target, Calendar, Clock, TrendingUp, Plus, MoveVertical as MoreVertical, Play, Pause, Trash2, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { goalService } from '@/lib/goal-service';
import { Goal } from '@/types/database.types';
import { BoltBadge } from '@/components/BoltBadge';

export default function GoalsScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const userGoals = await goalService.getUserGoals();
      setGoals(userGoals);
    } catch (error) {
      console.error('Error loading goals:', error);
      Alert.alert('Error', 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGoals();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user && !authLoading) {
      loadGoals();
    }
  }, [user, authLoading]);

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (endDate?: string): number => {
    if (!endDate) return 0;
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getProgressPercentage = (goal: Goal): number => {
    const today = new Date();
    const start = new Date(goal.start_date);
    const end = goal.end_date ? new Date(goal.end_date) : new Date();
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'paused': return '#f59e0b';
      case 'completed': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <TrendingUp size={12} color="#10b981" />;
      case 'paused': return <Pause size={12} color="#f59e0b" />;
      case 'completed': return <CheckCircle size={12} color="#3b82f6" />;
      case 'cancelled': return <Trash2 size={12} color="#ef4444" />;
      default: return <TrendingUp size={12} color="#6b7280" />;
    }
  };

  const handleGoalAction = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowActionModal(true);
  };

  const handlePauseResume = async () => {
    if (!selectedGoal) return;
    
    try {
      if (selectedGoal.status === 'active') {
        await goalService.pauseGoal(selectedGoal.id);
        Alert.alert('Goal Paused', 'Your goal has been paused. You can resume it anytime.');
      } else if (selectedGoal.status === 'paused') {
        await goalService.resumeGoal(selectedGoal.id);
        Alert.alert('Goal Resumed', 'Your goal is now active again.');
      }
      setShowActionModal(false);
      loadGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
      Alert.alert('Error', 'Failed to update goal status');
    }
  };

  const handleDeleteGoal = async () => {
    if (!selectedGoal) return;
    
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${selectedGoal.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await goalService.deleteGoal(selectedGoal.id);
              setShowActionModal(false);
              loadGoals();
              Alert.alert('Goal Deleted', 'Your goal has been permanently deleted.');
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal');
            }
          }
        }
      ]
    );
  };

  const handleCompleteGoal = async () => {
    if (!selectedGoal) return;
    
    Alert.alert(
      'Mark as Complete',
      `Mark "${selectedGoal.title}" as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await goalService.updateGoalStatus(selectedGoal.id, 'completed');
              setShowActionModal(false);
              loadGoals();
              Alert.alert('Congratulations!', 'Goal marked as completed! 🎉');
            } catch (error) {
              console.error('Error completing goal:', error);
              Alert.alert('Error', 'Failed to mark goal as complete');
            }
          }
        }
      ]
    );
  };

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
          <Target size={48} color="#9ca3af" />
          <Text style={styles.authTitle}>Your Goals Await</Text>
          <Text style={styles.authSubtitle}>Sign in to create and track your goals</Text>
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
            <Text style={styles.title}>Your Goals</Text>
            <Text style={styles.subtitle}>
              {goals.length} {goals.length === 1 ? 'goal' : 'goals'} in progress
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/onboarding')}
          >
            <Plus size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        {/* Goals List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading goals...</Text>
          </View>
        ) : goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Target size={64} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first goal to start your journey
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/onboarding')}
            >
              <Plus size={20} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Create First Goal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.goalsContainer}>
            {goals.map((goal) => {
              const progress = getProgressPercentage(goal);
              const daysRemaining = getDaysRemaining(goal.end_date);
              
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={styles.goalCard}
                  onPress={() => router.push(`/goal-details?id=${goal.id}`)}
                >
                  <View style={styles.goalHeader}>
                    <View style={styles.goalTitleContainer}>
                      <Text style={styles.goalTitle} numberOfLines={2}>
                        {goal.title}
                      </Text>
                      <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => handleGoalAction(goal)}
                      >
                        <MoreVertical size={20} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.goalStats}>
                      <View style={styles.statItem}>
                        <Calendar size={14} color="#6b7280" />
                        <Text style={styles.statText}>
                          {goal.duration_days} days
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Clock size={14} color="#6b7280" />
                        <Text style={styles.statText}>
                          {daysRemaining > 0 ? `${daysRemaining} left` : 'Complete'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.progressSection}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { width: `${progress}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.round(progress)}% complete
                    </Text>
                  </View>

                  <View style={styles.goalFooter}>
                    <Text style={styles.dateText}>
                      Started {formatDate(goal.start_date)}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(goal.status)}15` }]}>
                      {getStatusIcon(goal.status)}
                      <Text style={[styles.statusText, { color: getStatusColor(goal.status) }]}>
                        {goal.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Action Modal */}
      <Modal
        visible={showActionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedGoal?.title}
            </Text>
            
            <View style={styles.actionButtons}>
              {selectedGoal?.status === 'active' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handlePauseResume}
                >
                  <Pause size={20} color="#f59e0b" />
                  <Text style={[styles.actionButtonText, { color: '#f59e0b' }]}>
                    Pause Goal
                  </Text>
                </TouchableOpacity>
              )}
              
              {selectedGoal?.status === 'paused' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handlePauseResume}
                >
                  <Play size={20} color="#10b981" />
                  <Text style={[styles.actionButtonText, { color: '#10b981' }]}>
                    Resume Goal
                  </Text>
                </TouchableOpacity>
              )}
              
              {(selectedGoal?.status === 'active' || selectedGoal?.status === 'paused') && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleCompleteGoal}
                >
                  <CheckCircle size={20} color="#3b82f6" />
                  <Text style={[styles.actionButtonText, { color: '#3b82f6' }]}>
                    Mark Complete
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDeleteGoal}
              >
                <Trash2 size={20} color="#ef4444" />
                <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>
                  Delete Goal
                </Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowActionModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
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
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    paddingTop: 60, // Add space for the badge
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  addButton: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  goalsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  goalCard: {
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
  goalHeader: {
    marginBottom: 16,
  },
  goalTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 24,
    flex: 1,
    marginRight: 8,
  },
  moreButton: {
    padding: 4,
  },
  goalStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    marginBottom: 8,
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
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  actionButtons: {
    gap: 16,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
});