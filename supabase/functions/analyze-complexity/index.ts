const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  console.log('🔍 Analyze Complexity Function Called');
  console.log('📋 Request method:', req.method);
  console.log('🌐 Request URL:', req.url);
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Log environment variables (without exposing the key)
    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    console.log('🔑 API Key status:', apiKey ? `Available (${apiKey.substring(0, 10)}...)` : 'Missing');
    console.log('🌍 All env vars:', Object.keys(Deno.env.toObject()));

    if (!apiKey) {
      console.error('❌ Google AI API key not found in environment');
      return new Response(
        JSON.stringify({ 
          error: 'Google AI API key not configured',
          complexity: 'Complex Goal' // Safe fallback
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const requestBody = await req.json();
    const { input_text } = requestBody;
    
    console.log('📝 Input received:', input_text);

    if (!input_text || typeof input_text !== 'string') {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input: input_text is required and must be a string',
          complexity: 'Complex Goal'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const prompt = `You are an intelligent task analyzer. Analyze this user input: "${input_text}"

Classify it as either "Simple Task" or "Complex Goal" based on these criteria:

SIMPLE TASK:
- Single, immediate action that can be completed quickly (within a day)
- No learning or skill development required
- Direct, actionable items
- Examples: "Call John", "Buy groceries", "Send email", "Book appointment", "Pay bills"

COMPLEX GOAL:
- Requires multiple steps over time
- Involves learning, skill development, or planning
- Takes days, weeks, or months to achieve
- Requires breaking down into smaller tasks
- Examples: "Learn Spanish", "Get fit", "Start a business", "Learn to code", "Write a book"

Respond with EXACTLY one of these two phrases:
- "Simple Task"
- "Complex Goal"

Nothing else.`;

    console.log('🚀 Making request to Gemini API...');
    
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10,
          }
        })
      }
    );

    console.log('📡 Gemini API response status:', geminiResponse.status);
    console.log('📡 Gemini API response headers:', Object.fromEntries(geminiResponse.headers.entries()));

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Gemini API error:', geminiResponse.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Gemini API error: ${geminiResponse.status}`,
          details: errorText,
          complexity: 'Complex Goal'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log('🤖 Full Gemini response:', JSON.stringify(geminiData, null, 2));
    
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    console.log('🤖 AI Response:', aiResponse);
    
    let complexity: 'Simple Task' | 'Complex Goal';
    
    if (aiResponse?.includes('Simple Task')) {
      complexity = 'Simple Task';
    } else if (aiResponse?.includes('Complex Goal')) {
      complexity = 'Complex Goal';
    } else {
      console.log('⚠️ AI response unclear, using intelligent fallback');
      
      const text = input_text.toLowerCase().trim();
      const simpleKeywords = ['call', 'email', 'send', 'buy', 'order', 'book', 'schedule', 'remind', 'text', 'message', 'pick up', 'drop off', 'pay', 'check', 'review', 'update', 'fix', 'clean', 'organize'];
      const complexKeywords = ['learn', 'master', 'achieve', 'build', 'create', 'develop', 'improve', 'plan', 'start', 'launch', 'study', 'practice', 'train', 'prepare', 'establish', 'design', 'become'];
      const timeIndicators = ['days', 'weeks', 'months', 'year', 'daily', 'weekly', 'monthly'];
      
      const hasTimeIndicator = timeIndicators.some(indicator => text.includes(indicator));
      const hasSimpleKeywords = simpleKeywords.some(keyword => text.includes(keyword));
      const hasComplexKeywords = complexKeywords.some(keyword => text.includes(keyword));
      
      if (hasSimpleKeywords && !hasComplexKeywords && !hasTimeIndicator && text.length < 50) {
        complexity = 'Simple Task';
      } else if (hasComplexKeywords || hasTimeIndicator || text.length > 100) {
        complexity = 'Complex Goal';
      } else {
        complexity = text.length < 30 && !text.includes(' to ') ? 'Simple Task' : 'Complex Goal';
      }
    }

    console.log('✅ Final classification:', complexity);

    return new Response(
      JSON.stringify({ complexity }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('💥 Error in analyze-complexity:', error);
    console.error('💥 Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze complexity',
        message: error.message,
        stack: error.stack,
        complexity: 'Complex Goal' // Safe default
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});