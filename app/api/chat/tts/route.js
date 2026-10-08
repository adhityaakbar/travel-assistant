import { NextResponse } from 'next/server.js';

export async function POST(request) {
  try {
    const { text, language } = await request.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Teks wajib diisi' }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API Key belum dikonfigurasi', fallback: true }, { status: 404 });
    }

    // Standard ElevenLabs Multilingual v2 Voice ID (Adam / Sarah / Charlotte)
    const voiceId = '21m00Tcm4TlvDq8ikWAM'; 

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text.slice(0, 500),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'ElevenLabs TTS API error', fallback: true }, { status: 502 });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Gagal memproses audio TTS', fallback: true }, { status: 500 });
  }
}
