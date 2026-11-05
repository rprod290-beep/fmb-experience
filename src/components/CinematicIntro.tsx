'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Volume2, ArrowRight, X } from 'lucide-react';

interface CinematicIntroProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function CinematicIntro({ forceOpen, onClose }: CinematicIntroProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [voiceSubtitle, setVoiceSubtitle] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (forceOpen) {
      setIsVisible(true);
      setIsPlaying(false);
      setIsExiting(false);
      setVoiceSubtitle('');
      return;
    }

    // Check if intro has already been displayed in this browser session
    const hasSeen = sessionStorage.getItem('fmb_cinematic_intro_seen');
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, [forceOpen]);

  const handleStart = () => {
    if (isPlaying) return;
    setIsPlaying(true);

    try {
      const audio = new Audio('/fmb-welcome.m4a');
      audioRef.current = audio;
      
      // Fallback format if needed
      audio.onerror = () => {
        const fallbackAudio = new Audio('/fmb-welcome.wav');
        audioRef.current = fallbackAudio;
        fallbackAudio.play().catch((e) => console.log('Audio playback prevented:', e));
      };

      audio.play().catch((e) => {
        console.log('Audio autoplay prevented:', e);
      });

      // Synchronize cinematic subtitle appearance with voice onset (~0.8s)
      setTimeout(() => {
        setVoiceSubtitle('« Bienvenue chez FMB Expérience. »');
      }, 750);

      // End of transmission: trigger warp exit
      audio.onended = () => {
        triggerExit();
      };

      // Fallback exit timer if audio ends earlier/later
      setTimeout(() => {
        triggerExit();
      }, 4800);
    } catch (err) {
      console.error(err);
      triggerExit();
    }
  };

  const triggerExit = () => {
    setIsExiting(true);
    sessionStorage.setItem('fmb_cinematic_intro_seen', 'true');
    setTimeout(() => {
      setIsVisible(false);
      setIsPlaying(false);
      setIsExiting(false);
      setVoiceSubtitle('');
      if (onClose) onClose();
    }, 1100);
  };

  const handleSkip = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    triggerExit();
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#030306] overflow-hidden transition-all duration-1000 ${
        isExiting ? 'opacity-0 scale-110 pointer-events-none filter blur-sm' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Animated Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Glowing Nebulas */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70vw] h-[70vw] max-w-[700px] max-h-[700px] rounded-full blur-[140px] transition-all duration-1000 ${
          isPlaying 
            ? 'bg-gradient-to-tr from-purple-600/35 via-pink-600/35 to-orange-500/25 scale-125' 
            : 'bg-gradient-to-tr from-purple-600/20 via-pink-600/15 to-transparent scale-100'
        }`} />
        
        {/* Digital scanlines effect */}
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 3px)',
            backgroundSize: '100% 4px',
          }}
        />

        {/* Ambient radial vignette */}
        <div className="absolute inset-0 bg-radial from-transparent via-[#030306]/70 to-[#030306]"></div>
      </div>

      {/* Skip Button in Top Right */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute top-6 right-6 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white text-xs font-mono uppercase tracking-wider transition-all duration-300 cursor-pointer"
      >
        <span>Passer</span>
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Main Cinematic Content */}
      <div className="relative z-10 max-w-xl mx-auto px-6 text-center flex flex-col items-center">
        
        {/* Futuristic Protocol Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono tracking-widest text-zinc-400 uppercase mb-8">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-pink-500 animate-ping' : 'bg-purple-400'}`}></span>
          <span>{isPlaying ? 'TRANSMISSION CINÉMATIQUE' : 'IMMERSION CINÉMATIQUE'}</span>
        </div>

        {/* Big Glowing Title */}
        <div className="relative group mb-4">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-[0.2em] bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(219,39,119,0.5)]">
            FMB EXPÉRIENCE
          </h1>
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.35em] text-white/40 mt-3">
            L'Élite des Événements & Séjours Privatisés
          </p>
        </div>

        {/* State 1: Ready to Launch */}
        {!isPlaying ? (
          <div className="mt-10 flex flex-col items-center space-y-4 animate-fade-in">
            <button
              type="button"
              onClick={handleStart}
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 sm:px-10 sm:py-5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-500 hover:via-pink-500 hover:to-orange-400 text-white font-extrabold text-sm sm:text-base uppercase tracking-widest shadow-[0_0_35px_rgba(219,39,119,0.5)] hover:shadow-[0_0_55px_rgba(219,39,119,0.7)] transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <Volume2 className="w-5 h-5 text-white animate-pulse" />
              <span>Entrer dans l'expérience</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
              ✦ EXPÉRIENCE AUDIO CINÉMATIQUE & VISUELLE
            </span>
          </div>
        ) : (
          /* State 2: Cinematic Transmission Mode */
          <div className="mt-10 flex flex-col items-center space-y-6 animate-fade-in">
            
            {/* Holographic Equalizer Waveform */}
            <div className="flex items-center gap-1.5 h-12">
              {[40, 75, 50, 90, 65, 100, 70, 85, 45, 95, 60, 80, 50].map((h, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-gradient-to-t from-purple-500 via-pink-500 to-orange-400"
                  style={{
                    height: `${h}%`,
                    animation: `pulse ${0.4 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
                  }}
                />
              ))}
            </div>

            {/* Subtitle with Voice Line */}
            <div className="min-h-[32px] flex items-center justify-center">
              {voiceSubtitle ? (
                <p className="text-lg sm:text-2xl font-black italic tracking-wide text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.7)] animate-fade-in">
                  {voiceSubtitle}
                </p>
              ) : (
                <p className="text-xs font-mono text-zinc-500 tracking-widest uppercase animate-pulse">
                  Initialisation de la fréquence...
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-pink-400/80 tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>SYNCHRONISATION DU SYSTÈME</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
