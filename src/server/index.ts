/**
 * JARVIS Server - WebSocket backend for real-time voice assistant
 */

import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { z } from 'zod';
import type { JarvisConfig, ServerMessage, VoiceCommand, AssistantResponse, ConversationMessage } from '../shared/types.js';
import { DEFAULT_CONFIG } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT: number = (process.env.PORT ? parseInt(process.env.PORT, 10) : 3001);

// In-memory session store (replace with Redis in production)
const sessions = new Map<string, Session>();

interface Session {
  id: string;
  ws: WebSocket;
  config: JarvisConfig;
  history: ConversationMessage[];
  isListening: boolean;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function broadcast(session: Session, message: ServerMessage) {
  if (session.ws.readyState === WebSocket.OPEN || session.ws.readyState === WebSocket.CONNECTING) {
    try {
      session.ws.send(JSON.stringify(message));
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  }
}

function createSession(ws: WebSocket): Session {
  const session: Session = {
    id: generateId(),
    ws,
    config: { ...DEFAULT_CONFIG },
    history: [],
    isListening: false
  };
  sessions.set(session.id, session);
  return session;
}

// LLM Integration
async function callLLM(session: Session, userMessage: string): Promise<string> {
  const { config, history } = session;
  
  const messages: ConversationMessage[] = [
    { role: 'system', content: config.systemPrompt },
    ...history.slice(-10),
    { role: 'user', content: userMessage }
  ];

  try {
    switch (config.llmProvider) {
      case 'openai':
        return await callOpenAI(config, messages);
      case 'anthropic':
        return await callAnthropic(config, messages);
      case 'local':
        return await callLocalLLM(config, messages);
      default:
        return "I'm not configured with an LLM provider yet.";
    }
  } catch (error) {
    console.error('LLM Error:', error);
    return "I encountered an error processing that request.";
  }
}

async function callOpenAI(config: JarvisConfig, messages: ConversationMessage[]): Promise<string> {
  const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) return "OpenAI API key not configured. Please add it in Settings or .env file.";

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.llmModel,
      messages,
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callAnthropic(config: JarvisConfig, messages: ConversationMessage[]): Promise<string> {
  const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "Anthropic API key not configured. Please add it in Settings or .env file.";

  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.llmModel,
      system: systemMessage?.content,
      messages: userMessages,
      max_tokens: 500,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic error: ${err}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

async function callLocalLLM(config: JarvisConfig, messages: ConversationMessage[]): Promise<string> {
  const baseUrl = process.env.LOCAL_LLM_URL || 'http://localhost:11434';
  
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.llmModel,
      messages,
      stream: false
    })
  });

  if (!response.ok) throw new Error('Local LLM error');
  
  const data = await response.json();
  return data.message?.content || '';
}

// Action handlers
async function executeAction(session: Session, actionType: string, payload: Record<string, unknown>): Promise<void> {
  console.log(`Executing action: ${actionType}`, payload);
  switch (actionType) {
    case 'web_search':
      break;
    case 'smart_home':
      break;
    case 'run_script':
      break;
    default:
      console.warn(`Unknown action type: ${actionType}`);
  }
}

function handleMessage(session: Session, data: unknown) {
  const message = z.object({
    type: z.enum(['command', 'config', 'ping']),
    payload: z.unknown()
  }).safeParse(data);

  if (!message.success) {
    broadcast(session, { type: 'error', payload: 'Invalid message format' });
    return;
  }

  switch (message.data.type) {
    case 'ping':
      broadcast(session, { type: 'status', payload: { status: 'alive', sessionId: session.id } });
      break;

    case 'config':
      const configUpdate = z.object({
        wakeWord: z.string().optional(),
        language: z.string().optional(),
        voice: z.string().optional(),
        llmProvider: z.enum(['openai', 'anthropic', 'local', 'custom']).optional(),
        llmModel: z.string().optional(),
        apiKey: z.string().optional(),
        systemPrompt: z.string().optional()
      }).safeParse(message.data.payload);

      if (configUpdate.success) {
        session.config = { ...session.config, ...configUpdate.data };
        broadcast(session, { type: 'status', payload: { config: session.config } });
      }
      break;

    case 'command':
      const command = z.object({
        id: z.string().optional(),
        transcript: z.string(),
        confidence: z.number(),
        timestamp: z.number()
      }).safeParse(message.data.payload);

      if (command.success) {
        const cmd = command.data;
        processCommand(session, {
          ...cmd,
          id: cmd.id || generateId()
        });
      }
      break;
  }
}

async function processCommand(session: Session, voiceCommand: VoiceCommand) {
  const { transcript } = voiceCommand;
  
  session.history.push({
    role: 'user',
    content: transcript,
    timestamp: voiceCommand.timestamp
  });

  broadcast(session, { type: 'transcript', payload: voiceCommand });

  const responseText = await callLLM(session, transcript);

  const responseTimestamp = Date.now();
  session.history.push({
    role: 'assistant',
    content: responseText,
    timestamp: responseTimestamp
  });

  const response: AssistantResponse = {
    id: generateId(),
    text: responseText,
    timestamp: responseTimestamp
  };

  broadcast(session, { type: 'response', payload: response });
}

// Create HTTP server for health checks and static files in production
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', sessions: sessions.size }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const session = createSession(ws);
  console.log(`New session: ${session.id}`);

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      handleMessage(session, parsed);
    } catch (e) {
      console.error('Message parse error:', e);
    }
  });

  ws.on('close', () => {
    sessions.delete(session.id);
    console.log(`Session ended: ${session.id}`);
  });

  ws.on('error', (err) => {
    console.error(`Session error ${session.id}:`, err);
    try { ws.close(); } catch (e) {}
    sessions.delete(session.id);
  });

  broadcast(session, { 
    type: 'status', 
    payload: { 
      status: 'connected', 
      sessionId: session.id,
      config: session.config
    } 
  });
});

server.listen(PORT, () => {
  console.log(`JARVIS Server running on ws://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  wss.close(() => {
    server.close(() => process.exit(0));
  });
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});
