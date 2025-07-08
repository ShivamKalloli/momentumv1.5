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
    console.log('📋 Generate plan function called')
    
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
        plan: generateFallbackPlan('Default Goal', 7, {}),
        debug: 'JSON parsing failed, using fallback plan'
      }
      
      return new Response(
        JSON.stringify(fallbackResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { goal_title, duration_days, answers_to_questions } = requestBody as { 
      goal_title?: string, 
      duration_days?: number, 
      answers_to_questions?: Record<string, string> 
    }

    console.log('🎯 Goal:', goal_title, 'Duration:', duration_days, 'days')
    console.log('💬 Answers:', answers_to_questions)

    if (!goal_title || !duration_days) {
      console.warn('⚠️ Missing required parameters')
      const fallbackResponse = {
        error: 'Missing required parameters: goal_title and duration_days',
        plan: generateFallbackPlan('Default Goal', 7, {}),
        debug: 'Missing parameters, using fallback plan'
      }
      
      return new Response(
        JSON.stringify(fallbackResponse),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const plan = generateIntelligentPlan(goal_title, duration_days, answers_to_questions || {})
    console.log('✅ Intelligent plan generated successfully')

    const response = {
      plan,
      debug: `Generated intelligent ${duration_days}-day plan for "${goal_title}"`
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 Error in generate-plan:', error)
    
    const errorResponse = {
      error: String(error),
      plan: generateFallbackPlan('Default Goal', 7, {}),
      debug: 'Unexpected error occurred, using fallback plan'
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

function generateIntelligentPlan(goalTitle: string, durationDays: number, answers: Record<string, string>) {
  console.log('🧠 Generating intelligent plan for:', goalTitle)
  
  const goal = goalTitle.toLowerCase()
  const answerValues = Object.values(answers).join(' ').toLowerCase()
  
  // Extract key information from answers
  const experienceLevel = getExperienceLevel(answerValues)
  const timeCommitment = getTimeCommitment(answerValues)
  const learningStyle = getLearningStyle(answerValues)
  const motivation = getMotivation(answerValues)
  
  console.log('📊 Analysis:', { experienceLevel, timeCommitment, learningStyle, motivation })

  // Generate goal-specific curriculum
  if (goal.includes('python') || goal.includes('programming') || goal.includes('code')) {
    return generatePythonCurriculum(goalTitle, durationDays, experienceLevel, timeCommitment, learningStyle)
  } else if (goal.includes('guitar') || goal.includes('music') || goal.includes('instrument')) {
    return generateGuitarCurriculum(goalTitle, durationDays, experienceLevel, timeCommitment, learningStyle)
  } else if (goal.includes('dsa') || goal.includes('algorithm') || goal.includes('data structure')) {
    return generateDSACurriculum(goalTitle, durationDays, experienceLevel, timeCommitment, learningStyle)
  } else if (goal.includes('javascript') || goal.includes('js') || goal.includes('web development')) {
    return generateJavaScriptCurriculum(goalTitle, durationDays, experienceLevel, timeCommitment, learningStyle)
  } else if (goal.includes('fitness') || goal.includes('workout') || goal.includes('exercise')) {
    return generateFitnessCurriculum(goalTitle, durationDays, experienceLevel, timeCommitment, answerValues)
  } else if (goal.includes('language') || goal.includes('spanish') || goal.includes('french') || goal.includes('german')) {
    return generateLanguageCurriculum(goalTitle, durationDays, experienceLevel, timeCommitment, learningStyle)
  } else if (goal.includes('business') || goal.includes('startup') || goal.includes('entrepreneur')) {
    return generateBusinessCurriculum(goalTitle, durationDays, experienceLevel, timeCommitment, answerValues)
  } else {
    return generateGenericLearningPlan(goalTitle, durationDays, experienceLevel, timeCommitment, learningStyle)
  }
}

function getExperienceLevel(answerText: string): 'beginner' | 'intermediate' | 'advanced' {
  if (answerText.includes('beginner') || answerText.includes('never') || answerText.includes('no experience') || answerText.includes('new to')) {
    return 'beginner'
  } else if (answerText.includes('advanced') || answerText.includes('expert') || answerText.includes('experienced') || answerText.includes('professional')) {
    return 'advanced'
  } else {
    return 'intermediate'
  }
}

function getTimeCommitment(answerText: string): 'limited' | 'moderate' | 'extensive' {
  if (answerText.includes('30 minutes') || answerText.includes('limited') || answerText.includes('busy') || answerText.includes('little time')) {
    return 'limited'
  } else if (answerText.includes('2 hours') || answerText.includes('3 hours') || answerText.includes('lot of time') || answerText.includes('full time')) {
    return 'extensive'
  } else {
    return 'moderate'
  }
}

function getLearningStyle(answerText: string): 'hands-on' | 'structured' | 'mixed' {
  if (answerText.includes('hands-on') || answerText.includes('projects') || answerText.includes('practical') || answerText.includes('doing')) {
    return 'hands-on'
  } else if (answerText.includes('structured') || answerText.includes('courses') || answerText.includes('tutorials') || answerText.includes('step by step')) {
    return 'structured'
  } else {
    return 'mixed'
  }
}

function getMotivation(answerText: string): string {
  if (answerText.includes('career') || answerText.includes('job')) return 'career advancement'
  if (answerText.includes('hobby') || answerText.includes('fun')) return 'personal enjoyment'
  if (answerText.includes('project') || answerText.includes('build')) return 'project creation'
  return 'skill development'
}

function generatePythonCurriculum(goalTitle: string, durationDays: number, experience: string, timeCommitment: string, learningStyle: string) {
  const daily_plan = []
  const baseMinutes = timeCommitment === 'limited' ? 30 : timeCommitment === 'extensive' ? 90 : 60
  
  // Week 1: Python Fundamentals
  if (durationDays >= 7) {
    daily_plan.push(
      {
        day: 1,
        tasks: [
          {
            description: experience === 'beginner' 
              ? 'Install Python and set up development environment (VS Code, Python interpreter)'
              : 'Set up advanced Python development environment with virtual environments',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Learn Python syntax basics: variables, data types, and print statements',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      },
      {
        day: 2,
        tasks: [
          {
            description: 'Master Python operators: arithmetic, comparison, and logical operators',
            estimated_duration_minutes: baseMinutes * 0.7
          },
          {
            description: 'Practice with simple calculations and user input using input() function',
            estimated_duration_minutes: baseMinutes * 0.3
          }
        ]
      },
      {
        day: 3,
        tasks: [
          {
            description: 'Learn control structures: if statements, elif, and else conditions',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Build a simple calculator or number guessing game',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      },
      {
        day: 4,
        tasks: [
          {
            description: 'Master loops: for loops and while loops with practical examples',
            estimated_duration_minutes: baseMinutes * 0.7
          },
          {
            description: 'Practice loop exercises: counting, summing, and pattern printing',
            estimated_duration_minutes: baseMinutes * 0.3
          }
        ]
      },
      {
        day: 5,
        tasks: [
          {
            description: 'Learn Python data structures: lists, tuples, and basic operations',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Practice list manipulation: append, remove, sort, and slice operations',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      },
      {
        day: 6,
        tasks: [
          {
            description: 'Explore dictionaries and sets: creation, access, and modification',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Build a simple contact book or inventory system using dictionaries',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      },
      {
        day: 7,
        tasks: [
          {
            description: 'Learn functions: definition, parameters, return values, and scope',
            estimated_duration_minutes: baseMinutes * 0.7
          },
          {
            description: 'Create utility functions for common tasks (calculator functions, validators)',
            estimated_duration_minutes: baseMinutes * 0.3
          }
        ]
      }
    )
  }

  // Week 2: Intermediate Concepts
  if (durationDays >= 14) {
    for (let day = 8; day <= 14; day++) {
      if (day === 8) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn file handling: reading from and writing to files',
              estimated_duration_minutes: baseMinutes * 0.6
            },
            {
              description: 'Create a program that processes text files (word counter, log analyzer)',
              estimated_duration_minutes: baseMinutes * 0.4
            }
          ]
        })
      } else if (day === 9) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Master error handling: try, except, finally blocks',
              estimated_duration_minutes: baseMinutes * 0.5
            },
            {
              description: 'Build robust programs with proper error handling and user feedback',
              estimated_duration_minutes: baseMinutes * 0.5
            }
          ]
        })
      } else if (day === 10) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn object-oriented programming: classes, objects, and methods',
              estimated_duration_minutes: baseMinutes * 0.7
            },
            {
              description: 'Create a simple class (Student, Car, or BankAccount) with methods',
              estimated_duration_minutes: baseMinutes * 0.3
            }
          ]
        })
      } else if (day === 11) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Explore Python modules and packages: import, creating modules',
              estimated_duration_minutes: baseMinutes * 0.6
            },
            {
              description: 'Use popular libraries: requests for web APIs, datetime for time handling',
              estimated_duration_minutes: baseMinutes * 0.4
            }
          ]
        })
      } else if (day === 12) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn list comprehensions and lambda functions for efficient coding',
              estimated_duration_minutes: baseMinutes * 0.6
            },
            {
              description: 'Practice advanced data manipulation and filtering techniques',
              estimated_duration_minutes: baseMinutes * 0.4
            }
          ]
        })
      } else if (day === 13) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Start a medium-sized project: web scraper, data analyzer, or game',
              estimated_duration_minutes: baseMinutes * 0.8
            },
            {
              description: 'Plan project structure and implement core functionality',
              estimated_duration_minutes: baseMinutes * 0.2
            }
          ]
        })
      } else if (day === 14) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Complete and refine your Python project',
              estimated_duration_minutes: baseMinutes * 0.7
            },
            {
              description: 'Add error handling, comments, and test your project thoroughly',
              estimated_duration_minutes: baseMinutes * 0.3
            }
          ]
        })
      }
    }
  }

  // Week 3+: Advanced Topics and Projects
  if (durationDays > 14) {
    for (let day = 15; day <= durationDays; day++) {
      const weekNumber = Math.ceil(day / 7)
      if (weekNumber === 3) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn advanced Python: decorators, generators, and context managers',
              estimated_duration_minutes: baseMinutes * 0.6
            },
            {
              description: 'Build a complex project: web application with Flask or data analysis with pandas',
              estimated_duration_minutes: baseMinutes * 0.4
            }
          ]
        })
      } else {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Work on a comprehensive Python project showcasing all learned skills',
              estimated_duration_minutes: baseMinutes * 0.8
            },
            {
              description: 'Code review, optimization, and documentation of your project',
              estimated_duration_minutes: baseMinutes * 0.2
            }
          ]
        })
      }
    }
  }

  return {
    ai_insights: `Your ${durationDays}-day Python learning journey is designed for ${experience} level with ${timeCommitment} time commitment. You'll progress from basic syntax to building real projects. Python's readable syntax makes it perfect for beginners, while its powerful libraries enable complex applications. Focus on daily practice and building projects to reinforce concepts.`,
    knowledge_gaps: [
      {
        gap: 'Python development environment and tools',
        resource_recommendation: 'Install Python from python.org, use VS Code with Python extension, learn pip for package management'
      },
      {
        gap: 'Programming fundamentals and problem-solving',
        resource_recommendation: 'Practice on HackerRank, LeetCode, or Codewars. Use Python.org tutorial and automate the boring stuff book'
      },
      {
        gap: 'Real-world Python applications',
        resource_recommendation: 'Build projects: web scraper with requests, data analysis with pandas, web app with Flask'
      }
    ],
    daily_plan
  }
}

