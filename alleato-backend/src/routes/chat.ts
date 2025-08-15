import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
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
  
  const chat = await chatService.createChat(
    user.userId,
    data.title || 'New Chat'
  );
  
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
  
  // Save user message
  const lastUserMessage = data.messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    await chatService.addMessage(chatId, 'user', lastUserMessage.content);
  }
  
  // Create a readable stream for the response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      try {
        // Use the streaming method from ChatService
        const messageStream = chatService.streamMessage(
          chatId,
          lastUserMessage?.content || ''
        );
        
        for await (const chunk of messageStream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
        }
        
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
  
  return new Response(stream, {
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
  
  await chatService.deleteChat(chatId, user.userId);
  
  return c.json({ message: 'Chat deleted' });
});

export { chatRouter };