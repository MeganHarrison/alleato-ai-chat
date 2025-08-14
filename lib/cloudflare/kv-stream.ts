import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 7);

export interface StreamState {
  messages: any[];
  createdAt: number;
  lastAccessedAt: number;
}

export class CloudflareStreamManager {
  constructor(private kv: KVNamespace) {}

  async createStream(): Promise<string> {
    const streamId = nanoid();
    const state: StreamState = {
      messages: [],
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };
    
    // Store for 24 hours
    await this.kv.put(streamId, JSON.stringify(state), {
      expirationTtl: 86400,
    });
    
    return streamId;
  }

  async getStream(streamId: string): Promise<StreamState | null> {
    const data = await this.kv.get(streamId);
    if (!data) return null;
    
    const state = JSON.parse(data) as StreamState;
    state.lastAccessedAt = Date.now();
    
    // Update last accessed time
    await this.kv.put(streamId, JSON.stringify(state), {
      expirationTtl: 86400,
    });
    
    return state;
  }

  async appendToStream(streamId: string, message: any): Promise<void> {
    const state = await this.getStream(streamId);
    if (!state) throw new Error('Stream not found');
    
    state.messages.push(message);
    state.lastAccessedAt = Date.now();
    
    await this.kv.put(streamId, JSON.stringify(state), {
      expirationTtl: 86400,
    });
  }

  async deleteStream(streamId: string): Promise<void> {
    await this.kv.delete(streamId);
  }
}