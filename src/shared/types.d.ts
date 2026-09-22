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
export declare const DEFAULT_CONFIG: JarvisConfig;
