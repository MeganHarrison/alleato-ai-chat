import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { requireAuth } from '../middleware/auth';
import { ChatService } from '../services/chat';
import type { Env, AuthenticatedContext } from '../types/env';

const chatRouter = new Hono<{
  Bindings: Env;
  Variables: {
    user: AuthenticatedContext;
  };
}>();

// Apply authentication to all chat routes
chatRouter.use('*', requireAuth);

// Create chat schema
const createChatSchema = z.object({
  title: z.string().optional(),
  visibility: z.enum(['public', 'private']).default('private'),
});

// Message schema
const sendMessageSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
  model: z.string().optional(),
});

// GET /chats - List user's chats
chatRouter.get('/', async (c) => {
  const user = c.get('user');
  const chatService = new ChatService(c.env);
  
  const chats = await chatService.getUserChats(user.userId);
  return c.json({ chats });
});

// POST /chats - Create new chat
chatRouter.post('/', zValidator('json', createChatSchema), async (c) => {
  const user = c.get('user');
  const data = c.req.valid('json');
  const chatService = new ChatService(c.env);
  
  const chat = await chatService.createChat({
    userId: user.userId,
    title: data.title || 'New Chat',
    visibility: data.visibility,
  });
  
  return c.json({ chat }, 201);
});

// GET /chats/:id - Get chat details
chatRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const chatId = c.req.param('id');
  const chatService = new ChatService(c.env);
  
  const chat = await chatService.getChat(chatId, user.userId);
  if (!chat) {
    return c.json({ error: 'Chat not found' }, 404);
  }
  
  return c.json({ chat });
});

// POST /chats/:id/messages - Send message and stream response
chatRouter.post('/:id/messages', zValidator('json', sendMessageSchema), async (c) => {
  const user = c.get('user');
  const chatId = c.req.param('id');
  const data = c.req.valid('json');
  const chatService = new ChatService(c.env);
  
  // Verify chat ownership
  const chat = await chatService.getChat(chatId, user.userId);
  if (!chat) {
    return c.json({ error: 'Chat not found' }, 404);
  }
  
  // Create AI model instance
  const model = openai(data.model || c.env.AI_CHAT_MODEL);
  
  // Stream the response
  const result = await streamText({
    model,
    messages: data.messages,
    onFinish: async ({ text }) => {
      // Save assistant message
      await chatService.addMessage({
        chatId,
        role: 'assistant',
        content: text,
      });
    },
  });
  
  // Save user message
  const lastUserMessage = data.messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    await chatService.addMessage({
      chatId,
      role: 'user',
      content: lastUserMessage.content,
    });
  }
  
  // Return the stream
  return new Response(result.toAIStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});

// DELETE /chats/:id - Delete chat
chatRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const chatId = c.req.param('id');
  const chatService = new ChatService(c.env);
  
  const deleted = await chatService.deleteChat(chatId, user.userId);
  if (!deleted) {
    return c.json({ error: 'Chat not found' }, 404);
  }
  
  return c.json({ message: 'Chat deleted' });
});

export { chatRouter };