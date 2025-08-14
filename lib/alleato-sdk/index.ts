/**
 * Alleato Backend SDK
 * 
 * A type-safe SDK for interacting with the Alleato backend API
 */

interface AlleatoConfig {
  baseUrl: string;
  apiKey?: string;
  token?: string;
}

interface User {
  id: string;
  email: string;
  type: 'guest' | 'regular';
}

interface Chat {
  id: string;
  userId: string;
  title: string;
  visibility: 'public' | 'private';
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export class AlleatoSDK {
  private config: AlleatoConfig;
  private headers: HeadersInit;

  constructor(config: AlleatoConfig) {
    this.config = config;
    this.headers = {
      'Content-Type': 'application/json',
    };
    
    if (config.apiKey) {
      this.headers['X-API-Key'] = config.apiKey;
    }
    
    if (config.token) {
      this.headers['Authorization'] = `Bearer ${config.token}`;
    }
  }

  // Update authentication token
  setToken(token: string) {
    this.headers['Authorization'] = `Bearer ${token}`;
  }

  // Helper for API requests
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // Authentication
  auth = {
    login: async (email: string, password: string) => {
      const result = await this.request<{ user: User; token: string }>(
        '/api/v1/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      this.setToken(result.token);
      return result;
    },

    register: async (email: string, password: string) => {
      const result = await this.request<{ user: User; token: string }>(
        '/api/v1/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      this.setToken(result.token);
      return result;
    },

    guest: async () => {
      const result = await this.request<{ user: User; token: string }>(
        '/api/v1/auth/guest',
        {
          method: 'POST',
        }
      );
      this.setToken(result.token);
      return result;
    },

    logout: async () => {
      await this.request('/api/v1/auth/logout', {
        method: 'POST',
      });
      delete this.headers['Authorization'];
    },
  };

  // Chat operations
  chats = {
    list: async () => {
      return this.request<{ chats: Chat[] }>('/api/v1/chats');
    },

    create: async (data: { title?: string; visibility?: 'public' | 'private' }) => {
      return this.request<{ chat: Chat }>('/api/v1/chats', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    get: async (chatId: string) => {
      return this.request<{ chat: Chat }>(`/api/v1/chats/${chatId}`);
    },

    delete: async (chatId: string) => {
      return this.request(`/api/v1/chats/${chatId}`, {
        method: 'DELETE',
      });
    },

    sendMessage: async (
      chatId: string,
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
      options?: { model?: string }
    ) => {
      const response = await fetch(
        `${this.config.baseUrl}/api/v1/chats/${chatId}/messages`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({ messages, ...options }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Return the SSE stream
      return response.body;
    },
  };

  // File operations
  files = {
    upload: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${this.config.baseUrl}/api/v1/files/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: this.headers['Authorization'] as string,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      return response.json();
    },

    delete: async (fileId: string) => {
      return this.request(`/api/v1/files/${fileId}`, {
        method: 'DELETE',
      });
    },
  };

  // Stream operations
  streams = {
    create: async () => {
      return this.request<{ streamId: string }>('/api/v1/streams', {
        method: 'POST',
      });
    },

    get: async (streamId: string) => {
      return this.request(`/api/v1/streams/${streamId}`);
    },

    append: async (streamId: string, data: any) => {
      return this.request(`/api/v1/streams/${streamId}/append`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    delete: async (streamId: string) => {
      return this.request(`/api/v1/streams/${streamId}`, {
        method: 'DELETE',
      });
    },
  };
}

// Export a singleton instance
export const alleato = new AlleatoSDK({
  baseUrl: process.env.NEXT_PUBLIC_ALLEATO_API_URL || 'https://alleato-backend.workers.dev',
});

// Export the class for custom instances
export default AlleatoSDK;