import { useState, useEffect, useCallback } from 'react';
import type { JarvisConfig } from '@shared/types';

interface SettingsPanelProps {
  config: JarvisConfig;
  onChange: (config: Partial<JarvisConfig>) => void;
  onClose: () => void;
  isConnected: boolean;
}

export function SettingsPanel({ config, onChange, onClose, isConnected }: SettingsPanelProps) {
  const [localConfig, setLocalConfig] = useState(config);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
    setApiKey(config.apiKey || '');
  }, [config]);

  const handleChange = useCallback((key: keyof JarvisConfig, value: unknown) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onChange(newConfig);
  }, [localConfig, onChange]);

  const handleApiKeyChange = useCallback((value: string) => {
    setApiKey(value);
    handleChange('apiKey', value);
  }, [handleChange]);

  const handleSystemPromptChange = useCallback((value: string) => {
    handleChange('systemPrompt', value);
  }, [handleChange]);

  const toggleApiKeyVisibility = useCallback(() => {
    setShowApiKey(prev => !prev);
  }, []);

  const testConnection = useCallback(async () => {
    // Could add a test endpoint call here
    alert('Connection test would go here');
  }, []);

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>JARVIS Settings</h2>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="settings-content">
          <section className="settings-section">
            <h3>LLM Provider</h3>
            <div className="setting-row">
              <label>Provider</label>
              <select 
                value={localConfig.llmProvider} 
                onChange={(e) => handleChange('llmProvider', e.target.value)}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="local">Local (Ollama)</option>
                <option value="custom">Custom Endpoint</option>
              </select>
            </div>

            <div className="setting-row">
              <label>Model</label>
              <input
                type="text"
                value={localConfig.llmModel}
                onChange={(e) => handleChange('llmModel', e.target.value)}
                placeholder="gpt-4-turbo-preview"
              />
            </div>

            <div className="setting-row">
              <label>API Key</label>
              <div className="api-key-input">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={isConnected ? '••••••••' : 'Enter API key'}
                />
                <button type="button" className="toggle-visibility" onClick={toggleApiKeyVisibility}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <button className="test-btn" onClick={testConnection} disabled={!isConnected}>
              Test Connection
            </button>
          </section>

          <section className="settings-section">
            <h3>Voice Settings</h3>
            <div className="setting-row">
              <label>Language</label>
              <select 
                value={localConfig.language} 
                onChange={(e) => handleChange('language', e.target.value)}
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="ja-JP">Japanese</option>
                <option value="zh-CN">Chinese</option>
              </select>
            </div>

            <div className="setting-row">
              <label>Wake Word</label>
              <input
                type="text"
                value={localConfig.wakeWord || ''}
                onChange={(e) => handleChange('wakeWord', e.target.value || undefined)}
                placeholder="jarvis (optional)"
              />
            </div>

            <div className="setting-row">
              <label>Voice</label>
              <input
                type="text"
                value={localConfig.voice || ''}
                onChange={(e) => handleChange('voice', e.target.value || undefined)}
                placeholder="Browser default"
              />
            </div>
          </section>

          <section className="settings-section">
            <h3>System Prompt</h3>
            <textarea
              value={localConfig.systemPrompt}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
              rows={8}
              className="system-prompt"
              placeholder="Define JARVIS personality and capabilities..."
            />
          </section>
        </div>
      </div>
    </div>
  );
}