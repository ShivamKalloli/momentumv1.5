import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

interface DailyPlan {
  day: number
  tasks: Array<{
    description: string
    estimated_duration_minutes: number
  }>
}

interface PlanResponse {
  ai_insights: string
  knowledge_gaps: Array<{
    gap: string
    resource_recommendation: string
  }>
  daily_plan: DailyPlan[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📋 Generate plan function called')
    
    // Parse request body safely
    let requestBody = {}
    try {
      const text = await req.text()
      console.log('📥 Raw request body:', text)
      
      if (text && text.trim()) {
        requestBody = JSON.parse(text)
      }
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError)
      return createErrorResponse('JSON parsing failed', 'Default Goal', 30, {})
    }

    const { goal_title, duration_days, answers_to_questions } = requestBody as { 
      goal_title?: string
      duration_days?: number
      answers_to_questions?: Record<string, string>
    }

    console.log('🎯 Goal:', goal_title, 'Duration:', duration_days, 'days')

    if (!goal_title || !duration_days) {
      console.warn('⚠️ Missing required parameters')
      return createErrorResponse('Missing required parameters: goal_title and duration_days', goal_title || 'Default Goal', duration_days || 30, answers_to_questions || {})
    }

    const cleanGoalTitle = goal_title.trim()
    const cleanDurationDays = Math.max(1, Math.floor(duration_days))
    const cleanAnswers = answers_to_questions || {}

