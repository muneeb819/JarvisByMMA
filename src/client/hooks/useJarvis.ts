import { useState, useEffect, useRef, useCallback } from 'react';
import type { JarvisConfig, ServerMessage, VoiceCommand, AssistantResponse } from '@shared/types';

interface UseJarvisOptions {
  onTranscript?: (cmd: VoiceCommand) => void;
  onResponse?: (resp: AssistantResponse) => void;
  onStatus?: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
}

interface UseJarvisReturn {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  connect: (config: JarvisConfig) => void;
  disconnect: () => void;
  sendCommand: (command: VoiceCommand) => void;
  updateConfig: (config: Partial<JarvisConfig>) => void;
  isConnected: boolean;
}

const WS_URL = `ws://${window.location.hostname}:3001`;

export function useJarvis(options: UseJarvisOptions = {}): UseJarvisReturn {
  const { onTranscript, onResponse, onStatus } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const configRef = useRef<JarvisConfig>();

  const updateStatus = useCallback((newStatus: typeof status) => {
    setStatus(newStatus);
    onStatus?.(newStatus);
  }, [onStatus]);

  const connect = useCallback((config: JarvisConfig) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    configRef.current = config;
    updateStatus('connecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to JARVIS server');
      updateStatus('connected');
      
      // Send initial config
      ws.send(JSON.stringify({
        type: 'config',
        payload: config
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (e) {
        console.error('Failed to parse server message:', e);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from JARVIS server');
      updateStatus('disconnected');
      
      // Auto-reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (configRef.current) {
          connect(configRef.current);
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      updateStatus('error');
    };
  }, [updateStatus]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    updateStatus('disconnected');
  }, [updateStatus]);

  const sendCommand = useCallback((command: VoiceCommand) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'command',
        payload: command
      }));
    }
  }, []);

  const updateConfig = useCallback((newConfig: Partial<JarvisConfig>) => {
    configRef.current = { ...configRef.current, ...newConfig } as JarvisConfig;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'config',
        payload: newConfig
      }));
    }
  }, []);

  const handleServerMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case 'transcript':
        onTranscript?.(message.payload as VoiceCommand);
        break;
      case 'response':
        onResponse?.(message.payload as AssistantResponse);
        break;
      case 'status':
        // Handle status updates if needed
        break;
      case 'error':
        console.error('Server error:', message.payload);
        break;
    }
  }, [onTranscript, onResponse]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendCommand,
    updateConfig,
    isConnected: status === 'connected'
  };
}