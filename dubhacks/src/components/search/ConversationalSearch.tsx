import React, { useState, useRef, useEffect } from 'react';
import { searchService } from '../../services/searchService';
// import { RAGResponse } from '../../types';
import './SearchComponents.css';

interface ConversationalSearchProps {
  onEventSelect?: (eventId: string) => void;
  className?: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: Array<{
    title: string;
    url: string;
    excerpt: string;
    relevanceScore: number;
  }>;
}

export const ConversationalSearch: React.FC<ConversationalSearchProps> = ({
  onEventSelect,
  className = '',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: 'Hi! I can help you find events using natural language. Try asking me something like "Find music concerts this weekend" or "What tech events are happening in Seattle?"',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim() || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await searchService.performConversationalSearch({
        query: userMessage.content,
        sessionId,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        sources: response.sources,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (response.sessionId) {
        setSessionId(response.sessionId);
      }
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: `I'm sorry, I encountered an error: ${error.message}. Please try rephrasing your question.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome',
        type: 'assistant',
        content: 'Hi! I can help you find events using natural language. Try asking me something like "Find music concerts this weekend" or "What tech events are happening in Seattle?"',
        timestamp: new Date(),
      },
    ]);
    setSessionId(undefined);
  };

  const handleSourceClick = (source: any) => {
    if (source.url && onEventSelect) {
      // Extract event ID from URL if possible
      const eventIdMatch = source.url.match(/events\/([^/]+)/);
      if (eventIdMatch) {
        onEventSelect(eventIdMatch[1]);
      }
    }
  };

  const suggestedQueries = [
    "Find music concerts this weekend",
    "What tech events are happening in Seattle?",
    "Show me free events near downtown",
    "Any food festivals coming up?",
    "Find networking events for entrepreneurs",
  ];

  return (
    <div className={`conversational-search ${className}`}>
      <div className="chat-header">
        <h3>Ask me about events</h3>
        <button 
          onClick={handleClearChat}
          className="clear-chat-btn"
          title="Clear conversation"
        >
          🗑️
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              <p>{message.content}</p>
              {message.sources && message.sources.length > 0 && (
                <div className="message-sources">
                  <h4>Related Events:</h4>
                  <div className="sources-list">
                    {message.sources.map((source, index) => (
                      <div 
                        key={index} 
                        className="source-item"
                        onClick={() => handleSourceClick(source)}
                      >
                        <div className="source-title">{source.title}</div>
                        <div className="source-excerpt">{source.excerpt}</div>
                        <div className="source-score">
                          Relevance: {Math.round(source.relevanceScore * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant loading">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {messages.length === 1 && (
        <div className="suggested-queries">
          <p>Try asking:</p>
          <div className="suggestions">
            {suggestedQueries.map((query, index) => (
              <button
                key={index}
                className="suggestion-btn"
                onClick={() => setInputValue(query)}
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me about events..."
            disabled={isLoading}
            className="chat-input"
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim() || isLoading}
            className="send-btn"
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>
      </form>
    </div>
  );
};