function generateGuitarCurriculum(goalTitle: string, durationDays: number, experience: string, timeCommitment: string, learningStyle: string) {
  const daily_plan = []
  const baseMinutes = timeCommitment === 'limited' ? 20 : timeCommitment === 'extensive' ? 60 : 40
  
  // Week 1: Guitar Fundamentals
  if (durationDays >= 7) {
    daily_plan.push(
      {
        day: 1,
        tasks: [
          {
            description: experience === 'beginner' 
              ? 'Learn guitar parts, proper posture, and how to hold the guitar and pick'
              : 'Review proper technique and warm up with basic exercises',
            estimated_duration_minutes: baseMinutes * 0.4
          },
          {
            description: 'Learn your first chord: G major - practice finger placement and strumming',
            estimated_duration_minutes: baseMinutes * 0.6
          }
        ]
      },
      {
        day: 2,
        tasks: [
          {
            description: 'Learn C major chord and practice switching between G and C',
            estimated_duration_minutes: baseMinutes * 0.7
          },
          {
            description: 'Practice basic down-strum pattern with G and C chords',
            estimated_duration_minutes: baseMinutes * 0.3
          }
        ]
      },
      {
        day: 3,
        tasks: [
          {
            description: 'Learn D major chord and practice G-C-D chord progression',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Practice chord transitions slowly, focusing on clean chord changes',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      },
      {
        day: 4,
        tasks: [
          {
            description: 'Learn Em (E minor) chord - complete the basic four-chord foundation',
            estimated_duration_minutes: baseMinutes * 0.5
          },
          {
            description: 'Practice the classic progression: G-D-Em-C with steady strumming',
            estimated_duration_minutes: baseMinutes * 0.5
          }
        ]
      },
      {
        day: 5,
        tasks: [
          {
            description: 'Learn basic strumming patterns: down-down-up-up-down-up',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Apply strumming patterns to your four-chord progressions',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      },
      {
        day: 6,
        tasks: [
          {
            description: 'Practice playing along to a simple song using G-C-D-Em progression',
            estimated_duration_minutes: baseMinutes * 0.7
          },
          {
            description: 'Work on rhythm and timing - use a metronome or backing track',
            estimated_duration_minutes: baseMinutes * 0.3
          }
        ]
      },
      {
        day: 7,
        tasks: [
          {
            description: 'Review all learned chords and practice smooth transitions',
            estimated_duration_minutes: baseMinutes * 0.5
          },
          {
            description: 'Play through a complete simple song from start to finish',
            estimated_duration_minutes: baseMinutes * 0.5
          }
        ]
      }
    )
  }

  // Week 2: Expanding Skills
  if (durationDays >= 14) {
    for (let day = 8; day <= 14; day++) {
      if (day === 8) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn A major and E major chords to expand your chord vocabulary',
              estimated_duration_minutes: baseMinutes * 0.6
            },
            {
              description: 'Practice new chord progressions: A-D-G and E-A-D',
              estimated_duration_minutes: baseMinutes * 0.4
            }
          ]
        })
      } else if (day === 9) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn F major chord (barre chord) - start with simplified version if needed',
              estimated_duration_minutes: baseMinutes * 0.7
            },
            {
              description: 'Practice barre chord technique and finger strength exercises',
              estimated_duration_minutes: baseMinutes * 0.3
            }
          ]
        })
      } else if (day === 10) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn basic fingerpicking pattern: thumb-index-middle-ring',
              estimated_duration_minutes: baseMinutes * 0.6
            },
            {
              description: 'Apply fingerpicking to simple chord progressions',
              estimated_duration_minutes: baseMinutes * 0.4
            }
          ]
        })
      } else if (day === 11) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn a complete song with both strumming and fingerpicking sections',
              estimated_duration_minutes: baseMinutes * 0.8
            },
            {
              description: 'Focus on song structure: verse, chorus, bridge transitions',
              estimated_duration_minutes: baseMinutes * 0.2
            }
          ]
        })
      } else if (day === 12) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn basic scales: G major scale and pentatonic scale',
              estimated_duration_minutes: baseMinutes * 0.6
            },
            {
              description: 'Practice scale exercises for finger dexterity and fretboard knowledge',
              estimated_duration_minutes: baseMinutes * 0.4
            }
          ]
        })
      } else if (day === 13) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn simple lead guitar techniques: hammer-ons and pull-offs',
              estimated_duration_minutes: baseMinutes * 0.5
            },
            {
              description: 'Practice combining rhythm and lead playing in simple songs',
              estimated_duration_minutes: baseMinutes * 0.5
            }
          ]
        })
      } else if (day === 14) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Record yourself playing a complete song to assess progress',
              estimated_duration_minutes: baseMinutes * 0.6
            },
            {
              description: 'Plan next learning goals and identify areas for improvement',
              estimated_duration_minutes: baseMinutes * 0.4
            }
          ]
        })
      }
    }
  }

  // Week 3+: Advanced Techniques
  if (durationDays > 14) {
    for (let day = 15; day <= durationDays; day++) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Learn advanced techniques: bending, vibrato, and slide techniques',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Work on a challenging song that incorporates multiple techniques',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      })
    }
  }

  return {
    ai_insights: `Your ${durationDays}-day guitar journey is tailored for ${experience} level with ${timeCommitment} daily practice. Guitar requires muscle memory development, so consistent daily practice is more effective than long, infrequent sessions. You'll build from basic chords to playing complete songs. Remember: finger soreness is normal initially, but proper technique prevents injury.`,
    knowledge_gaps: [
      {
        gap: 'Proper guitar technique and posture',
        resource_recommendation: 'Watch JustinGuitar free lessons, use a mirror to check posture, consider a few lessons with a local teacher'
      },
      {
        gap: 'Rhythm and timing skills',
        resource_recommendation: 'Use metronome apps, play along with songs on YouTube, practice with backing tracks'
      },
      {
        gap: 'Song repertoire and music theory',
        resource_recommendation: 'Learn songs you enjoy, use Ultimate Guitar for tabs, study basic music theory for chord relationships'
      }
    ],
    daily_plan
  }
}

