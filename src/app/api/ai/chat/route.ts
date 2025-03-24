import { NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

// Initialize the Azure OpenAI client
const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  endpoint: 'https://tigercare-oai.openai.azure.com/',
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
  apiVersion: '2024-02-15-preview'
});

const DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4';

async function validateSession(request: Request) {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token');

  if (!sessionToken) {
    return null;
  }

  try {
    const payload = jwt.verify(
      sessionToken.value,
      process.env.JWT_SECRET || 'your-secret-key'
    );
    return payload;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

// Helper function to create a streaming response
function createStream(stream: AsyncIterable<any>) {
  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        let totalTokens = 0;
        for await (const chunk of stream) {
          // Extract and send the delta content
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
          // Track token usage
          if (chunk.usage) {
            totalTokens = chunk.usage.total_tokens;
          }
        }
        // Send the final message with token usage
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ done: true, usage: { total_tokens: totalTokens } })}\n\n`)
        );
        controller.close();
      } catch (error) {
        console.error('Stream processing error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(request: Request) {
  console.log('AI Chat request received:', {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries())
  });

  // Validate session
  const session = await validateSession(request);
  if (!session) {
    console.warn('Unauthorized AI chat request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { messages, stream = false } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      console.warn('Invalid request body:', { body });
      return NextResponse.json(
        { error: 'Invalid request. Messages array is required.' },
        { status: 400 }
      );
    }

    console.log('Processing chat request:', {
      userId: (session as any).sub,
      messageCount: messages.length,
      firstMessage: messages[0].content.substring(0, 50) + '...',
      deployment: DEPLOYMENT_NAME,
      isStreaming: stream
    });

    if (stream) {
      const streamingCompletion = await client.chat.completions.create({
        model: DEPLOYMENT_NAME,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: 0.7,
        max_tokens: 800,
        stream: true
      });

      return createStream(streamingCompletion);
    }

    const completion = await client.chat.completions.create({
      model: DEPLOYMENT_NAME,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      temperature: 0.7,
      max_tokens: 800,
    });

    console.log('Chat completion received:', {
      hasChoices: !!completion.choices,
      choiceCount: completion.choices?.length,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens
    });

    return NextResponse.json({
      message: completion.choices[0]?.message?.content,
      usage: completion.usage
    });

  } catch (error) {
    console.error('AI Chat error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : 'Unknown type',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 