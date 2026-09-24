/**
 * Shared types between client and server
 */

export interface VoiceCommand {
  id: string;
  transcript: string;
  confidence: number;
  timestamp: number;
}

export interface AssistantResponse {
  id: string;
  text: string;
  audioUrl?: string;
  actions?: Action[];
  timestamp: number;
}

export interface Action {
  type: string;
  payload: Record<string, unknown>;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface ServerMessage {
  type: 'command' | 'response' | 'error' | 'status' | 'transcript';
  payload: unknown;
}

export interface ClientMessage {
  type: 'command' | 'config' | 'ping';
  payload: unknown;
}

export interface JarvisConfig {
  wakeWord?: string;
  language: string;
  voice?: string;
  llmProvider: 'openai' | 'anthropic' | 'local' | 'custom';
  llmModel: string;
  apiKey?: string;
  systemPrompt: string;
}

export const DEFAULT_CONFIG: JarvisConfig = {
  language: 'en-US',
  llmProvider: 'openai',
  llmModel: 'gpt-4-turbo-preview',
  systemPrompt: `You are JARVIS, a highly intelligent AI assistant. You are helpful, concise, and slightly witty. 
You can control smart home devices, answer questions, run automation tasks, and have natural conversations.
Keep responses brief and conversational. Use "Sir" or "Ma'am" occasionally but not excessively.`
};

