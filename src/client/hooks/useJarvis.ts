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
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);
  const connectingRef = useRef(false);

  const updateStatus = useCallback((newStatus: typeof status) => {
    if (!mountedRef.current) return;
    setStatus(newStatus);
    onStatus?.(newStatus);
  }, [onStatus]);

  const doConnect = useCallback((config: JarvisConfig) => {
    if (connectingRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }
    
    connectingRef.current = true;
    configRef.current = config;
    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;
    updateStatus('connecting');

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      connectingRef.current = false;
      if (!mountedRef.current || !shouldReconnectRef.current) {
        ws.close();
        return;
      }
      console.log('Connected to JARVIS server');
      updateStatus('connected');
      reconnectAttemptsRef.current = 0;
      
      ws.send(JSON.stringify({
        type: 'config',
        payload: config
      }));
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const message: ServerMessage = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (e) {
        console.error('Failed to parse server message:', e);
      }
    };

    ws.onclose = () => {
      connectingRef.current = false;
      if (!mountedRef.current) return;
      console.log('Disconnected from JARVIS server');
      updateStatus('disconnected');
      
      if (shouldReconnectRef.current && mountedRef.current) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current += 1;
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (shouldReconnectRef.current && configRef.current && mountedRef.current && !connectingRef.current) {
            doConnect(configRef.current);
          }
        }, delay);
      }
    };

    ws.onerror = (error) => {
      connectingRef.current = false;
      if (!mountedRef.current) return;
      console.error('WebSocket error:', error);
      updateStatus('error');
    };
  }, [updateStatus]);

  const connect = useCallback((config: JarvisConfig) => {
    doConnect(config);
  }, [doConnect]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    connectingRef.current = false;
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
        break;
      case 'error':
        console.error('Server error:', message.payload);
        break;
    }
  }, [onTranscript, onResponse]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
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