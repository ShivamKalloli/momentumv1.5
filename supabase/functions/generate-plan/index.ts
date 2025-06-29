const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  console.log('📋 Generate Plan Function Called');
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestBody = await req.json();
    const { goal_title, duration_days, answers_to_questions } = requestBody;
    
    console.log('📝 Plan request received:', { goal_title, duration_days, answersCount: Object.keys(answers_to_questions || {}).length });

    if (!goal_title || typeof goal_title !== 'string') {
      throw new Error('Invalid input: goal_title is required and must be a string');
    }

    if (!duration_days || typeof duration_days !== 'number' || duration_days < 1) {
      throw new Error('Invalid input: duration_days must be a positive number');
    }

    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    
    console.log('🔑 API Key status:', apiKey ? `Available (${apiKey.substring(0, 10)}...)` : 'Missing');

    if (!apiKey) {
      console.error('❌ Google AI API key not found in environment');
      
      return new Response(
        JSON.stringify({ 
          error: 'Google AI API key not configured. Please add GOOGLE_AI_API_KEY to your Supabase Edge Functions environment variables.'
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

    // Prepare context from answers
    const answersContext = Object.entries(answers_to_questions || {})
      .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
      .join('\n\n');

    console.log('📝 User context prepared, length:', answersContext.length);

    const prompt = `You are "Aura," an expert AI coach specializing in creating detailed, actionable plans. Create a comprehensive ${duration_days}-day plan for achieving this goal.

GOAL: ${goal_title}
DURATION: ${duration_days} days

USER CONTEXT:
${answersContext}

INSTRUCTIONS:
Create a structured, progressive plan that builds skills day by day. The plan should be:
- Realistic based on user's experience level and time availability from their answers
- Progressive (building from basics to advanced concepts)
- Specific and actionable (not generic advice)
- Tailored to their specific answers and situation
- Include variety (learning, practice, application, review)
- Reference specific resources, tools, or methods when appropriate

RESPONSE FORMAT:
Return ONLY a valid JSON object with these exact keys:

{
  "ai_insights": "A motivational 2-3 sentence summary explaining the plan's approach and why it will work specifically for this user based on their answers",
  "knowledge_gaps": [
    {
      "gap": "Specific skill or knowledge area they need based on their goal",
      "resource_recommendation": "Specific book, course, website, or resource to fill this gap"
    }
  ],
  "daily_plan": [
    {
      "day": 1,
      "tasks": [
        {
          "description": "Specific, actionable task description that builds toward the goal",
          "estimated_duration_minutes": 45
        }
      ]
    }
  ]
}

DAILY PLAN REQUIREMENTS:
- Create exactly ${duration_days} days
- Each day should have 1-3 tasks
- Tasks should be specific and actionable (not vague like "practice" or "study")
- Duration should match user's available time from their answers
- Progress logically from day to day
- Include variety: learning new concepts, practicing skills, applying knowledge, reviewing progress
- Reference specific tools, platforms, or resources when relevant

EXAMPLES OF EXCELLENT TASKS:
- "Set up Python development environment: Install VS Code, Python 3.9, and create your first 'Hello World' program"
- "Complete Chapter 1 of 'Automate the Boring Stuff with Python' focusing on variables and basic operations"
- "Practice 20 minutes of Spanish conversation using HelloTalk app, focusing on introducing yourself"
- "Do 30-minute beginner yoga routine from Yoga with Adriene, focusing on basic poses and breathing"
- "Research and analyze 3 competitors in your target market, documenting their pricing and features"
- "Complete Duolingo Spanish lesson on present tense verbs and practice with 10 new vocabulary words"
- "Follow a 45-minute strength training routine: 3 sets of squats, push-ups, and planks"

EXAMPLES OF BAD TASKS:
- "Learn programming" (too vague)
- "Practice Spanish" (not specific enough)
- "Study business" (no clear action)
- "Work on fitness" (not actionable)

Make the plan feel personal and achievable based on their specific situation and answers. Reference their experience level, time availability, and preferences from their responses.`;

    console.log('🚀 Making request to Gemini API for plan generation...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
    
    try {
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
              maxOutputTokens: 4000,
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
        
        let errorMessage = 'Unknown API error';
        if (geminiResponse.status === 400) {
          errorMessage = 'Invalid API request - check API key format';
        } else if (geminiResponse.status === 401) {
          errorMessage = 'Invalid API key - check your Google AI API key';
        } else if (geminiResponse.status === 403) {
          errorMessage = 'API access forbidden - check API key permissions';
        } else if (geminiResponse.status === 429) {
          errorMessage = 'API rate limit exceeded - try again later';
        } else if (geminiResponse.status >= 500) {
          errorMessage = 'Google AI service temporarily unavailable';
        }
        
        return new Response(
          JSON.stringify({ 
            error: errorMessage,
            details: errorText,
            status: geminiResponse.status
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
      const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      
      console.log('🤖 AI Plan Response received, length:', aiResponse?.length);
      
      let plan;
      
      try {
        // Clean the response and parse JSON
        const cleanResponse = aiResponse?.replace(/```json\n?|\n?```/g, '').trim();
        plan = JSON.parse(cleanResponse || '{}');
        
        console.log('📊 Plan structure validation:', {
          hasInsights: !!plan.ai_insights,
          hasGaps: !!plan.knowledge_gaps,
          hasDailyPlan: !!plan.daily_plan,
          dailyPlanLength: plan.daily_plan?.length
        });
        
        // Validate the plan structure
        if (!plan.ai_insights || !plan.knowledge_gaps || !plan.daily_plan) {
          throw new Error('Invalid plan structure from AI');
        }
        
        // Ensure daily_plan has the right number of days
        if (plan.daily_plan.length !== duration_days) {
          console.warn(`⚠️ Plan duration mismatch: expected ${duration_days}, got ${plan.daily_plan.length}`);
        }
        
        console.log('✅ Successfully generated AI plan with', plan.daily_plan.length, 'days');
        
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', parseError);
        console.log('Raw response sample:', aiResponse?.substring(0, 500));
        throw new Error('Failed to parse AI plan response');
      }

      return new Response(
        JSON.stringify({ plan }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('⏰ Request timeout');
        return new Response(
          JSON.stringify({ 
            error: 'Request timeout - Google AI API took too long to respond'
          }),
          {
            status: 408,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('💥 Error in generate-plan:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate plan',
        message: error.message
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