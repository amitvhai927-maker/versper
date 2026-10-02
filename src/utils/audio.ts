/**
 * Vesper Messenger - Universal Web Audio & Media Generator
 * Generates valid PCM WAV data URIs that work in 100% of browsers without network requests,
 * preventing 'Failed to load because no supported source was found' codec/CORS errors.
 */

export function createSynthesizedVoiceWav(durationSeconds = 3, frequency = 440): string {
  const sampleRate = 8000; // 8kHz telephony voice quality
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + numSamples * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 is PCM)
  view.setUint16(20, 1, true);
  // channel count (1 for mono)
  view.setUint16(22, 1, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, numSamples * 2, true);

  // Write speech-like modulated tone samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Harmonic voice modulation (fundamental + harmonics with natural cadence)
    const envelope = Math.sin((Math.PI * i) / numSamples); // smooth fade in & out
    const voiceMod = Math.sin(2 * Math.PI * 4 * t); // syllabic modulation
    const sample =
      envelope *
      (0.6 * Math.sin(2 * Math.PI * frequency * t) +
        0.3 * Math.sin(2 * Math.PI * frequency * 1.5 * t) +
        0.1 * voiceMod);
    const intSample = Math.max(-1, Math.min(1, sample)) * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  // Convert buffer to base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:audio/wav;base64,${base64}`;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Pre-computed standard voice message audio URI for instant zero-latency playback
export const DEFAULT_VOICE_NOTE_URI = createSynthesizedVoiceWav(3, 380);

/**
 * Safe audio player that handles unsupported source errors gracefully
 */
export function playSafeAudio(
  url: string,
  speed = 1,
  onEnded?: () => void,
  onError?: (err: any) => void
): HTMLAudioElement {
  const audio = new Audio();
  audio.playbackRate = speed;

  const cleanup = () => {
    audio.removeEventListener('ended', handleEnded);
    audio.removeEventListener('error', handleError);
  };

  const handleEnded = () => {
    cleanup();
    onEnded?.();
  };

  const handleError = (e: any) => {
    cleanup();
    console.warn('[Audio] Failed to load audio source, falling back to local synthesizer:', url);
    onError?.(e);
    // Fallback to synthesized audio
    const fallbackAudio = new Audio(DEFAULT_VOICE_NOTE_URI);
    fallbackAudio.playbackRate = speed;
    fallbackAudio.onended = () => onEnded?.();
    fallbackAudio.play().catch(() => {});
  };

  audio.addEventListener('ended', handleEnded);
  audio.addEventListener('error', handleError);

  try {
    audio.src = url || DEFAULT_VOICE_NOTE_URI;
    audio.play().catch((err) => {
      handleError(err);
    });
  } catch (err) {
    handleError(err);
  }

  return audio;
}
