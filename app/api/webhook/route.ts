import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

let messageQueue: any[] = [];

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-line-signature') || '';
    const channelSecret = process.env.LINE_CHANNEL_SECRET || '';

    const hash = crypto
      .createHmac('sha256', channelSecret)
      .update(body)
      .digest('base64');

    if (hash !== signature) {
      console.error('[Webhook] Invalid Signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const events = payload.events || [];

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const incomingData = {
          id: event.message.id,
          userId: event.source.userId,
          text: event.message.text,
          timestamp: new Date().toISOString()
        };
        
        console.log(`[Webhook] New Message from ${incomingData.userId}: ${incomingData.text}`);
        messageQueue.push(incomingData);
        
        if (messageQueue.length > 50) messageQueue.shift();
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  const messages = [...messageQueue];
  messageQueue = [];
  return NextResponse.json({ messages });
}