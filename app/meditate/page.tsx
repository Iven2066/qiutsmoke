"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Wind, CloudRain, Zap, Moon, Droplets, Settings, X, Activity, Shield, Timer, Heart } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const DEFAULT_PROMPT = "创建一个关于坐在舒适的房间里听着温柔雨声的引导冥想脚本。请用中文回复。";

const TOPICS = [
    {
        id: "breathing",
        title: "三分钟呼吸锚定",
        icon: Wind,
        color: "from-teal-400 to-teal-600",
        prompt: "创建一个3分钟的呼吸锚定冥想引导脚本。引导用户将注意力集中在呼吸上，当注意力游离时温柔地带回。适合快速平复心情。请用中文回复。"
    },
    {
        id: "body-scan",
        title: "身体扫描",
        icon: Activity,
        color: "from-indigo-400 to-indigo-600",
        prompt: "创建一个身体扫描冥想引导脚本。引导用户从脚趾开始，逐渐向上扫描全身，感受身体的每一个部位，释放紧张感。请用中文回复。"
    },
    {
        id: "rain-exp",
        title: "RAIN 体会版",
        icon: CloudRain,
        color: "from-blue-400 to-blue-600",
        prompt: "创建一个RAIN旁观冥想引导脚本。R(Recognize)识别当下情绪，A(Allow)允许它的存在，I(Investigate)带着好奇心探究身体感受，N(Non-identification)不认同情绪即自我。请用中文回复。"
    },
    {
        id: "desensitization",
        title: "脱敏训练",
        icon: Shield,
        color: "from-rose-400 to-rose-600",
        prompt: "创建一个针对烟瘾的脱敏训练冥想引导脚本。引导用户想象诱发吸烟的场景，观察随之而来的冲动，但不付诸行动，像冲浪一样驾驭冲动直到它消退。请用中文回复。"
    },
    {
        id: "rain-quick",
        title: "RAIN 快速版",
        icon: Zap,
        color: "from-amber-400 to-amber-600",
        prompt: "创建一个快速版RAIN冥想引导脚本。适合在强烈冲动来袭时使用，快速通过识别、允许、探究、不认同四个步骤，找回内心的平静。请用中文回复。"
    },
    {
        id: "rain-full",
        title: "RAIN 完整版",
        icon: Droplets,
        color: "from-violet-400 to-violet-600",
        prompt: "创建一个完整的RAIN冥想引导脚本。详细引导用户进行识别(Recognize)、允许(Allow)、探究(Investigate)、不认同(Non-identification)的每一个步骤，给予充足的时间进行深度体验和转化。请用中文回复。"
    },
];

const VOICES = [
    { id: "zh-CN-XiaoxiaoNeural", name: "晓晓 (女声-温暖)", style: "warm" },
    { id: "zh-CN-YunxiNeural", name: "云希 (男声-沉稳)", style: "calm" },
    { id: "zh-CN-XiaohanNeural", name: "晓涵 (女声-温柔)", style: "gentle" },
    { id: "zh-CN-YunyangNeural", name: "云野 (男声-专业)", style: "professional" },
];

