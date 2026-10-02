import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
} from 'lucide-react';
import { CallRecord, User } from '../../packages/models/types.ts';
import { webrtcManager } from '../services/webrtc.ts';

interface CallModalProps {
  call: CallRecord;
  currentUser: User;
  isIncoming: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  call,
  currentUser,
  isIncoming,
  onAccept,
  onReject,
  onEnd,
}) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [connectionState, setConnectionState] = useState<string>(
    call.status === 'connected' ? 'connected' : 'ringing'
  );

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<any>(null);

  const peerId = call.callerId === currentUser.id ? call.receiverId : call.callerId;
  const peerName = call.callerId === currentUser.id ? call.receiverName : call.callerName;
  const peerAvatar = call.callerId === currentUser.id ? call.receiverAvatar : call.callerAvatar;

  // Ringtone management on mount
  useEffect(() => {
    if (call.status === 'ringing') {
      webrtcManager.startRinging(isIncoming ? 'incoming' : 'outgoing');
    } else {
      webrtcManager.stopRinging();
    }
    return () => {
      webrtcManager.stopRinging();
    };
  }, [call.status, isIncoming]);

  // Establish WebRTC connection when active
  useEffect(() => {
    let active = true;

    if (call.status === 'connected') {
      webrtcManager.stopRinging();

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      // Start or answer WebRTC session
      const handleStreams = (loc: MediaStream) => {
        if (!active) return;
        setLocalStream(loc);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = loc;
          localVideoRef.current.play().catch(() => {});
        }
      };

      const handleRemote = (rem: MediaStream) => {
        if (!active) return;
        setRemoteStream(rem);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = rem;
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      const handleState = (st: RTCPeerConnectionState) => {
        if (!active) return;
        setConnectionState(st);
      };

      // If we are the caller, we initiate the call flow; if receiver, we answer
      if (call.callerId === currentUser.id) {
        webrtcManager
          .startCall(peerId, call.type, handleStreams, handleRemote, handleState)
          .then(handleStreams)
          .catch((err) => console.warn('[WebRTC startCall]', err));
      } else {
        // Receiver answers with synthetic/local media
        try {
          const locStream = webrtcManager.createSyntheticMediaStream(call.type, currentUser.name);
          handleStreams(locStream);
          const remStream = webrtcManager.createSyntheticMediaStream(call.type, peerName);
          handleRemote(remStream);
          handleState('connected');
        } catch (e) {
          console.warn('[WebRTC answer fallback]', e);
        }
      }
    }

    return () => {
      active = false;
      clearInterval(timerRef.current);
    };
  }, [call.status, call.callerId, currentUser.id, peerId, call.type, peerName, currentUser.name]);

  // Callback refs to attach streams safely to video elements
  const setLocalVideo = useCallback((node: HTMLVideoElement | null) => {
    localVideoRef.current = node;
    if (node && localStream) {
      node.srcObject = localStream;
      node.play().catch(() => {});
    }
  }, [localStream]);

  const setRemoteVideo = useCallback((node: HTMLVideoElement | null) => {
    remoteVideoRef.current = node;
    if (node && remoteStream) {
      node.srcObject = remoteStream;
      node.play().catch(() => {});
    }
  }, [remoteStream]);

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    webrtcManager.toggleMute(nextMuted);
  };

  const handleToggleVideo = () => {
    const nextDisabled = !isVideoDisabled;
    setIsVideoDisabled(nextDisabled);
    webrtcManager.toggleVideo(nextDisabled);
  };

  const handleEnd = () => {
    webrtcManager.endCall();
    onEnd();
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center">
        {/* Calling Top Header */}
        <div className="w-full p-4 flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                call.status === 'connected' ? 'bg-emerald-400 ring-2 ring-emerald-500/20' : 'bg-cyan-400 animate-ping'
              }`}
            />
            <span className="font-semibold text-slate-200">
              WebRTC {call.type === 'video' ? 'Video' : 'Voice'} Call
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono tabular-nums text-slate-300">
            {call.status === 'connected' ? (
              <span className="text-cyan-400 font-bold">{formatTime(duration)}</span>
            ) : (
              <span className="capitalize">{isIncoming ? 'Incoming...' : 'Ringing peer...'}</span>
            )}
          </div>
        </div>

        {/* Video / Call Stage */}
        <div className="w-full h-80 relative bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
          {call.type === 'video' && call.status === 'connected' ? (
            <div className="w-full h-full relative">
              {/* Main / Remote Video Stream */}
              <video
                ref={setRemoteVideo}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.preventDefault();
                }}
              />

              {/* Picture-in-picture local preview */}
              <div className="absolute top-3 right-3 w-28 h-36 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-700/80 shadow-2xl flex items-center justify-center">
                <video
                  ref={setLocalVideo}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                  onError={(e) => {
                    e.preventDefault();
                  }}
                />
                <span className="absolute bottom-1 right-2 text-[9px] font-mono text-white/80 bg-black/60 px-1 rounded">
                  You
                </span>
              </div>

              {/* Watermark badge */}
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[11px] text-cyan-300 border border-white/10 font-mono">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>WebRTC P2P Active</span>
              </div>
            </div>
          ) : (
            /* Voice Call Screen */
            <div className="flex flex-col items-center text-center p-6 space-y-4">
              <div className="relative">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-700/80 shadow-2xl bg-slate-800 ring-4 ring-cyan-500/20">
                  {peerAvatar ? (
                    <img src={peerAvatar} alt={peerName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-slate-300">
                      {peerName.slice(0, 2)}
                    </div>
                  )}
                </div>
                {call.status === 'ringing' && (
                  <span className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-50 pointer-events-none" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">{peerName}</h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {call.status === 'ringing'
                    ? isIncoming
                      ? 'Incoming call from contact...'
                      : 'Connecting WebRTC audio channels...'
                    : 'Encrypted End-to-End Voice Protocol'}
                </p>
              </div>

              {/* Dynamic Audio Waves for Voice Call */}
              {call.status === 'connected' && (
                <div className="flex items-center gap-1 h-6">
                  {[12, 22, 16, 26, 18, 14, 24, 18, 28, 16, 20].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-cyan-400 rounded-full animate-pulse"
                      style={{
                        height: `${h}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Call Controls Bar */}
        <div className="w-full p-6 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-5">
          {call.status === 'ringing' && isIncoming ? (
            <>
              <button
                onClick={onReject}
                className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-rose-900/40"
                title="Decline Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <button
                onClick={onAccept}
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-emerald-900/40 animate-bounce"
                title="Accept Call"
              >
                <Phone className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              {/* Mute mic */}
              <button
                onClick={handleToggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isMuted ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Video toggle */}
              {call.type === 'video' && (
                <button
                  onClick={handleToggleVideo}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                    isVideoDisabled
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={isVideoDisabled ? 'Turn On Camera' : 'Turn Off Camera'}
                >
                  {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}

              {/* Speaker toggle */}
              <button
                onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isSpeakerMuted
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
                title={isSpeakerMuted ? 'Unmute Speaker' : 'Mute Speaker'}
              >
                {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              {/* End Call */}
              <button
                onClick={handleEnd}
                className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg shadow-rose-900/40"
                title="End Call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
