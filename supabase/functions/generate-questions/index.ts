const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Always wrap in try-catch to guarantee 200 response
  try {
    console.log('❓ Generate Questions Function Called');
    
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    let goal_title = '';

    // Safely parse request body
    try {
      const bodyText = await req.text();
      console.log('📝 Raw request body length:', bodyText?.length || 0);
      
      if (bodyText) {
        const requestBody = JSON.parse(bodyText);
        goal_title = requestBody?.goal_title || '';
      }
    } catch (parseError) {
      console.error('❌ Request parsing error:', parseError.message);
      // Continue with empty goal_title
    }

    console.log('📝 Processing goal:', goal_title);

    // Validate input
    if (!goal_title || typeof goal_title !== 'string' || goal_title.trim().length === 0) {
      console.log('⚠️ Invalid goal, using fallback questions');
      const questions = getGenericFallbackQuestions();
      
      return new Response(
        JSON.stringify({ 
          questions,
          debug: 'Invalid or missing goal_title - used generic fallback'
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
      const questions = getIntelligentFallbackQuestions(goal_title);
      
      return new Response(
        JSON.stringify({ 
          questions,
          debug: 'API key missing - used intelligent fallback questions'
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

    // Try AI question generation
    try {
      console.log('🚀 Attempting AI question generation...');
      
      const prompt = `Generate exactly 4 specific questions for this goal: "${goal_title}"

Questions should determine:
1. Current skill/experience level
2. Available time commitment  
3. Resources/constraints/preferences
4. Specific focus areas/outcomes

Return ONLY a JSON array: ["Question 1?", "Question 2?", "Question 3?", "Question 4?"]`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 500 }
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      console.log('📡 AI response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        console.log('🤖 AI response length:', aiResponse?.length || 0);
        
        try {
          const cleanResponse = aiResponse?.replace(/```json\n?|\n?```/g, '').trim();
          const questions = JSON.parse(cleanResponse || '[]');
          
          if (Array.isArray(questions) && questions.length > 0 && questions.every(q => typeof q === 'string')) {
            return new Response(
              JSON.stringify({ 
                questions,
                debug: 'AI questions generated successfully'
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
            throw new Error('Invalid questions format');
          }
        } catch (parseError) {
          console.error('❌ Failed to parse AI response:', parseError.message);
          throw new Error('AI response parsing failed');
        }
      } else {
        throw new Error(`AI API error: ${response.status}`);
      }

    } catch (aiError) {
      console.error('💥 AI error:', aiError.message);
      const questions = getIntelligentFallbackQuestions(goal_title);
      
      return new Response(
        JSON.stringify({ 
          questions,
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
    
    const questions = getGenericFallbackQuestions();
    return new Response(
      JSON.stringify({ 
        questions,
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

function getGenericFallbackQuestions(): string[] {
  return [
    'What is your current experience level with this goal?',
    'How much time can you realistically dedicate daily?',
    'What resources or support do you have available?',
    'How will you measure success and stay motivated?'
  ];
}

function getIntelligentFallbackQuestions(goalTitle: string): string[] {
  const goal = goalTitle.toLowerCase();
  
  if (goal.includes('learn') && (goal.includes('code') || goal.includes('program') || goal.includes('python') || goal.includes('javascript'))) {
    return [
      'What is your programming experience level?',
      'Which programming language interests you most?',
      'Do you have a specific project in mind?',
      'How much time can you dedicate to coding daily?'
    ];
  } else if (goal.includes('learn') && goal.includes('language')) {
    return [
      'What is your current level in this language?',
      'How much time can you dedicate to practice daily?',
      'Do you prefer structured courses or self-study?',
      'What specific skills do you want to focus on most?'
    ];
  } else if (goal.includes('fitness') || goal.includes('workout') || goal.includes('exercise')) {
    return [
      'What is your current fitness level?',
      'How many days per week can you exercise?',
      'Do you have access to a gym or equipment?',
      'What is your main motivation for this goal?'
    ];
  } else if (goal.includes('business') || goal.includes('startup')) {
    return [
      'What is your relevant experience in this area?',
      'What resources or budget do you have available?',
      'What is your target timeline for initial results?',
      'Who is your target audience or market?'
    ];
  } else {
    return getGenericFallbackQuestions();
  }
}