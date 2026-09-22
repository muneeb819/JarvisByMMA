# JARVIS - Personal AI Assistant

A web-based JARVIS clone with voice control, built from scratch with TypeScript, React, and Web Speech API.

## Features

- 🎤 **Voice Control** - Web Speech API for speech-to-text
- 🔊 **Text-to-Speech** - Browser TTS for responses
- 🤖 **LLM Integration** - OpenAI, Anthropic, or local (Ollama)
- 💬 **Conversation History** - Persistent chat log
- ⚙️ **Configurable** - Runtime settings panel
- 🎨 **Modern UI** - Dark/light mode, animated visualizer

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your API keys to .env
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# Start development (runs both client & server)
npm run dev
```

Open http://localhost:5173 in Chrome/Edge (Firefox has limited Speech Recognition support).

## Architecture

```
jarvis/
├── src/
│   ├── server/          # WebSocket server (Node.js + ws)
│   │   └── index.ts     # Main server entry
│   ├── client/          # React frontend (Vite)
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── hooks/
│   │   │   └── useJarvis.ts    # WebSocket + Speech Recognition
│   │   ├── components/
│   │   │   ├── VoiceVisualizer.tsx  # Animated orb + STT
│   │   │   ├── TranscriptLog.tsx    # Chat history
│   │   │   └── SettingsPanel.tsx    # Config UI
│   │   └── styles.css
│   └── shared/          # Shared types
│       └── types.ts
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

## LLM Providers

| Provider | Models | Setup |
|----------|--------|-------|
| OpenAI | gpt-4-turbo, gpt-4o, gpt-3.5-turbo | `OPENAI_API_KEY` |
| Anthropic | claude-3-opus, claude-3-sonnet, claude-3-haiku | `ANTHROPIC_API_KEY` |
| Local (Ollama) | llama3, mistral, codellama, etc. | `LOCAL_LLM_URL` (default: http://localhost:11434) |

## Voice Commands

Click the microphone button or press `Space` to start listening. JARVIS will:
1. Transcribe your speech in real-time
2. Send to configured LLM
3. Display response in chat log
4. (Future) Speak response via TTS

## Extending

### Add Custom Actions

Edit `src/server/index.ts` - `executeAction()`:

```typescript
case 'smart_home':
  await controlDevice(payload.device, payload.action);
  break;
case 'web_search':
  const results = await search(payload.query);
  break;
case 'run_script':
  await execScript(payload.script);
  break;
```

### Add New LLM Provider

1. Add to `JarvisConfig.llmProvider` type in `src/shared/types.ts`
2. Add handler in `callLLM()` in `src/server/index.ts`

### Frontend Components

All components in `src/client/components/` - extend or replace as needed.

## Browser Support

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Speech Recognition | ✅ | ✅ | ⚠️ Limited | ❌ |
| Speech Synthesis | ✅ | ✅ | ✅ | ✅ |
| WebSocket | ✅ | ✅ | ✅ | ✅ |

**Recommendation:** Use Chrome or Edge for best experience.

## Production Build

```bash
npm run build
npm start
```

Serves static files from `dist/client` and API on port 3001.

## License

MIT