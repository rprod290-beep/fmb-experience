'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { X, Music, Calendar, MapPin, ArrowRight } from 'lucide-react';

interface AudioContextType {
  hasEntered: 'gate' | 'entering' | 'entered' | null;
  audioPlaying: boolean;
  playAudio: () => void;
  pauseAudio: () => void;
  audioInstance: HTMLAudioElement | null;
  setHasEntered: (val: 'gate' | 'entering' | 'entered' | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [hasEntered, setHasEntered] = useState<'gate' | 'entering' | 'entered' | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Check if user already clicked Enter in this session
    const entered = sessionStorage.getItem('fmb_has_entered') === 'true';
    setHasEntered(entered ? 'entered' : 'gate');
  }, []);

  const handleEnter = () => {
    try {
      // Play intro music
      const audio = new Audio('/intro.mp3');
      audio.loop = true;
      audio.volume = 0.4;

      // Fallback if local intro.mp3 fails
      audio.addEventListener('error', () => {
        console.log("Local intro.mp3 not found, falling back to CDN track...");
        audio.src = 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3';
        audio.play().catch(err => console.error("Audio playback blocked:", err));
      });

      audio.play()
        .then(() => {
          setAudioPlaying(true);
        })
        .catch(err => {
          console.error("Audio playback blocked:", err);
        });
      
      setAudioInstance(audio);
    } catch (e) {
      console.error("Erreur d'initialisation de l'audio:", e);
    }

    setHasEntered('entering');

    // Wait 2.2s for portal stroboscope transition to finish, then unmount overlay
    setTimeout(() => {
      sessionStorage.setItem('fmb_has_entered', 'true');
      setHasEntered('entered');
    }, 2200);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioInstance) {
        audioInstance.pause();
      }
    };
  }, [audioInstance]);

  const playAudio = () => {
    if (audioInstance) {
      audioInstance.play().catch(e => console.error(e));
      setAudioPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioInstance) {
      audioInstance.pause();
      setAudioPlaying(false);
    }
  };

  // Don't render gate overlay on admin pages
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <AudioContext.Provider value={{ hasEntered, audioPlaying, playAudio, pauseAudio, audioInstance, setHasEntered }}>
      {children}

      {/* Floating Audio Controller - only if entered and not on admin pages */}
      {!isAdminPage && hasEntered === 'entered' && audioInstance && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 animate-fade-in">
          <button
            onClick={() => {
              if (audioPlaying) {
                pauseAudio();
              } else {
                playAudio();
              }
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-zinc-950/90 border border-white/10 hover:border-pink-500/30 text-white backdrop-blur-md transition-all shadow-lg text-[10px] font-black uppercase tracking-widest active:scale-95 duration-200"
          >
            {audioPlaying ? (
              <>
                <div className="flex gap-0.5 items-end h-3.5 w-4 pb-0.5">
                  <div className="w-0.5 bg-pink-500 rounded-full animate-[soundwave_0.8s_infinite_alternate]"></div>
                  <div className="w-0.5 bg-pink-400 rounded-full animate-[soundwave_0.5s_infinite_alternate_0.15s]"></div>
                  <div className="w-0.5 bg-purple-500 rounded-full animate-[soundwave_0.7s_infinite_alternate_0.3s]"></div>
                </div>
                <span>MUTE</span>
              </>
            ) : (
              <>
                <div className="flex gap-0.5 items-end h-3.5 w-4 pb-0.5">
                  <div className="w-0.5 h-1.5 bg-zinc-600 rounded-full"></div>
                  <div className="w-0.5 h-1 bg-zinc-600 rounded-full"></div>
                  <div className="w-0.5 h-2 bg-zinc-600 rounded-full"></div>
                </div>
                <span>PLAY</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Immersive Entry Gate - only on non-admin pages */}
      {!isAdminPage && hasEntered !== 'entered' && hasEntered !== null && (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050508] overflow-hidden ${
          hasEntered === 'entering' ? 'animate-portal-overlay' : ''
        }`}>
          {/* Neon background blobs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] animate-pulse"></div>
          
          <div className={`relative text-center space-y-8 z-10 p-6 max-w-sm transition-all duration-300 ${
            hasEntered === 'entering' ? 'animate-portal-logo' : ''
          }`}>
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">
                Bienvenue dans l'Univers
              </span>
              <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-white uppercase select-none animate-pulse">
                FMB<br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-transparent">EXPÉRIENCE</span>
              </h1>
              <p className="text-[11px] text-pink-400/80 uppercase tracking-widest font-black">
                Une expérience à ne pas rater
              </p>
            </div>

            <button
              onClick={handleEnter}
              className="glow-btn-primary w-full py-4 px-8 text-xs font-black uppercase tracking-widest rounded-2xl shadow-[0_0_40px_rgba(219,39,119,0.3)] transition-all transform active:scale-95 duration-300"
            >
              🔊 Activer le son & entrer
            </button>
            
            <p className="text-[9px] text-white/30 tracking-wider">
              Ce site contient des effets sonores immersifs.
            </p>
          </div>
        </div>
      )}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
