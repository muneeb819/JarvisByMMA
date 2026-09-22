import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { TranscriptLog } from './components/TranscriptLog';
import { SettingsPanel } from './components/SettingsPanel';
import { useJarvis } from './hooks/useJarvis';
import type { JarvisConfig, VoiceCommand, AssistantResponse } from '@shared/types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function App() {
  const [config, setConfig] = useState<JarvisConfig>({
    language: 'en-US',
    llmProvider: 'openai',
    llmModel: 'gpt-4-turbo-preview',
    systemPrompt: `You are JARVIS, a highly intelligent AI assistant. You are helpful, concise, and slightly witty.
You can control smart home devices, answer questions, run automation tasks, and have natural conversations.
Keep responses brief and conversational. Use "Sir" or "Ma'am" occasionally but not excessively.`
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [transcripts, setTranscripts] = useState<Array<VoiceCommand | AssistantResponse>>([]);
  
  const {
    status,
    connect,
    disconnect,
    sendCommand,
    updateConfig,
    isConnected
  } = useJarvis({
    onTranscript: (cmd: VoiceCommand) => setTranscripts(prev => [...prev, cmd]),
    onResponse: (resp: AssistantResponse) => setTranscripts(prev => [...prev, resp]),
    onStatus: (s) => {}
  });

  useEffect(() => {
    connect(config);
    return () => disconnect();
  }, [config, connect, disconnect]);

  const handleConfigChange = useCallback((newConfig: Partial<JarvisConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    updateConfig(newConfig);
  }, [updateConfig]);

  const handleVoiceCommand = useCallback((transcript: string, confidence: number) => {
    sendCommand({ 
      id: generateId(),
      transcript, 
      confidence, 
      timestamp: Date.now() 
    });
  }, [sendCommand]);

  return (
    <div className="jarvis-app">
      <header className="jarvis-header">
        <div className="logo">
          <svg viewBox="0 0 64 64" className="jarvis-icon">
            <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="2"/>
            <path d="M32 10 v44 M10 32 h44" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="32" cy="32" r="12" fill="none" stroke="currentColor" strokeWidth="1.5"/>
            <circle cx="32" cy="32" r="6" fill="currentColor"/>
          </svg>
          <span className="jarvis-title">JARVIS</span>
        </div>
        <div className={`status-indicator ${status}`}>
          <span className="status-dot"></span>
          <span className="status-text">{status}</span>
        </div>
        <button 
          className="settings-btn" 
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Settings"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
          </svg>
        </button>
      </header>

      <main className="jarvis-main">
        <VoiceVisualizer 
          status={status}
          isListening={status === 'connected'}
          onVoiceCommand={handleVoiceCommand}
        />

        <TranscriptLog 
          transcripts={transcripts}
          onClear={() => setTranscripts([])}
        />
      </main>

      {showSettings && (
        <SettingsPanel 
          config={config}
          onChange={handleConfigChange}
          onClose={() => setShowSettings(false)}
          isConnected={isConnected}
        />
      )}
    </div>
  );
}

export default App;