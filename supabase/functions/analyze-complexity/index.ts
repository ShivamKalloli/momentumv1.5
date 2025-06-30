const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  console.log('🔍 Analyze Complexity Function Called');
  console.log('📋 Request method:', req.method);
  console.log('🌐 Request URL:', req.url);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Wrap everything in try-catch to ensure we always return 200
  try {
    let requestBody;
    let input_text = '';

    // Parse request body with fallback
    try {
      const bodyText = await req.text();
      console.log('📝 Raw request body:', bodyText);
      
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
        input_text = requestBody?.input_text || '';
      }
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      input_text = 'default goal'; // Use default to continue processing
    }

    console.log('📝 Input received:', input_text);

    // Validate input with fallback
    if (!input_text || typeof input_text !== 'string' || input_text.trim().length === 0) {
      console.log('❌ Invalid input, using fallback');
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

    // Get API key
    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    console.log('🔑 API Key status:', apiKey ? `Available (${apiKey.substring(0, 10)}...)` : 'Missing');

    // If no API key, use intelligent fallback
    if (!apiKey) {
      console.log('⚠️ No API key found, using intelligent fallback');
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

    // Try AI classification
    try {
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
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
      
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
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      console.log('📡 Gemini API response status:', geminiResponse.status);

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error('❌ Gemini API error:', geminiResponse.status, errorText);
        
        const complexity = getIntelligentFallbackComplexity(input_text);
        return new Response(
          JSON.stringify({ 
            complexity,
            debug: `Gemini API error ${geminiResponse.status} - used intelligent fallback`
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

      const geminiData = await geminiResponse.json();
      const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      console.log('🤖 AI Response:', aiResponse);
      
      let complexity: 'Simple Task' | 'Complex Goal';
      
      if (aiResponse?.includes('Simple Task')) {
        complexity = 'Simple Task';
      } else if (aiResponse?.includes('Complex Goal')) {
        complexity = 'Complex Goal';
      } else {
        console.log('⚠️ AI response unclear, using intelligent fallback');
        complexity = getIntelligentFallbackComplexity(input_text);
      }

      console.log('✅ Final classification:', complexity);

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

    } catch (aiError) {
      console.error('💥 AI request error:', aiError);
      
      const complexity = getIntelligentFallbackComplexity(input_text);
      return new Response(
        JSON.stringify({ 
          complexity,
          debug: 'AI request failed - used intelligent fallback'
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
    console.error('💥 Critical error in analyze-complexity:', error);
    
    // Ultimate fallback - always return something
    return new Response(
      JSON.stringify({ 
        complexity: 'Complex Goal',
        debug: 'Critical error - defaulting to Complex Goal'
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
  
  // Simple task indicators
  const simpleKeywords = [
    'call', 'email', 'send', 'buy', 'order', 'book', 'schedule',
    'remind', 'text', 'message', 'pick up', 'drop off', 'pay',
    'check', 'review', 'update', 'fix', 'clean', 'organize',
    'submit', 'download', 'upload', 'install', 'delete'
  ];
  
  // Complex goal indicators
  const complexKeywords = [
    'learn', 'master', 'achieve', 'build', 'create', 'develop',
    'improve', 'plan', 'start', 'launch', 'study', 'practice',
    'train', 'prepare', 'establish', 'design', 'become',
    'understand', 'explore', 'discover', 'research'
  ];
  
  // Time indicators suggest complexity
  const timeIndicators = ['days', 'weeks', 'months', 'year', 'daily', 'weekly', 'monthly'];
  const hasTimeIndicator = timeIndicators.some(indicator => text.includes(indicator));
  
  // Check for keywords
  const hasSimpleKeywords = simpleKeywords.some(keyword => text.includes(keyword));
  const hasComplexKeywords = complexKeywords.some(keyword => text.includes(keyword));
  
  // Decision logic
  if (hasSimpleKeywords && !hasComplexKeywords && !hasTimeIndicator && text.length < 50) {
    console.log('📝 Fallback classification: Simple Task');
    return 'Simple Task';
  } else if (hasComplexKeywords || hasTimeIndicator || text.length > 100) {
    console.log('📝 Fallback classification: Complex Goal');
    return 'Complex Goal';
  } else {
    // Default based on length and structure
    const result = text.length < 30 && !text.includes(' to ') ? 'Simple Task' : 'Complex Goal';
    console.log('📝 Fallback classification:', result);
    return result;
  }
}