function generateDSACurriculum(goalTitle: string, durationDays: number, experience: string, timeCommitment: string, learningStyle: string) {
  const daily_plan = []
  const baseMinutes = timeCommitment === 'limited' ? 45 : timeCommitment === 'extensive' ? 120 : 90
  
  // Week 1: Fundamentals
  for (let day = 1; day <= Math.min(7, durationDays); day++) {
    if (day === 1) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Learn Big O notation: time and space complexity analysis',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Practice analyzing simple algorithms for complexity',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      })
    } else if (day === 2) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Master arrays and strings: basic operations and common patterns',
            estimated_duration_minutes: baseMinutes * 0.5
          },
          {
            description: 'Solve 3-5 easy array problems on LeetCode or HackerRank',
            estimated_duration_minutes: baseMinutes * 0.5
          }
        ]
      })
    } else if (day === 3) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Learn linked lists: implementation, traversal, insertion, deletion',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Implement singly and doubly linked lists from scratch',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      })
    } else if (day === 4) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Master stacks and queues: implementation using arrays and linked lists',
            estimated_duration_minutes: baseMinutes * 0.5
          },
          {
            description: 'Solve stack/queue problems: balanced parentheses, queue using stacks',
            estimated_duration_minutes: baseMinutes * 0.5
          }
        ]
      })
    } else if (day === 5) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Learn recursion: base cases, recursive thinking, call stack',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Practice recursive problems: factorial, fibonacci, tree traversal',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      })
    } else if (day === 6) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Introduction to sorting algorithms: bubble, selection, insertion sort',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Implement and analyze time complexity of basic sorting algorithms',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      })
    } else if (day === 7) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Learn advanced sorting: merge sort and quick sort',
            estimated_duration_minutes: baseMinutes * 0.7
          },
          {
            description: 'Compare sorting algorithms and understand when to use each',
            estimated_duration_minutes: baseMinutes * 0.3
          }
        ]
      })
    }
  }

  // Continue with more advanced topics for longer durations
  if (durationDays > 7) {
    for (let day = 8; day <= durationDays; day++) {
      const week = Math.ceil(day / 7)
      if (week === 2) {
        // Week 2: Trees and Graphs
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn binary trees: structure, traversals (inorder, preorder, postorder)',
              estimated_duration_minutes: baseMinutes * 0.6
            },
            {
              description: 'Implement tree traversal algorithms and solve tree problems',
              estimated_duration_minutes: baseMinutes * 0.4
            }
          ]
        })
      } else if (week === 3) {
        // Week 3: Advanced Data Structures
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn hash tables: implementation, collision handling, applications',
              estimated_duration_minutes: baseMinutes * 0.6
            },
            {
              description: 'Solve hash table problems: two sum, group anagrams, frequency counting',
              estimated_duration_minutes: baseMinutes * 0.4
            }
          ]
        })
      } else {
        // Week 4+: Dynamic Programming and Advanced Algorithms
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Master dynamic programming: memoization, tabulation, optimal substructure',
              estimated_duration_minutes: baseMinutes * 0.7
            },
            {
              description: 'Solve classic DP problems: fibonacci, coin change, longest subsequence',
              estimated_duration_minutes: baseMinutes * 0.3
            }
          ]
        })
      }
    }
  }

  return {
    ai_insights: `Your ${durationDays}-day DSA journey focuses on building strong problem-solving foundations. Data structures and algorithms are the backbone of efficient programming. Start with understanding concepts deeply before jumping to complex problems. Practice coding implementations from scratch to build intuition. Regular problem-solving on platforms like LeetCode will reinforce learning.`,
    knowledge_gaps: [
      {
        gap: 'Mathematical foundations and complexity analysis',
        resource_recommendation: 'Study discrete mathematics, practice Big O analysis, use visualization tools like VisuAlgo'
      },
      {
        gap: 'Implementation skills in your preferred language',
        resource_recommendation: 'Practice coding without IDE assistance, implement data structures from scratch, focus on clean code'
      },
      {
        gap: 'Problem-solving patterns and techniques',
        resource_recommendation: 'Study common patterns: two pointers, sliding window, divide and conquer. Use LeetCode patterns guide'
      }
    ],
    daily_plan
  }
}