    // Try Gemini AI first
    if (GEMINI_API_KEY) {
      try {
        console.log('🤖 Using Gemini AI for plan generation')
        const plan = await generateWithGemini(cleanGoalTitle, cleanDurationDays, cleanAnswers)
        
        return new Response(
          JSON.stringify({ 
            plan,
            debug: `Gemini AI generated ${cleanDurationDays}-day plan for "${cleanGoalTitle}"`,
            ai_powered: true
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } catch (geminiError) {
        console.warn('⚠️ Gemini AI failed, falling back to rule-based plan:', geminiError)
      }
    } else {
      console.warn('⚠️ No Gemini API key found, using rule-based plan')
    }

    // Fallback to rule-based plan
    const plan = generateWithRules(cleanGoalTitle, cleanDurationDays, cleanAnswers)
    
    return new Response(
      JSON.stringify({ 
        plan,
        debug: `Rule-based generation: ${cleanDurationDays}-day plan for "${cleanGoalTitle}"`,
        ai_powered: false
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Error in generate-plan:', error)
    return createErrorResponse('Unexpected error occurred', 'Default Goal', 30, {})
  }
})

async function generateWithGemini(goalTitle: string, durationDays: number, answers: Record<string, string>): Promise<PlanResponse> {
  const answersText = Object.entries(answers)
    .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
    .join('\n\n')

  const prompt = `
You are an expert learning and goal achievement coach. Create a detailed, personalized ${durationDays}-day plan for this goal.

Goal: "${goalTitle}"
Duration: ${durationDays} days

User's answers to questions:
${answersText}

Create a comprehensive plan with:

1. AI Insights: A motivational and strategic overview (2-3 sentences) explaining the approach and why it will work for this person based on their answers.

2. Knowledge Gaps: 3-4 specific areas they need to learn about, with concrete resource recommendations for each.

3. Daily Plan: Specific, actionable tasks for each day that build progressively. Each task should have a realistic time estimate in minutes.

For the daily plan:
- Start with fundamentals and build complexity
- Consider their experience level and available time from their answers
- Make tasks specific and actionable (not vague like "practice coding")
- Include variety to maintain engagement
- Build in review and application opportunities
- Create exactly ${durationDays} days of tasks

Return ONLY a JSON object in this exact format:
{
  "ai_insights": "string",
  "knowledge_gaps": [
    {
      "gap": "specific knowledge area",
      "resource_recommendation": "specific resource or approach"
    }
  ],
  "daily_plan": [
    {
      "day": 1,
      "tasks": [
        {
          "description": "specific task description",
          "estimated_duration_minutes": 30
        }
      ]
    }
  ]
}
`

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  
  if (!result) {
    throw new Error('No response from Gemini')
  }

  try {
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/s)
    if (!jsonMatch) {
      throw new Error('No JSON object found in response')
    }
    
    const plan = JSON.parse(jsonMatch[0])
    
    // Validate the plan structure
    if (!plan.ai_insights || !plan.knowledge_gaps || !plan.daily_plan) {
      throw new Error('Invalid plan structure')
    }
    
    if (!Array.isArray(plan.daily_plan) || plan.daily_plan.length === 0) {
      throw new Error('Invalid daily plan format')
    }
    
    // Ensure we have the correct number of days
    if (plan.daily_plan.length !== durationDays) {
      console.warn(`⚠️ Plan has ${plan.daily_plan.length} days but expected ${durationDays}`)
    }
    
    return plan
  } catch (parseError) {
    throw new Error(`Failed to parse Gemini response: ${parseError}`)
  }
}

function generateWithRules(goalTitle: string, durationDays: number, answers: Record<string, string>): PlanResponse {
  const goal = goalTitle.toLowerCase()
  const answerValues = Object.values(answers).join(' ').toLowerCase()
  
  // Determine experience level and time commitment from answers
  const isBeginnerLevel = answerValues.includes('beginner') || answerValues.includes('no experience') || answerValues.includes('never') || answerValues.includes('new')
  const hasLimitedTime = answerValues.includes('30 minutes') || answerValues.includes('limited') || answerValues.includes('busy') || answerValues.includes('little time')
  const isAdvanced = answerValues.includes('advanced') || answerValues.includes('experienced') || answerValues.includes('expert')
  
  const phases = Math.max(3, Math.ceil(durationDays / 7)) // At least 3 phases
  const daily_plan: DailyPlan[] = []
  
  for (let day = 1; day <= durationDays; day++) {
    const phase = Math.ceil((day / durationDays) * phases)
    const tasks = []
    
    if (goal.includes('learn') || goal.includes('study')) {
      if (goal.includes('python') || goal.includes('programming') || goal.includes('code')) {
        if (phase === 1) { // Foundation phase
          tasks.push({
            description: isBeginnerLevel 
              ? `Learn Python basics: variables, data types, and basic syntax` 
              : `Review Python fundamentals and set up development environment`,
            estimated_duration_minutes: hasLimitedTime ? 45 : 60
          })
          tasks.push({
            description: 'Practice basic Python exercises and syntax',
            estimated_duration_minutes: hasLimitedTime ? 30 : 45
          })
        } else if (phase === 2) { // Practice phase
          tasks.push({
            description: `Learn Python control structures: loops, conditionals, and functions`,
            estimated_duration_minutes: hasLimitedTime ? 60 : 75
          })
          tasks.push({
            description: 'Build small Python projects to practice concepts',
            estimated_duration_minutes: hasLimitedTime ? 30 : 45
          })
        } else { // Application phase
          tasks.push({
            description: `Work on a comprehensive Python project applying all learned concepts`,
            estimated_duration_minutes: hasLimitedTime ? 90 : 120
          })
          tasks.push({
            description: 'Code review and optimization of your Python projects',
            estimated_duration_minutes: 30
          })
        }
      } else if (goal.includes('guitar') || goal.includes('music')) {
        if (phase === 1) { // Foundation phase
          tasks.push({
            description: isBeginnerLevel 
              ? `Learn basic guitar chords and proper holding technique` 
              : `Review fundamental chords and practice chord transitions`,
            estimated_duration_minutes: hasLimitedTime ? 30 : 45
          })
          tasks.push({
            description: 'Practice strumming patterns and rhythm exercises',
            estimated_duration_minutes: hasLimitedTime ? 20 : 30
          })
        } else if (phase === 2) { // Practice phase
          tasks.push({
            description: `Learn new chord progressions and practice chord changes`,
            estimated_duration_minutes: hasLimitedTime ? 45 : 60
          })
          tasks.push({
            description: 'Practice playing simple songs with learned chords',
            estimated_duration_minutes: hasLimitedTime ? 30 : 45
          })
        } else { // Application phase
          tasks.push({
            description: `Learn and practice complete songs, focusing on smooth transitions`,
            estimated_duration_minutes: hasLimitedTime ? 60 : 90
          })
          tasks.push({
            description: 'Record yourself playing and analyze areas for improvement',
            estimated_duration_minutes: 20
          })
        }
      } else {
        // Generic learning goal
        if (phase === 1) { // Foundation phase
          tasks.push({
            description: isBeginnerLevel 
              ? `Learn the fundamentals of ${goalTitle}` 
              : `Review and strengthen foundation knowledge in ${goalTitle}`,
            estimated_duration_minutes: hasLimitedTime ? 45 : 60
          })
          tasks.push({
            description: 'Research additional learning resources and create study plan',
            estimated_duration_minutes: 20
          })
        } else if (phase === 2) { // Practice phase
          tasks.push({
            description: `Practice key concepts and skills in ${goalTitle}`,
            estimated_duration_minutes: hasLimitedTime ? 60 : 75
          })
          tasks.push({
            description: 'Review progress and identify areas for improvement',
            estimated_duration_minutes: 15
          })
        } else { // Application phase
          tasks.push({
            description: `Apply knowledge through projects or real-world scenarios`,
            estimated_duration_minutes: hasLimitedTime ? 90 : 120
          })
          tasks.push({
            description: 'Share progress and seek feedback from community or mentors',
            estimated_duration_minutes: 20
          })
        }
      }
    } else if (goal.includes('fitness') || goal.includes('workout')) {
      if (phase === 1) { // Building routine
        tasks.push({
          description: isBeginnerLevel 
            ? 'Light cardio and basic bodyweight exercises' 
            : 'Establish consistent workout routine with proper warm-up',
          estimated_duration_minutes: hasLimitedTime ? 30 : 45
        })
        tasks.push({
          description: 'Track energy levels, recovery, and progress',
          estimated_duration_minutes: 10
        })
      } else if (phase === 2) { // Intensity building
        tasks.push({
          description: 'Increase workout intensity and add strength training',
          estimated_duration_minutes: hasLimitedTime ? 45 : 60
        })
        tasks.push({
          description: 'Monitor progress and adjust routine based on results',
          estimated_duration_minutes: 15
        })
      } else { // Performance phase
        tasks.push({
          description: 'Challenge workouts with advanced exercises and techniques',
          estimated_duration_minutes: hasLimitedTime ? 60 : 75
        })
        tasks.push({
          description: 'Plan next phase of fitness journey and set new goals',
          estimated_duration_minutes: 15
        })
      }
    } else {
      // Generic goal structure
      if (phase === 1) { // Learning phase
        tasks.push({
          description: isBeginnerLevel 
            ? `Learn the basics of ${goalTitle}` 
            : `Review fundamentals and plan approach for ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 45 : 60
        })
        tasks.push({
          description: 'Research resources and create action plan',
          estimated_duration_minutes: 20
        })
      } else if (phase === 2) { // Practice phase
        tasks.push({
          description: `Practice key skills for ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 60 : 75
        })
        tasks.push({
          description: 'Track progress and adjust approach',
          estimated_duration_minutes: 15
        })
      } else { // Application phase
        tasks.push({
          description: `Apply knowledge and work on ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 90 : 120
        })
        tasks.push({
          description: 'Share progress and get feedback',
          estimated_duration_minutes: 20
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
  
  if (goal.includes('python') || goal.includes('programming')) {
    knowledge_gaps.push(
      {
        gap: 'Python syntax and core programming concepts',
        resource_recommendation: 'Complete Python.org tutorial and practice on platforms like Codecademy or freeCodeCamp'
      },
      {
        gap: 'Problem-solving and algorithmic thinking',
        resource_recommendation: 'Practice coding challenges on LeetCode, HackerRank, or Codewars'
      },
      {
        gap: 'Real-world application and project development',
        resource_recommendation: 'Build projects like web scrapers, data analysis tools, or simple web applications'
      },
      {
        gap: 'Best practices and code organization',
        resource_recommendation: 'Read "Clean Code" by Robert Martin and study open-source Python projects on GitHub'
      }
    )
  } else if (goal.includes('guitar')) {
    knowledge_gaps.push(
      {
        gap: 'Proper technique and finger positioning',
        resource_recommendation: 'Take lessons with a qualified instructor or follow structured online courses like JustinGuitar'
      },
      {
        gap: 'Music theory fundamentals',
        resource_recommendation: 'Learn basic music theory through apps like Yousician or books like "Harmony and Voice Leading"'
      },
      {
        gap: 'Song repertoire and practical application',
        resource_recommendation: 'Learn songs you enjoy and practice with backing tracks from YouTube or apps like Ultimate Guitar'
      },
      {
        gap: 'Ear training and rhythm development',
        resource_recommendation: 'Use apps like Ear Trainer or practice with metronome apps to develop timing and pitch recognition'
      }
    )
  } else if (goal.includes('fitness')) {
    knowledge_gaps.push(
      {
        gap: 'Proper form and exercise technique',
        resource_recommendation: 'Work with a personal trainer or follow reputable fitness YouTubers like Athlean-X or Calisthenic Movement'
      },
      {
        gap: 'Nutrition and recovery principles',
        resource_recommendation: 'Learn about macronutrients, meal planning, and recovery through resources like Precision Nutrition'
      },
      {
        gap: 'Progressive overload and program design',
        resource_recommendation: 'Study strength training principles through books like "Starting Strength" or apps like Strong'
      }
    )
  } else {
    knowledge_gaps.push(
      {
        gap: 'Foundational knowledge and concepts',
        resource_recommendation: 'Find authoritative books, online courses, or tutorials from reputable sources in your field'
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
  }

  return {
    ai_insights: insights,
    knowledge_gaps,
    daily_plan
  }
}

function createErrorResponse(reason: string, goalTitle: string, durationDays: number, answers: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: reason,
      debug: `${reason} - AI service required`,
      ai_powered: false
    }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}