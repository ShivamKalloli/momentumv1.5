import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Target, MessageSquare, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { goalService } from '@/lib/goal-service';
import { BoltBadge } from '@/components/BoltBadge';

type OnboardingStep = 'input' | 'duration' | 'questions' | 'generating';

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState<OnboardingStep>('input');
  const [goalInput, setGoalInput] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleGoalSubmit = async () => {
    if (!goalInput.trim()) {
      Alert.alert('Error', 'Please enter your goal');
      return;
    }

    try {
      setLoading(true);
      const result = await goalService.createGoal(goalInput, durationDays);
      
      if (result.isSimpleTask) {
        Alert.alert(
          'Task Added!',
          'Your task has been added to today\'s list.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
        );
      } else if (result.questions) {
        setQuestions(result.questions);
        setStep('questions');
      }
    } catch (error) {
      console.error('Error creating goal:', error);
      Alert.alert('Error', 'Failed to process your goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = () => {
    const currentAnswer = answers[currentQuestionIndex];
    if (!currentAnswer?.trim()) {
      Alert.alert('Please provide an answer', 'This helps us create a better plan for you.');
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      generatePlan();
    }
  };

  const generatePlan = async () => {
    try {
      setStep('generating');
      setLoading(true);
      
      const questionAnswers: Record<string, string> = {};
      questions.forEach((question, index) => {
        questionAnswers[question] = answers[index] || '';
      });

      await goalService.createComplexGoal(goalInput, durationDays, questionAnswers);
      
      Alert.alert(
        'Plan Created!',
        'Your personalized plan is ready. Check out today\'s tasks!',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error) {
      console.error('Error generating plan:', error);
      Alert.alert('Error', 'Failed to create your plan. Please try again.');
      setStep('questions');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'questions' && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (step === 'questions') {
      setStep('duration');
    } else if (step === 'duration') {
      setStep('input');
    } else {
      router.back();
    }
  };

  const renderInputStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Target size={32} color="#3b82f6" />
        <Text style={styles.stepTitle}>What's your goal?</Text>
        <Text style={styles.stepSubtitle}>
          Tell me what you want to achieve. I'll help you create a plan.
        </Text>
      </View>

      <View style={styles.inputSection}>
        <TextInput
          style={styles.goalInput}
          placeholder="e.g., Learn to play guitar, Run a marathon, Start a business..."
          value={goalInput}
          onChangeText={setGoalInput}
          multiline
          autoFocus
        />
        
        <TouchableOpacity
          style={[styles.continueButton, !goalInput.trim() && styles.disabledButton]}
          onPress={() => setStep('duration')}
          disabled={!goalInput.trim()}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDurationStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>How long do you want to work on this?</Text>
        <Text style={styles.stepSubtitle}>
          Choose a realistic timeframe for your goal.
        </Text>
      </View>

      <View style={styles.durationSection}>
        <View style={styles.durationOptions}>
          {[7, 14, 30, 60, 90].map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.durationOption,
                durationDays === days && styles.selectedDuration
              ]}
              onPress={() => setDurationDays(days)}
            >
              <Text style={[
                styles.durationText,
                durationDays === days && styles.selectedDurationText
              ]}>
                {days} days
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.customDurationContainer}>
          <Text style={styles.customDurationLabel}>Or enter custom duration:</Text>
          <TextInput
            style={styles.customDurationInput}
            value={durationDays.toString()}
            onChangeText={(text) => {
              const days = parseInt(text) || 1;
              setDurationDays(Math.max(1, Math.min(365, days)));
            }}
            keyboardType="numeric"
            placeholder="Days"
          />
          <Text style={styles.customDurationSuffix}>days</Text>
        </View>

        <TouchableOpacity
          style={[styles.continueButton, loading && styles.disabledButton]}
          onPress={handleGoalSubmit}
          disabled={loading}
        >
          <Text style={styles.continueButtonText}>
            {loading ? 'Analyzing...' : 'Create Plan'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderQuestionsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <MessageSquare size={32} color="#3b82f6" />
        <Text style={styles.stepTitle}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Text>
        <Text style={styles.stepSubtitle}>
          {questions[currentQuestionIndex]}
        </Text>
      </View>

      <View style={styles.questionSection}>
        <TextInput
          style={styles.answerInput}
          placeholder="Type your answer here..."
          value={answers[currentQuestionIndex] || ''}
          onChangeText={(text) => setAnswers({
            ...answers,
            [currentQuestionIndex]: text
          })}
          multiline
          autoFocus
        />

        <View style={styles.questionProgress}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {currentQuestionIndex + 1} of {questions.length}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            !answers[currentQuestionIndex]?.trim() && styles.disabledButton
          ]}
          onPress={handleAnswerSubmit}
          disabled={!answers[currentQuestionIndex]?.trim()}
        >
          <Text style={styles.continueButtonText}>
            {currentQuestionIndex === questions.length - 1 ? 'Create Plan' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGeneratingStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Sparkles size={32} color="#3b82f6" />
        <Text style={styles.stepTitle}>Creating Your Plan</Text>
        <Text style={styles.stepSubtitle}>
          I'm analyzing your goal and crafting a personalized plan...
        </Text>
      </View>

      <View style={styles.generatingSection}>
        <View style={styles.loadingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
        <Text style={styles.generatingText}>This may take a moment</Text>
      </View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <BoltBadge position="top-right" size={35} />
        <View style={styles.authPrompt}>
          <Text style={styles.authTitle}>Sign in required</Text>
          <Text style={styles.authSubtitle}>
            Please sign in to create goals and plans
          </Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.authButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <BoltBadge position="top-right" size={35} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Goal</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 'input' && renderInputStep()}
          {step === 'duration' && renderDurationStep()}
          {step === 'questions' && renderQuestionsStep()}
          {step === 'generating' && renderGeneratingStep()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60, // Add space for the badge
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  backButton: {
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
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  inputSection: {
    gap: 24,
  },
  goalInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 120,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  durationSection: {
    gap: 24,
  },
  durationOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  durationOption: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  selectedDuration: {
    borderColor: '#3b82f6',
    backgroundColor: '#f0f9ff',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedDurationText: {
    color: '#3b82f6',
  },
  customDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  customDurationLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  customDurationInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    textAlign: 'center',
    width: 60,
  },
  customDurationSuffix: {
    fontSize: 14,
    color: '#6b7280',
  },
  questionSection: {
    gap: 24,
  },
  answerInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 120,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  questionProgress: {
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  generatingSection: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 24,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  generatingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  continueButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
});