const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  console.log('📋 Generate Plan Function Called');
  
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
    let duration_days = 30;
    let answers_to_questions = {};

    // Parse request body with fallback
    try {
      const bodyText = await req.text();
      console.log('📝 Raw request body:', bodyText);
      
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
        goal_title = requestBody?.goal_title || 'Achieve Goal';
        duration_days = requestBody?.duration_days || 30;
        answers_to_questions = requestBody?.answers_to_questions || {};
      }
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      // Use defaults and continue
    }

    console.log('📝 Plan request received:', { goal_title, duration_days, answersCount: Object.keys(answers_to_questions).length });

    // Validate and sanitize inputs
    if (!goal_title || typeof goal_title !== 'string' || goal_title.trim().length === 0) {
      goal_title = 'Achieve Goal';
    }

    if (!duration_days || typeof duration_days !== 'number' || duration_days < 1 || duration_days > 365) {
      duration_days = 30;
    }

    if (!answers_to_questions || typeof answers_to_questions !== 'object') {
      answers_to_questions = {};
    }

    // Get API key
    const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    console.log('🔑 API Key status:', apiKey ? `Available (${apiKey.substring(0, 10)}...)` : 'Missing');

    // If no API key, use intelligent fallback
    if (!apiKey) {
      console.log('⚠️ No API key found, using intelligent fallback');
      const plan = generateIntelligentFallbackPlan(goal_title, duration_days, answers_to_questions);
      
      return new Response(
        JSON.stringify({ 
          plan,
          debug: 'API key missing - used intelligent fallback plan'
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

    // Try AI plan generation
    try {
      // Prepare context from answers
      const answersContext = Object.entries(answers_to_questions)
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
      const timeoutId = setTimeout(() => controller.abort(), 40000); // 40 second timeout
      
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
        
        const plan = generateIntelligentFallbackPlan(goal_title, duration_days, answers_to_questions);
        return new Response(
          JSON.stringify({ 
            plan,
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
        plan = generateIntelligentFallbackPlan(goal_title, duration_days, answers_to_questions);
      }

      return new Response(
        JSON.stringify({ 
          plan,
          debug: 'AI plan generated successfully'
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
      
      const plan = generateIntelligentFallbackPlan(goal_title, duration_days, answers_to_questions);
      return new Response(
        JSON.stringify({ 
          plan,
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
    console.error('💥 Critical error in generate-plan:', error);
    
    // Ultimate fallback - always return something
    const plan = generateIntelligentFallbackPlan('Achieve Goal', 30, {});
    return new Response(
      JSON.stringify({ 
        plan,
        debug: 'Critical error - used intelligent fallback plan'
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

function generateIntelligentFallbackPlan(goalTitle: string, durationDays: number, answers: Record<string, string>) {
  console.log('📝 Generating intelligent fallback plan for:', goalTitle);
  
  const goal = goalTitle.toLowerCase();
  const answerValues = Object.values(answers).join(' ').toLowerCase();
  
  // Determine experience level and time commitment from answers
  const isBeginnerLevel = answerValues.includes('beginner') || answerValues.includes('no experience') || answerValues.includes('never') || answerValues.includes('new');
  const hasLimitedTime = answerValues.includes('30 minutes') || answerValues.includes('limited') || answerValues.includes('busy') || answerValues.includes('little time');
  const hasMoreTime = answerValues.includes('hour') || answerValues.includes('hours') || answerValues.includes('plenty') || answerValues.includes('flexible');
  
  // Determine goal type and create specific plan
  let daily_plan = [];
  let ai_insights = '';
  let knowledge_gaps = [];
  
  if (goal.includes('learn') && (goal.includes('python') || goal.includes('programming') || goal.includes('code'))) {
    // Python/Programming specific plan
    ai_insights = `Your ${durationDays}-day Python learning plan is designed to take you from ${isBeginnerLevel ? 'complete beginner to confident coder' : 'your current level to advanced skills'}. ${hasLimitedTime ? 'With focused 30-45 minute sessions' : 'With dedicated practice time'}, you'll build practical skills through hands-on projects and real-world applications.`;
    
    knowledge_gaps = [
      {
        gap: 'Python fundamentals and syntax',
        resource_recommendation: 'Complete "Automate the Boring Stuff with Python" by Al Sweigart (free online)'
      },
      {
        gap: 'Practical coding experience',
        resource_recommendation: 'Practice on HackerRank, LeetCode, or Codewars for daily coding challenges'
      },
      {
        gap: 'Real-world project development',
        resource_recommendation: 'Build projects from "Python Crash Course" by Eric Matthes'
      }
    ];
    
    const phases = Math.ceil(durationDays / 4);
    for (let day = 1; day <= durationDays; day++) {
      const phase = Math.ceil(day / phases);
      const tasks = [];
      
      if (phase === 1) { // Setup and basics
        if (day === 1) {
          tasks.push({
            description: 'Install Python 3.9+ and VS Code, set up your development environment',
            estimated_duration_minutes: hasLimitedTime ? 30 : 45
          });
          tasks.push({
            description: 'Write your first "Hello World" program and explore the Python REPL',
            estimated_duration_minutes: 15
          });
        } else {
          tasks.push({
            description: `Learn Python basics: variables, data types, and basic operations (Day ${day} focus)`,
            estimated_duration_minutes: hasLimitedTime ? 30 : 45
          });
          tasks.push({
            description: 'Practice with 3-5 simple coding exercises on basic syntax',
            estimated_duration_minutes: 15
          });
        }
      } else if (phase === 2) { // Control structures
        tasks.push({
          description: 'Master control structures: if statements, loops, and functions',
          estimated_duration_minutes: hasLimitedTime ? 35 : 50
        });
        tasks.push({
          description: 'Build a simple calculator or number guessing game',
          estimated_duration_minutes: 25
        });
      } else if (phase === 3) { // Data structures and libraries
        tasks.push({
          description: 'Work with lists, dictionaries, and file handling in Python',
          estimated_duration_minutes: hasLimitedTime ? 40 : 60
        });
        tasks.push({
          description: 'Explore popular libraries: requests, pandas, or matplotlib',
          estimated_duration_minutes: 20
        });
      } else { // Projects and advanced topics
        tasks.push({
          description: 'Build a complete project: web scraper, data analyzer, or automation script',
          estimated_duration_minutes: hasLimitedTime ? 45 : 75
        });
        tasks.push({
          description: 'Code review and optimization of your projects',
          estimated_duration_minutes: 15
        });
      }
      
      daily_plan.push({ day, tasks });
    }
  } else if (goal.includes('fitness') || goal.includes('workout') || goal.includes('exercise')) {
    // Fitness specific plan
    ai_insights = `Your ${durationDays}-day fitness journey is structured to build sustainable habits and progressive strength. ${isBeginnerLevel ? 'Starting with bodyweight exercises and basic movements' : 'Building on your existing fitness base'}, you'll develop both physical strength and healthy routines.`;
    
    knowledge_gaps = [
      {
        gap: 'Proper exercise form and technique',
        resource_recommendation: 'Follow Fitness Blender or Athlean-X YouTube channels for form guidance'
      },
      {
        gap: 'Nutrition and recovery knowledge',
        resource_recommendation: 'Read "Bigger Leaner Stronger" by Michael Matthews for science-based approach'
      },
      {
        gap: 'Progressive workout planning',
        resource_recommendation: 'Use apps like Strong, Jefit, or Nike Training Club for structured programs'
      }
    ];
    
    for (let day = 1; day <= durationDays; day++) {
      const tasks = [];
      const weekDay = ((day - 1) % 7) + 1;
      
      if (weekDay <= 3 || weekDay === 6) { // Workout days
        if (isBeginnerLevel) {
          tasks.push({
            description: `Beginner bodyweight workout: 3 sets of push-ups, squats, and planks (modify as needed)`,
            estimated_duration_minutes: hasLimitedTime ? 20 : 30
          });
        } else {
          tasks.push({
            description: `Strength training session: Focus on compound movements (squats, deadlifts, push-ups, rows)`,
            estimated_duration_minutes: hasLimitedTime ? 30 : 45
          });
        }
        tasks.push({
          description: '10-minute stretching and mobility routine',
          estimated_duration_minutes: 10
        });
      } else if (weekDay === 4 || weekDay === 5) { // Active recovery
        tasks.push({
          description: '20-30 minute walk or light yoga session',
          estimated_duration_minutes: hasLimitedTime ? 20 : 30
        });
        tasks.push({
          description: 'Plan healthy meals and track your progress',
          estimated_duration_minutes: 10
        });
      } else { // Rest day
        tasks.push({
          description: 'Complete rest day: focus on hydration and meal prep',
          estimated_duration_minutes: 15
        });
      }
      
      daily_plan.push({ day, tasks });
    }
  } else {
    // Generic goal plan
    ai_insights = `Your ${durationDays}-day plan for "${goalTitle}" is structured in progressive phases: foundation building, skill development, and practical application. ${isBeginnerLevel ? 'Starting with fundamentals will create a strong base' : 'Building on your existing knowledge will accelerate progress'}.`;
    
    knowledge_gaps = [
      {
        gap: 'Foundational knowledge and skills',
        resource_recommendation: 'Research authoritative books, courses, or online resources in this specific area'
      },
      {
        gap: 'Practical application experience',
        resource_recommendation: 'Find hands-on projects, exercises, or real-world applications to practice'
      },
      {
        gap: 'Community and mentorship',
        resource_recommendation: 'Join online communities, forums, or find mentors in this field'
      }
    ];
    
    const phases = Math.ceil(durationDays / 3);
    for (let day = 1; day <= durationDays; day++) {
      const phase = Math.ceil(day / phases);
      const tasks = [];
      
      if (phase === 1) { // Learning phase
        tasks.push({
          description: isBeginnerLevel 
            ? `Learn the fundamentals of ${goalTitle}: core concepts and basic principles` 
            : `Review and strengthen your foundation in ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 30 : 45
        });
        if (!hasLimitedTime) {
          tasks.push({
            description: 'Research additional resources and create a detailed action plan',
            estimated_duration_minutes: 15
          });
        }
      } else if (phase === 2) { // Practice phase
        tasks.push({
          description: `Practice key skills and techniques for ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 40 : 60
        });
        tasks.push({
          description: 'Track your progress and identify areas for improvement',
          estimated_duration_minutes: 15
        });
      } else { // Application phase
        tasks.push({
          description: `Apply your knowledge in a real project or practical scenario for ${goalTitle}`,
          estimated_duration_minutes: hasLimitedTime ? 50 : 75
        });
        tasks.push({
          description: 'Share your progress and get feedback from others',
          estimated_duration_minutes: 15
        });
      }
      
      daily_plan.push({ day, tasks });
    }
  }

  return {
    ai_insights,
    knowledge_gaps,
    daily_plan
  };
}