const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Always wrap in try-catch to guarantee 200 response
  try {
    console.log('🔍 Analyze Complexity Function Called');
    console.log('📋 Request method:', req.method);
    
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    let input_text = '';

    // Safely parse request body
    try {
      const bodyText = await req.text();
      console.log('📝 Raw request body length:', bodyText?.length || 0);
      
      if (bodyText) {
        const requestBody = JSON.parse(bodyText);
        input_text = requestBody?.input_text || '';
      }
    } catch (parseError) {
      console.error('❌ Request parsing error:', parseError.message);
      // Continue with empty input_text
    }

    console.log('📝 Processing input:', input_text);

    // Validate input
    if (!input_text || typeof input_text !== 'string' || input_text.trim().length === 0) {
      console.log('⚠️ Invalid input, using fallback');
      return new Response(
        JSON.stringify({ 
          complexity: 'Complex Goal',
          debug: 'Invalid or missing input - defaulting to Complex Goal'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Check API key
    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    console.log('🔑 API Key available:', !!apiKey);

    if (!apiKey) {
      console.log('⚠️ No API key, using intelligent fallback');
      const complexity = getIntelligentFallbackComplexity(input_text);
      
      return new Response(
        JSON.stringify({ 
          complexity,
          debug: 'API key missing - used intelligent fallback classification'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    // Try AI classification with timeout
    try {
      console.log('🚀 Attempting AI classification...');
      
      const prompt = `Analyze this user input: "${input_text}"

Classify as either "Simple Task" or "Complex Goal":

SIMPLE TASK: Single action, completed quickly, no learning required
Examples: "Call John", "Buy groceries", "Send email"

COMPLEX GOAL: Multiple steps, learning/development, takes time
Examples: "Learn Spanish", "Get fit", "Start business"

Respond with EXACTLY: "Simple Task" or "Complex Goal"`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 10 }
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      console.log('📡 AI response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        console.log('🤖 AI response:', aiResponse);
        
        let complexity: 'Simple Task' | 'Complex Goal';
        if (aiResponse?.includes('Simple Task')) {
          complexity = 'Simple Task';
        } else if (aiResponse?.includes('Complex Goal')) {
          complexity = 'Complex Goal';
        } else {
          complexity = getIntelligentFallbackComplexity(input_text);
        }

        return new Response(
          JSON.stringify({ 
            complexity,
            debug: 'AI classification successful'
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      } else {
        throw new Error(`AI API error: ${response.status}`);
      }

    } catch (aiError) {
      console.error('💥 AI error:', aiError.message);
      const complexity = getIntelligentFallbackComplexity(input_text);
      
      return new Response(
        JSON.stringify({ 
          complexity,
          debug: `AI failed (${aiError.message}) - used intelligent fallback`
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

  } catch (error) {
    console.error('💥 Critical error:', error.message);
    
    return new Response(
      JSON.stringify({ 
        complexity: 'Complex Goal',
        debug: `Critical error: ${error.message}`
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});

function getIntelligentFallbackComplexity(inputText: string): 'Simple Task' | 'Complex Goal' {
  const text = inputText.toLowerCase().trim();
  
  const simpleKeywords = [
    'call', 'email', 'send', 'buy', 'order', 'book', 'schedule',
    'remind', 'text', 'message', 'pick up', 'drop off', 'pay',
    'check', 'review', 'update', 'fix', 'clean', 'organize'
  ];
  
  const complexKeywords = [
    'learn', 'master', 'achieve', 'build', 'create', 'develop',
    'improve', 'plan', 'start', 'launch', 'study', 'practice',
    'train', 'prepare', 'establish', 'design', 'become'
  ];
  
  const timeIndicators = ['days', 'weeks', 'months', 'year', 'daily', 'weekly'];
  
  const hasSimple = simpleKeywords.some(k => text.includes(k));
  const hasComplex = complexKeywords.some(k => text.includes(k));
  const hasTime = timeIndicators.some(k => text.includes(k));
  
  if (hasSimple && !hasComplex && !hasTime && text.length < 50) {
    return 'Simple Task';
  } else if (hasComplex || hasTime || text.length > 100) {
    return 'Complex Goal';
  } else {
    return text.length < 30 ? 'Simple Task' : 'Complex Goal';
  }
}