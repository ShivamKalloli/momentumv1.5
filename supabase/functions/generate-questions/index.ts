import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

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
    console.log('❓ Generate questions function called')
    
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
      const fallbackResponse = {
        error: 'Invalid JSON in request body',
        questions: [
          'What is your current experience level with this goal?',
          'How much time can you realistically dedicate daily?',
          'What resources or support do you have available?',
          'How will you measure success and stay motivated?'
        ],
        debug: 'JSON parsing failed, using fallback questions'
      }
      
      return new Response(
        JSON.stringify(fallbackResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { goal_title } = requestBody as { goal_title?: string }
    console.log('🎯 Goal title:', goal_title)

    if (!goal_title || typeof goal_title !== 'string') {
      console.warn('⚠️ Missing or invalid goal_title parameter')
      const fallbackResponse = {
        error: 'Missing or invalid goal_title parameter',
        questions: [
          'What is your current experience level with this goal?',
          'How much time can you realistically dedicate daily?',
          'What resources or support do you have available?',
          'How will you measure success and stay motivated?'
        ],
        debug: 'Invalid goal title, using fallback questions'
      }
      
      return new Response(
        JSON.stringify(fallbackResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate questions based on goal type
    const goal = goal_title.toLowerCase()
    let questions: string[] = []

    console.log('🔍 Analyzing goal type for:', goal)

    if (goal.includes('learn') || goal.includes('study')) {
      if (goal.includes('language')) {
        questions = [
          'What is your current level in this language?',
          'How much time can you dedicate to practice daily?',
          'Do you prefer structured courses or self-study?',
          'What specific skills do you want to focus on most (speaking, writing, reading)?',
          'Do you have any previous experience with similar languages?'
        ]
      } else if (goal.includes('code') || goal.includes('program') || goal.includes('software') || goal.includes('python') || goal.includes('javascript') || goal.includes('dsa') || goal.includes('algorithm')) {
        questions = [
          'What is your programming experience level?',
          'Which programming language or technology interests you most?',
          'Do you have a specific project or application in mind?',
          'How much time can you dedicate to coding daily?',
          'Do you prefer hands-on projects or structured tutorials?'
        ]
      } else if (goal.includes('guitar') || goal.includes('piano') || goal.includes('music') || goal.includes('instrument')) {
        questions = [
          'What is your current musical experience level?',
          'How much time can you dedicate to practice daily?',
          'Do you have access to an instrument?',
          'What style of music interests you most?',
          'Do you prefer learning songs or focusing on technique?'
        ]
      } else {
        questions = [
          'What is your current knowledge level in this area?',
          'How much time can you dedicate to learning daily?',
          'What learning resources do you prefer (books, videos, courses)?',
          'What specific outcome do you want to achieve?',
          'Do you learn better alone or with others?'
        ]
      }
    } else if (goal.includes('fitness') || goal.includes('workout') || goal.includes('run') || goal.includes('exercise')) {
      questions = [
        'What is your current fitness level?',
        'How many days per week can you realistically exercise?',
        'Do you have access to a gym or prefer home workouts?',
        'What is your main motivation for this fitness goal?',
        'Do you have any physical limitations or injuries to consider?'
      ]
    } else if (goal.includes('business') || goal.includes('startup') || goal.includes('entrepreneur')) {
      questions = [
        'What is your relevant experience in business or this industry?',
        'What resources or budget do you have available?',
        'What is your target timeline for initial results?',
        'Who is your target audience or market?',
        'What is your biggest concern or challenge with this goal?'
      ]
    } else if (goal.includes('habit') || goal.includes('routine')) {
      questions = [
        'What time of day works best for building this habit?',
        'What has prevented you from doing this consistently before?',
        'How will you track your progress?',
        'What will motivate you to stick with this habit?',
        'How will you handle setbacks or missed days?'
      ]
    } else if (goal.includes('career') || goal.includes('job') || goal.includes('promotion')) {
      questions = [
        'What is your current role and experience level?',
        'What specific skills do you need to develop?',
        'What is your target timeline for this career goal?',
        'Who can mentor or support you in this journey?',
        'What are the biggest obstacles you anticipate?'
      ]
    } else {
      // Generic questions for any goal
      questions = [
        'What is your current experience level with this goal?',
        'How much time can you realistically dedicate daily or weekly?',
        'What resources, tools, or support do you have available?',
        'How will you measure success and track progress?',
        'What is your main motivation for achieving this goal?'
      ]
    }

    console.log('✅ Generated', questions.length, 'questions')

    const response = { 
      questions,
      debug: `Generated ${questions.length} questions for goal: "${goal_title}"`
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Error in generate-questions:', error)
    
    // Fallback questions
    const fallbackQuestions = [
      'What is your current experience level with this goal?',
      'How much time can you realistically dedicate daily?',
      'What resources or support do you have available?',
      'How will you measure success and stay motivated?'
    ]
    
    const errorResponse = {
      error: String(error),
      questions: fallbackQuestions,
      debug: 'Unexpected error occurred, using fallback questions'
    }
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})