function generateJavaScriptCurriculum(goalTitle: string, durationDays: number, experience: string, timeCommitment: string, learningStyle: string) {
  const daily_plan = []
  const baseMinutes = timeCommitment === 'limited' ? 40 : timeCommitment === 'extensive' ? 100 : 70
  
  // Week 1: JavaScript Fundamentals
  for (let day = 1; day <= Math.min(7, durationDays); day++) {
    if (day === 1) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Set up development environment: VS Code, browser dev tools, Node.js',
            estimated_duration_minutes: baseMinutes * 0.3
          },
          {
            description: 'Learn JavaScript basics: variables (let, const, var), data types, operators',
            estimated_duration_minutes: baseMinutes * 0.7
          }
        ]
      })
    } else if (day === 2) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Master functions: declarations, expressions, arrow functions, parameters',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Practice function exercises: calculators, converters, validators',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      })
    } else if (day === 3) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Learn arrays and objects: creation, access, methods, iteration',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Build projects using arrays and objects: todo list, student records',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      })
    } else if (day === 4) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Master DOM manipulation: selecting elements, changing content, styling',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Create interactive web page: dynamic content, button clicks, form handling',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      })
    } else if (day === 5) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Learn event handling: click, submit, keyboard events, event listeners',
            estimated_duration_minutes: baseMinutes * 0.5
          },
          {
            description: 'Build interactive features: image gallery, calculator, or quiz app',
            estimated_duration_minutes: baseMinutes * 0.5
          }
        ]
      })
    } else if (day === 6) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Learn asynchronous JavaScript: callbacks, promises, async/await',
            estimated_duration_minutes: baseMinutes * 0.7
          },
          {
            description: 'Practice with API calls using fetch() and handling responses',
            estimated_duration_minutes: baseMinutes * 0.3
          }
        ]
      })
    } else if (day === 7) {
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Build a complete project: weather app, movie search, or news reader',
            estimated_duration_minutes: baseMinutes * 0.8
          },
          {
            description: 'Add error handling, loading states, and responsive design',
            estimated_duration_minutes: baseMinutes * 0.2
          }
        ]
      })
    }
  }

  // Continue with more advanced topics
  if (durationDays > 7) {
    for (let day = 8; day <= durationDays; day++) {
      const week = Math.ceil(day / 7)
      if (week === 2) {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn ES6+ features: destructuring, spread operator, template literals, modules',
              estimated_duration_minutes: baseMinutes * 0.6
            },
            {
              description: 'Refactor previous projects using modern JavaScript features',
              estimated_duration_minutes: baseMinutes * 0.4
            }
          ]
        })
      } else {
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Learn JavaScript frameworks: React basics or Vue.js fundamentals',
              estimated_duration_minutes: baseMinutes * 0.7
            },
            {
              description: 'Build a single-page application using your chosen framework',
              estimated_duration_minutes: baseMinutes * 0.3
            }
          ]
        })
      }
    }
  }

  return {
    ai_insights: `Your ${durationDays}-day JavaScript journey covers both fundamentals and modern web development. JavaScript is essential for web development and increasingly used for backend, mobile, and desktop applications. Focus on understanding core concepts before moving to frameworks. Build projects to reinforce learning and create a portfolio.`,
    knowledge_gaps: [
      {
        gap: 'Modern JavaScript development tools and workflow',
        resource_recommendation: 'Learn npm/yarn, webpack basics, use VS Code with JavaScript extensions, practice with CodePen for quick experiments'
      },
      {
        gap: 'Asynchronous programming and API integration',
        resource_recommendation: 'Practice with public APIs, understand promises and async/await, learn error handling patterns'
      },
      {
        gap: 'Framework knowledge and best practices',
        resource_recommendation: 'Choose React or Vue.js, follow official tutorials, build projects, learn component-based architecture'
      }
    ],
    daily_plan
  }
}

