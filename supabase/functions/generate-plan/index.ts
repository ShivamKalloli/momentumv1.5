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
    console.log('📋 Generate plan function called')

    let requestBody = {}
    try {
      const text = await req.text()
      if (text && text.trim()) {
        requestBody = JSON.parse(text)
      }
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError)
      return respondWithFallback('Default Goal', 7, {}, 'Invalid JSON in request body')
    }

    const { goal_title, duration_days, answers_to_questions } = requestBody as {
      goal_title?: string
      duration_days?: number
      answers_to_questions?: Record<string, string>
    }

    if (!goal_title || !duration_days) {
      return respondWithFallback('Default Goal', 7, {}, 'Missing required parameters: goal_title and duration_days')
    }

    // --- Try the real LLM call first ---
    if (GROQ_API_KEY) {
      try {
        const plan = await generatePlanWithLLM(goal_title, duration_days, answers_to_questions || {})
        console.log('✅ Plan generated via Groq LLM')
        return new Response(
          JSON.stringify({ plan, debug: `Generated ${duration_days}-day plan for "${goal_title}" via LLM` }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (llmError) {
        console.warn('⚠️ LLM generation failed, using fallback:', llmError)
        return respondWithFallback(goal_title, duration_days, answers_to_questions || {}, `LLM call failed: ${String(llmError)}`)
      }
    } else {
      console.warn('⚠️ GROQ_API_KEY not set, using fallback')
      return respondWithFallback(goal_title, duration_days, answers_to_questions || {}, 'GROQ_API_KEY not configured')
    }
  } catch (error) {
    console.error('💥 Error in generate-plan:', error)
    return respondWithFallback('Default Goal', 7, {}, `Unexpected error: ${String(error)}`)
  }
})

// ---------------------------------------------------------------------------
// Real LLM-backed plan generation
// ---------------------------------------------------------------------------

async function generatePlanWithLLM(
  goalTitle: string,
  durationDays: number,
  answers: Record<string, string>
) {
  const answersText = Object.entries(answers)
    .map(([q, a]) => `Q: ${q}\nA: ${a}`)
    .join('\n\n')

  const systemPrompt = `You are a personal goal-achievement coach. Given a user's goal, a plan duration, and their answers to clarifying questions, produce a structured day-by-day plan.

Respond with ONLY a valid JSON object (no markdown, no code fences) matching this exact shape:
{
  "ai_insights": "string — a short summary of the plan strategy",
  "knowledge_gaps": [
    { "gap": "string", "resource_recommendation": "string" }
  ],
  "daily_plan": [
    {
      "day": 1,
      "tasks": [
        { "description": "string", "estimated_duration_minutes": 30 }
      ]
    }
  ]
}

Rules:
- daily_plan must have exactly ${durationDays} entries, one per day, "day" 1-indexed.
- Each day should have 1-3 tasks appropriate to the user's stated experience level and time availability.
- Structure the plan in phases (foundation -> practice -> application) across the duration.
- knowledge_gaps should have 2-3 entries specific to this goal, not generic filler.`

  const userPrompt = `Goal: ${goalTitle}
Duration: ${durationDays} days

Clarifying question answers:
${answersText || 'None provided.'}`

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      temperature: 0.4,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Groq API returned ${response.status}: ${await response.text()}`)
  }

  const data = await response.json()
  let content: string = data.choices?.[0]?.message?.content ?? ''

  // Strip markdown code fences if the model added them anyway
  content = content.trim()
  if (content.startsWith('```')) {
    content = content.replace(/^```(json)?/, '').replace(/```$/, '').trim()
  }

  const plan = JSON.parse(content)

  if (!plan.daily_plan || !Array.isArray(plan.daily_plan)) {
    throw new Error('LLM response missing valid daily_plan array')
  }

  return plan
}

// ---------------------------------------------------------------------------
// Fallback (rule-based) — unchanged from before, used only when the LLM
// call is unavailable or fails
// ---------------------------------------------------------------------------

function respondWithFallback(
  goalTitle: string,
  durationDays: number,
  answers: Record<string, string>,
  reason: string
) {
  const plan = generateFallbackPlan(goalTitle, durationDays, answers)
  return new Response(
    JSON.stringify({ plan, debug: `Using fallback plan — ${reason}` }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

function generateFallbackPlan(goalTitle: string, durationDays: number, answers: Record<string, string>) {
  const daily_plan = []

  for (let day = 1; day <= durationDays; day++) {
    daily_plan.push({
      day,
      tasks: [
        { description: `Work on ${goalTitle} - Day ${day}`, estimated_duration_minutes: 45 },
        { description: 'Review progress and plan next steps', estimated_duration_minutes: 15 },
      ],
    })
  }

  return {
    ai_insights: `Your ${durationDays}-day plan for "${goalTitle}" provides a structured approach to achieving your goal. Stay consistent and adjust as needed.`,
    knowledge_gaps: [
      {
        gap: 'Understanding the fundamentals',
        resource_recommendation: 'Research authoritative books, courses, or online resources in this area',
      },
      {
        gap: 'Practical application skills',
        resource_recommendation: 'Find hands-on projects or exercises to practice what you learn',
      },
    ],
    daily_plan,
  }
}
