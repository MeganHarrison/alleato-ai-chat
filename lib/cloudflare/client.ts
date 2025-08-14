// Client-side utilities for interacting with Cloudflare Worker

const WORKER_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || '';
const WORKER_TOKEN = process.env.CLOUDFLARE_WORKER_TOKEN || '';

export class CloudflareClient {
  private async request(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${WORKER_URL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${WORKER_TOKEN}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Worker request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Stream management
  async createStream() {
    return this.request('/api/streams', { method: 'POST' });
  }

  async getStream(streamId: string) {
    return this.request(`/api/streams/${streamId}`);
  }

  async appendToStream(streamId: string, message: any) {
    return this.request(`/api/streams/${streamId}/append`, {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  async deleteStream(streamId: string) {
    return this.request(`/api/streams/${streamId}`, { method: 'DELETE' });
  }

  // File upload
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${WORKER_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WORKER_TOKEN}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Database query (for complex operations)
  async query(query: string, params: any[] = []) {
    return this.request('/api/db/query', {
      method: 'POST',
      body: JSON.stringify({ query, params }),
    });
  }
}

export const cloudflareClient = new CloudflareClient();