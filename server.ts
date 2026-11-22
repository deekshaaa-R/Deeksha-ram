import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import { WebSocketServer, type WebSocket } from 'ws';
import { optionalAuth, requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  createBookingRecord,
  createDemoRequestRecord,
  createOrderRecord,
  createWarrantyRecord,
  getOrCreateUser,
  getUserAccountSnapshot,
} from './src/db/users.ts';
import { attachFleetSocketHub } from './src/server/fleetSocketHub.ts';
import { registerNewVehicleWizardRoutes } from './src/server/newVehicleWizardStore.ts';
import { registerUnifiedPlatformRoutes } from './src/server/unifiedPlatformStore.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_CHAT_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-4-carbon',
  'gemini-4-argon',
  'gemini-3.1-flash-lite',
]);

let cachedAiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error('GEMINI_API_KEY is missing. Please add it in Settings > Secrets.'),
      { status: 403 }
    );
  }
  if (!cachedAiClient) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedAiClient;
}

function sendGeminiError(res: Response, err: unknown, fallbackMessage: string) {
  const anyErr = err as { status?: number; code?: number; message?: string };
  const rawMessage = anyErr?.message || String(err);
  const status =
    typeof anyErr?.status === 'number'
      ? anyErr.status
      : typeof anyErr?.code === 'number'
      ? anyErr.code
      : rawMessage.includes('403') || rawMessage.includes('PERMISSION_DENIED')
      ? 403
      : rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')
      ? 429
      : 500;

  let userMessage = rawMessage || fallbackMessage;
  if (status === 403) {
    userMessage =
      'Gemini API permission denied. Please verify or select an active API key in Settings > Secrets.';
  } else if (status === 429) {
    userMessage =
      'Gemini API quota reached (or paid API key required for this model). Please check Settings > Secrets to select a billing-enabled key.';
  }

  console.error('[Gemini API Error]', status, rawMessage);
  return res.status(status >= 400 && status < 600 ? status : 500).json({
    error: userMessage,
    code: status,
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'vs-technology-api',
      timestamp: new Date().toISOString(),
    });
  });

  // --- Cloud SQL Account & E-Commerce Routes ---
  app.post('/api/account/sync', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const decoded = req.user!;
      const email = decoded.email || `${decoded.uid}@users.vstech.local`;
      const { displayName, phone, company } = req.body || {};
      await getOrCreateUser(
        decoded.uid,
        email,
        displayName || decoded.name,
        phone,
        company
      );
      const snapshot = await getUserAccountSnapshot(decoded.uid);
      res.json(snapshot);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Account sync failed.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/orders', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const decoded = req.user!;
      const email = decoded.email || `${decoded.uid}@users.vstech.local`;
      const dbUser = await getOrCreateUser(decoded.uid, email, decoded.name);
      const body = req.body || {};

      if (!Array.isArray(body.items) || body.items.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one item.' });
      }
      if (!body.customerName || !body.shippingAddress || !body.city) {
        return res.status(400).json({ error: 'Missing required shipping fields.' });
      }

      const orderCode =
        typeof body.orderCode === 'string' && body.orderCode.trim()
          ? body.orderCode.trim().slice(0, 48)
          : `VST-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const created = await createOrderRecord(dbUser.id, {
        orderCode,
        subtotal: Math.round(Number(body.subtotal) || 0),
        discount: Math.round(Number(body.discount) || 0),
        gst: Math.round(Number(body.gst) || 0),
        shipping: Math.round(Number(body.shipping) || 0),
        total: Math.round(Number(body.total) || 0),
        customerName: String(body.customerName),
        shippingAddress: String(body.shippingAddress),
        city: String(body.city),
        paymentMethod: String(body.paymentMethod || 'UPI / Card'),
        items: body.items.map((item: Record<string, unknown>) => ({
          productId: String(item.productId || ''),
          name: String(item.name || ''),
          quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
          unitPrice: Math.round(Number(item.unitPrice) || 0),
          plan: String(item.plan || '1-Year Cloud SIM'),
        })),
      });

      res.status(201).json({ order: created });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to save order.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/warranties', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const decoded = req.user!;
      const email = decoded.email || `${decoded.uid}@users.vstech.local`;
      const dbUser = await getOrCreateUser(decoded.uid, email, decoded.name);
      const body = req.body || {};

      if (!body.imei || !body.productName || !body.purchaseDate || !body.invoiceNumber) {
        return res.status(400).json({ error: 'Missing required warranty registration fields.' });
      }

      const warrantyCode =
        typeof body.warrantyCode === 'string' && body.warrantyCode.trim()
          ? body.warrantyCode.trim().slice(0, 48)
          : `war-${Date.now()}`;

      const purchaseYear = Number(String(body.purchaseDate).slice(0, 4)) || 2026;
      const expiresOn =
        typeof body.expiresOn === 'string' && body.expiresOn
          ? body.expiresOn
          : `${purchaseYear + 2}${String(body.purchaseDate).slice(4)}`;

      const created = await createWarrantyRecord(dbUser.id, {
        warrantyCode,
        imei: String(body.imei),
        productName: String(body.productName),
        purchaseDate: String(body.purchaseDate),
        invoiceNumber: String(body.invoiceNumber),
        expiresOn,
      });

      res.status(201).json({ warranty: created });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to register warranty.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/bookings', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const decoded = req.user!;
      const email = decoded.email || `${decoded.uid}@users.vstech.local`;
      const dbUser = await getOrCreateUser(decoded.uid, email, decoded.name);
      const body = req.body || {};

      if (!body.vehicleType || !body.city || !body.date || !body.timeSlot || !body.customerName || !body.phone) {
        return res.status(400).json({ error: 'Missing required installation booking fields.' });
      }

      const bookingCode =
        typeof body.bookingCode === 'string' && body.bookingCode.trim()
          ? body.bookingCode.trim().slice(0, 48)
          : `ins-${Math.floor(200 + Math.random() * 800)}-${Date.now().toString().slice(-4)}`;

      const created = await createBookingRecord(dbUser.id, {
        bookingCode,
        vehicleType: String(body.vehicleType),
        city: String(body.city),
        date: String(body.date),
        timeSlot: String(body.timeSlot),
        customerName: String(body.customerName),
        phone: String(body.phone),
      });

      res.status(201).json({ booking: created });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to create installation booking.';
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/demo-requests', optionalAuth, async (req: AuthRequest, res: Response) => {
    try {
      let dbUserId: number | null = null;
      if (req.user) {
        const email = req.user.email || `${req.user.uid}@users.vstech.local`;
        const dbUser = await getOrCreateUser(req.user.uid, email, req.user.name);
        dbUserId = dbUser.id;
      }

      const body = req.body || {};
      if (!body.name || !body.email || !body.phone) {
        return res.status(400).json({ error: 'Name, email, and phone are required.' });
      }

      const requestCode = `demo-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const created = await createDemoRequestRecord(dbUserId, {
        requestCode,
        name: String(body.name),
        company: String(body.company || 'Independent Fleet'),
        email: String(body.email),
        phone: String(body.phone),
        fleetSize: String(body.fleetSize || '1-10 Vehicles'),
        interest: String(body.interest || 'Fleet Telematics Demo'),
        preferredDate: String(body.preferredDate || new Date().toISOString().slice(0, 10)),
      });

      res.status(201).json({ demoRequest: created });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unable to save demo request.';
      res.status(500).json({ error: msg });
    }
  });

  // --- Gemini Multi-Turn Chat + Google Search Grounding + Google Maps Grounding ---
  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const ai = getGenAI();
      const {
        messages,
        prompt,
        model = 'gemini-4-hydrogen',
        groundingMode = 'none',
        systemInstruction,
        latLng,
      } = req.body || {};

      const requestedModel = ALLOWED_CHAT_MODELS.has(model)
        ? model
        : 'gemini-4-hydrogen';
      const selectedModel =
        groundingMode === 'maps' || groundingMode === 'search'
          ? 'gemini-4-hydrogen'
          : requestedModel;

      const contents = Array.isArray(messages) && messages.length > 0
        ? messages.map((m: { role?: string; text?: string }) => ({
            role: m.role === 'model' ? 'model' : 'user',
            parts: [{ text: String(m.text || '') }],
          }))
        : [{ role: 'user', parts: [{ text: String(prompt || '') }] }];

      if (!contents.some((c) => c.parts[0].text.trim().length > 0)) {
        return res.status(400).json({ error: 'Please provide a message prompt.' });
      }

      const config: Record<string, unknown> = {
        systemInstruction:
          typeof systemInstruction === 'string' && systemInstruction.trim()
            ? systemInstruction.trim()
            : 'You are the VS Technology Fleet Telematics Copilot. Help fleet managers, logistics operators, and vehicle owners choose GPS trackers, 4G AI dashcams, fuel sensors, smart farming GNSS, installation slots, and plan efficient routes across India. Be concise, accurate, and practical. Contact support: vstechnology999@gmail.com | +91 97406 40650.',
      };

      if (groundingMode === 'search') {
        config.tools = [{ googleSearch: {} }];
      } else if (groundingMode === 'maps') {
        config.tools = [{ googleMaps: {} }];
        if (
          latLng &&
          typeof latLng.latitude === 'number' &&
          typeof latLng.longitude === 'number'
        ) {
          config.toolConfig = {
            retrievalConfig: {
              latLng: {
                latitude: latLng.latitude,
                longitude: latLng.longitude,
              },
            },
          };
        }
      }

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config,
      });

      const rawChunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

      const webSources: Array<{ title: string; uri: string }> = [];
      const mapPlaces: Array<{
        title: string;
        uri: string;
        placeId?: string;
        reviewSnippets: string[];
      }> = [];

      const seenWeb = new Set<string>();
      const seenMaps = new Set<string>();
      for (const chunk of rawChunks as Array<Record<string, unknown>>) {
        const web = chunk.web as { title?: string; uri?: string } | undefined;
        if (web?.uri && !seenWeb.has(web.uri)) {
          seenWeb.add(web.uri);
          webSources.push({
            title: web.title || web.uri,
            uri: web.uri,
          });
        }
        const maps = chunk.maps as
          | {
              title?: string;
              uri?: string;
              placeId?: string;
              placeAnswerSources?: {
                reviewSnippets?: Array<{ content?: string; text?: string } | string>;
              };
            }
          | undefined;
        if (maps?.uri && !seenMaps.has(maps.uri)) {
          seenMaps.add(maps.uri);
          const snippetsRaw = maps.placeAnswerSources?.reviewSnippets ?? [];
          const reviewSnippets = snippetsRaw
            .map((s) => (typeof s === 'string' ? s : s.content || s.text || ''))
            .filter(Boolean);
          mapPlaces.push({
            title: maps.title || 'Google Maps Place',
            uri: maps.uri,
            placeId: maps.placeId,
            reviewSnippets,
          });
        }
      }

      res.json({
        text: response.text ?? '',
        model: selectedModel,
        groundingMode,
        webSources,
        mapPlaces,
      });
    } catch (err) {
      return sendGeminiError(res, err, 'Unable to generate chat response.');
    }
  });

  // --- Gemini Image Generation & Editing (gemini-nano-banana-2.1) ---
  app.post('/api/gemini/image', async (req: Request, res: Response) => {
    try {
      const ai = getGenAI();
      const {
        prompt,
        aspectRatio = '16:9',
        imageSize = '1K',
        sourceImageBase64,
        sourceMimeType,
        useImageSearch = false,
      } = req.body || {};

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Image prompt is required.' });
      }

      const parts: Array<Record<string, unknown>> = [];
      if (sourceImageBase64 && typeof sourceImageBase64 === 'string') {
        parts.push({
          inlineData: {
            data: sourceImageBase64,
            mimeType: typeof sourceMimeType === 'string' ? sourceMimeType : 'image/png',
          },
        });
      }
      parts.push({ text: prompt.trim() });

      const config: Record<string, unknown> = {
        imageConfig: {
          aspectRatio: ['1:1', '3:4', '4:3', '9:16', '16:9', '1:4', '4:1'].includes(aspectRatio)
            ? aspectRatio
            : '16:9',
          imageSize: ['1K', '2K', '4K'].includes(imageSize) ? imageSize : '1K',
        },
      };

      if (useImageSearch && !sourceImageBase64) {
        config.tools = [
          {
            googleSearch: {
              searchTypes: {
                webSearch: {},
                imageSearch: {},
              },
            },
          },
        ];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-nano-banana-2.1',
        contents: { parts },
        config,
      });

      let imageUrl = '';
      let caption = '';

      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data && !imageUrl) {
          const mime = part.inlineData.mimeType ?? 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          caption += (caption ? '\n' : '') + part.text;
        }
      }

      if (!imageUrl) {
        return res.status(502).json({
          error: 'No image data returned by model. Try refining the prompt.',
        });
      }

      res.json({ imageUrl, caption, model: 'gemini-nano-banana-2.1' });
    } catch (err) {
      return sendGeminiError(res, err, 'Unable to generate or edit image.');
    }
  });

  // --- Gemini Video Generation & Image Animation (gemini-omni-1.2-flash via Interactions API) ---
  app.post('/api/gemini/video', async (req: Request, res: Response) => {
    try {
      const ai = getGenAI();
      const {
        prompt,
        aspectRatio = '16:9',
        duration = '5s',
        sourceImageBase64,
        sourceMimeType,
      } = req.body || {};

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Video prompt is required.' });
      }

      const input =
        sourceImageBase64 && typeof sourceImageBase64 === 'string'
          ? [
              {
                type: 'image' as const,
                mime_type:
                  typeof sourceMimeType === 'string' ? sourceMimeType : 'image/png',
                data: sourceImageBase64,
              },
              {
                type: 'text' as const,
                text: prompt.trim(),
              },
            ]
          : prompt.trim();

      const validDuration = ['3s', '4s', '5s', '6s', '8s', '10s'].includes(duration)
        ? duration
        : '5s';

      const interaction = await ai.interactions.create(
        {
          model: 'gemini-omni-1.2-flash',
          input,
          background: false,
          store: false,
          stream: false,
          response_format: {
            type: 'video',
            aspect_ratio: aspectRatio === '9:16' ? '9:16' : '16:9',
            duration: validDuration,
            resolution: '720p',
          },
        },
        { timeout: 300000 }
      );

      const videoPart = interaction.output_video;
      if (!videoPart || (!videoPart.data && !videoPart.uri)) {
        return res.status(502).json({
          error: 'No video payload returned. Please try a different prompt.',
        });
      }

      const mimeType = videoPart.mime_type || 'video/mp4';
      const videoUrl = videoPart.data
        ? `data:${mimeType};base64,${videoPart.data}`
        : videoPart.uri;

      res.json({
        videoUrl,
        mimeType,
        model: 'gemini-omni-1.2-flash',
      });
    } catch (err) {
      return sendGeminiError(res, err, 'Unable to generate video.');
    }
  });

  // --- Gemini Audio Transcription (gemini-3.5-transcribe) ---
  app.post('/api/gemini/transcribe', async (req: Request, res: Response) => {
    try {
      const ai = getGenAI();
      const { audioBase64, mimeType = 'audio/webm', prompt } = req.body || {};

      if (!audioBase64 || typeof audioBase64 !== 'string') {
        return res.status(400).json({ error: 'Audio recording or file is required.' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: typeof mimeType === 'string' ? mimeType : 'audio/webm',
                data: audioBase64,
              },
            },
            {
              text:
                typeof prompt === 'string' && prompt.trim()
                  ? prompt.trim()
                  : 'Transcribe this audio clearly with punctuation and speaker clarity for a fleet telematics support ticket.',
            },
          ],
        },
      });

      res.json({
        transcript: response.text ?? '',
        model: 'gemini-3.5-transcribe',
      });
    } catch (err) {
      return sendGeminiError(res, err, 'Unable to transcribe audio.');
    }
  });

  // HTTP Server + Socket.io Real-Time Fleet Hub + Live Voice WebSocket (/api/live)
  const server = http.createServer(app);
  const fleetHub = attachFleetSocketHub(server);

  // Real-time Fleet Telemetry Ingestion & Snapshot Endpoints (pushes live to Socket.io clients)
  app.post('/api/fleet/telemetry', optionalAuth, (req: AuthRequest, res: Response) => {
    const body = req.body || {};
    const roomId =
      typeof body.roomId === 'string' && body.roomId.trim()
        ? body.roomId
        : req.user?.uid || 'demo';

    const result = fleetHub.pushExternalTelemetry({
      ...body,
      roomId,
    });

    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({
      ok: true,
      roomId: result.roomId,
      matchedRooms: result.matchedRooms,
      event: result.event,
    });
  });

  app.get('/api/fleet/live-snapshot', optionalAuth, (req: AuthRequest, res: Response) => {
    const queryRoom =
      typeof req.query.roomId === 'string' && req.query.roomId.trim()
        ? req.query.roomId
        : req.user?.uid || 'demo';
    return res.json(fleetHub.getLiveSnapshot(queryRoom));
  });

  // Unified Combined Live Tracking Platform (Ttrack + myFleetvigilPro: 4 Roles x 3 Platforms)
  registerUnifiedPlatformRoutes(app, fleetHub.io);

  // 7-Step New Vehicle Onboarding Wizard + TurboTrackers Live Tracking + Multi-Level Auth
  registerNewVehicleWizardRoutes(app);

  // Catch unmatched API endpoints before SPA middleware
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found' });
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url || '/', 'http://localhost').pathname;
    if (pathname === '/api/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (clientWs: WebSocket, req) => {
    const reqUrl = new URL(req.url || '/api/live', 'http://localhost');
    const voiceName = reqUrl.searchParams.get('voice') || 'Zephyr';

    let session: Awaited<ReturnType<GoogleGenAI['live']['connect']>> | null = null;
    try {
      const ai = getGenAI();
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(
                  voiceName
                )
                  ? voiceName
                  : 'Zephyr',
              },
            },
          },
          systemInstruction:
            'You are VS Technology Voice Copilot, a helpful fleet telematics and GPS hardware specialist. Keep spoken answers crisp, natural, and under 3 sentences unless asked for deep details. For sales or support, mention +91 97406 40650 or vstechnology999@gmail.com.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== clientWs.OPEN) return;
            const serverContent = message.serverContent;
            if (serverContent?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  inputTranscript: serverContent.inputTranscription.text,
                })
              );
            }
            if (serverContent?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  outputTranscript: serverContent.outputTranscription.text,
                })
              );
            }
            for (const part of serverContent?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
          onerror: (err: unknown) => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(
                JSON.stringify({
                  error:
                    err instanceof Error
                      ? err.message
                      : 'Live voice session encountered an error.',
                })
              );
            }
          },
          onclose: () => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(JSON.stringify({ closed: true }));
            }
          },
        },
      });

      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({ ready: true }));
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to start Gemini Live session. Check Settings > Secrets.';
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify({ error: msg }));
        clientWs.close();
      }
      return;
    }

    clientWs.on('message', (raw) => {
      if (!session) return;
      try {
        const parsed = JSON.parse(raw.toString()) as {
          audio?: string;
          text?: string;
        };
        if (parsed.audio) {
          session.sendRealtimeInput({
            audio: {
              data: parsed.audio,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        } else if (parsed.text) {
          session.sendRealtimeInput({ text: parsed.text });
        }
      } catch {
        // Ignore malformed frame
      }
    });

    clientWs.on('close', () => {
      try {
        session?.close();
      } catch {
        // Ignore close errors
      }
    });
  });

  // Return 404 JSON for unmatched /api/* routes instead of serving SPA index.html
  app.all('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found' });
  });

  // Vite dev middleware vs static production serving
  const distDir = path.join(__dirname, 'dist');
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (!process.env.NODE_ENV && fs.existsSync(path.join(distDir, 'index.html')));

  if (!isProduction) {
    process.env.DISABLE_HMR = 'true';

    // Serve a clean no-WebSocket /@vite/client shim so dev CSS injection and import.meta.hot
    // work reliably without opening HMR WebSockets that fail behind preview proxies or restarts.
    const NO_HMR_VITE_CLIENT = `
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else {
    style.textContent = content;
  }
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  const noop = () => {};
  return {
    data: {},
    accept: noop,
    acceptExports: noop,
    dispose: noop,
    prune: noop,
    decline: noop,
    invalidate: noop,
    on: noop,
    off: noop,
    send: noop,
  };
}
export function injectQuery(url, queryToInject) {
  if (!url || (!url.startsWith('.') && !url.startsWith('/'))) return url;
  const pathname = url.replace(/[?#].*$/, '');
  const search = url.slice(pathname.length).replace(/#.*$/, '');
  const hash = url.includes('#') ? url.slice(url.indexOf('#')) : '';
  return pathname + (search ? search + '&' + queryToInject : '?' + queryToInject) + hash;
}
export class ErrorOverlay extends HTMLElement {}
`;

    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(NO_HMR_VITE_CLIENT);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      '/assets',
      express.static(path.join(distDir, 'assets'), {
        maxAge: '1y',
        immutable: true,
      })
    );
    app.use(
      express.static(distDir, {
        setHeaders(res, filePath) {
          if (
            filePath.endsWith('.html') ||
            filePath.endsWith('sw.js') ||
            filePath.endsWith('registerSW.js') ||
            filePath.endsWith('.webmanifest')
          ) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`VS Technology server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