export default function MeditatePage() {
    const [activeCard, setActiveCard] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
    const [customPrompt, setCustomPrompt] = useState(DEFAULT_PROMPT);
    const [apiKey, setApiKey] = useState("");
    const [showPromptEdit, setShowPromptEdit] = useState(false);
    const [editedPrompts, setEditedPrompts] = useState<Record<string, string>>({});
    const [globalSystemPrompt, setGlobalSystemPrompt] = useState("");
    const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
    const [draftPrompt, setDraftPrompt] = useState("");

    // Load settings from localStorage on mount
    useEffect(() => {
        const savedPrompt = localStorage.getItem("meditation_prompt");
        if (savedPrompt) setCustomPrompt(savedPrompt);

        try {
            const savedPrompts = localStorage.getItem("meditation_prompts");
            if (savedPrompts) {
                const obj = JSON.parse(savedPrompts);
                if (obj && typeof obj === 'object') setEditedPrompts(obj);
            }
        } catch {}

        const savedKey = localStorage.getItem("deepseek_api_key");
        if (savedKey) setApiKey(savedKey);

        try {
            const g = localStorage.getItem("global_system_prompt");
            if (g) setGlobalSystemPrompt(g);
        } catch {}

        (async () => {
            try {
                const res = await fetch('/api/prompts');
                if (res.ok) {
                    const serverObj = await res.json();
                    if (serverObj && typeof serverObj === 'object' && Object.keys(serverObj).length > 0) {
                        setEditedPrompts(serverObj);
                    }
                }
            } catch {}
            try {
                const res = await fetch('/api/system-prompt');
                if (res.ok) {
                    const text = await res.text();
                    if (text && text.trim().length > 0) {
                        setGlobalSystemPrompt(text);
                        try { localStorage.setItem("global_system_prompt", text); } catch {}
                    }
                }
            } catch {}
        })();
    }, []);

    // Save settings to localStorage when changed
    useEffect(() => {
        localStorage.setItem("meditation_prompt", customPrompt);
        localStorage.setItem("deepseek_api_key", apiKey);
        try {
            localStorage.setItem("meditation_prompts", JSON.stringify(editedPrompts));
        } catch {}
        try {
            localStorage.setItem("global_system_prompt", globalSystemPrompt);
        } catch {}
    }, [customPrompt, apiKey, editedPrompts, globalSystemPrompt]);

    // Audio Queue Management
    type QueueItem =
        | { type: 'audio', url?: string, buffer?: AudioBuffer, id: string }
        | { type: 'pause', duration: number, id: string };

    const [isPlaying, setIsPlaying] = useState(false);
    const [audioQueue, setAudioQueue] = useState<QueueItem[]>([]);
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const [showAudioHint, setShowAudioHint] = useState(false);
    const [text, setText] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    // Refs for processing
    const currentRate = useRef("0%");
    const processingBuffer = useRef("");
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isPausingRef = useRef(false);
    const currentItemIdRef = useRef<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const ensureAudioContext = async () => {
        const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!audioContextRef.current && AC) {
            const ctx = new AC();
            audioContextRef.current = ctx;
            try {
                ctx.onstatechange = () => {
                    const st = ctx.state;
                    if (st === 'suspended') {
                        setShowAudioHint(true);
                    } else if (st === 'running') {
                        setShowAudioHint(false);
                    }
                };
            } catch { }
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
    };

    const playSilence = async (seconds: number) => {
        const url = createSilenceWavURL(seconds);
        const audio = new Audio(url);
        (audio as any).playsInline = true;
        audio.preload = 'auto';
        return new Promise<void>((resolve) => {
            audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            audio.onerror = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            audio.play().catch(() => resolve());
        });
    };

    const primeOnceRef = useRef(false);
    const primeAudio = async () => {
        if (primeOnceRef.current) return;
        primeOnceRef.current = true;
        await playSilence(0.05);
    };

    // Play next item in queue
    useEffect(() => {
        // Handle global pause/play toggle
        if (!isPlaying) {
            if (currentAudio) currentAudio.pause();
            if (currentSourceRef.current) {
                try { currentSourceRef.current.stop(); } catch { }
                currentSourceRef.current = null;
            }
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
                isPausingRef.current = false;
                currentItemIdRef.current = null; // Reset so we can resume correctly
            }
            return;
        }

        // If currently playing audio, do nothing (wait for onended)
        if (currentAudio && !currentAudio.paused) return;

        // If currently pausing, do nothing (wait for timeout)
        if (isPausingRef.current) return;

        // If we have a current audio that is paused (and we are isPlaying=true), resume it
        if (currentAudio && currentAudio.paused) {
            currentAudio.play().catch(e => console.error("Resume failed", e));
            return;
        }

        // Process next item in queue
        if (audioQueue.length > 0) {
            const item = audioQueue[0];

            // Prevent double-processing the same item (Fix for skipping/jumping)
            if (currentItemIdRef.current === item.id) return;
            currentItemIdRef.current = item.id;

            if (item.type === 'pause') {
                isPausingRef.current = true;
                (async () => {
                    await playSilence(item.duration);
                    isPausingRef.current = false;
                    setAudioQueue(prev => prev.slice(1));
                    currentItemIdRef.current = null;
                })();
            } else {
                // Start audio
                if (item.buffer) {
                    (async () => {
                        await ensureAudioContext();
                        const ctx = audioContextRef.current;
                        if (!ctx) {
                            setAudioQueue(prev => prev.slice(1));
                            currentItemIdRef.current = null;
                            return;
                        }
                        const source = ctx.createBufferSource();
                        source.buffer = item.buffer || null;
                        source.connect(ctx.destination);
                        source.onended = () => {
                            setAudioQueue(prev => prev.slice(1));
                            currentSourceRef.current = null;
                            currentItemIdRef.current = null;
                        };
                        currentSourceRef.current = source;
                        try {
                            await ctx.resume();
                            source.start();
                        } catch (e) {
                            console.error('WebAudio play failed', e);
                            currentSourceRef.current = null;
                            setAudioQueue(prev => prev.slice(1));
                            currentItemIdRef.current = null;
                        }
                    })();
                } else if (item.url) {
                    const audio = new Audio(item.url);
                    (audio as any).playsInline = true;
                    audio.preload = 'auto';
                    try {
                        const nav: any = navigator as any;
                        if (nav && 'mediaSession' in nav) {
                            try {
                                nav.mediaSession.metadata = new (window as any).MediaMetadata({
                                    title: 'Rain 冥想',
                                    artist: 'Rain'
                                });
                                nav.mediaSession.setActionHandler('play', async () => { setIsPlaying(true); });
                                nav.mediaSession.setActionHandler('pause', async () => { setIsPlaying(false); });
                                nav.mediaSession.setActionHandler('seekforward', async () => { try { audio.currentTime += 30; } catch { } });
                                nav.mediaSession.setActionHandler('seekbackward', async () => { try { audio.currentTime -= 15; } catch { } });
                            } catch { }
                        }
                    } catch { }
                    audio.onended = () => {
                        if (item.url!.startsWith('blob:')) {
                            URL.revokeObjectURL(item.url!);
                        }
                        setAudioQueue(prev => prev.slice(1));
                        setCurrentAudio(null);
                        currentItemIdRef.current = null; // Reset for next item
                    };
                    audio.onerror = (e) => {
                        if (item.url!.startsWith('blob:')) {
                            URL.revokeObjectURL(item.url!);
                        }
                        console.error("Audio playback error", e);
                        setAudioQueue(prev => prev.slice(1));
                        setCurrentAudio(null);
                        currentItemIdRef.current = null;
                    };
                    (async () => {
                        try {
                            await ensureAudioContext();
                            await audio.play();
                        } catch (e) {
                            console.error("Playback failed", e);
                            try {
                                await ensureAudioContext();
                                await audio.play();
                            } catch (err) {
                                console.error('Retry play failed', err);
                            }
                        }
                    })();
                    setCurrentAudio(audio);
                } else {
                    setAudioQueue(prev => prev.slice(1));
                    currentItemIdRef.current = null;
                }
            }
        }
    }, [isPlaying, audioQueue, currentAudio]);


    const isProcessingRef = useRef(false);
    const wakeLockRef = useRef<any>(null);
    const wakeLockActiveRef = useRef(false);

    const requestWakeLock = async () => {
        try {
            const nav: any = navigator as any;
            if (!nav || !('wakeLock' in nav)) return;
            const sent = await nav.wakeLock.request('screen');
            wakeLockRef.current = sent;
            wakeLockActiveRef.current = true;
            try {
                sent.addEventListener('release', () => {
                    wakeLockActiveRef.current = false;
                });
            } catch { }
        } catch {
            wakeLockActiveRef.current = false;
        }
    };

    const releaseWakeLock = async () => {
        try {
            if (wakeLockRef.current) {
                await wakeLockRef.current.release();
            }
        } catch {
        } finally {
            wakeLockRef.current = null;
            wakeLockActiveRef.current = false;
        }
    };

    useEffect(() => {
        const onVisibility = async () => {
            if (document.hidden) {
                if (!wakeLockActiveRef.current) {
                    try { await requestWakeLock(); } catch { }
                }
                setShowAudioHint(false);
            } else {
                setShowAudioHint(false);
                try { await ensureAudioContext(); } catch { }
                if (currentAudio && isPlaying && currentAudio.paused) {
                    try { await currentAudio.play(); } catch { }
                }
            }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [currentAudio, isPlaying]);

    useEffect(() => {
        (async () => {
            if (isPlaying) {
                await requestWakeLock();
            } else {
                await releaseWakeLock();
            }
        })();
    }, [isPlaying]);

    // ...

    const generateMeditation = async (prompt: string) => {
        setIsGenerating(true);
        setText("");
        setAudioQueue([]);
        setCurrentAudio(null);
        processingBuffer.current = "";
        currentRate.current = "0%"; // Reset rate
        currentItemIdRef.current = null; // Reset processing tracker
        isProcessingRef.current = false; // Reset lock

        // Remove any existing listeners to avoid duplicates
        if (window.electron) {
            window.electron.removeMeditationListeners();
        }

        try {
            setIsPlaying(true);

            if (window.electron) {
                window.electron.onMeditationChunk(async (chunk) => {
                    setText((prev) => prev + chunk);
                    processingBuffer.current += chunk;
                    await processBuffer();
                });

                window.electron.onMeditationError((error) => {
                    console.error("Generation error:", error);
                    setIsGenerating(false);
                });

                window.electron.onMeditationDone(async () => {
                    // Process any remaining text in buffer
                    await processBuffer();
                    setIsGenerating(false);
                });

                window.electron.generateMeditation(prompt, apiKey);
            } else {
                const res = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, apiKey, systemPrompt: globalSystemPrompt })
                });
                if (!res.ok) {
                    try {
                        const data = await res.json();
                        setText(`生成失败：${data?.error || `HTTP ${res.status}`} `);
                    } catch (_) {
                        setText(`生成失败：HTTP ${res.status}`);
                    }
                    setIsGenerating(false);
                    return;
                }
                const reader = res.body?.getReader();
                if (!reader) {
                    setText('生成失败：服务器未开启流');
                    setIsGenerating(false);
                } else {
                    const decoder = new TextDecoder();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value);
                        setText((prev) => prev + chunk);
                        processingBuffer.current += chunk;
                        await processBuffer();
                    }
                    await processBuffer();
                    setIsGenerating(false);
                }
            }

        } catch (error) {
            console.error("Generation failed", error);
            setIsGenerating(false);
        }
    };

    const isIOSPlatform = () => {
        try {
            return typeof navigator !== 'undefined' && ((/iPad|iPhone|iPod/.test(navigator.userAgent)) || ((navigator.platform === 'MacIntel') && (navigator.maxTouchPoints > 1)));
        } catch {
            return false;
        }
    };

    const createSilenceWavURL = (seconds: number) => {
        const sr = audioContextRef.current?.sampleRate || 44100;
        const sec = Math.max(0.05, seconds);
        const samples = Math.max(1, Math.floor(sr * sec));
        const channels = 1;
        const bps = 16;
        const blockAlign = (channels * bps) >> 3;
        const byteRate = sr * blockAlign;
        const dataSize = samples * blockAlign;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);
        const writeStr = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + dataSize, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, channels, true);
        view.setUint32(24, sr, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bps, true);
        writeStr(36, 'data');
        view.setUint32(40, dataSize, true);
        const dataOffset = 44;
        for (let i = 0; i < samples; i++) {
            view.setInt16(dataOffset + i * 2, 0, true);
        }
        const blob = new Blob([view], { type: 'audio/wav' });
        return URL.createObjectURL(blob);
    };

    const processBuffer = async () => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        try {
            // Regex to find tags or sentence endings
            // Matches: [pause 5s], [rate -10%], or sentence endings (.!?)
            const tokenRegex = /((?:\[(?:pause|rate)[^\]]*\])|(?:[.!?\n。！？，,]+))/;

            while (true) {
                const match = processingBuffer.current.match(tokenRegex);
                if (!match) break;

                const index = match.index!;
                const token = match[0];
                const textBefore = processingBuffer.current.substring(0, index);

                // Remove processed part from buffer immediately to prevent re-processing
                processingBuffer.current = processingBuffer.current.substring(index + token.length);

                if (token.startsWith("[")) {
                    // Tag found
                    if (textBefore.trim().length > 0) {
                        await generateAudio(textBefore.trim());
                    }

                    if (token.includes("pause")) {
                        const durationMatch = token.match(/(\d+)/);
                        if (durationMatch) {
                            const dur = parseInt(durationMatch[1]);
                            const url = createSilenceWavURL(dur);
                            setAudioQueue(prev => [...prev, {
                                type: 'audio',
                                url,
                                id: Math.random().toString(36).substr(2, 9)
                            }]);
                        }
                    } else if (token.includes("rate")) {
                        const rateMatch = token.match(/([+-]?\d+%)/);
                        if (rateMatch) {
                            currentRate.current = rateMatch[1];
                        }
                    }
                } else {
                    // Punctuation found
                    // Include punctuation in the text
                    const textToGen = textBefore + token;
                    if (textToGen.trim().length > 0) {
                        await generateAudio(textToGen.trim());

                        // Add natural pause based on punctuation type
                        if (token.match(/[.!?。！？\n]+/)) {
                            const url = createSilenceWavURL(1.2);
                            setAudioQueue(prev => [...prev, {
                                type: 'audio',
                                url,
                                id: Math.random().toString(36).substr(2, 9)
                            }]);
                        } else if (token.match(/[,，]+/)) {
                            const url = createSilenceWavURL(0.4);
                            setAudioQueue(prev => [...prev, {
                                type: 'audio',
                                url,
                                id: Math.random().toString(36).substr(2, 9)
                            }]);
                        }
                    }
                }
            }
        } finally {
            isProcessingRef.current = false;
            // Check if more data arrived while we were processing
            // If so, trigger processing again
            const tokenRegex = /((?:\[(?:pause|rate)[^\]]*\])|(?:[.!?\n。！？，,]+))/;
            if (processingBuffer.current.match(tokenRegex)) {
                processBuffer();
            }
        }
    };

    const generateAudio = async (text: string) => {
        try {
            if (window.electron) {
                const url = await window.electron.generateTTS(text, selectedVoice, currentRate.current);
                setAudioQueue(prev => [...prev, {
                    type: 'audio',
                    url,
                    id: Math.random().toString(36).substr(2, 9)
                }]);
            } else {
                const resp = await fetch('/api/tts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, voice: selectedVoice, rate: currentRate.current })
                });
                if (resp.ok) {
                    try {
                        const blob = await resp.blob();
                        const isIOS = typeof navigator !== 'undefined' && ((/iPad|iPhone|iPod/.test(navigator.userAgent)) || ((navigator.platform === 'MacIntel') && (navigator.maxTouchPoints > 1)));
                        if (isIOS) {
                            const url = URL.createObjectURL(blob);
                            setAudioQueue(prev => [...prev, {
                                type: 'audio',
                                url,
                                id: Math.random().toString(36).substr(2, 9)
                            }]);
                        } else {
                            await ensureAudioContext();
                            const arr = await blob.arrayBuffer();
                            const ctx = audioContextRef.current;
                            if (ctx) {
                                const buf = await ctx.decodeAudioData(arr);
                                setAudioQueue(prev => [...prev, {
                                    type: 'audio',
                                    buffer: buf,
                                    id: Math.random().toString(36).substr(2, 9)
                                }]);
                            } else {
                                const url = URL.createObjectURL(blob);
                                setAudioQueue(prev => [...prev, {
                                    type: 'audio',
                                    url,
                                    id: Math.random().toString(36).substr(2, 9)
                                }]);
                            }
                        }
                    } catch {
                        const blob = await resp.blob();
                        const url = URL.createObjectURL(blob);
                        setAudioQueue(prev => [...prev, {
                            type: 'audio',
                            url,
                            id: Math.random().toString(36).substr(2, 9)
                        }]);
                    }
                }
            }
        } catch (e) {
            console.error("TTS failed", e);
        }
    };

    const handleCardClick = async (id: string) => {
        setActiveCard(id);
        const topic = TOPICS.find(t => t.id === id);
        const promptToUse = (editedPrompts[id] ?? topic?.prompt ?? customPrompt);

        await ensureAudioContext();
        await primeAudio();
        generateMeditation(promptToUse);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
                style={{ backgroundImage: 'url(/mountain-9472312.svg)' }}
            />

            {/* Top Navigation */}
            <nav className="glass-panel rounded-full p-2 flex justify-center items-center gap-4 z-20 mb-6 w-fit mx-auto">
                <Link href="/" className="p-3 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                    <Wind className="w-6 h-6" />
                </Link>
                <Link href="/meditate" className="p-3 rounded-full bg-white/10 text-white">
                    <Droplets className="w-6 h-6" />
                </Link>
            </nav>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-4xl mx-auto z-10 overflow-y-auto pb-20 px-4 scrollbar-hide">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-8">
                    {TOPICS.map((topic) => (
                        <motion.button
                            key={topic.id}
                            layoutId={`card-${topic.id}`}
                            onClick={() => handleCardClick(topic.id)}
                            className={cn(
                                "glass-card p-4 rounded-2xl flex flex-col items-start justify-between aspect-square text-left group relative overflow-hidden w-full transition-all hover:scale-[1.02]",
                                activeCard === topic.id ? "opacity-0" : "opacity-100"
                            )}
                        >
                            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-gradient-to-br", topic.color)} />
                                    <div className="absolute top-3 right-3 z-20">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingTopicId(topic.id);
                                                const t = TOPICS.find(x => x.id === topic.id);
                                                const base = editedPrompts[topic.id] ?? t?.prompt ?? DEFAULT_PROMPT;
                                                setDraftPrompt(base);
                                                setShowPromptEdit(true);
                                            }}
                                            className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                                        >
                                            <Settings className="w-3.5 h-3.5 text-white" />
                                        </div>
                            </div>
                            <topic.icon className="w-6 h-6 mb-2 text-white/80" />
                            <span className="text-sm md:text-base font-medium leading-tight">{topic.title}</span>
                        </motion.button>
                    ))}
                </div>
            </main>

            {/* Settings Modal (Prompt + Voice) */}
            <AnimatePresence>
                {showPromptEdit && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-6"
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-medium">冥想设置</h3>
                                <button onClick={() => setShowPromptEdit(false)} className="p-2 hover:bg-white/10 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {showAudioHint && (
                                <div className="fixed bottom-4 inset-x-0 z-50 px-4">
                                    <div className="mx-auto max-w-md flex items-center justify-between rounded-2xl px-4 py-3"
                                        style={{
                                            background: 'rgba(255,255,255,0.20)',
                                            backdropFilter: 'blur(16px) saturate(160%)',
                                            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                                            border: '1px solid rgba(255,255,255,0.35)'
                                        }}>
                                        <span className="text-sm text-slate-900">音频被系统暂停（移动端限制）</span>
                                        <button
                                            onClick={async () => {
                                                await ensureAudioContext();
                                                setShowAudioHint(false);
                                                if (currentAudio && currentAudio.paused && isPlaying) {
                                                    try { await currentAudio.play(); } catch { }
                                                }
                                            }}
                                            className="px-3 py-1 rounded-full text-sm"
                                            style={{
                                                background: 'rgba(255,255,255,0.6)',
                                                border: '1px solid rgba(255,255,255,0.8)'
                                            }}
                                        >继续播放</button>
                                    </div>
                                </div>
                            )}

                            {/* Voice Selection */}
                            <div className="space-y-3">
                                <label className="text-xs text-slate-400 uppercase tracking-wider block">选择人声</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {VOICES.map(voice => (
                                        <button
                                            key={voice.id}
                                            onClick={() => setSelectedVoice(voice.id)}
                                            className={cn(
                                                "px-3 py-2 rounded-xl text-sm text-left transition-all border",
                                                selectedVoice === voice.id
                                                    ? "bg-blue-600/20 border-blue-500 text-white"
                                                    : "bg-white/5 border-transparent text-slate-400 hover:bg-white/10"
                                            )}
                                        >
                                            <div className="font-medium">{voice.name.split(" ")[0]}</div>
                                            <div className="text-xs opacity-60">{voice.name.split(" ")[1]}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* API Key Setting */}
                            <div className="space-y-3">
                                <label className="text-xs text-slate-400 uppercase tracking-wider block">DeepSeek API Key</label>
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full bg-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="sk-..."
                                />
                                <p className="text-xs text-slate-500">
                                    如果不填，将使用默认的 API Key
                                </p>
                            </div>

                            {/* Global System Prompt */}
                            <div className="space-y-3">
                                <label className="text-xs text-slate-400 uppercase tracking-wider block">全局系统提示词</label>
                                <textarea
                                    value={globalSystemPrompt}
                                    onChange={(e) => setGlobalSystemPrompt(e.target.value)}
                                    className="w-full h-24 bg-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="所有生成都会附加的系统提示词..."
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => { try { localStorage.setItem("global_system_prompt", globalSystemPrompt); fetch('/api/system-prompt', { method: 'POST', body: globalSystemPrompt }); } catch {} }}
                                        className="px-3 py-1.5 bg-white/10 rounded-full text-slate-200 hover:bg-white/20 transition-colors"
                                    >保存全局</button>
                                </div>
                            </div>

                            {/* Prompt Editing */}
                            <div className="space-y-3">
                                <label className="text-xs text-slate-400 uppercase tracking-wider block">提示词（仅当前卡片）</label>
                                <textarea
                                    value={draftPrompt}
                                    onChange={(e) => setDraftPrompt(e.target.value)}
                                    className="w-full h-32 bg-slate-800 rounded-xl p-4 text-sm text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="输入当前卡片的冥想提示词..."
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => {
                                        if (editingTopicId) {
                                            setEditedPrompts(prev => ({ ...prev, [editingTopicId]: draftPrompt }));
                                            try { fetch('/api/prompts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingTopicId, prompt: draftPrompt }) }); } catch {}
                                        }
                                        setShowPromptEdit(false);
                                        setEditingTopicId(null);
                                    }}
                                    className="px-6 py-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors font-medium"
                                >
                                    完成
                                </button>
                                <button
                                    onClick={() => {
                                        if (editingTopicId) {
                                            setEditedPrompts(prev => ({ ...prev, [editingTopicId]: draftPrompt }));
                                            setShowPromptEdit(false);
                                            const id = editingTopicId;
                                            setEditingTopicId(null);
                                            try { fetch('/api/prompts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, prompt: draftPrompt }) }); } catch {}
                                            handleCardClick(id);
                                        }
                                    }}
                                    className="ml-3 px-6 py-2 bg-emerald-600 rounded-full text-white hover:bg-emerald-700 transition-colors font-medium"
                                >
                                    开始生成
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Card Overlay */}
            <AnimatePresence>
                {activeCard && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
                        style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                    >
                        <motion.div
                            layoutId={`card-${activeCard}`}
                            className="w-full max-w-md rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col h-[80vh]"
                            style={{
                                background: 'rgba(255, 255, 255, 0.25)',
                                backdropFilter: 'blur(20px) saturate(180%) brightness(120%)',
                                WebkitBackdropFilter: 'blur(20px) saturate(180%) brightness(120%)',
                                border: '1px solid rgba(255, 255, 255, 0.4)',
                                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.2), inset 0 1px 1px 0 rgba(255, 255, 255, 0.5)',
                            }}
                        >
                            {/* Glass edge refraction effect */}
                            <div
                                className="absolute inset-0 rounded-3xl pointer-events-none"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.15) 100%)',
                                }}
                            />

                            <button
                                onClick={() => setActiveCard(null)}
                                className="absolute top-4 right-4 p-2 rounded-full z-10 transition-colors"
                                style={{
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    backdropFilter: 'blur(10px)',
                                    WebkitBackdropFilter: 'blur(10px)',
                                }}
                            >
                                <span className="sr-only">Close</span>
                                ✕
                            </button>

                            <div className="flex-1 overflow-y-auto space-y-4 mt-8 custom-scrollbar relative">
                                {text ? (
                                    <p className="text-lg leading-relaxed text-slate-200 whitespace-pre-wrap">{text}</p>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-pulse text-slate-500">吸气...</div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-center">
                                <button
                                    onClick={async () => { await ensureAudioContext(); await primeAudio(); setIsPlaying(!isPlaying); }}
                                    className="p-4 bg-white text-slate-900 rounded-full hover:scale-105 transition-transform"
                                >
                                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
