'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ArrowRight, X, Sparkles } from 'lucide-react';

interface CinematicIntroProps {
  forceOpen?: boolean;
  onRevealStart?: () => void;
  onClose?: () => void;
}

export default function CinematicIntro({ forceOpen, onRevealStart, onClose }: CinematicIntroProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [stage, setStage] = useState<'idle' | 'playing' | 'revealing' | 'done'>('idle');
  const [voiceSubtitle, setVoiceSubtitle] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasRevealedRef = useRef(false);

  useEffect(() => {
    if (forceOpen) {
      setIsVisible(true);
      setStage('idle');
      setVoiceSubtitle('');
      hasRevealedRef.current = false;
      return;
    }

    const hasSeen = sessionStorage.getItem('fmb_cinematic_intro_seen');
    if (!hasSeen) {
      setIsVisible(true);
      setStage('idle');
      hasRevealedRef.current = false;
    }
  }, [forceOpen]);

  const handleStart = () => {
    if (stage !== 'idle') return;
    setStage('playing');

    try {
      const audio = new Audio('/fmb-welcome.m4a');
      audioRef.current = audio;

      audio.onerror = () => {
        const fallbackAudio = new Audio('/fmb-welcome.wav');
        audioRef.current = fallbackAudio;
        fallbackAudio.play().catch((e) => console.log('Audio fallback error:', e));
      };

      audio.play().catch((e) => {
        console.log('Audio autoplay prevented:', e);
      });

      // Synchronize natural female voice line display (~0.6s)
      setTimeout(() => {
        setVoiceSubtitle('« Bienvenue chez FMB Expérience. »');
      }, 600);

      // When the audio finishes, launch the theatrical aperture reveal
      audio.onended = () => {
        startCinematicReveal();
      };

      // Fallback timer based on audio duration (3.9s)
      setTimeout(() => {
        if (!hasRevealedRef.current) {
          startCinematicReveal();
        }
      }, 4100);
    } catch (err) {
      console.error(err);
      startCinematicReveal();
    }
  };

  const startCinematicReveal = () => {
    if (hasRevealedRef.current) return;
    hasRevealedRef.current = true;
    setStage('revealing');
    if (onRevealStart) onRevealStart();
    sessionStorage.setItem('fmb_cinematic_intro_seen', 'true');

    // Complete transition after the theatrical curtains have fully opened
    setTimeout(() => {
      setStage('done');
      setIsVisible(false);
      if (onClose) onClose();
    }, 1350);
  };

  const handleSkip = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    startCinematicReveal();
  };

  if (!isVisible || stage === 'done') return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden pointer-events-auto">
      
      {/* ============================================================ */}
      {/* CINEMATIC APERTURE CURTAIN 1: TOP HALF                      */}
      {/* ============================================================ */}
      <div 
        className={`absolute top-0 left-0 right-0 h-1/2 bg-[#030306] border-b border-pink-500/40 z-20 transition-all ${
          stage === 'revealing' ? 'animate-curtain-top shadow-[0_10px_40px_rgba(219,39,119,0.7)]' : ''
        }`}
      >
        {/* Ambient Top Nebula */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[70vw] h-[50vh] rounded-full bg-purple-600/25 blur-[120px]"></div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CINEMATIC APERTURE CURTAIN 2: BOTTOM HALF                   */}
      {/* ============================================================ */}
      <div 
        className={`absolute bottom-0 left-0 right-0 h-1/2 bg-[#030306] border-t border-purple-500/40 z-20 transition-all ${
          stage === 'revealing' ? 'animate-curtain-bottom shadow-[0_-10px_40px_rgba(147,51,234,0.7)]' : ''
        }`}
      >
        {/* Ambient Bottom Nebula */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-50">
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[70vw] h-[50vh] rounded-full bg-pink-600/25 blur-[120px]"></div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SHOCKWAVE & LENS FLARE (Triggers on Reveal)                  */}
      {/* ============================================================ */}
      {stage === 'revealing' && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
          {/* Anamorphic Horizontal Lens Flare Beam */}
          <div className="absolute w-[120vw] h-8 bg-gradient-to-r from-transparent via-white to-transparent blur-[2px] animate-lens-flare"></div>
          <div className="absolute w-[120vw] h-2 bg-gradient-to-r from-purple-400 via-pink-300 to-orange-400 blur-sm animate-lens-flare"></div>

          {/* Expanding Circular Shockwave */}
          <div className="absolute w-64 h-64 rounded-full border border-pink-400 shadow-[0_0_50px_rgba(219,39,119,0.8)] animate-shockwave"></div>
        </div>
      )}

      {/* ============================================================ */}
      {/* FOREGROUND CONTENT LAYER (Fades / Scales away on reveal)    */}
      {/* ============================================================ */}
      <div 
        className={`relative z-30 w-full h-full flex flex-col items-center justify-center px-6 transition-all duration-700 ${
          stage === 'revealing' 
            ? 'opacity-0 scale-125 filter blur-md' 
            : 'opacity-100 scale-100'
        }`}
      >
        {/* Skip button in top right */}
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-6 right-6 z-40 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white text-xs font-mono uppercase tracking-widest transition-all duration-300 cursor-pointer"
        >
          <span>Passer</span>
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Central Brand Emblem */}
        <div className="max-w-xl mx-auto text-center flex flex-col items-center">
          
          {/* Subtle Protocol Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono tracking-widest text-zinc-400 uppercase mb-8">
            <span className={`w-2 h-2 rounded-full ${
              stage === 'playing' ? 'bg-pink-500 animate-ping' : 'bg-purple-400'
            }`}></span>
            <span>{stage === 'playing' ? 'TRANSMISSION IMMERSIVE' : 'IMMERSION FMB EXPÉRIENCE'}</span>
          </div>

          {/* Brand Title */}
          <div className="relative mb-3">
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-[0.22em] bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(219,39,119,0.55)]">
              FMB EXPÉRIENCE
            </h1>
            <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.38em] text-white/50 mt-3">
              L'Élite des Événements & Séjours Privatisés
            </p>
          </div>

          {/* State 1: Ready to Launch */}
          {stage === 'idle' ? (
            <div className="mt-10 flex flex-col items-center space-y-4 animate-fade-in">
              <button
                type="button"
                onClick={handleStart}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 sm:px-10 sm:py-5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-500 hover:via-pink-500 hover:to-orange-400 text-white font-extrabold text-sm sm:text-base uppercase tracking-widest shadow-[0_0_35px_rgba(219,39,119,0.5)] hover:shadow-[0_0_60px_rgba(219,39,119,0.75)] transition-all duration-300 active:scale-95 cursor-pointer"
              >
                <Volume2 className="w-5 h-5 text-white animate-pulse" />
                <span>Entrer dans l'expérience</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <span className="text-[10px] font-mono text-zinc-500 tracking-wider">
                ✦ EXPÉRIENCE IMMERSIVE HAUT DE GAMME
              </span>
            </div>
          ) : (
            /* State 2: Natural Female Voice Transmission */
            <div className="mt-10 flex flex-col items-center space-y-6 animate-fade-in">
              
              {/* Luxury Audio Equalizer Waveform */}
              <div className="flex items-center gap-1.5 h-12">
                {[35, 65, 45, 85, 95, 70, 100, 75, 90, 50, 80, 60, 40].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-gradient-to-t from-purple-500 via-pink-500 to-orange-400 shadow-[0_0_10px_rgba(219,39,119,0.5)]"
                    style={{
                      height: `${h}%`,
                      animation: `pulse ${0.45 + (i % 4) * 0.12}s ease-in-out infinite alternate`,
                    }}
                  />
                ))}
              </div>

              {/* Subtitle with Female Voice Line */}
              <div className="min-h-[36px] flex items-center justify-center">
                {voiceSubtitle ? (
                  <p className="text-xl sm:text-2xl md:text-3xl font-black italic tracking-wide text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.8)] animate-fade-in">
                    {voiceSubtitle}
                  </p>
                ) : (
                  <p className="text-xs font-mono text-zinc-400 tracking-widest uppercase animate-pulse">
                    Ouverture de la fréquence...
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 text-[10px] font-mono text-pink-400/90 tracking-widest uppercase">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>RÉVÉLATION DE L'UNIVERS EN COURS</span>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
