import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  Bot,
  Check,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Film,
  Globe,
  History,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Sparkles,
  Upload,
  Volume2,
  Wand2,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  buildAiMessageCreatePayload,
  buildAiSessionCreatePayload,
  buildAiSessionUpdatePayload,
  buildSavedMediaCreatePayload,
  sanitizeFirestoreId,
} from '../utils/firestorePayloads';

export type AiStudioTab = 'chat' | 'voice' | 'transcribe' | 'image' | 'video';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  webSources?: Array<{ title: string; uri: string }>;
  mapPlaces?: Array<{
    title: string;
    uri: string;
    placeId?: string;
    reviewSnippets: string[];
  }>;
}

const CHAT_MODELS = [
  { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (Fast Default)' },
  { id: 'gemini-4-argon', label: 'Gemini 4 Argon (Balanced)' },
  { id: 'gemini-4-carbon', label: 'Gemini 4 Carbon (Deep Reasoning)' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite (Ultra Fast)' },
];

const QUICK_PROMPTS = [
  'Which VS GPS tracker works best for refrigerated trucks with fuel theft prevention?',
  'Explain how VS AI 4G Dashcam reduces highway fatigue incidents.',
  'Find highway transport hubs and truck service corridors near Electronic City Bengaluru.',
  'Summarize AIS-140 compliance and latest commercial fleet GPS mandates in India.',
];

async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve({
        base64: comma >= 0 ? result.slice(comma + 1) : result,
        mimeType: file.type || 'application/octet-stream',
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export function AiStudioPage({ initialTab = 'chat' }: { initialTab?: AiStudioTab }) {
  const { user, showToast } = useStore();
  const [tab, setTab] = useState<AiStudioTab>(initialTab);

  // Sync prop change
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // --- TAB 1: CHAT COPILOT STATE ---
  const [chatModel, setChatModel] = useState('gemini-4-hydrogen');
  const [groundingMode, setGroundingMode] = useState<'none' | 'search' | 'maps'>('none');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [showSystemBox, setShowSystemBox] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sessionSuffix, setSessionSuffix] = useState('main');
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const WELCOME_MESSAGE: ChatMessage = {
    id: 'welcome',
    role: 'model',
    text: 'Welcome to VS Technology AI Telematics Studio. Ask about GPS hardware selection, fuel probe calibration, 4G AI ADAS dashcams, live web fleet regulations (Google Search), or highway hubs & depots (Google Maps).',
  };

  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);

  interface SavedStudioItem {
    id: string;
    kind: 'image' | 'video' | 'transcript';
    title: string;
    prompt: string;
    summaryText?: string;
    createdMs: number;
  }
  const [savedHistory, setSavedHistory] = useState<SavedStudioItem[]>([]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, chatLoading]);

  // Firestore chat persistence for signed-in verified Google users
  const currentUid = auth.currentUser?.uid;
  const sessionId =
    currentUid && user.authProvider === 'google'
      ? sanitizeFirestoreId(`user-${currentUid}-${sessionSuffix}`)
      : null;

  useEffect(() => {
    if (!sessionId || !currentUid || user.authProvider !== 'google') return;
    const msgRef = collection(db, 'aiSessions', sessionId, 'messages');
    const q = query(msgRef, where('ownerId', '==', currentUid), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) return;
        const rows = snap.docs
          .map((d) => {
            const data = d.data();
            const createdMs =
              typeof data.createdAt?.toMillis === 'function'
                ? data.createdAt.toMillis()
                : 0;
            return {
              id: d.id,
              role: (data.role === 'user' ? 'user' : 'model') as 'user' | 'model',
              text: String(data.text || ''),
              createdMs,
            };
          })
          .sort((a, b) => a.createdMs - b.createdMs);
        setMessages(rows.map(({ id, role, text }) => ({ id, role, text })));
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, `aiSessions/${sessionId}/messages`);
        } catch {
          // Logged cleanly
        }
      }
    );
    return () => unsub();
  }, [sessionId, currentUid, user.authProvider]);

  useEffect(() => {
    if (!currentUid || user.authProvider !== 'google') {
      setSavedHistory([]);
      return;
    }
    const q = query(
      collection(db, 'savedMedia'),
      where('ownerId', '==', currentUid),
      limit(15)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: SavedStudioItem[] = snap.docs
          .map((d) => {
            const data = d.data();
            const createdMs =
              typeof data.createdAt?.toMillis === 'function'
                ? data.createdAt.toMillis()
                : 0;
            return {
              id: d.id,
              kind:
                data.kind === 'video'
                  ? ('video' as const)
                  : data.kind === 'transcript'
                  ? ('transcript' as const)
                  : ('image' as const),
              title: String(data.title || 'Studio Output'),
              prompt: String(data.prompt || ''),
              summaryText: data.summaryText ? String(data.summaryText) : undefined,
              createdMs,
            };
          })
          .sort((a, b) => b.createdMs - a.createdMs);
        setSavedHistory(items);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'savedMedia');
        } catch {
          // Logged cleanly
        }
      }
    );
    return () => unsub();
  }, [currentUid, user.authProvider]);

  const startNewChat = () => {
    setChatError(null);
    setMessages([WELCOME_MESSAGE]);
    setSessionSuffix(`s_${Date.now()}`);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      showToast('Browser geolocation unavailable; using Bengaluru coordinates.', 'info');
      setUserCoords({ latitude: 12.9716, longitude: 77.5946 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        showToast('Location attached for Google Maps Grounding.');
      },
      () => {
        setUserCoords({ latitude: 12.9716, longitude: 77.5946 });
        showToast('Using Bengaluru HQ coordinates for Maps Grounding.', 'info');
      }
    );
  };

  const sendChat = async (e?: FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    const text = (overridePrompt ?? chatInput).trim();
    if (!text || chatLoading) return;

    setChatError(null);
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    const nextHistory = [...messages.filter((m) => m.id !== 'welcome'), userMsg];
    setMessages((prev) => [...prev, userMsg]);
    if (!overridePrompt) setChatInput('');
    setChatLoading(true);

    try {
      const resp = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory.map((m) => ({ role: m.role, text: m.text })),
          model: chatModel,
          groundingMode,
          systemInstruction: systemInstruction.trim() || undefined,
          latLng: groundingMode === 'maps' ? userCoords ?? { latitude: 12.9716, longitude: 77.5946 } : undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Unable to reach Gemini Copilot.');
      }
      const botMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: data.text || 'No text returned.',
        webSources: Array.isArray(data.webSources) ? data.webSources : [],
        mapPlaces: Array.isArray(data.mapPlaces) ? data.mapPlaces : [],
      };
      setMessages((prev) => [...prev, botMsg]);

      if (sessionId && auth.currentUser && user.authProvider === 'google') {
        const uid = auth.currentUser.uid;
        try {
          const parentRef = doc(db, 'aiSessions', sessionId);
          const parentSnap = await getDoc(parentRef);
          const activeModel = String(data.model || chatModel);
          if (!parentSnap.exists()) {
            await setDoc(
              parentRef,
              buildAiSessionCreatePayload(
                sessionId,
                uid,
                text.slice(0, 80),
                activeModel,
                serverTimestamp()
              )
            );
          } else {
            await updateDoc(
              parentRef,
              buildAiSessionUpdatePayload(
                String(parentSnap.data().title || text.slice(0, 80)),
                activeModel,
                serverTimestamp()
              )
            );
          }

          const colRef = collection(db, 'aiSessions', sessionId, 'messages');
          const userDocRef = doc(colRef);
          await setDoc(
            userDocRef,
            buildAiMessageCreatePayload(
              userDocRef.id,
              sessionId,
              uid,
              'user',
              text,
              activeModel,
              serverTimestamp()
            )
          );
          const modelDocRef = doc(colRef);
          await setDoc(
            modelDocRef,
            buildAiMessageCreatePayload(
              modelDocRef.id,
              sessionId,
              uid,
              'model',
              botMsg.text,
              activeModel,
              serverTimestamp()
            )
          );
        } catch (fsErr) {
          try {
            handleFirestoreError(fsErr, OperationType.CREATE, `aiSessions/${sessionId}/messages`);
          } catch {
            // Logged cleanly
          }
        }
      }
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : 'Chat error.');
    } finally {
      setChatLoading(false);
    }
  };

  // --- TAB 2: LIVE VOICE SESSION (gemini-3.8-live) ---
  const [voiceName, setVoiceName] = useState<'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir'>('Zephyr');
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Idle — click Start Voice Session');
  const [voiceLogs, setVoiceLogs] = useState<Array<{ who: 'You' | 'Copilot'; text: string }>>([]);
  const [voiceNudge, setVoiceNudge] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const voiceActiveRef = useRef(false);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const playCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

  const stopVoiceSession = () => {
    voiceActiveRef.current = false;
    setVoiceActive(false);
    setVoiceStatus('Session disconnected');
    activeSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // Ignore
      }
    });
    activeSourcesRef.current = [];
    if (micProcessorRef.current) {
      micProcessorRef.current.disconnect();
      micProcessorRef.current = null;
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micCtxRef.current) {
      void micCtxRef.current.close();
      micCtxRef.current = null;
    }
    if (playCtxRef.current) {
      void playCtxRef.current.close();
      playCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopVoiceSession();
  }, []);

  const schedulePcmPlayback = (b64: string) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const bytes = base64ToUint8Array(b64);
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }
    const audioBuf = ctx.createBuffer(1, float32.length, 24000);
    audioBuf.copyToChannel(float32, 0);
    const source = ctx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(ctx.destination);
    const now = ctx.currentTime;
    const startAt = Math.max(now, nextStartTimeRef.current);
    source.start(startAt);
    nextStartTimeRef.current = startAt + audioBuf.duration;
    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
    };
  };

  const startVoiceSession = async () => {
    if (voiceActive) {
      stopVoiceSession();
      return;
    }
    try {
      setVoiceStatus('Requesting microphone & connecting to Gemini Live...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const micCtx = new AudioContext({ sampleRate: 16000 });
      micCtxRef.current = micCtx;
      const playCtx = new AudioContext({ sampleRate: 24000 });
      playCtxRef.current = playCtx;
      nextStartTimeRef.current = playCtx.currentTime;

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/api/live?voice=${voiceName}`);
      wsRef.current = ws;

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.ready) {
            voiceActiveRef.current = true;
            setVoiceActive(true);
            setVoiceStatus(`Live connected (${voiceName} voice)`);

            const source = micCtx.createMediaStreamSource(stream);
            const processor = micCtx.createScriptProcessor(4096, 1, 1);
            micSourceRef.current = source;
            micProcessorRef.current = processor;
            processor.onaudioprocess = (audioEvent) => {
              if (!voiceActiveRef.current || ws.readyState !== WebSocket.OPEN) return;
              const inputData = audioEvent.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                const clamped = Math.max(-1, Math.min(1, inputData[i]));
                int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
              }
              ws.send(JSON.stringify({ audio: arrayBufferToBase64(int16.buffer) }));
            };
            source.connect(processor);
            processor.connect(micCtx.destination);
          } else if (msg.audio) {
            schedulePcmPlayback(msg.audio);
          } else if (msg.inputTranscript) {
            setVoiceLogs((prev) => [...prev, { who: 'You', text: msg.inputTranscript }]);
          } else if (msg.outputTranscript) {
            setVoiceLogs((prev) => [...prev, { who: 'Copilot', text: msg.outputTranscript }]);
          } else if (msg.interrupted) {
            activeSourcesRef.current.forEach((s) => {
              try {
                s.stop();
              } catch {
                // Ignore
              }
            });
            activeSourcesRef.current = [];
            nextStartTimeRef.current = playCtx.currentTime;
          } else if (msg.error) {
            setVoiceStatus(`Error: ${msg.error}`);
            stopVoiceSession();
          }
        } catch {
          // Ignore parse error
        }
      };

      ws.onerror = () => {
        setVoiceStatus('WebSocket connection error');
        stopVoiceSession();
      };
      ws.onclose = () => {
        if (voiceActiveRef.current) stopVoiceSession();
      };
    } catch (err: unknown) {
      setVoiceStatus(err instanceof Error ? err.message : 'Microphone access denied');
      stopVoiceSession();
    }
  };

  const sendVoiceTextNudge = (e: FormEvent) => {
    e.preventDefault();
    if (!voiceNudge.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ text: voiceNudge.trim() }));
    setVoiceLogs((prev) => [...prev, { who: 'You', text: voiceNudge.trim() }]);
    setVoiceNudge('');
  };

  // --- TAB 3: TRANSCRIBE AUDIO (gemini-3.5-transcribe) ---
  const [recording, setRecording] = useState(false);
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcriptCopied, setTranscriptCopied] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const submitAudioForTranscription = async (base64: string, mimeType: string) => {
    setTranscribeLoading(true);
    setTranscribeError(null);
    try {
      const resp = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, mimeType }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Transcription failed');
      const textOut = String(data.transcript || '');
      setTranscript(textOut);

      if (textOut.trim() && auth.currentUser && user.authProvider === 'google') {
        try {
          const mediaRef = doc(collection(db, 'savedMedia'));
          await setDoc(
            mediaRef,
            buildSavedMediaCreatePayload(
              mediaRef.id,
              auth.currentUser.uid,
              'transcript',
              `Audio Transcript (${mimeType})`,
              `Audio transcription (${mimeType})`,
              serverTimestamp(),
              textOut
            )
          );
        } catch (fsErr) {
          try {
            handleFirestoreError(fsErr, OperationType.CREATE, 'savedMedia');
          } catch {
            // Logged cleanly
          }
        }
      }

      showToast('Audio transcribed cleanly.');
    } catch (err: unknown) {
      setTranscribeError(err instanceof Error ? err.message : 'Failed to transcribe audio.');
    } finally {
      setTranscribeLoading(false);
    }
  };

  const toggleRecording = async () => {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    try {
      setTranscribeError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const buf = await blob.arrayBuffer();
        await submitAudioForTranscription(arrayBufferToBase64(buf), blob.type || 'audio/webm');
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (err: unknown) {
      setTranscribeError(err instanceof Error ? err.message : 'Microphone unavailable.');
    }
  };

  const handleAudioUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64, mimeType } = await fileToBase64(file);
    await submitAudioForTranscription(base64, mimeType);
  };

  // --- TAB 4: IMAGE STUDIO (gemini-nano-banana-2.1) ---
  const [imgPrompt, setImgPrompt] = useState(
    'Sleek matte-black 4G AI fleet dashcam mounted on a commercial freight truck windshield overlooking a coastal highway at sunset, studio telemetry product photography'
  );
  const [imgAspect, setImgAspect] = useState<'16:9' | '1:1' | '9:16' | '4:3' | '3:4'>('16:9');
  const [imgSize, setImgSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [imgSource, setImgSource] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [imgSearchGround, setImgSearchGround] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const [imgResult, setImgResult] = useState<{ url: string; caption?: string } | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);

  const handleImgFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64, mimeType } = await fileToBase64(file);
    setImgSource({
      base64,
      mimeType,
      preview: `data:${mimeType};base64,${base64}`,
    });
  };

  const generateOrEditImage = async (e: FormEvent) => {
    e.preventDefault();
    if (!imgPrompt.trim() || imgLoading) return;
    setImgLoading(true);
    setImgError(null);
    try {
      const resp = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imgPrompt.trim(),
          aspectRatio: imgAspect,
          imageSize: imgSize,
          sourceImageBase64: imgSource?.base64,
          sourceMimeType: imgSource?.mimeType,
          useImageSearch: imgSearchGround && !imgSource,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Image generation failed');
      setImgResult({ url: data.imageUrl, caption: data.caption });

      if (auth.currentUser && user.authProvider === 'google') {
        try {
          const mediaRef = doc(collection(db, 'savedMedia'));
          await setDoc(
            mediaRef,
            buildSavedMediaCreatePayload(
              mediaRef.id,
              auth.currentUser.uid,
              'image',
              imgSource ? `Edited Visual (${imgAspect})` : `Generated Visual (${imgAspect} · ${imgSize})`,
              imgPrompt.trim(),
              serverTimestamp(),
              data.caption ? String(data.caption) : undefined
            )
          );
        } catch (fsErr) {
          try {
            handleFirestoreError(fsErr, OperationType.CREATE, 'savedMedia');
          } catch {
            // Logged cleanly
          }
        }
      }
      showToast(imgSource ? 'Image edited successfully!' : 'Image generated!');
    } catch (err: unknown) {
      setImgError(err instanceof Error ? err.message : 'Unable to generate image.');
    } finally {
      setImgLoading(false);
    }
  };

  // --- TAB 5: VIDEO LAB (gemini-omni-1.2-flash) ---
  const [vidPrompt, setVidPrompt] = useState(
    'Aerial tracking shot of a modern logistics truck convoy driving smoothly across a lit suspension bridge at dusk with subtle cyan telemetry overlay lines'
  );
  const [vidAspect, setVidAspect] = useState<'16:9' | '9:16'>('16:9');
  const [vidDuration, setVidDuration] = useState<'5s' | '8s' | '10s'>('5s');
  const [vidSource, setVidSource] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [vidLoading, setVidLoading] = useState(false);
  const [vidResultUrl, setVidResultUrl] = useState<string | null>(null);
  const [vidError, setVidError] = useState<string | null>(null);

  const handleVidFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { base64, mimeType } = await fileToBase64(file);
    setVidSource({
      base64,
      mimeType,
      preview: `data:${mimeType};base64,${base64}`,
    });
  };

  const generateVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!vidPrompt.trim() || vidLoading) return;
    setVidLoading(true);
    setVidError(null);
    try {
      const resp = await fetch('/api/gemini/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: vidPrompt.trim(),
          aspectRatio: vidAspect,
          duration: vidDuration,
          sourceImageBase64: vidSource?.base64,
          sourceMimeType: vidSource?.mimeType,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Video generation failed');
      setVidResultUrl(data.videoUrl);

      if (auth.currentUser && user.authProvider === 'google') {
        try {
          const mediaRef = doc(collection(db, 'savedMedia'));
          await setDoc(
            mediaRef,
            buildSavedMediaCreatePayload(
              mediaRef.id,
              auth.currentUser.uid,
              'video',
              vidSource ? `Animated Clip (${vidAspect} · ${vidDuration})` : `Promo Video (${vidAspect} · ${vidDuration})`,
              vidPrompt.trim(),
              serverTimestamp()
            )
          );
        } catch (fsErr) {
          try {
            handleFirestoreError(fsErr, OperationType.CREATE, 'savedMedia');
          } catch {
            // Logged cleanly
          }
        }
      }
      showToast(vidSource ? 'Image animated into video!' : 'Video generated!');
    } catch (err: unknown) {
      setVidError(err instanceof Error ? err.message : 'Unable to generate video.');
    } finally {
      setVidLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      {/* Studio Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF]">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>VS Technology Telematics Intelligence</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            AI Fleet Copilot &amp; Media Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A9B4D0] mt-1">
            Grounded telematics Q&amp;A, real-time voice dispatch, audio ticket transcription, product imagery, and fleet promo video generation.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ['chat', 'Fleet Chat', Bot],
              ['voice', 'Live Voice', Volume2],
              ['transcribe', 'Transcribe Audio', Mic],
              ['image', 'Image Studio', ImageIcon],
              ['video', 'Video Lab', Film],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                tab === id
                  ? 'bg-[#00D4FF] text-[#0A1128]'
                  : 'bg-slate-100 dark:bg-[#0A1128] text-slate-700 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: MULTI-TURN CHAT + SEARCH / MAPS GROUNDING */}
      {tab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Sidebar */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-5 space-y-4">
            <div>
              <label
                htmlFor="ai-chat-model"
                className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0] mb-1.5"
              >
                Copilot Model
              </label>
              <select
                id="ai-chat-model"
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                {CHAT_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-[#A9B4D0] mb-1.5">
                Live Grounding Mode
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    ['none', 'Standard', Bot],
                    ['search', 'Web Search', Globe],
                    ['maps', 'Google Maps', MapPin],
                  ] as const
                ).map(([modeId, modeLabel, Icon]) => (
                  <button
                    key={modeId}
                    type="button"
                    onClick={() => setGroundingMode(modeId)}
                    className={`flex flex-col items-center gap-1 py-2 px-2 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                      groundingMode === modeId
                        ? 'border-[#00D4FF] bg-[#00D4FF]/15 text-cyan-800 dark:text-[#00D4FF]'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-[#A9B4D0]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{modeLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {groundingMode === 'maps' && (
              <div className="rounded-xl bg-slate-50 dark:bg-[#0A1128] p-3 border border-slate-200 dark:border-white/10 space-y-2">
                <p className="text-[11px] text-slate-600 dark:text-[#A9B4D0]">
                  Google Maps Grounding attaches real-world places, service corridors, and clickable Google Maps links.
                </p>
                <button
                  type="button"
                  onClick={requestLocation}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-cyan-600/15 text-cyan-700 dark:text-[#00D4FF] cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {userCoords
                      ? `Location Set (${userCoords.latitude.toFixed(2)}, ${userCoords.longitude.toFixed(2)})`
                      : 'Attach My Coordinates'}
                  </span>
                </button>
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => setShowSystemBox((v) => !v)}
                className="text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline cursor-pointer"
              >
                {showSystemBox ? 'Hide Custom System Instruction' : '+ Custom System Instruction'}
              </button>
              {showSystemBox && (
                <textarea
                  rows={3}
                  value={systemInstruction}
                  onChange={(e) => setSystemInstruction(e.target.value)}
                  placeholder="Optional role or fleet rules..."
                  className="mt-2 w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-[#A9B4D0]">
                Quick Fleet Prompts
              </div>
              <div className="space-y-1.5">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp}
                    type="button"
                    onClick={() => sendChat(undefined, qp)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 dark:bg-[#0A1128] border border-slate-200/80 dark:border-white/10 text-[11px] text-slate-700 dark:text-[#A9B4D0] hover:border-[#00D4FF] cursor-pointer"
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Thread */}
          <div className="lg:col-span-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] flex flex-col h-[540px]">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700 dark:text-[#A9B4D0]">
                Active Model:{' '}
                <strong className="font-mono text-slate-900 dark:text-white">
                  {groundingMode !== 'none' ? 'gemini-4-hydrogen (Grounded)' : chatModel}
                </strong>
              </span>
              <button
                type="button"
                onClick={startNewChat}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/15 text-slate-600 dark:text-[#A9B4D0] hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>New Chat</span>
              </button>
            </div>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-2.5 ${
                      msg.role === 'user'
                        ? 'bg-[#00D4FF] text-[#0A1128] font-medium'
                        : 'bg-slate-100 dark:bg-[#0A1128] text-slate-800 dark:text-white border border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Google Search Citations */}
                    {msg.webSources && msg.webSources.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-1">
                        <div className="text-[11px] font-semibold text-cyan-700 dark:text-[#00D4FF]">
                          Web Sources
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.webSources.map((src, i) => (
                            <a
                              key={`${src.uri}-${i}`}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-[#111B3A] border border-slate-200 dark:border-white/15 text-[11px] text-cyan-700 dark:text-[#00D4FF] hover:underline"
                            >
                              <span>{src.title}</span>
                              <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Google Maps Grounding Places & Review Snippets */}
                    {msg.mapPlaces && msg.mapPlaces.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-white/10 space-y-2">
                        <div className="text-[11px] font-semibold text-emerald-700 dark:text-[#7CFF6B]">
                          Google Maps Grounded Places
                        </div>
                        <div className="space-y-2">
                          {msg.mapPlaces.map((pl, idx) => (
                            <div
                              key={`${pl.uri}-${idx}`}
                              className="rounded-xl bg-white dark:bg-[#111B3A] p-2.5 border border-slate-200 dark:border-white/10"
                            >
                              <a
                                href={pl.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 dark:text-[#00D4FF] hover:underline"
                              >
                                <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>{pl.title}</span>
                                <ExternalLink className="w-3 h-3" aria-hidden="true" />
                              </a>
                              {pl.reviewSnippets.length > 0 && (
                                <p className="text-[11px] text-slate-600 dark:text-[#A9B4D0] mt-1 italic">
                                  &ldquo;{pl.reviewSnippets[0]}&rdquo;
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#A9B4D0]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#00D4FF]" />
                  <span>Consulting Gemini Copilot...</span>
                </div>
              )}

              {chatError && (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-[#FF4D4F]">
                  {chatError}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => sendChat(e)}
              className="p-4 border-t border-slate-200 dark:border-white/10 flex gap-2"
            >
              <label htmlFor="ai-chat-input" className="sr-only">
                Message VS Fleet Copilot
              </label>
              <input
                id="ai-chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about GPS trackers, routes, fuel theft, or fleet hubs..."
                className="flex-1 min-w-0 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-4 py-2.5 text-sm text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE VOICE CONVERSATION */}
      {tab === 'voice' && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Real-Time Voice Telematics Desk (Gemini Live)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A9B4D0] mt-1">
                Hands-free bi-directional voice assistant for drivers, installers, and fleet coordinators.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value as typeof voiceName)}
                disabled={voiceActive}
                aria-label="Select Copilot Voice"
                className="rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-xs text-slate-900 dark:text-white"
              >
                {(['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'] as const).map((v) => (
                  <option key={v} value={v}>
                    Voice: {v}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={startVoiceSession}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                  voiceActive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-[#00D4FF] hover:bg-[#33DDFF] text-[#0A1128]'
                }`}
              >
                {voiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{voiceActive ? 'End Voice Session' : 'Start Voice Session'}</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-[#0A1128] border border-slate-200 dark:border-white/10 p-4 flex items-center justify-between text-xs">
            <span className="font-mono text-slate-700 dark:text-[#A9B4D0]">{voiceStatus}</span>
            {voiceActive && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-[#7CFF6B] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#7CFF6B]" />
                16kHz PCM Mic Streaming
              </span>
            )}
          </div>

          {voiceActive && (
            <form onSubmit={sendVoiceTextNudge} className="flex gap-2">
              <input
                type="text"
                value={voiceNudge}
                onChange={(e) => setVoiceNudge(e.target.value)}
                placeholder="Optional: send a text prompt into the live voice conversation..."
                className="flex-1 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3.5 py-2 text-sm text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128] cursor-pointer"
              >
                Send
              </button>
            </form>
          )}

          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] p-4 min-h-[180px] max-h-72 overflow-y-auto space-y-2 text-sm">
            {voiceLogs.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                Live speech transcripts will appear here once you start talking.
              </p>
            ) : (
              voiceLogs.map((l, idx) => (
                <div key={idx} className="text-xs">
                  <strong className={l.who === 'Copilot' ? 'text-[#00D4FF]' : 'text-[#7CFF6B]'}>
                    {l.who}:{' '}
                  </strong>
                  <span className="text-slate-800 dark:text-white">{l.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIO TRANSCRIPTION */}
      {tab === 'transcribe' && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Driver Voice-Note &amp; Call Log Transcription
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#A9B4D0] mt-1">
              Record a live voice note or upload dispatch audio (.mp3, .wav, .m4a, .webm) to transcribe accurately.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={toggleRecording}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer ${
                recording
                  ? 'bg-rose-600 text-white'
                  : 'bg-[#00D4FF] text-[#0A1128]'
              }`}
            >
              {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{recording ? 'Stop & Transcribe' : 'Record Microphone'}</span>
            </button>

            <label className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white hover:border-[#00D4FF] cursor-pointer">
              <Upload className="w-4 h-4" aria-hidden="true" />
              <span>Upload Audio File</span>
              <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
            </label>
          </div>

          {transcribeLoading && (
            <div className="flex items-center gap-2 text-xs text-[#00D4FF]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Transcribing audio with Gemini...</span>
            </div>
          )}

          {transcribeError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-[#FF4D4F]">
              {transcribeError}
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="transcript-output"
                className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0]"
              >
                Transcript Output
              </label>
              {transcript.trim() && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(transcript);
                      setTranscriptCopied(true);
                      showToast('Transcript copied to clipboard.');
                      window.setTimeout(() => setTranscriptCopied(false), 1800);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-300 dark:border-white/15 text-slate-700 dark:text-white cursor-pointer"
                  >
                    {transcriptCopied ? (
                      <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3 h-3" aria-hidden="true" />
                    )}
                    <span>{transcriptCopied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const snippet = transcript.trim();
                      setTab('chat');
                      void sendChat(undefined, `Summarize and create action items for this driver audio note:\n\n${snippet}`);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#00D4FF]/15 text-cyan-800 dark:text-[#00D4FF] cursor-pointer"
                  >
                    <Bot className="w-3 h-3" aria-hidden="true" />
                    <span>Analyze in Fleet Chat</span>
                  </button>
                </div>
              )}
            </div>
            <textarea
              id="transcript-output"
              rows={6}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Transcribed driver or dispatch text appears here..."
              className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] p-4 text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* TAB 4: IMAGE STUDIO (CREATE & EDIT) */}
      {tab === 'image' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={generateOrEditImage}
            className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-4"
          >
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Create &amp; Edit Hardware / Fleet Visuals
            </h2>

            <div>
              <label
                htmlFor="img-prompt"
                className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0] mb-1.5"
              >
                Prompt *
              </label>
              <textarea
                id="img-prompt"
                rows={4}
                value={imgPrompt}
                onChange={(e) => setImgPrompt(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] p-3 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="img-aspect"
                  className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0] mb-1"
                >
                  Aspect Ratio
                </label>
                <select
                  id="img-aspect"
                  value={imgAspect}
                  onChange={(e) => setImgAspect(e.target.value as typeof imgAspect)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  {(['16:9', '1:1', '9:16', '4:3', '3:4'] as const).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="img-size"
                  className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0] mb-1"
                >
                  Resolution
                </label>
                <select
                  id="img-size"
                  value={imgSize}
                  onChange={(e) => setImgSize(e.target.value as typeof imgSize)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="1K">1K Standard</option>
                  <option value="2K">2K High-Res</option>
                  <option value="4K">4K Ultra-Res</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-[#A9B4D0]">
                Optional: Upload Photo to Edit
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white cursor-pointer">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{imgSource ? 'Replace Photo' : 'Upload Reference Photo'}</span>
                  <input type="file" accept="image/*" onChange={handleImgFileChange} className="hidden" />
                </label>
                {imgSource && (
                  <button
                    type="button"
                    onClick={() => setImgSource(null)}
                    className="text-xs text-rose-600 dark:text-[#FF4D4F] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              {imgSource && (
                <img
                  src={imgSource.preview}
                  alt="Uploaded source for editing"
                  className="h-24 rounded-xl object-cover border border-white/10"
                />
              )}
            </div>

            {!imgSource && (
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#A9B4D0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={imgSearchGround}
                  onChange={(e) => setImgSearchGround(e.target.checked)}
                  className="accent-[#00D4FF]"
                />
                <span>Use Google Image Search Grounding for real-world visual references</span>
              </label>
            )}

            {imgError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-[#FF4D4F]">
                {imgError}
              </div>
            )}

            <button
              type="submit"
              disabled={imgLoading}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] disabled:opacity-50 cursor-pointer"
            >
              {imgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              <span>{imgLoading ? 'Rendering Image...' : imgSource ? 'Edit Uploaded Image' : 'Generate Image'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 min-h-[380px] flex flex-col items-center justify-center">
            {imgResult ? (
              <div className="w-full space-y-3">
                <img
                  src={imgResult.url}
                  alt="Generated VS Technology visual"
                  className="w-full rounded-xl border border-white/10 object-contain max-h-[440px]"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 dark:text-[#A9B4D0]">
                    {imgResult.caption || 'Rendered via Gemini Image Studio'}
                  </span>
                  <a
                    href={imgResult.url}
                    download="vs-technology-visual.png"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128]"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Download PNG</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 text-slate-500 dark:text-[#A9B4D0]">
                <ImageIcon className="w-10 h-10 mx-auto opacity-40" aria-hidden="true" />
                <p className="text-sm font-medium">Generated or edited visuals will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: VIDEO LAB (TEXT-TO-VIDEO & ANIMATE IMAGE) */}
      {tab === 'video' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={generateVideo}
            className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-4"
          >
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Generate Video &amp; Animate Product Photos
            </h2>

            <div>
              <label
                htmlFor="vid-prompt"
                className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0] mb-1.5"
              >
                Motion / Scene Prompt *
              </label>
              <textarea
                id="vid-prompt"
                rows={4}
                value={vidPrompt}
                onChange={(e) => setVidPrompt(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] p-3 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="vid-aspect"
                  className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0] mb-1"
                >
                  Aspect Ratio
                </label>
                <select
                  id="vid-aspect"
                  value={vidAspect}
                  onChange={(e) => setVidAspect(e.target.value as '16:9' | '9:16')}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="16:9">16:9 Landscape</option>
                  <option value="9:16">9:16 Vertical Reel</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="vid-dur"
                  className="block text-xs font-semibold text-slate-700 dark:text-[#A9B4D0] mb-1"
                >
                  Duration
                </label>
                <select
                  id="vid-dur"
                  value={vidDuration}
                  onChange={(e) => setVidDuration(e.target.value as '5s' | '8s' | '10s')}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-[#0A1128] px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="5s">5 Seconds</option>
                  <option value="8s">8 Seconds</option>
                  <option value="10s">10 Seconds</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-[#A9B4D0]">
                Optional: Animate Starting Image
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-800 dark:text-white cursor-pointer">
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{vidSource ? 'Change Image' : 'Upload Start Frame'}</span>
                  <input type="file" accept="image/*" onChange={handleVidFileChange} className="hidden" />
                </label>
                {vidSource && (
                  <button
                    type="button"
                    onClick={() => setVidSource(null)}
                    className="text-xs text-rose-600 dark:text-[#FF4D4F] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              {vidSource && (
                <img
                  src={vidSource.preview}
                  alt="Starting frame to animate"
                  className="h-24 rounded-xl object-cover border border-white/10"
                />
              )}
            </div>

            {vidError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-[#FF4D4F]">
                {vidError}
              </div>
            )}

            <button
              type="submit"
              disabled={vidLoading}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold bg-[#00D4FF] text-[#0A1128] hover:bg-[#33DDFF] disabled:opacity-50 cursor-pointer"
            >
              {vidLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
              <span>{vidLoading ? 'Generating Video (30–90s)...' : vidSource ? 'Animate Image' : 'Generate Video'}</span>
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 min-h-[380px] flex flex-col items-center justify-center">
            {vidResultUrl ? (
              <div className="w-full space-y-3">
                <video
                  src={vidResultUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full rounded-xl border border-white/10 max-h-[440px]"
                />
                <div className="flex justify-end">
                  <a
                    href={vidResultUrl}
                    download="vs-technology-fleet-promo.mp4"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#00D4FF] text-[#0A1128]"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Download MP4</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2 text-slate-500 dark:text-[#A9B4D0]">
                <Film className="w-10 h-10 mx-auto opacity-40" aria-hidden="true" />
                <p className="text-sm font-medium">Generated fleet &amp; hardware video clips will play here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cloud-Synced Studio History (when signed in with Google) */}
      {user.authProvider === 'google' && savedHistory.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111B3A] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-700 dark:text-[#00D4FF]" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Recent Cloud Studio Activity
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {savedHistory.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0A1128] p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="uppercase tracking-wider text-cyan-700 dark:text-[#00D4FF]">
                    {item.kind}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {item.title}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-[#A9B4D0] line-clamp-2">
                  {item.summaryText || item.prompt}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
