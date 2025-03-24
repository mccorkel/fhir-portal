import { NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

// Mark this route as dynamic and Node.js compatible
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

const DEPLOYMENT_NAME = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4-1106-preview';

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://tigercare-oai.openai.azure.com',
  apiVersion: '2024-02-15-preview',
  deployment: DEPLOYMENT_NAME
});

// Helper function to create a streaming response
function createStream(response: AsyncIterable<any>) {
  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        let totalTokens = 0;
        for await (const chunk of response) {
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

async function validateSession(request: Request): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token');

  if (!sessionToken) {
    return null;
  }

  try {
    const payload = jwt.verify(
      sessionToken.value,
      process.env.JWT_SECRET || 'your-secret-key'
    ) as SessionPayload;
    return payload;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    console.log('Chat request received');

    // Validate session
    const session = await validateSession(request);
    if (!session) {
      console.log('Unauthorized: No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Session validated for user:', session.email);

    const body = await request.json();
    const { messages, stream = false } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Invalid messages array' }, { status: 400 });
    }

    console.log('Processing chat request:', {
      messageCount: messages.length,
      stream,
      deployment: DEPLOYMENT_NAME
    });

    const chatRequest = {
      messages,
      temperature: 0.7,
      max_tokens: 800,
      model: DEPLOYMENT_NAME
    };

    if (stream) {
      const streamingResponse = await client.chat.completions.create({
        ...chatRequest,
        stream: true
      });
      return createStream(streamingResponse);
    }

    const completion = await client.chat.completions.create({
      ...chatRequest,
      stream: false
    });
    
    console.log('Chat completion received:', {
      usage: completion.usage,
      messageCount: completion.choices.length
    });

    return NextResponse.json({
      content: completion.choices[0].message.content,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 