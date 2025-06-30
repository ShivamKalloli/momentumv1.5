const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  console.log('❓ Generate Questions Function Called');
  
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
    let goal_title = '';

    // Parse request body with fallback
    try {
      const bodyText = await req.text();
      console.log('📝 Raw request body:', bodyText);
      
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
        goal_title = requestBody?.goal_title || '';
      }
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      goal_title = 'achieve goal'; // Use default to continue processing
    }

    console.log('📝 Goal received:', goal_title);

    // Validate input with fallback
    if (!goal_title || typeof goal_title !== 'string' || goal_title.trim().length === 0) {
      console.log('❌ Invalid goal title, using fallback questions');
      const questions = getGenericFallbackQuestions();
      
      return new Response(
        JSON.stringify({ 
          questions,
          debug: 'Invalid or missing goal_title - used generic fallback questions'
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
      const prompt = `You are an expert goal planning assistant. The user wants to achieve: "${goal_title}"

Generate exactly 4 essential, specific questions to understand how to create the best personalized plan for this exact goal.

The questions should help determine:
1. Current skill/experience level
2. Available time commitment  
3. Resources, constraints, or preferences
4. Specific focus areas or desired outcomes

Make questions highly specific to this type of goal. Examples:

For "learn to code":
- "What programming languages interest you most (Python, JavaScript, etc.)?"
- "Do you want to build web apps, mobile apps, or data analysis tools?"
- "How much time can you dedicate to coding daily?"
- "What is your current programming experience level?"

For "get fit":
- "What is your current fitness level and exercise experience?"
- "Do you prefer gym workouts, home workouts, or outdoor activities?"
- "How many days per week can you realistically exercise?"
- "What are your specific fitness goals (weight loss, strength, endurance)?"

For "learn Spanish":
- "What is your current Spanish level (complete beginner, some basics, etc.)?"
- "How much time can you dedicate to Spanish practice daily?"
- "Do you prefer apps, classes, conversation practice, or self-study?"
- "What's your main goal (travel, business, personal interest)?"

Return ONLY a valid JSON array of exactly 4 strings. No other text.

Format: ["Question 1?", "Question 2?", "Question 3?", "Question 4?"]`;

      console.log('🚀 Making request to Gemini API for questions...');
      
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
              temperature: 0.7,
              maxOutputTokens: 500,
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
        
        const questions = getIntelligentFallbackQuestions(goal_title);
        return new Response(
          JSON.stringify({ 
            questions,
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
      console.log('🤖 AI Questions Response received, length:', aiResponse?.length);
      
      let questions: string[];
      
      try {
        // Clean the response and parse JSON
        const cleanResponse = aiResponse?.replace(/```json\n?|\n?```/g, '').trim();
        questions = JSON.parse(cleanResponse || '[]');
        
        // Validate that we got an array of strings
        if (!Array.isArray(questions) || questions.length === 0 || !questions.every(q => typeof q === 'string')) {
          throw new Error('Invalid questions format from AI');
        }
        
        console.log('✅ Successfully parsed', questions.length, 'questions from AI');
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', parseError);
        console.log('Raw response sample:', aiResponse?.substring(0, 200));
        questions = getIntelligentFallbackQuestions(goal_title);
      }

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

    } catch (aiError) {
      console.error('💥 AI request error:', aiError);
      
      const questions = getIntelligentFallbackQuestions(goal_title);
      return new Response(
        JSON.stringify({ 
          questions,
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
    console.error('💥 Critical error in generate-questions:', error);
    
    // Ultimate fallback - always return something
    const questions = getGenericFallbackQuestions();
    return new Response(
      JSON.stringify({ 
        questions,
        debug: 'Critical error - used generic fallback questions'
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
  
  if (goal.includes('learn') || goal.includes('study')) {
    if (goal.includes('language')) {
      return [
        'What is your current level in this language?',
        'How much time can you dedicate to practice daily?',
        'Do you prefer structured courses or self-study?',
        'What specific skills do you want to focus on most (speaking, writing, reading)?'
      ];
    } else if (goal.includes('code') || goal.includes('program')) {
      return [
        'What is your programming experience level?',
        'Which programming language interests you most?',
        'Do you have a specific project in mind?',
        'How much time can you dedicate to coding daily?'
      ];
    } else {
      return [
        'What is your current knowledge level in this area?',
        'How much time can you dedicate to learning daily?',
        'What learning resources do you prefer?',
        'What specific outcome do you want to achieve?'
      ];
    }
  } else if (goal.includes('fitness') || goal.includes('workout') || goal.includes('run')) {
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