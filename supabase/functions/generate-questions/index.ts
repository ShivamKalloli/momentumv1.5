const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  console.log('❓ Generate Questions Function Called');
  
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestBody = await req.json();
    const { goal_title } = requestBody;
    
    console.log('📝 Goal received:', goal_title);

    if (!goal_title || typeof goal_title !== 'string') {
      throw new Error('Invalid input: goal_title is required and must be a string');
    }

    // Get Google AI API key from environment
    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    
    console.log('🔑 API Key status:', apiKey ? 'Available' : 'Missing');

    if (!apiKey) {
      console.error('❌ Google AI API key not found in environment');
      throw new Error('Google AI API key not configured');
    }

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
        })
      }
    );

    console.log('📡 Gemini API response status:', geminiResponse.status);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Gemini API error:', geminiResponse.status, errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
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
      throw new Error('Failed to parse AI questions response');
    }

    return new Response(
      JSON.stringify({ questions }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('💥 Error in generate-questions:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate questions',
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