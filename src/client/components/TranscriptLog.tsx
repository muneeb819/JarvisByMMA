import { useMemo } from 'react';
import type { VoiceCommand, AssistantResponse } from '@shared/types';

interface TranscriptLogProps {
  transcripts: Array<VoiceCommand | AssistantResponse>;
  onClear: () => void;
}

function isAssistantResponse(item: VoiceCommand | AssistantResponse): item is AssistantResponse {
  return 'role' in item && item.role === 'assistant';
}

function isVoiceCommand(item: VoiceCommand | AssistantResponse): item is VoiceCommand {
  return 'transcript' in item;
}

export function TranscriptLog({ transcripts, onClear }: TranscriptLogProps) {
  const groupedTranscripts = useMemo(() => {
    return transcripts.reduce((acc, item) => {
      const date = new Date(item.timestamp).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {} as Record<string, Array<VoiceCommand | AssistantResponse>>);
  }, [transcripts]);

  if (transcripts.length === 0) {
    return (
      <div className="transcript-log empty">
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p>No conversation yet</p>
          <span>Start speaking to begin</span>
        </div>
      </div>
    );
  }

  return (
    <div className="transcript-log">
      <div className="log-header">
        <h3>Conversation</h3>
        <button className="clear-btn" onClick={onClear}>Clear</button>
      </div>
      
      <div className="log-content">
        {Object.entries(groupedTranscripts)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .map(([date, items]) => (
            <div key={date} className="transcript-group">
              <div className="group-date">{date}</div>
              {items
                .slice()
                .reverse()
                .map((item, idx) => {
                  const isAssistant = isAssistantResponse(item);
                  const role = isAssistant ? 'assistant' : 'user';
                  const content = isAssistant ? item.text : item.transcript;
                  
                  return (
                    <div 
                      key={`${item.id}-${idx}`} 
                      className={`transcript-item ${role}`}
                    >
                      <div className="message-bubble">
                        <span className="role-label">
                          {role === 'user' ? 'You' : 'JARVIS'}
                        </span>
                        <p className="message-text">{content}</p>
                        <span className="message-time">
                          {new Date(item.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
      </div>
    </div>
  );
}