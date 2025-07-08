import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

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
      return createErrorResponse('JSON parsing failed', 'Default Goal')
    }

    const { goal_title } = requestBody as { goal_title?: string }
    console.log('🎯 Goal title:', goal_title)

    if (!goal_title || typeof goal_title !== 'string' || goal_title.trim().length === 0) {
      console.warn('⚠️ Missing or invalid goal_title parameter')
      return createErrorResponse('Missing or invalid goal_title parameter', goal_title || 'Default Goal')
    }

    const cleanGoalTitle = goal_title.trim()

    // Try Gemini AI first
    if (GEMINI_API_KEY) {
      try {
        console.log('🤖 Using Gemini AI for question generation')
        const questions = await generateWithGemini(cleanGoalTitle)
        
        return new Response(
          JSON.stringify({ 
            questions,
            debug: `Gemini AI generated ${questions.length} questions for: "${cleanGoalTitle}"`,
            ai_powered: true
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } catch (geminiError) {
        console.warn('⚠️ Gemini AI failed, falling back to rule-based questions:', geminiError)
      }
    } else {
      console.warn('⚠️ No Gemini API key found, using rule-based questions')
    }

    // Fallback to rule-based questions
    const questions = generateWithRules(cleanGoalTitle)
    
    return new Response(
      JSON.stringify({ 
        questions,
        debug: `Rule-based generation: ${questions.length} questions for "${cleanGoalTitle}"`,
        ai_powered: false
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Error in generate-questions:', error)
    return createErrorResponse('Unexpected error occurred', 'Default Goal')
  }
})

async function generateWithGemini(goalTitle: string): Promise<string[]> {
  const prompt = `
You are an expert goal-setting coach. Generate 4-5 specific, insightful questions to help someone create a personalized plan for their goal.

Goal: "${goalTitle}"

The questions should help understand:
1. Current experience/skill level
2. Available time and resources
3. Learning preferences or approach
4. Specific outcomes or motivations
5. Potential challenges or constraints

Make the questions specific to this goal type. For example:
- If it's learning a programming language, ask about coding experience, preferred projects, etc.
- If it's fitness, ask about current fitness level, available equipment, etc.
- If it's learning an instrument, ask about musical background, practice time, etc.

Return ONLY a JSON array of question strings, no other text:
["question 1", "question 2", "question 3", "question 4", "question 5"]
`

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
        maxOutputTokens: 500,
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  
  if (!result) {
    throw new Error('No response from Gemini')
  }

  try {
    // Extract JSON from the response
    const jsonMatch = result.match(/\[.*\]/s)
    if (!jsonMatch) {
      throw new Error('No JSON array found in response')
    }
    
    const questions = JSON.parse(jsonMatch[0])
    
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format')
    }
    
    return questions.filter(q => typeof q === 'string' && q.trim().length > 0)
  } catch (parseError) {
    throw new Error(`Failed to parse Gemini response: ${parseError}`)
  }
}

function generateWithRules(goalTitle: string): string[] {
  const goal = goalTitle.toLowerCase()
  
  if (goal.includes('learn') || goal.includes('study')) {
    if (goal.includes('language')) {
      return [
        'What is your current level in this language?',
        'How much time can you dedicate to practice daily?',
        'Do you prefer structured courses or self-study?',
        'What specific skills do you want to focus on most (speaking, writing, reading)?',
        'Do you have any previous experience with similar languages?'
      ]
    } else if (goal.includes('code') || goal.includes('program') || goal.includes('software') || goal.includes('python') || goal.includes('javascript') || goal.includes('dsa') || goal.includes('algorithm')) {
      return [
        'What is your programming experience level?',
        'Which programming language or technology interests you most?',
        'Do you have a specific project or application in mind?',
        'How much time can you dedicate to coding daily?',
        'Do you prefer hands-on projects or structured tutorials?'
      ]
    } else if (goal.includes('guitar') || goal.includes('piano') || goal.includes('music') || goal.includes('instrument')) {
      return [
        'What is your current musical experience level?',
        'How much time can you dedicate to practice daily?',
        'Do you have access to an instrument?',
        'What style of music interests you most?',
        'Do you prefer learning songs or focusing on technique?'
      ]
    } else {
      return [
        'What is your current knowledge level in this area?',
        'How much time can you dedicate to learning daily?',
        'What learning resources do you prefer (books, videos, courses)?',
        'What specific outcome do you want to achieve?',
        'Do you learn better alone or with others?'
      ]
    }
  } else if (goal.includes('fitness') || goal.includes('workout') || goal.includes('run') || goal.includes('exercise')) {
    return [
      'What is your current fitness level?',
      'How many days per week can you realistically exercise?',
      'Do you have access to a gym or prefer home workouts?',
      'What is your main motivation for this fitness goal?',
      'Do you have any physical limitations or injuries to consider?'
    ]
  } else if (goal.includes('business') || goal.includes('startup') || goal.includes('entrepreneur')) {
    return [
      'What is your relevant experience in business or this industry?',
      'What resources or budget do you have available?',
      'What is your target timeline for initial results?',
      'Who is your target audience or market?',
      'What is your biggest concern or challenge with this goal?'
    ]
  } else {
    return [
      'What is your current experience level with this goal?',
      'How much time can you realistically dedicate daily or weekly?',
      'What resources, tools, or support do you have available?',
      'How will you measure success and track progress?',
      'What is your main motivation for achieving this goal?'
    ]
  }
}

function createErrorResponse(reason: string, goalTitle: string) {
  const fallbackQuestions = [
    'What is your current experience level with this goal?',
    'How much time can you realistically dedicate daily?',
    'What resources or support do you have available?',
    'How will you measure success and stay motivated?'
  ]
  
  return new Response(
    JSON.stringify({
      error: reason,
      questions: fallbackQuestions,
      debug: `${reason}, using fallback questions`,
      ai_powered: false
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}