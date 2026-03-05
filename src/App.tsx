import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, Play, Download, Languages, Loader2, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for Tailwind classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Header = () => (
  <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Mic className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white">ZDub</span>
      </div>
      <nav className="flex items-center gap-6">
        <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Features</a>
        <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Pricing</a>
        <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">About</a>
      </nav>
    </div>
  </header>
);

const LanguageSelector = ({ selected, onChange }: { selected: string, onChange: (lang: string) => void }) => {
  const languages = [
    { code: 'English', name: 'English', flag: '🇺🇸' },
    { code: 'Spanish', name: 'Spanish', flag: '🇪🇸' },
    { code: 'French', name: 'French', flag: '🇫🇷' },
    { code: 'German', name: 'German', flag: '🇩🇪' },
    { code: 'Hindi', name: 'Hindi', flag: '🇮🇳' },
    { code: 'Japanese', name: 'Japanese', flag: '🇯🇵' },
    { code: 'Chinese', name: 'Chinese', flag: '🇨🇳' },
    { code: 'Korean', name: 'Korean', flag: '🇰🇷' },
    { code: 'Portuguese', name: 'Portuguese', flag: '🇵🇹' },
    { code: 'Russian', name: 'Russian', flag: '🇷🇺' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code)}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left",
            selected === lang.code
              ? "bg-indigo-600/10 border-indigo-500/50 text-white shadow-[0_0_20px_rgba(79,70,229,0.15)]"
              : "bg-zinc-900/50 border-white/5 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/10"
          )}
        >
          <span className="text-xl">{lang.flag}</span>
          <span className="font-medium">{lang.name}</span>
        </button>
      ))}
    </div>
  );
};

