import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// API Routes
app.post('/api/dub', upload.single('video'), async (req, res) => {
  try {
    const file = req.file;
    const targetLanguage = req.body.language;
    
    if (!file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('Error: GEMINI_API_KEY is missing in environment variables.');
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const apiKey = process.env.GEMINI_API_KEY.trim();
    
    if (apiKey === 'MY_GEMINI_API_KEY' || apiKey === '') {
      console.error('Error: GEMINI_API_KEY is set to placeholder or empty.');
      return res.status(500).json({ error: 'Invalid API Key: Please configure your GEMINI_API_KEY in the Secrets panel.' });
    }

    console.log(`Using API Key starting with: ${apiKey.substring(0, 4)}...`);

    // Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Read file as base64
    const fileBuffer = fs.readFileSync(file.path);
    const base64Data = fileBuffer.toString('base64');

    // 1. Generate translated audio directly using Gemini 2.5 Flash
    // We ask for audio output directly.
    // Note: This is experimental and might need specific prompting.
    // Alternatively, we get text first then TTS.
    // Let's try to get audio directly if possible, or text then audio.
    // Actually, Gemini 2.5 Flash supports audio output.
    
    const prompt = `
      You are an expert dubbing AI. 
      Your task is to generate a dubbed audio track for this video in ${targetLanguage}.
      1. Listen to the original audio.
      2. Translate the speech to ${targetLanguage}.
      3. Generate a new audio track with the translated speech, matching the original emotion and timing as closely as possible.
      4. Do NOT include background music if possible, or keep it minimal. Ideally, just the voice.
      5. Output ONLY the audio.
    `;

    // For now, let's try to get a transcript first, then generate speech, 
    // because direct video-to-dubbed-audio might be tricky to control for timing.
    // But the user wants "match original voice emotions".
    // Let's try the direct approach with Gemini 2.5 Flash.
    
    // However, the response format for audio is specific.
    // Let's use a simpler approach for reliability:
    // 1. Transcribe and translate to text.
    // 2. Use a TTS model (or Gemini TTS) to generate audio.
    
    // Actually, let's try to get the audio directly.
    const model = 'gemini-2.5-flash-native-audio-preview-09-2025'; // Or similar
    // Wait, the documentation says 'gemini-2.5-flash-native-audio-preview-12-2025' for native audio.
    // Let's use that.
    
    // But wait, can it take video input? Yes.
    // Can it output audio? Yes.
    
    // Let's try generating audio directly.
    /*
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: file.mimetype, data: base64Data } },
            { text: prompt }
          ]
        }
      ],
      config: {
        responseModalities: ['AUDIO'],
      }
    });
    */
    
    // Fallback plan if that fails: Text to Speech.
    // Let's stick to a safer path: 
    // 1. Get transcript/translation (Text).
    // 2. Use Gemini TTS (Text-to-Speech) to generate audio.
    
    // Step 1: Transcribe & Translate
    const textResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: file.mimetype, data: base64Data } },
            { text: `Transcribe the speech in this video and translate it to ${targetLanguage}. Return ONLY the translated text as a continuous script.` }
          ]
        }
      ]
    });
    
    const translatedText = textResponse.text;
    
    if (!translatedText) {
      throw new Error('Failed to generate translation');
    }

    // Step 2: Generate Speech
    // We use the TTS model.
    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [
        {
          role: 'user',
          parts: [{ text: translatedText }]
        }
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Kore' // 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
            }
          }
        }
      }
    });

    const audioData = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      throw new Error('Failed to generate audio');
    }

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    res.json({ 
      audio: audioData,
      transcript: translatedText
    });

  } catch (error) {
    console.error('Dubbing error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// Vite middleware
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
