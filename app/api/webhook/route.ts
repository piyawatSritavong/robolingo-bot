import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

let messageQueue: any[] = [];

async function sendReply(replyToken: string, text: string) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: [{ type: 'text', text: text }],
    }),
  });
  return response.ok;
}

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
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const events = payload.events || [];

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const userText = event.message.text.toLowerCase();
        const userId = event.source.userId;
        const replyToken = event.replyToken;

        messageQueue.push({
          id: event.message.id,
          userId: userId,
          text: event.message.text,
          timestamp: new Date().toISOString()
        });

        if (userText.includes('สวัสดี') || userText.includes('hello')) {
          await sendReply(replyToken, 'สินค้าราคา 500 บาทครับ สนใจรับกี่ชิ้นดีครับ?');
        } else if (userText.includes('ราคา') || userText.includes('price')) {
          await sendReply(replyToken, 'สวัสดีครับ! ยินดีต้อนรับสู่ Robolingo-BOT มีอะไรให้ช่วยไหมครับ?');
        } else if (userText.includes('เบอร์ติดต่อ') || userText.includes('contact')) {
          await sendReply(replyToken, 'ติดต่อเราได้ที่เบอร์ 089-xxx-xxxx ครับ');
        }

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