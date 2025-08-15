import { OpenAI } from 'openai';
import type { Env } from '../types/env';

export class ChatService {
  private openai: OpenAI;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  async getUserChats(userId: string): Promise<any[]> {
    try {
      const results = await this.env.DB.prepare(
        'SELECT * FROM Chat WHERE userId = ? ORDER BY updatedAt DESC'
      ).bind(userId).all();
      return results.results || [];
    } catch (error) {
      console.error('Failed to get user chats:', error);
      return [];
    }
  }

  async createChat(userId: string, title: string): Promise<any> {
    const chatId = `chat-${Date.now()}`;
    const now = new Date().toISOString();
    
    try {
      await this.env.DB.prepare(
        'INSERT INTO Chat (id, userId, title, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)'
      ).bind(chatId, userId, title, now, now).run();
      
      return { id: chatId, userId, title, createdAt: now, updatedAt: now };
    } catch (error) {
      console.error('Failed to create chat:', error);
      throw new Error('Failed to create chat');
    }
  }

  async getChat(chatId: string, userId: string): Promise<any> {
    try {
      const result = await this.env.DB.prepare(
        'SELECT * FROM Chat WHERE id = ? AND userId = ?'
      ).bind(chatId, userId).first();
      
      if (!result) {
        throw new Error('Chat not found');
      }
      
      // Get messages from conversation
      const conversation = await this.getConversation(chatId);
      return { ...result, messages: conversation.messages };
    } catch (error) {
      console.error('Failed to get chat:', error);
      throw error;
    }
  }

  async deleteChat(chatId: string, userId: string): Promise<void> {
    try {
      await this.env.DB.prepare(
        'DELETE FROM Chat WHERE id = ? AND userId = ?'
      ).bind(chatId, userId).run();
      
      // Also delete conversation from KV
      await this.env.STREAMS.delete(`conversation:${chatId}`);
    } catch (error) {
      console.error('Failed to delete chat:', error);
      throw new Error('Failed to delete chat');
    }
  }

  async addMessage(chatId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    const conversation = await this.getConversation(chatId);
    const messages = conversation.messages || [];
    messages.push({ role, content, timestamp: new Date().toISOString() });
    await this.saveConversation(chatId, messages);
    
    // Update chat's updatedAt
    try {
      await this.env.DB.prepare(
        'UPDATE Chat SET updatedAt = ? WHERE id = ?'
      ).bind(new Date().toISOString(), chatId).run();
    } catch (error) {
      console.error('Failed to update chat timestamp:', error);
    }
  }

  async getConversation(conversationId: string): Promise<any> {
    const messages = await this.env.STREAMS.get(`conversation:${conversationId}`);
    if (!messages) {
      return { messages: [] };
    }
    return JSON.parse(messages);
  }

  async saveConversation(conversationId: string, messages: any[]): Promise<void> {
    await this.env.STREAMS.put(
      `conversation:${conversationId}`,
      JSON.stringify({ messages }),
      { expirationTtl: 86400 * 7 } // 7 days
    );
  }

  async sendMessage(conversationId: string, message: string): Promise<string> {
    // Get existing conversation
    const conversation = await this.getConversation(conversationId);
    const messages = conversation.messages || [];
    
    // Add user message
    messages.push({ role: 'user', content: message });
    
    try {
      // Call OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      });
      
      const assistantMessage = completion.choices[0].message.content || '';
      
      // Add assistant message
      messages.push({ role: 'assistant', content: assistantMessage });
      
      // Save updated conversation
      await this.saveConversation(conversationId, messages);
      
      return assistantMessage;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate response');
    }
  }

  async *streamMessage(conversationId: string, message: string): AsyncGenerator<string> {
    // Get existing conversation
    const conversation = await this.getConversation(conversationId);
    const messages = conversation.messages || [];
    
    // Add user message
    messages.push({ role: 'user', content: message });
    
    try {
      // Call OpenAI with streaming
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });
      
      let fullContent = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullContent += content;
        yield content;
      }
      
      // Add complete assistant message
      messages.push({ role: 'assistant', content: fullContent });
      
      // Save updated conversation
      await this.saveConversation(conversationId, messages);
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate response');
    }
  }
}