function generateFitnessCurriculum(goalTitle: string, durationDays: number, experience: string, timeCommitment: string, answerText: string) {
  const daily_plan = []
  const baseMinutes = timeCommitment === 'limited' ? 20 : timeCommitment === 'extensive' ? 60 : 40
  
  const hasGym = answerText.includes('gym') || answerText.includes('equipment')
  const prefersHome = answerText.includes('home') || answerText.includes('no gym')
  
  for (let day = 1; day <= durationDays; day++) {
    const week = Math.ceil(day / 7)
    const dayOfWeek = ((day - 1) % 7) + 1
    
    if (dayOfWeek === 7) { // Rest day
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Active recovery: light stretching, yoga, or gentle walk',
            estimated_duration_minutes: baseMinutes * 0.5
          },
          {
            description: 'Plan next week\'s workouts and track progress',
            estimated_duration_minutes: baseMinutes * 0.5
          }
        ]
      })
    } else if (week === 1) { // Foundation week
      if (dayOfWeek % 2 === 1) { // Odd days - strength
        daily_plan.push({
          day,
          tasks: [
            {
              description: hasGym 
                ? 'Full body strength training: squats, deadlifts, bench press (light weights)'
                : 'Bodyweight strength: push-ups, squats, lunges, planks',
              estimated_duration_minutes: baseMinutes * 0.8
            },
            {
              description: 'Cool down stretching and mobility work',
              estimated_duration_minutes: baseMinutes * 0.2
            }
          ]
        })
      } else { // Even days - cardio
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'Cardio workout: brisk walking, jogging, or cycling (moderate intensity)',
              estimated_duration_minutes: baseMinutes * 0.8
            },
            {
              description: 'Core strengthening: planks, crunches, leg raises',
              estimated_duration_minutes: baseMinutes * 0.2
            }
          ]
        })
      }
    } else { // Progressive weeks
      if (dayOfWeek % 2 === 1) { // Strength days
        daily_plan.push({
          day,
          tasks: [
            {
              description: hasGym 
                ? `Progressive strength training: increase weight or reps from week ${week - 1}`
                : 'Advanced bodyweight exercises: pistol squats, one-arm push-ups, burpees',
              estimated_duration_minutes: baseMinutes * 0.8
            },
            {
              description: 'Flexibility and recovery: foam rolling, stretching routine',
              estimated_duration_minutes: baseMinutes * 0.2
            }
          ]
        })
      } else { // Cardio days
        daily_plan.push({
          day,
          tasks: [
            {
              description: 'High-intensity interval training (HIIT) or longer steady-state cardio',
              estimated_duration_minutes: baseMinutes * 0.8
            },
            {
              description: 'Nutrition tracking and hydration monitoring',
              estimated_duration_minutes: baseMinutes * 0.2
            }
          ]
        })
      }
    }
  }

  return {
    ai_insights: `Your ${durationDays}-day fitness journey is designed for ${experience} level with ${timeCommitment} time commitment. Consistency is more important than intensity - it's better to do shorter workouts regularly than long workouts sporadically. Progressive overload (gradually increasing difficulty) is key to improvement. Listen to your body and adjust intensity as needed.`,
    knowledge_gaps: [
      {
        gap: 'Proper exercise form and technique',
        resource_recommendation: hasGym 
          ? 'Consider a few personal training sessions, use fitness apps like Jefit or Strong, watch form videos'
          : 'Use bodyweight training apps like Nike Training Club, follow YouTube fitness channels like Fitness Blender'
      },
      {
        gap: 'Nutrition and recovery knowledge',
        resource_recommendation: 'Learn about macronutrients, use MyFitnessPal for tracking, prioritize sleep (7-9 hours), stay hydrated'
      },
      {
        gap: 'Progress tracking and motivation',
        resource_recommendation: 'Take progress photos, track workouts in a journal or app, set specific measurable goals, find a workout buddy'
      }
    ],
    daily_plan
  }
}

