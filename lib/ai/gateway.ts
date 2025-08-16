import { createGatewayProvider } from '@ai-sdk/gateway';
import { openai } from '@ai-sdk/openai';

// Create gateway provider for unified model access
export const gateway = createGatewayProvider({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
});

// Export direct providers as fallback
export { openai };

// Helper to get provider based on environment
export function getAIProvider(modelId?: string) {
  // If gateway URL is configured, use gateway
  if (process.env.AI_GATEWAY_BASE_URL) {
    return gateway(modelId || 'openai:gpt-4-turbo');
  }
  
  // Otherwise use direct provider
  return openai(modelId || 'gpt-4-turbo');
}