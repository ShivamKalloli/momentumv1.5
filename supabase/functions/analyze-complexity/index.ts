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
    console.log('🔍 Analyze complexity function called')
    
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
      return createFallbackResponse('JSON parsing failed')
    }

    const { input_text } = requestBody as { input_text?: string }
    console.log('📝 Input text:', input_text)

    if (!input_text || typeof input_text !== 'string' || input_text.trim().length === 0) {
      console.warn('⚠️ Missing or invalid input_text parameter')
      return createFallbackResponse('Invalid input')
    }

    // Try Gemini AI first
    if (GEMINI_API_KEY) {
      try {
        console.log('🤖 Using Gemini AI for complexity analysis')
        const complexity = await analyzeWithGemini(input_text.trim())
        
        const response = { 
          complexity,
          debug: `Gemini AI analyzed "${input_text}" as ${complexity}`,
          ai_powered: true
        }

        return new Response(
          JSON.stringify(response),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } catch (geminiError) {
        console.warn('⚠️ Gemini AI failed, falling back to rule-based analysis:', geminiError)
      }
    } else {
      console.warn('⚠️ No Gemini API key found, using rule-based analysis')
    }

    // Fallback to rule-based analysis
    const complexity = analyzeWithRules(input_text.trim())
    
    const response = { 
      complexity,
      debug: `Rule-based analysis: "${input_text}" classified as ${complexity}`,
      ai_powered: false
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Error in analyze-complexity:', error)
    return createFallbackResponse('Unexpected error occurred')
  }
})

async function analyzeWithGemini(inputText: string): Promise<'Simple Task' | 'Complex Goal'> {
  const prompt = `
Analyze the following user input and determine if it's a "Simple Task" or "Complex Goal":

Simple Task: Something that can be completed in one session, typically within a few hours. Examples:
- "Call the dentist"
- "Buy groceries"
- "Send email to John"
- "Pay electricity bill"
- "Clean the kitchen"

Complex Goal: Something that requires multiple steps, learning, or extended time to achieve. Examples:
- "Learn Python programming"
- "Get fit and lose weight"
- "Start a business"
- "Learn to play guitar"
- "Master data structures and algorithms"

User input: "${inputText}"

Respond with ONLY "Simple Task" or "Complex Goal" - no other text.
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
        temperature: 0.1,
        maxOutputTokens: 10,
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  
  if (result === 'Simple Task' || result === 'Complex Goal') {
    return result
  }
  
  throw new Error(`Invalid Gemini response: ${result}`)
}

function analyzeWithRules(inputText: string): 'Simple Task' | 'Complex Goal' {
  const text = inputText.toLowerCase().trim()
  
  // Complex goal indicators
  const complexKeywords = [
    'learn', 'master', 'achieve', 'build', 'create', 'develop',
    'improve', 'plan', 'start', 'launch', 'study', 'practice',
    'train', 'prepare', 'establish', 'design', 'become',
    'understand', 'explore', 'discover', 'research', 'career',
    'business', 'skill', 'habit', 'fitness', 'health'
  ]
  
  // Simple task indicators
  const simpleKeywords = [
    'call', 'email', 'send', 'buy', 'order', 'book', 'schedule',
    'remind', 'text', 'message', 'pick up', 'drop off', 'pay',
    'check', 'review', 'update', 'fix', 'clean', 'organize',
    'submit', 'download', 'upload', 'install', 'delete'
  ]
  
  // Time indicators suggest complexity
  const timeIndicators = ['days', 'weeks', 'months', 'year', 'daily', 'weekly', 'monthly']
  const hasTimeIndicator = timeIndicators.some(indicator => text.includes(indicator))
  
  // Check for keywords
  const hasComplexKeywords = complexKeywords.some(keyword => text.includes(keyword))
  const hasSimpleKeywords = simpleKeywords.some(keyword => text.includes(keyword))
  
  if (hasComplexKeywords || hasTimeIndicator || text.length > 100) {
    return 'Complex Goal'
  } else if (hasSimpleKeywords && !hasComplexKeywords && text.length < 50) {
    return 'Simple Task'
  } else {
    // Default based on length and structure
    return text.length < 30 && !text.includes(' to ') ? 'Simple Task' : 'Complex Goal'
  }
}

function createFallbackResponse(reason: string) {
  const fallbackResponse = {
    error: reason,
    complexity: 'Complex Goal' as const,
    debug: `${reason}, using fallback`,
    ai_powered: false
  }
  
  return new Response(
    JSON.stringify(fallbackResponse),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}