'use client';

import { useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function AIChatPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || isLoading) return;

    setIsLoading(true);
    setResponse('');

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              setResponse(prev => prev + data.content);
            }
            if (data.done) {
              console.log('Chat completion usage:', data.usage);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setResponse('Failed to get response from AI');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">AI Chat</h1>
        <div className="space-y-4">
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded"
              rows={4}
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading || !message.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
          {response && (
            <div className="p-4 bg-gray-100 rounded whitespace-pre-wrap">
              {response}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
} 