import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause } from 'lucide-react';
import { createSynthesizedVoiceWav } from '../utils/audio.ts';

interface VoiceRecorderProps {
  onSendVoice: (duration: number, audioUrl: string) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoice, onCancel }) => {
  const [isRecording, setIsRecording] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformBars] = useState<number[]>(() =>
    Array.from({ length: 28 }, () => Math.floor(Math.random() * 24) + 6)
  );
  const timerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const handleStopRecording = () => {
    setIsRecording(false);
    // Generate valid universal WAV data URI matching recorded duration
    const wavUri = createSynthesizedVoiceWav(Math.max(1, seconds), 420);
    setAudioUrl(wavUri);
  };

  const handleTogglePlay = () => {
    const url = audioUrl || createSynthesizedVoiceWav(Math.max(1, seconds), 420);
    if (!audioRef.current) {
      const audio = new Audio();
      audio.src = url;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        setIsPlaying(false);
      };
      audioRef.current = audio;
    }

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        ?.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
        });
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSend = () => {
    if (isPlaying) {
      audioRef.current?.pause();
    }
    const finalUrl = audioUrl || createSynthesizedVoiceWav(Math.max(1, seconds), 420);
    onSendVoice(Math.max(1, seconds), finalUrl);
  };

  return (
    <div className="h-14 px-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4 text-slate-200 select-none">
      {/* Left: Cancel Button */}
      <button
        onClick={() => {
          if (isPlaying) audioRef.current?.pause();
          onCancel();
        }}
        className="w-9 h-9 rounded-lg hover:bg-slate-800 text-rose-400 flex items-center justify-center transition-colors"
        title="Discard Recording"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Center: Recording Status & Dynamic Waveform */}
      <div className="flex-1 flex items-center gap-3">
        <div className="flex items-center gap-2">
          {isRecording ? (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          ) : (
            <button
              onClick={handleTogglePlay}
              className="w-7 h-7 rounded-full bg-cyan-600 text-white flex items-center justify-center hover:bg-cyan-500 transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          )}
          <span className="text-xs font-mono tabular-nums text-slate-300 font-semibold min-w-[36px]">
            {formatDuration(seconds)}
          </span>
        </div>

        {/* Waveform graphic */}
        <div className="flex-1 h-8 flex items-center gap-[3px] overflow-hidden px-2">
          {waveformBars.map((height, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-300 ${
                isRecording
                  ? i % 2 === 0
                    ? 'bg-cyan-400'
                    : 'bg-cyan-600/70'
                  : 'bg-slate-600'
              }`}
              style={{
                height: isRecording ? `${Math.min(30, height + (i % 3) * 4)}px` : `${height}px`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Right: Stop / Send Controls */}
      <div className="flex items-center gap-2">
        {isRecording ? (
          <button
            onClick={handleStopRecording}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Square className="w-3.5 h-3.5 fill-current text-rose-400" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            onClick={handleSend}
            className="w-9 h-9 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg flex items-center justify-center transition-colors shadow-sm shadow-cyan-900/40"
            title="Send Voice Message"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        )}
      </div>
    </div>
  );
};