const FileUpload = ({ onFileSelect }: { onFileSelect: (file: File) => void }) => {
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': []
    },
    maxFiles: 1
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 h-64 flex flex-col items-center justify-center text-center p-8",
        isDragActive
          ? "border-indigo-500 bg-indigo-500/10"
          : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
      )}
    >
      <input {...getInputProps()} />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-xl border border-white/5 group-hover:scale-110 transition-transform duration-300">
          <Upload className="w-8 h-8 text-indigo-500" />
        </div>
        <div>
          <p className="text-lg font-medium text-white mb-1">
            {isDragActive ? "Drop video here" : "Upload your video"}
          </p>
          <p className="text-sm text-zinc-500">
            Drag & drop or click to browse
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-600 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-white/5">
          <span>MP4, MOV, AVI</span>
          <span className="w-1 h-1 rounded-full bg-zinc-700" />
          <span>Up to 100MB</span>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState('Spanish');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dubbedAudio, setDubbedAudio] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Mute original video by default when dub is ready

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setDubbedAudio(null);
    setTranscript(null);
    setError(null);
  };

  const handleDubbing = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    const formData = new FormData();
    formData.append('video', file);
    formData.append('language', targetLang);

    try {
      const response = await fetch('/api/dub', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Dubbing failed');
      }

      const data = await response.json();
      
      // Create audio blob URL
      const audioBlob = await (await fetch(`data:audio/mp3;base64,${data.audio}`)).blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      setDubbedAudio(audioUrl);
      setTranscript(data.transcript);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current && audioRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        audioRef.current.pause();
      } else {
        videoRef.current.play();
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (videoRef.current) {
      // Only video
       if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    if (audioRef.current) audioRef.current.play();
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
  };

  const handleVideoSeek = () => {
    if (videoRef.current && audioRef.current) {
      audioRef.current.currentTime = videoRef.current.currentTime;
    }
  };
  
  const handleDownload = () => {
    if (dubbedAudio) {
      const a = document.createElement('a');
      a.href = dubbedAudio;
      a.download = `dubbed_audio_${targetLang}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleMergeAndDownload = async () => {
    if (!videoRef.current || !dubbedAudio) return;
    
    setIsProcessing(true);
    const video = videoRef.current;
    const audio = new Audio(dubbedAudio);
    
    // Wait for audio to load
    await new Promise((resolve) => {
      audio.onloadeddata = resolve;
      audio.load();
    });

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    // Create streams
    const stream = canvas.captureStream(30); // 30 FPS
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaElementSource(audio);
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(dest);
    
    // Add audio track to stream
    const audioTrack = dest.stream.getAudioTracks()[0];
    stream.addTrack(audioTrack);

    const originalMuted = video.muted;
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9,opus'
    });
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dubbed_video_${targetLang}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setIsProcessing(false);
      
      // Cleanup
      audioCtx.close();
      video.muted = originalMuted; // Restore mute state
    };

    // Start recording
    video.muted = true; // Mute video during recording
    
    try {
      mediaRecorder.start();
      video.currentTime = 0;
      audio.currentTime = 0;
      
      await Promise.all([video.play(), audio.play()]);

      // Draw loop
      const draw = () => {
        if (video.paused || video.ended) {
          mediaRecorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(draw);
      };
      draw();
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      video.muted = originalMuted;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-indigo-500/30">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        
        {/* Hero Section */}
        <section className="text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium uppercase tracking-wider"
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            AI-Powered Dubbing
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent"
          >
            Break Language Barriers <br />
            <span className="text-indigo-500">Instantly.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed"
          >
            Upload any video, select a language, and let our AI generate a professional dub 
            that matches the original emotion and timing.
          </motion.p>
        </section>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Step 1: Upload */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">1. Upload Video</h2>
                {file && (
                  <button 
                    onClick={() => {
                      setFile(null);
                      setDubbedAudio(null);
                      setTranscript(null);
                      setError(null);
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              {!file ? (
                <FileUpload onFileSelect={handleFileSelect} />
              ) : (
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                    <Play className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{file.name}</p>
                    <p className="text-xs text-zinc-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
              )}
            </section>

            {/* Step 2: Language */}
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">2. Select Language</h2>
              <LanguageSelector selected={targetLang} onChange={setTargetLang} />
            </section>

            {/* Action Button */}
            <button
              onClick={handleDubbing}
              disabled={!file || isProcessing}
              className={cn(
                "w-full py-4 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center gap-2",
                !file || isProcessing
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Start Dubbing
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-7 space-y-8">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">3. Preview & Download</h2>
            
            <div className="relative aspect-video bg-zinc-900 rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
              {file ? (
                <>
                  <video
                    ref={videoRef}
                    src={URL.createObjectURL(file)}
                    className="w-full h-full object-cover"
                    onPlay={handleVideoPlay}
                    onPause={handleVideoPause}
                    onSeeked={handleVideoSeek}
                    muted={isMuted} // Mute original if dubbed audio is playing
                    controls
                    crossOrigin="anonymous"
                  />
                  {dubbedAudio && (
                    <audio
                      ref={audioRef}
                      src={dubbedAudio}
                      className="hidden"
                      crossOrigin="anonymous"
                    />
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600">
                  <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                    <Play className="w-6 h-6 ml-1 opacity-50" />
                  </div>
                  <p>Video preview will appear here</p>
                </div>
              )}
            </div>

            {/* Controls & Transcript */}
            <AnimatePresence>
              {dubbedAudio && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between gap-4 p-4 bg-zinc-900/50 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        title={isMuted ? "Unmute Original" : "Mute Original"}
                      >
                        {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-zinc-400" />}
                      </button>
                      <span className="text-sm text-zinc-400">
                        {isMuted ? "Original Audio Muted" : "Original Audio Playing"}
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg font-medium hover:bg-zinc-700 transition-colors border border-white/10"
                      >
                        <Download className="w-4 h-4" />
                        Audio Only
                      </button>
                      <button
                        onClick={handleMergeAndDownload}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 transition-colors"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        Dubbed Video
                      </button>
                    </div>
                  </div>

                  {transcript && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-zinc-400">Generated Transcript</h3>
                      <div className="p-4 bg-zinc-900/30 rounded-2xl border border-white/5 max-h-48 overflow-y-auto text-sm text-zinc-300 leading-relaxed">
                        {transcript}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
