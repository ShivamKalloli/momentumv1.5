import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('❓ Generate questions function called')

    let requestBody = {}
    try {
      const text = await req.text()
      if (text && text.trim()) {
        requestBody = JSON.parse(text)
      }
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError)
      return respondWithFallback('', 'Invalid JSON in request body')
    }

    const { goal_title } = requestBody as { goal_title?: string }

    if (!goal_title || typeof goal_title !== 'string') {
      return respondWithFallback('', 'Missing or invalid goal_title parameter')
    }

    // --- Try the real LLM call first ---
    if (GROQ_API_KEY) {
      try {
        const questions = await generateQuestionsWithLLM(goal_title)
        console.log('✅ Questions generated via Groq LLM')
        return new Response(
          JSON.stringify({ questions, debug: `Generated ${questions.length} questions for "${goal_title}" via LLM` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (llmError) {
        console.warn('⚠️ LLM question generation failed, using fallback:', llmError)
        return respondWithFallback(goal_title, `LLM call failed: ${String(llmError)}`)
      }
    } else {
      console.warn('⚠️ GROQ_API_KEY not set, using fallback')
      return respondWithFallback(goal_title, 'GROQ_API_KEY not configured')
    }
  } catch (error) {
    console.error('💥 Error in generate-questions:', error)
    return respondWithFallback('', `Unexpected error: ${String(error)}`)
  }
})

// ---------------------------------------------------------------------------
// Real LLM-backed question generation
// ---------------------------------------------------------------------------

async function generateQuestionsWithLLM(goalTitle: string): Promise<string[]> {
  const systemPrompt = `You are a goal-planning assistant. Given a user's goal, generate 4-5 clarifying questions that would help build a personalized plan for them.

Respond with ONLY a valid JSON object (no markdown, no code fences) matching this exact shape:
{ "questions": ["string", "string", "string", "string"] }

Rules:
- Questions must be specific to the stated goal (e.g. a guitar goal gets questions about instrument access and musical background, not generic filler).
- Cover: current experience level, realistic time commitment, available resources/support, and how they'll measure success.
- Keep each question to one sentence.`

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      temperature: 0.5,
      max_tokens: 512,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Goal: ${goalTitle}` },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API returned ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  let content: string = data.choices?.[0]?.message?.content ?? ''

  content = content.trim()
  if (content.startsWith('```')) {
    content = content.replace(/^```(json)?/, '').replace(/```$/, '').trim()
  }

  const parsed = JSON.parse(content)

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('LLM response missing valid questions array')
  }

  return parsed.questions
}

// ---------------------------------------------------------------------------
// Fallback (rule-based) — unchanged from before, used only when the LLM
// call is unavailable or fails
// ---------------------------------------------------------------------------

function respondWithFallback(goalTitle: string, reason: string) {
  const questions = generateFallbackQuestions(goalTitle)
  return new Response(
    JSON.stringify({ questions, debug: `Using fallback questions — ${reason}` }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function generateFallbackQuestions(goalTitle: string): string[] {
  const goal = goalTitle.toLowerCase()

  if (goal.includes('learn') || goal.includes('study')) {
    if (goal.includes('code') || goal.includes('program') || goal.includes('software')) {
      return [
        'What is your programming experience level?',
        'Which programming language or technology interests you most?',
        'Do you have a specific project or application in mind?',
        'How much time can you dedicate to coding daily?',
      ]
    }
    return [
      'What is your current knowledge level in this area?',
      'How much time can you dedicate to learning daily?',
      'What learning resources do you prefer (books, videos, courses)?',
      'What specific outcome do you want to achieve?',
    ]
  }

  return [
    'What is your current experience level with this goal?',
    'How much time can you realistically dedicate daily or weekly?',
    'What resources, tools, or support do you have available?',
    'How will you measure success and track progress?',
  ]
}
