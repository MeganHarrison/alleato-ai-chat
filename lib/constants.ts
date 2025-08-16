import { generateDummyPassword } from './db/utils';

export const isProductionEnvironment = process.env.NODE_ENV === 'production';
export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT,
);

export const guestRegex = /^guest-\d+$/;

export const DUMMY_PASSWORD = generateDummyPassword();

export const DEFAULT_MODEL = 'openai/gpt-5';

export const SUPPORTED_MODELS = [
  'amazon/nova-lite',
  'amazon/nova-micro',
  'anthropic/claude-3.5-haiku',
  'google/gemini-2.0-flash',
  'google/gemma2-9b-it',
  'meta/llama-3.1-8b',
  'mistral/ministral-3b',
  'openai/gpt-3.5-turbo',
  'openai/gpt-4o-mini',
  'openai/gpt-5',
  'xai/grok-3',
];
