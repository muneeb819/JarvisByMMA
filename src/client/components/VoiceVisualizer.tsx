import { useEffect, useRef, useState, useCallback } from 'react';
import type { VoiceCommand } from '@shared/types';

interface VoiceVisualizerProps {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  isListening: boolean;
  onVoiceCommand: (transcript: string, confidence: number) => void;
}

export function VoiceVisualizer({ status, isListening, onVoiceCommand }: VoiceVisualizerProps) {
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number>();
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';
    recog.maxAlternatives = 3;

    recog.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      let maxConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result[0];
        if (result.isFinal) {
          finalTranscript += alt.transcript;
          maxConfidence = Math.max(maxConfidence, alt.confidence);
        } else {
          interimTranscript += alt.transcript;
        }
      }

      setTranscript(interimTranscript || finalTranscript);

      if (finalTranscript.trim()) {
        onVoiceCommand(finalTranscript.trim(), maxConfidence || 0.9);
        setTranscript('');
      }
    };

    recog.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsRecording(false);
      }
    };

    recog.onend = () => {
      if (isRecording) {
        // Auto-restart if still supposed to be recording
        try {
          recog.start();
        } catch (e) {
          setIsRecording(false);
        }
      }
    };

    setRecognition(recog);
    return () => {
      recog.stop();
    };
  }, [onVoiceCommand]);

  // Audio visualization
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    const sum = dataArray.reduce((a, b) => a + b, 0);
    const average = sum / dataArray.length;
    setAudioLevel(average / 255);

    animationRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  const startListening = useCallback(async () => {
    if (!recognition || isRecording) return;

    try {
      // Get microphone access for visualization
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      recognition.start();
      setIsRecording(true);
      updateAudioLevel();
    } catch (err) {
      console.error('Failed to start listening:', err);
    }
  }, [recognition, isRecording, updateAudioLevel]);

  const stopListening = useCallback(() => {
    if (!recognition || !isRecording) return;
    
    recognition.stop();
    setIsRecording(false);
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
  }, [recognition, isRecording]);

  const toggleListening = useCallback(() => {
    if (isRecording) {
      stopListening();
    } else {
      startListening();
    }
  }, [isRecording, startListening, stopListening]);

  // Auto-start when connected
  useEffect(() => {
    if (status === 'connected' && !isRecording) {
      startListening();
    } else if (status !== 'connected' && isRecording) {
      stopListening();
    }
  }, [status, isRecording, startListening, stopListening]);

  return (
    <div className="voice-visualizer">
      <div className="visualizer-core" data-active={isRecording}>
        <svg className="orbital-rings" viewBox="0 0 300 300">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Outer ring - pulses with audio level */}
          <circle
            className="ring outer"
            cx="150" cy="150" r={120 + audioLevel * 30}
            fill="none" stroke="currentColor" strokeWidth="2"
            style={{ filter: 'url(#glow)', opacity: 0.6 }}
          />
          
          {/* Middle ring */}
          <circle
            className="ring middle"
            cx="150" cy="150" r={90 + audioLevel * 20}
            fill="none" stroke="currentColor" strokeWidth="1.5"
            style={{ filter: 'url(#glow)', opacity: 0.4 }}
          />
          
          {/* Inner ring */}
          <circle
            className="ring inner"
            cx="150" cy="150" r={60 + audioLevel * 15}
            fill="none" stroke="currentColor" strokeWidth="1"
            style={{ filter: 'url(#glow)', opacity: 0.3 }}
          />
          
          {/* Center core */}
          <circle
            className="core"
            cx="150" cy="150" r={30 + audioLevel * 20}
            fill="currentColor"
            style={{ filter: 'url(#glow)' }}
          />
          
          {/* Frequency bars */}
          {Array.from({ length: 32 }).map((_, i) => {
            const angle = (i / 32) * Math.PI * 2;
            const radius = 45 + audioLevel * 25;
            const x = 150 + Math.cos(angle) * radius;
            const y = 150 + Math.sin(angle) * radius;
            const x2 = 150 + Math.cos(angle) * (radius + 15 + audioLevel * 20);
            const y2 = 150 + Math.sin(angle) * (radius + 15 + audioLevel * 20);
            return (
              <line
                key={i}
                className="freq-bar"
                x1={x} y1={y} x2={x2} y2={y2}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ opacity: 0.5 + audioLevel * 0.5 }}
              />
            );
          })}
        </svg>

        <div className="visualizer-overlay">
          <div className="status-text">
            {status === 'connecting' && 'Initializing...'}
            {status === 'connected' && !isRecording && 'Click to activate'}
            {status === 'connected' && isRecording && 'Listening...'}
            {status === 'error' && 'Connection error'}
            {status === 'disconnected' && 'Disconnected'}
          </div>
          
          {transcript && (
            <div className="live-transcript">
              <span className="transcript-prefix">▋</span>
              <span>{transcript}</span>
            </div>
          )}
        </div>
      </div>

      <div className="visualizer-controls">
        <button
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          onClick={toggleListening}
          disabled={status !== 'connected'}
          aria-label={isRecording ? 'Stop listening' : 'Start listening'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        </button>
        
        <div className="audio-meter">
          <div 
            className="meter-fill" 
            style={{ width: `${audioLevel * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}