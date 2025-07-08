import { serve } from "std/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { goal_title, duration_days, answers_to_questions } = await req.json()

    if (!goal_title || !duration_days) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: goal_title and duration_days',
          plan: generateFallbackPlan('Default Goal', 7, {})
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const plan = generatePlan(goal_title, duration_days, answers_to_questions || {})

    return new Response(
      JSON.stringify({ 
        plan,
        debug: `Generated ${duration_days}-day plan for "${goal_title}"`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in generate-plan:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        plan: generateFallbackPlan('Default Goal', 7, {}),
        debug: 'Error occurred, using fallback plan'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generatePlan(goalTitle: string, durationDays: number, answers: Record<string, string>) {
  const goal = goalTitle.toLowerCase()
  const answerValues = Object.values(answers).join(' ').toLowerCase()
  
  // Determine experience level and time commitment from answers
  const isBeginnerLevel = answerValues.includes('beginner') || answerValues.includes('no experience') || answerValues.includes('never') || answerValues.includes('new')
  const hasLimitedTime = answerValues.includes('30 minutes') || answerValues.includes('limited') || answerValues.includes('busy') || answerValues.includes('little time')
  const isAdvanced = answerValues.includes('advanced') || answerValues.includes('experienced') || answerValues.includes('expert')
  
  const phases = Math.max(3, Math.ceil(durationDays / 7)) // At least 3 phases
  const daily_plan = []
  
  for (let day = 1; day <= durationDays; day++) {
    const phase = Math.ceil((day / durationDays) * phases)
    const tasks = []
    
    if (goal.includes('learn') || goal.includes('study')) {
      if (phase === 1) { // Foundation phase
        tasks.push({
          description: isBeginnerLevel 
            ? `Learn the fundamentals of ${goalTitle}` 
            : `Review and strengthen foundation knowledge in ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 30 : 45
        })
        if (!hasLimitedTime) {
          tasks.push({
            description: 'Research additional learning resources and create study plan',
            estimated_duration_minutes: 15
          })
        }
      } else if (phase === 2) { // Practice phase
        tasks.push({
          description: `Practice key concepts and skills in ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 45 : 60
        })
        tasks.push({
          description: 'Review progress and identify areas for improvement',
          estimated_duration_minutes: 15
        })
      } else { // Application phase
        tasks.push({
          description: `Apply knowledge through projects or real-world scenarios`,
          estimated_duration_minutes: hasLimitedTime ? 60 : 90
        })
        tasks.push({
          description: 'Share progress and seek feedback from community or mentors',
          estimated_duration_minutes: 15
        })
      }
    } else if (goal.includes('fitness') || goal.includes('workout')) {
      if (phase === 1) { // Building routine
        tasks.push({
          description: isBeginnerLevel 
            ? 'Light exercise and form practice' 
            : 'Establish consistent workout routine',
          estimated_duration_minutes: hasLimitedTime ? 20 : 30
        })
        tasks.push({
          description: 'Track energy levels and recovery',
          estimated_duration_minutes: 5
        })
      } else if (phase === 2) { // Intensity building
        tasks.push({
          description: 'Increase workout intensity and duration',
          estimated_duration_minutes: hasLimitedTime ? 30 : 45
        })
        tasks.push({
          description: 'Monitor progress and adjust routine',
          estimated_duration_minutes: 10
        })
      } else { // Performance phase
        tasks.push({
          description: 'Challenge workouts and skill development',
          estimated_duration_minutes: hasLimitedTime ? 45 : 60
        })
        tasks.push({
          description: 'Plan next phase of fitness journey',
          estimated_duration_minutes: 10
        })
      }
    } else if (goal.includes('business') || goal.includes('startup')) {
      if (phase === 1) { // Planning phase
        tasks.push({
          description: 'Research market and develop business plan',
          estimated_duration_minutes: hasLimitedTime ? 60 : 90
        })
        tasks.push({
          description: 'Network and connect with potential mentors',
          estimated_duration_minutes: 30
        })
      } else if (phase === 2) { // Development phase
        tasks.push({
          description: 'Build MVP or core business components',
          estimated_duration_minutes: hasLimitedTime ? 90 : 120
        })
        tasks.push({
          description: 'Test ideas with potential customers',
          estimated_duration_minutes: 30
        })
      } else { // Launch phase
        tasks.push({
          description: 'Execute launch strategy and marketing',
          estimated_duration_minutes: hasLimitedTime ? 120 : 180
        })
        tasks.push({
          description: 'Analyze results and plan next steps',
          estimated_duration_minutes: 30
        })
      }
    } else {
      // Generic goal structure
      if (phase === 1) { // Learning phase
        tasks.push({
          description: isBeginnerLevel 
            ? `Learn the basics of ${goalTitle}` 
            : `Review fundamentals and plan approach for ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 30 : 45
        })
        if (!hasLimitedTime) {
          tasks.push({
            description: 'Research resources and create action plan',
            estimated_duration_minutes: 15
          })
        }
      } else if (phase === 2) { // Practice phase
        tasks.push({
          description: `Practice key skills for ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 45 : 60
        })
        tasks.push({
          description: 'Track progress and adjust approach',
          estimated_duration_minutes: 15
        })
      } else { // Application phase
        tasks.push({
          description: `Apply knowledge and work on ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 60 : 90
        })
        tasks.push({
          description: 'Share progress and get feedback',
          estimated_duration_minutes: 15
        })
      }
    }
    
    daily_plan.push({ day, tasks })
  }

  // Generate insights based on goal and answers
  let insights = `Your ${durationDays}-day plan for "${goalTitle}" is structured in ${phases} phases. `
  
  if (isBeginnerLevel) {
    insights += 'Starting with fundamentals will build a strong foundation for long-term success. '
  } else if (isAdvanced) {
    insights += 'Building on your existing expertise will accelerate your progress significantly. '
  }
  
  if (hasLimitedTime) {
    insights += 'The plan is optimized for your busy schedule with focused, efficient sessions. '
  }
  
  insights += 'Stay consistent, track your progress, and adjust the plan as you learn what works best for you.'

  // Generate knowledge gaps based on goal type
  const knowledge_gaps = []
  
  if (goal.includes('learn') || goal.includes('study')) {
    knowledge_gaps.push(
      {
        gap: 'Foundational knowledge and concepts',
        resource_recommendation: 'Find authoritative books, online courses, or tutorials from reputable sources'
      },
      {
        gap: 'Practical application skills',
        resource_recommendation: 'Seek hands-on projects, exercises, or real-world practice opportunities'
      },
      {
        gap: 'Community and mentorship',
        resource_recommendation: 'Join online communities, forums, or find mentors in this field'
      }
    )
  } else if (goal.includes('fitness')) {
    knowledge_gaps.push(
      {
        gap: 'Proper form and technique',
        resource_recommendation: 'Work with a trainer or use video tutorials to learn correct form'
      },
      {
        gap: 'Nutrition and recovery knowledge',
        resource_recommendation: 'Research nutrition basics and recovery strategies for your fitness goals'
      },
      {
        gap: 'Progressive overload principles',
        resource_recommendation: 'Learn how to safely increase intensity and avoid plateaus'
      }
    )
  } else if (goal.includes('business')) {
    knowledge_gaps.push(
      {
        gap: 'Market research and validation',
        resource_recommendation: 'Learn customer discovery techniques and market analysis methods'
      },
      {
        gap: 'Business operations and legal knowledge',
        resource_recommendation: 'Consult with business advisors or take courses on business fundamentals'
      },
      {
        gap: 'Marketing and customer acquisition',
        resource_recommendation: 'Study digital marketing strategies and customer acquisition channels'
      }
    )
  } else {
    knowledge_gaps.push(
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
    )
  }

  return {
    ai_insights: insights,
    knowledge_gaps,
    daily_plan
  }
}

function generateFallbackPlan(goalTitle: string, durationDays: number, answers: Record<string, string>) {
  const daily_plan = []
  
  for (let day = 1; day <= durationDays; day++) {
    daily_plan.push({
      day,
      tasks: [
        {
          description: `Work on ${goalTitle} - Day ${day}`,
          estimated_duration_minutes: 45
        },
        {
          description: 'Review progress and plan next steps',
          estimated_duration_minutes: 15
        }
      ]
    })
  }

  return {
    ai_insights: `Your ${durationDays}-day plan for "${goalTitle}" provides a structured approach to achieving your goal. Stay consistent and adjust as needed.`,
    knowledge_gaps: [
      {
        gap: 'Understanding the fundamentals',
        resource_recommendation: 'Research authoritative books, courses, or online resources in this area'
      },
      {
        gap: 'Practical application skills',
        resource_recommendation: 'Find hands-on projects or exercises to practice what you learn'
      }
    ],
    daily_plan
  }
}