function generateLanguageCurriculum(goalTitle: string, durationDays: number, experience: string, timeCommitment: string, learningStyle: string) {
  const daily_plan = []
  const baseMinutes = timeCommitment === 'limited' ? 25 : timeCommitment === 'extensive' ? 75 : 45
  
  const language = goalTitle.toLowerCase().includes('spanish') ? 'Spanish' : 
                  goalTitle.toLowerCase().includes('french') ? 'French' :
                  goalTitle.toLowerCase().includes('german') ? 'German' : 'target language'

  for (let day = 1; day <= durationDays; day++) {
    const week = Math.ceil(day / 7)
    
    if (week === 1) { // Foundation
      daily_plan.push({
        day,
        tasks: [
          {
            description: `Learn basic ${language} pronunciation and alphabet`,
            estimated_duration_minutes: baseMinutes * 0.4
          },
          {
            description: `Master essential greetings and introductions in ${language}`,
            estimated_duration_minutes: baseMinutes * 0.4
          },
          {
            description: 'Practice listening with beginner audio content',
            estimated_duration_minutes: baseMinutes * 0.2
          }
        ]
      })
    } else if (week === 2) { // Basic vocabulary
      daily_plan.push({
        day,
        tasks: [
          {
            description: `Learn ${language} numbers, colors, and basic adjectives`,
            estimated_duration_minutes: baseMinutes * 0.5
          },
          {
            description: 'Practice basic sentence structure and verb conjugations',
            estimated_duration_minutes: baseMinutes * 0.3
          },
          {
            description: 'Speaking practice: record yourself or use language exchange apps',
            estimated_duration_minutes: baseMinutes * 0.2
          }
        ]
      })
    } else { // Intermediate and advanced
      daily_plan.push({
        day,
        tasks: [
          {
            description: `Study ${language} grammar: tenses, sentence structure, complex expressions`,
            estimated_duration_minutes: baseMinutes * 0.4
          },
          {
            description: 'Read simple texts and practice comprehension',
            estimated_duration_minutes: baseMinutes * 0.3
          },
          {
            description: 'Conversation practice with native speakers or language partners',
            estimated_duration_minutes: baseMinutes * 0.3
          }
        ]
      })
    }
  }

  return {
    ai_insights: `Your ${durationDays}-day ${language} learning plan emphasizes daily practice and gradual progression. Language learning requires consistent exposure and practice across all skills: listening, speaking, reading, and writing. Immersion through media, music, and conversation accelerates learning. Don't fear making mistakes - they're essential for improvement.`,
    knowledge_gaps: [
      {
        gap: 'Pronunciation and listening comprehension',
        resource_recommendation: `Use language apps like Duolingo or Babbel, watch ${language} YouTube channels with subtitles, listen to ${language} podcasts for beginners`
      },
      {
        gap: 'Grammar and sentence structure',
        resource_recommendation: `Study with structured courses, use grammar books specific to ${language}, practice with conjugation apps`
      },
      {
        gap: 'Speaking confidence and fluency',
        resource_recommendation: 'Find language exchange partners on HelloTalk or Tandem, practice with AI tutors, join local language meetups'
      }
    ],
    daily_plan
  }
}

