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
      const fallbackResponse = {
        error: 'Invalid JSON in request body',
        complexity: 'Complex Goal',
        debug: 'JSON parsing failed, using fallback'
      }
      
      return new Response(
        JSON.stringify(fallbackResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { input_text } = requestBody as { input_text?: string }
    console.log('📝 Input text:', input_text)

    if (!input_text || typeof input_text !== 'string') {
      console.warn('⚠️ Missing or invalid input_text parameter')
      const fallbackResponse = {
        error: 'Missing or invalid input_text parameter',
        complexity: 'Complex Goal',
        debug: 'Invalid input, using fallback'
      }
      
      return new Response(
        JSON.stringify(fallbackResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Simple complexity analysis logic
    const text = input_text.toLowerCase().trim()
    console.log('🔍 Analyzing text:', text)
    
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

    console.log('✅ Analysis complete:', complexity)
    
    const response = { 
      complexity,
      debug: `Analyzed "${input_text}" - Keywords: complex=${hasComplexKeywords}, simple=${hasSimpleKeywords}, time=${hasTimeIndicator}, length=${text.length}`
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
    
    const errorResponse = {
      error: String(error),
      complexity: 'Complex Goal',
      debug: 'Unexpected error occurred, using fallback'
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