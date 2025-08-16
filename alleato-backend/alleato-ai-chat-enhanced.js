// alleato-ai-chat-enhanced.js
// Enhanced AI chat worker that properly integrates with the RAG vectorization system

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      switch (path) {
        case '/':
          return handleDashboard(env, corsHeaders);
        case '/chat':
          return handleChat(request, env, corsHeaders);
        case '/health':
          return handleHealth(env, corsHeaders);
        default:
          return new Response('Not found', { status: 404, headers: corsHeaders });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Enhanced AI Chat Service
class EnhancedAIChatService {
  constructor(env) {
    this.env = env;
    this.openaiApiKey = env.OPENAI_API_KEY;
    this.ragWorkerUrl = env.RAG_WORKER_URL || 'https://rag-vectorization-worker.yourdomain.workers.dev';
    this.model = 'gpt-4-turbo-preview';
    this.embeddingModel = 'text-embedding-3-small';
  }

  async processChat(message, conversationId = null, filters = {}) {
    try {
      console.log('Processing chat message:', message);
      
      // Step 1: Retrieve relevant context from RAG system
      const context = await this.retrieveContext(message, filters);
      
      // Step 2: Build enhanced prompt with context
      const enhancedPrompt = this.buildEnhancedPrompt(message, context);
      
      // Step 3: Get AI response
      const response = await this.getAIResponse(enhancedPrompt, conversationId);
      
      // Step 4: Format and return response with sources
      return this.formatResponse(response, context);
    } catch (error) {
      console.error('Chat processing error:', error);
      throw error;
    }
  }

  async retrieveContext(query, filters) {
    try {
      // Call the RAG vectorization worker for semantic search
      const response = await fetch(`${this.ragWorkerUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          limit: 5,
          filters
        })
      });

      if (!response.ok) {
        console.warn('RAG search failed, falling back to database search');
        return await this.fallbackDatabaseSearch(query, filters);
      }

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Context retrieval error:', error);
      // Fallback to direct database search
      return await this.fallbackDatabaseSearch(query, filters);
    }
  }

  async fallbackDatabaseSearch(query, filters) {
    try {
      // Direct database text search as fallback
      const searchPattern = `%${query}%`;
      const results = await this.env.ALLEATO_DB.prepare(`
        SELECT 
          mc.id,
          mc.content,
          mc.chunk_type,
          mc.speaker,
          m.title as meeting_title,
          m.date_time as meeting_date
        FROM meeting_chunks mc
        JOIN meetings m ON mc.meeting_id = m.id
        WHERE LOWER(mc.content) LIKE LOWER(?)
        ORDER BY m.date_time DESC
        LIMIT 5
      `).bind(searchPattern).all();

      return results.results.map(r => ({
        meeting: {
          title: r.meeting_title,
          date: r.meeting_date
        },
        chunk: {
          content: r.content,
          speaker: r.speaker,
          type: r.chunk_type
        },
        relevance: {
          score: 0.5 // Default relevance for text search
        }
      }));
    } catch (error) {
      console.error('Fallback search error:', error);
      return [];
    }
  }

  buildEnhancedPrompt(userMessage, context) {
    let prompt = `You are an intelligent assistant with access to meeting transcripts and organizational knowledge.

`;

    if (context.length > 0) {
      prompt += `Here is relevant context from previous meetings that may help answer the user's question:

`;
      
      context.forEach((item, index) => {
        prompt += `--- Context ${index + 1} ---
Meeting: ${item.meeting.title}
Date: ${new Date(item.meeting.date).toLocaleDateString()}
`;
        if (item.chunk.speaker) {
          prompt += `Speaker: ${item.chunk.speaker}
`;
        }
        prompt += `Content: ${item.chunk.content}
Relevance Score: ${(item.relevance.score * 100).toFixed(1)}%

`;
      });

      prompt += `Please use the above context to provide an informed and accurate response. If the context contains the answer, reference it. If the context doesn't fully answer the question, acknowledge this and provide the best response you can.

`;
    } else {
      prompt += `Note: No relevant context was found in the meeting transcripts for this query.

`;
    }

    prompt += `User Question: ${userMessage}

Response:`;

    return prompt;
  }

  async getAIResponse(prompt, conversationId) {
    const messages = [];
    
    // Load conversation history if exists
    if (conversationId) {
      const history = await this.loadConversationHistory(conversationId);
      messages.push(...history);
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Save to conversation history
    if (conversationId) {
      await this.saveToConversationHistory(conversationId, messages[messages.length - 1], {
        role: 'assistant',
        content: aiResponse
      });
    }

    return aiResponse;
  }

  formatResponse(response, context) {
    const sources = context.map(item => ({
      meeting: item.meeting.title,
      date: item.meeting.date,
      relevance: item.relevance.score,
      preview: item.chunk.content.substring(0, 100) + '...'
    }));

    return {
      response,
      sources,
      timestamp: new Date().toISOString(),
      contextUsed: context.length > 0
    };
  }

  async loadConversationHistory(conversationId) {
    try {
      const results = await this.env.ALLEATO_DB.prepare(`
        SELECT role, content 
        FROM conversation_history 
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        LIMIT 10
      `).bind(conversationId).all();

      return results.results.map(r => ({
        role: r.role,
        content: r.content
      }));
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
  }

  async saveToConversationHistory(conversationId, userMessage, assistantMessage) {
    try {
      const stmt = this.env.ALLEATO_DB.prepare(`
        INSERT INTO conversation_history (conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      
      await this.env.ALLEATO_DB.batch([
        stmt.bind(conversationId, 'user', userMessage.content, now),
        stmt.bind(conversationId, 'assistant', assistantMessage.content, now)
      ]);
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
  }
}

// Request handlers
async function handleDashboard(env, corsHeaders) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alleato AI Chat Enhanced</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
</head>
<body class="bg-gray-900 text-white min-h-screen">
    <div class="container mx-auto px-6 py-8" x-data="chatApp()">
        <h1 class="text-4xl font-bold mb-8">💬 Alleato AI Chat Enhanced</h1>
        
        <div class="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 class="text-xl font-semibold mb-4">Chat with Your Meeting Intelligence</h2>
            
            <div class="space-y-4">
                <!-- Filters -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm mb-1">Category Filter</label>
                        <select x-model="filters.category" class="w-full px-3 py-2 bg-gray-700 rounded">
                            <option value="">All Categories</option>
                            <option value="standup">Standup</option>
                            <option value="planning">Planning</option>
                            <option value="review">Review</option>
                            <option value="one-on-one">One-on-One</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm mb-1">Date From</label>
                        <input type="date" x-model="filters.dateFrom" class="w-full px-3 py-2 bg-gray-700 rounded">
                    </div>
                    <div>
                        <label class="block text-sm mb-1">Date To</label>
                        <input type="date" x-model="filters.dateTo" class="w-full px-3 py-2 bg-gray-700 rounded">
                    </div>
                </div>
                
                <!-- Chat Messages -->
                <div class="bg-gray-700 rounded-lg p-4 h-96 overflow-y-auto" id="chatMessages">
                    <template x-for="message in messages" :key="message.id">
                        <div class="mb-4">
                            <div :class="message.role === 'user' ? 'text-blue-400' : 'text-green-400'" class="font-semibold mb-1">
                                <span x-text="message.role === 'user' ? 'You' : 'AI Assistant'"></span>
                            </div>
                            <div class="text-gray-300" x-text="message.content"></div>
                            <template x-if="message.sources && message.sources.length > 0">
                                <div class="mt-2 text-xs text-gray-500">
                                    <div class="font-semibold">Sources:</div>
                                    <template x-for="source in message.sources">
                                        <div class="ml-2">
                                            • <span x-text="source.meeting"></span> 
                                            (<span x-text="new Date(source.date).toLocaleDateString()"></span>)
                                            - <span x-text="Math.round(source.relevance * 100)"></span>% relevant
                                        </div>
                                    </template>
                                </div>
                            </template>
                        </div>
                    </template>
                    <div x-show="loading" class="text-gray-500">
                        <span class="animate-pulse">AI is thinking...</span>
                    </div>
                </div>
                
                <!-- Input -->
                <div class="flex gap-2">
                    <input 
                        type="text" 
                        x-model="currentMessage"
                        @keyup.enter="sendMessage"
                        placeholder="Ask about your meetings..."
                        class="flex-1 px-4 py-2 bg-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        :disabled="loading"
                    >
                    <button 
                        @click="sendMessage"
                        :disabled="loading || !currentMessage"
                        class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-semibold transition-colors"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>

        <div class="bg-gray-800 p-6 rounded-lg">
            <h3 class="text-xl font-semibold mb-4">Example Questions</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <button @click="askExample('What were the key decisions from our last planning meeting?')" 
                        class="text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
                    What were the key decisions from our last planning meeting?
                </button>
                <button @click="askExample('Summarize the action items from this week\\'s standups')" 
                        class="text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
                    Summarize the action items from this week's standups
                </button>
                <button @click="askExample('What did we discuss about the Q4 roadmap?')" 
                        class="text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
                    What did we discuss about the Q4 roadmap?
                </button>
                <button @click="askExample('Who mentioned concerns about the project timeline?')" 
                        class="text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
                    Who mentioned concerns about the project timeline?
                </button>
            </div>
        </div>
    </div>

    <script>
        function chatApp() {
            return {
                messages: [],
                currentMessage: '',
                loading: false,
                conversationId: 'conv_' + Date.now(),
                filters: {
                    category: '',
                    dateFrom: '',
                    dateTo: ''
                },
                
                async sendMessage() {
                    if (!this.currentMessage || this.loading) return;
                    
                    const message = this.currentMessage;
                    this.currentMessage = '';
                    this.loading = true;
                    
                    // Add user message to chat
                    this.messages.push({
                        id: Date.now(),
                        role: 'user',
                        content: message
                    });
                    
                    try {
                        const response = await fetch('/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                message,
                                conversationId: this.conversationId,
                                filters: this.filters
                            })
                        });
                        
                        const data = await response.json();
                        
                        // Add AI response to chat
                        this.messages.push({
                            id: Date.now() + 1,
                            role: 'assistant',
                            content: data.response,
                            sources: data.sources
                        });
                        
                        // Scroll to bottom
                        this.$nextTick(() => {
                            const chatDiv = document.getElementById('chatMessages');
                            chatDiv.scrollTop = chatDiv.scrollHeight;
                        });
                    } catch (error) {
                        console.error('Chat error:', error);
                        this.messages.push({
                            id: Date.now() + 1,
                            role: 'assistant',
                            content: 'Sorry, I encountered an error. Please try again.'
                        });
                    } finally {
                        this.loading = false;
                    }
                },
                
                askExample(question) {
                    this.currentMessage = question;
                    this.sendMessage();
                }
            };
        }
    </script>
</body>
</html>`;

  return new Response(html, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html' }
  });
}

async function handleChat(request, env, corsHeaders) {
  const chatService = new EnhancedAIChatService(env);
  const { message, conversationId, filters } = await request.json();
  
  if (!message) {
    return new Response(JSON.stringify({ error: 'Message required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const result = await chatService.processChat(message, conversationId, filters || {});
  
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleHealth(env, corsHeaders) {
  const stats = {};
  
  // Check database connection
  try {
    const meetings = await env.ALLEATO_DB.prepare(
      'SELECT COUNT(*) as count FROM meetings'
    ).first();
    stats.totalMeetings = meetings?.count || 0;
    stats.databaseConnected = true;
  } catch (error) {
    stats.databaseConnected = false;
  }

  // Check RAG worker connection
  try {
    const ragWorkerUrl = env.RAG_WORKER_URL || 'https://rag-vectorization-worker.yourdomain.workers.dev';
    const response = await fetch(`${ragWorkerUrl}/health`);
    stats.ragWorkerConnected = response.ok;
  } catch (error) {
    stats.ragWorkerConnected = false;
  }

  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