function generateBusinessCurriculum(goalTitle: string, durationDays: number, experience: string, timeCommitment: string, answerText: string) {
  const daily_plan = []
  const baseMinutes = timeCommitment === 'limited' ? 60 : timeCommitment === 'extensive' ? 150 : 90
  
  for (let day = 1; day <= durationDays; day++) {
    const week = Math.ceil(day / 7)
    
    if (week === 1) { // Foundation and planning
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Define your business idea and conduct initial market research',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Analyze competitors and identify your unique value proposition',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      })
    } else if (week === 2) { // Business planning
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Develop business model canvas and revenue streams',
            estimated_duration_minutes: baseMinutes * 0.7
          },
          {
            description: 'Create financial projections and funding requirements',
            estimated_duration_minutes: baseMinutes * 0.3
          }
        ]
      })
    } else if (week === 3) { // MVP development
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Build minimum viable product (MVP) or service prototype',
            estimated_duration_minutes: baseMinutes * 0.8
          },
          {
            description: 'Test MVP with potential customers and gather feedback',
            estimated_duration_minutes: baseMinutes * 0.2
          }
        ]
      })
    } else { // Launch and growth
      daily_plan.push({
        day,
        tasks: [
          {
            description: 'Execute marketing strategy and customer acquisition',
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Analyze metrics, iterate on product, and plan scaling',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      })
    }
  }

  return {
    ai_insights: `Your ${durationDays}-day business journey focuses on lean startup methodology: build, measure, learn. Start with validating your idea before investing heavily in development. Customer feedback is crucial - talk to potential customers early and often. Focus on solving a real problem that people are willing to pay for.`,
    knowledge_gaps: [
      {
        gap: 'Market validation and customer discovery',
        resource_recommendation: 'Read "The Mom Test" by Rob Fitzpatrick, conduct customer interviews, use surveys and landing pages to test demand'
      },
      {
        gap: 'Business model and financial planning',
        resource_recommendation: 'Study business model canvas, learn basic accounting, use tools like LivePlan for business planning'
      },
      {
        gap: 'Marketing and customer acquisition',
        resource_recommendation: 'Learn digital marketing basics, study successful case studies, experiment with different channels (social media, content, ads)'
      }
    ],
    daily_plan
  }
}

function generateGenericLearningPlan(goalTitle: string, durationDays: number, experience: string, timeCommitment: string, learningStyle: string) {
  const daily_plan = []
  const baseMinutes = timeCommitment === 'limited' ? 30 : timeCommitment === 'extensive' ? 90 : 60
  
  const phases = Math.max(3, Math.ceil(durationDays / 10))
  
  for (let day = 1; day <= durationDays; day++) {
    const phase = Math.ceil((day / durationDays) * phases)
    
    if (phase === 1) { // Foundation phase
      daily_plan.push({
        day,
        tasks: [
          {
            description: experience === 'beginner' 
              ? `Learn the fundamentals and basic concepts of ${goalTitle}`
              : `Review and strengthen foundation knowledge in ${goalTitle}`,
            estimated_duration_minutes: baseMinutes * 0.7
          },
          {
            description: 'Research additional learning resources and create study plan',
            estimated_duration_minutes: baseMinutes * 0.3
          }
        ]
      })
    } else if (phase === 2) { // Practice phase
      daily_plan.push({
        day,
        tasks: [
          {
            description: `Practice key concepts and skills in ${goalTitle}`,
            estimated_duration_minutes: baseMinutes * 0.6
          },
          {
            description: 'Work on practical exercises or small projects',
            estimated_duration_minutes: baseMinutes * 0.4
          }
        ]
      })
    } else { // Application phase
      daily_plan.push({
        day,
        tasks: [
          {
            description: `Apply knowledge through comprehensive projects in ${goalTitle}`,
            estimated_duration_minutes: baseMinutes * 0.7
          },
          {
            description: 'Share progress and seek feedback from community or mentors',
            estimated_duration_minutes: baseMinutes * 0.3
          }
        ]
      })
    }
  }

  return {
    ai_insights: `Your ${durationDays}-day learning plan for "${goalTitle}" is structured in ${phases} progressive phases. The plan adapts to your ${experience} level and ${timeCommitment} time commitment. Consistent daily practice is more effective than sporadic intensive sessions. Focus on understanding concepts deeply before moving to advanced topics.`,
    knowledge_gaps: [
      {
        gap: 'Foundational knowledge and concepts',
        resource_recommendation: 'Find authoritative books, online courses, or tutorials from reputable sources in your field'
      },
      {
        gap: 'Practical application skills',
        resource_recommendation: 'Seek hands-on projects, exercises, or real-world practice opportunities'
      },
      {
        gap: 'Community and mentorship',
        resource_recommendation: 'Join online communities, forums, or find mentors in this field'
      }
    ],
    daily_plan
  }
}

function generateFallbackPlan(goalTitle: string, durationDays: number, answers: Record<string, string>) {
  console.log('🔄 Generating fallback plan for:', goalTitle)
  
  const daily_plan = []
  
  for (let day = 1; day <= durationDays; day++) {
    daily_plan.push({
      day,
      tasks: [
        {
          description: `Work on ${goalTitle} - Day ${day}`,
          estimated_duration_minutes: 45
        },
        {
          description: 'Review progress and plan next steps',
          estimated_duration_minutes: 15
        }
      ]
    })
  }

  return {
    ai_insights: `Your ${durationDays}-day plan for "${goalTitle}" provides a structured approach to achieving your goal. Stay consistent and adjust as needed.`,
    knowledge_gaps: [
      {
        gap: 'Understanding the fundamentals',
        resource_recommendation: 'Research authoritative books, courses, or online resources in this area'
      },
      {
        gap: 'Practical application skills',
        resource_recommendation: 'Find hands-on projects or exercises to practice what you learn'
      }
    ],
    daily_plan
  }
}