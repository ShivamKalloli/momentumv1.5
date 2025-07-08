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
    const { input_text } = await req.json()

    if (!input_text || typeof input_text !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'Missing or invalid input_text parameter',
          complexity: 'Simple Task' // fallback
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Simple complexity analysis logic
    const text = input_text.toLowerCase().trim()
    
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
    
    let complexity: 'Simple Task' | 'Complex Goal'
    
    if (hasComplexKeywords || hasTimeIndicator || text.length > 100) {
      complexity = 'Complex Goal'
    } else if (hasSimpleKeywords && !hasComplexKeywords && text.length < 50) {
      complexity = 'Simple Task'
    } else {
      // Default based on length and structure
      complexity = text.length < 30 && !text.includes(' to ') ? 'Simple Task' : 'Complex Goal'
    }

    return new Response(
      JSON.stringify({ 
        complexity,
        debug: `Analyzed "${input_text}" - Keywords: complex=${hasComplexKeywords}, simple=${hasSimpleKeywords}, time=${hasTimeIndicator}, length=${text.length}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in analyze-complexity:', error)
    
    return new Response(
      JSON.stringify({ 
        error: String(error),
        complexity: 'Complex Goal', // safe fallback
        debug: 'Error occurred, using fallback'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})