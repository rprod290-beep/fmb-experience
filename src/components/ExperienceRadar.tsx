'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Event } from '@/lib/supabase';
import { 
  Radar as RadarIcon, 
  MapPin, 
  Music, 
  Plane, 
  Sparkles, 
  ArrowRight, 
  Radio, 
  Crosshair, 
  Calendar, 
  CheckCircle2, 
  Lock,
} from 'lucide-react';

interface ExperienceRadarProps {
  events: Event[];
  activeAtmosphere: 'all' | 'party' | 'trip';
  onAtmosphereChange?: (atmosphere: 'all' | 'party' | 'trip') => void;
}

interface RadarBlip {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  category: 'party' | 'trip' | 'teaser';
  coords: string;
  distance: string;
  status: 'active' | 'sold_out' | 'teaser';
  statusLabel: string;
  x: number; // percentage in radar space 0-100
  y: number; // percentage in radar space 0-100
  slug?: string;
  date?: string;
  endDate?: string | null;
  highlights: string[];
}

export default function ExperienceRadar({
  events,
  activeAtmosphere,
  onAtmosphereChange,
}: ExperienceRadarProps) {
  // Convert live events into radar blips + curated teaser coordinates
  const blips: RadarBlip[] = useMemo(() => {
    const list: RadarBlip[] = [];

    // 1. Soirée(s) from DB
    const partyEvents = events.filter(e => e.status === 'upcoming' && e.category !== 'trip');
    if (partyEvents.length > 0) {
      const p = partyEvents[0];
      list.push({
        id: `party-${p.id}`,
        title: p.title,
        subtitle: p.subtitle || 'Soirée Privée & Line-up DJ',
        location: 'Lieu Secret • Île-de-France (dévoilé aux membres)',
        category: 'party',
        coords: '48°51\'24"N 2°21\'07"E',
        distance: 'Paris Centre (Zone 1)',
        status: p.status === 'sold_out' ? 'sold_out' : 'active',
        statusLabel: p.status === 'sold_out' ? 'Complet' : 'Inscriptions Ouvertes',
        x: 48,
        y: 42,
        slug: p.slug,
        date: p.event_date,
        endDate: p.end_date,
        highlights: ['Accès QR Code Sécurisé', 'Lieu d\'exception privatisé', 'Line-up DJs & Bar'],
      });
    } else {
      list.push({
        id: 'party-default',
        title: 'FMB Private Night • Next Session',
        subtitle: 'Expérience Nocturne & Clubbing Privatisé',
        location: 'Lieu Secret • Île-de-France',
        category: 'party',
        coords: '48°51\'24"N 2°21\'07"E',
        distance: 'Paris Centre (Zone 1)',
        status: 'teaser',
        statusLabel: 'Programmation en cours',
        x: 48,
        y: 42,
        highlights: ['Accès exclusif sur réservation', 'Cadre confidentiel', 'Ambiance sonore premium'],
      });
    }

    // 2. Voyage(s) from DB
    const tripEvents = events.filter(e => e.status === 'upcoming' && e.category === 'trip');
    if (tripEvents.length > 0) {
      const t = tripEvents[0];
      list.push({
        id: `trip-${t.id}`,
        title: t.title,
        subtitle: t.subtitle || 'Séjour Cottage & Domaine Privatisé',
        location: t.address || 'Domaine Center Parcs • Les Hauts de Bruyères (Sologne)',
        category: 'trip',
        coords: '47°38\'12"N 1°52\'45"E',
        distance: '175 KM de Paris',
        status: t.status === 'sold_out' ? 'sold_out' : 'active',
        statusLabel: t.status === 'sold_out' ? 'Complet' : 'Cottages Disponibles',
        x: 36,
        y: 72,
        slug: t.slug,
        date: t.event_date,
        endDate: t.end_date,
        highlights: ['Cottages privatifs tout confort', 'Espace Aquamundo & Nature', 'Paiement sécurisé ou Virement'],
      });
    } else {
      list.push({
        id: 'trip-default',
        title: 'FMB Escape • Évasion Domaine Sauvage',
        subtitle: 'Séjour Cottages & Détente entre amis',
        location: 'Sologne / Région Centre',
        category: 'trip',
        coords: '47°38\'12"N 1°52\'45"E',
        distance: '175 KM de Paris',
        status: 'teaser',
        statusLabel: 'Bientôt ouvert',
        x: 36,
        y: 72,
        highlights: ['Hébergement privatisé', 'Accès nature & activités', 'Nombre de places limité'],
      });
    }

    // 3. Teaser: Grand Sud / Riviera
    list.push({
      id: 'teaser-sud',
      title: 'FMB Summer Villa • French Riviera',
      subtitle: 'Séjour Villa d\'Architecte & Piscine Infinity',
      location: 'Côte d\'Azur • Domaine Privé',
      category: 'teaser',
      coords: '43°33\'05"N 7°00\'46"E',
      distance: '820 KM de Paris',
      status: 'teaser',
      statusLabel: 'Teaser Saison Estivale',
      x: 76,
      y: 78,
      highlights: ['Villa avec piscine à débordement', 'Sunset sessions & DJ set', 'Capacité ultra confidentielle'],
    });

    // 4. Secret After / Underground
    list.push({
      id: 'teaser-rooftop',
      title: 'FMB Sky Lounge • Secret Rooftop',
      subtitle: 'Sunset Cocktails & Panorama Capitale',
      location: 'Grand Paris Ouest • Vue Imprenable',
      category: 'party',
      coords: '48°53\'30"N 2°14\'50"E',
      distance: '12 KM de Paris',
      status: 'teaser',
      statusLabel: 'En préparation',
      x: 64,
      y: 28,
      highlights: ['Accès sur mot de passe', 'Bar à cocktails signatures', 'Vue panoramique 360°'],
    });

    return list;
  }, [events]);

  // Selected blip state
  const [selectedId, setSelectedId] = useState<string>(() => {
    // Default to the first blip matching atmosphere or first available
    const firstParty = blips.find(b => b.category === 'party');
    return firstParty?.id || blips[0].id;
  });

  const selectedBlip = useMemo(() => {
    return blips.find(b => b.id === selectedId) || blips[0];
  }, [blips, selectedId]);

  const formatDateShort = (dateString?: string, endDateString?: string | null) => {
    if (!dateString) return null;
    const start = new Date(dateString);
    if (!endDateString) {
      return start.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Europe/Paris'
      });
    }
    const end = new Date(endDateString);
    return `Du ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <section className="relative rounded-3xl overflow-hidden glass border border-white/10 p-5 sm:p-8 lg:p-10 shadow-[0_0_50px_rgba(147,51,234,0.12)]">
      {/* Background cyber grid effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Header HUD */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-mono">
              RADAR TACTIQUE • SYSTÈME EN DIRECT
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2.5">
            <RadarIcon className="w-6 h-6 text-pink-500 animate-spin" style={{ animationDuration: '14s' }} />
            Radar des Destinations & Expériences
          </h3>
          <p className="text-xs sm:text-sm text-white/50 max-w-2xl">
            Explorez les coordonnées de nos événements et séjours. Cliquez sur une balise du scanner pour afficher la fiche de mission et débloquer votre accès.
          </p>
        </div>

        {/* Telemetry pill */}
        <div className="flex items-center gap-2 bg-black/60 border border-white/10 rounded-2xl px-4 py-2 font-mono text-[11px] text-zinc-400 shadow-inner">
          <Radio className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
          <span>{blips.length} COORDONNÉES EN LIGNE</span>
        </div>
      </div>

      {/* Main Grid: Radar Screen (Left) + HUD Target Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* ============================================================ */}
        {/* 1. THE RADAR CIRCLE VISUALIZER (7 cols on lg)                */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full max-w-[420px] aspect-square rounded-full border border-purple-500/20 bg-[#07070f]/90 p-4 shadow-[0_0_60px_rgba(147,51,234,0.15)] flex items-center justify-center overflow-hidden group">
            
            {/* Concentric Range Rings */}
            <div className="absolute inset-4 rounded-full border border-white/10 pointer-events-none"></div>
            <div className="absolute inset-16 rounded-full border border-dashed border-white/10 pointer-events-none"></div>
            <div className="absolute inset-28 rounded-full border border-white/5 pointer-events-none"></div>
            <div className="absolute inset-40 rounded-full border border-purple-500/10 pointer-events-none"></div>

            {/* Crosshairs & Axis lines */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="h-full w-[1px] bg-gradient-to-b from-transparent via-white/15 to-transparent"></div>
            </div>

            {/* Range markers */}
            <span className="absolute top-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-white/30 tracking-widest pointer-events-none">
              N • 300 KM
            </span>
            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[9px] font-mono text-white/30 tracking-widest pointer-events-none">
              S • 150 KM
            </span>
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-mono text-white/30 tracking-widest pointer-events-none">
              E • 50 KM
            </span>
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[9px] font-mono text-white/30 tracking-widest pointer-events-none">
              W
            </span>

            {/* Center Core Beacon */}
            <div className="absolute z-10 w-4 h-4 rounded-full bg-pink-500/30 border border-pink-400 flex items-center justify-center shadow-[0_0_15px_rgba(219,39,119,0.8)]">
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>

            {/* Rotating Radar Sweep Line */}
            <div className="absolute inset-4 pointer-events-none animate-radar-sweep">
              <div 
                className="w-1/2 h-1/2 origin-bottom-right"
                style={{
                  background: 'conic-gradient(from 180deg at 100% 100%, rgba(219, 39, 119, 0.28) 0deg, rgba(147, 51, 234, 0.12) 40deg, transparent 75deg)',
                }}
              />
              {/* Sweep Line highlight */}
              <div className="absolute top-1/2 left-1/2 w-1/2 h-[1.5px] bg-gradient-to-r from-pink-400 via-purple-300 to-transparent origin-left shadow-[0_0_8px_rgba(219,39,119,0.9)]"></div>
            </div>

            {/* ============================================================ */}
            {/* RADAR INTERACTIVE BLIPS                                       */}
            {/* ============================================================ */}
            {blips.map((blip) => {
              const isSelected = selectedBlip.id === blip.id;
              
              // Filter dimming based on atmosphere
              const isDimmed =
                (activeAtmosphere === 'party' && blip.category === 'trip') ||
                (activeAtmosphere === 'trip' && blip.category === 'party');

              const isParty = blip.category === 'party';
              const isTrip = blip.category === 'trip';

              return (
                <button
                  key={blip.id}
                  type="button"
                  onClick={() => setSelectedId(blip.id)}
                  style={{
                    left: `${blip.x}%`,
                    top: `${blip.y}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer p-2 group/blip transition-all duration-300 ${
                    isDimmed ? 'opacity-25 hover:opacity-75 scale-90' : 'opacity-100 scale-100'
                  }`}
                  aria-label={`Sélectionner ${blip.title}`}
                >
                  {/* Ping Ring Effect */}
                  <span 
                    className={`absolute inset-0 rounded-full animate-radar-blip-ping pointer-events-none ${
                      isParty 
                        ? 'bg-purple-500/40' 
                        : isTrip 
                          ? 'bg-emerald-400/40' 
                          : 'bg-amber-400/40'
                    }`} 
                  />

                  {/* Lock-on brackets if selected */}
                  {isSelected && (
                    <div className="absolute -inset-2 pointer-events-none animate-pulse">
                      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-pink-400"></div>
                      <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-pink-400"></div>
                      <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-pink-400"></div>
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-pink-400"></div>
                    </div>
                  )}

                  {/* Blip Dot */}
                  <div className={`relative flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-300 ${
                    isSelected
                      ? 'bg-white scale-125 border-white shadow-[0_0_20px_#fff]'
                      : isParty
                        ? 'bg-purple-600 border-purple-300 shadow-[0_0_12px_rgba(147,51,234,0.8)]'
                        : isTrip
                          ? 'bg-emerald-500 border-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                          : 'bg-amber-500 border-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.8)]'
                  }`}>
                    {isParty ? (
                      <Music className={`w-2.5 h-2.5 ${isSelected ? 'text-black' : 'text-white'}`} />
                    ) : isTrip ? (
                      <Plane className={`w-2.5 h-2.5 ${isSelected ? 'text-black' : 'text-white'}`} />
                    ) : (
                      <Sparkles className={`w-2.5 h-2.5 ${isSelected ? 'text-black' : 'text-white'}`} />
                    )}
                  </div>

                  {/* Floating label on hover or if selected */}
                  <div className={`absolute left-1/2 -translate-x-1/2 top-full mt-1.5 whitespace-nowrap pointer-events-none transition-all duration-200 ${
                    isSelected ? 'opacity-100 translate-y-0 scale-100 z-30' : 'opacity-0 -translate-y-1 scale-90 group-hover/blip:opacity-100 group-hover/blip:translate-y-0'
                  }`}>
                    <span className="px-2 py-0.5 rounded-md bg-black/90 border border-white/20 text-[9px] font-black uppercase tracking-wider text-white shadow-xl backdrop-blur-md">
                      {blip.distance}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Radar Coordinates HUD Footer */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 border border-white/10 font-mono text-[9px] text-zinc-400 tracking-wider flex items-center gap-1.5 backdrop-blur-md">
              <Crosshair className="w-3 h-3 text-pink-400" />
              <span>FR-IDF // LAT 48.85 • LON 2.35</span>
            </div>
          </div>

          {/* Quick interactive blip pills for mobile / direct select */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            {blips.map((blip) => {
              const isSelected = selectedBlip.id === blip.id;
              const isParty = blip.category === 'party';
              const isTrip = blip.category === 'trip';

              return (
                <button
                  key={blip.id}
                  type="button"
                  onClick={() => setSelectedId(blip.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-200 cursor-pointer border ${
                    isSelected
                      ? 'bg-white/15 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.2)] scale-105'
                      : 'bg-black/40 border-white/5 text-white/50 hover:text-white hover:border-white/20'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isParty ? 'bg-purple-400' : isTrip ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}></span>
                  <span>{blip.distance}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. HUD TARGET TELEMETRY CARD (5 cols on lg)                  */}
        {/* ============================================================ */}
        <div className="lg:col-span-5">
          <div className="relative rounded-3xl p-6 sm:p-7 border border-white/10 bg-black/60 backdrop-blur-xl shadow-2xl space-y-6">
            
            {/* Top Telemetry Bar */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-0.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-pink-400 flex items-center gap-1.5 font-bold">
                  <Crosshair className="w-3 h-3" />
                  CIBLE VERROUILLÉE // {selectedBlip.coords}
                </span>
                <p className="text-[11px] font-mono text-zinc-400">
                  SECTEUR : {selectedBlip.distance}
                </p>
              </div>

              {/* Status Badge */}
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border font-mono ${
                selectedBlip.status === 'active'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : selectedBlip.status === 'sold_out'
                    ? 'bg-red-500/20 border-red-500/30 text-red-400'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              }`}>
                {selectedBlip.statusLabel}
              </span>
            </div>

            {/* Event Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {selectedBlip.category === 'party' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Music className="w-3 h-3" /> Soirée Privée
                  </span>
                ) : selectedBlip.category === 'trip' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Plane className="w-3 h-3" /> Voyage & Cottage
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Sparkles className="w-3 h-3" /> Expérience Mystère
                  </span>
                )}
              </div>

              <h4 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-tight">
                {selectedBlip.title}
              </h4>
              <p className="text-xs sm:text-sm text-pink-400/90 font-semibold tracking-wide">
                {selectedBlip.subtitle}
              </p>
            </div>

            {/* Details & Location */}
            <div className="space-y-2.5 bg-white/[0.02] p-4 rounded-2xl border border-white/5 text-xs text-white/70">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" />
                <span className="font-medium text-white/90">{selectedBlip.location}</span>
              </div>
              
              {selectedBlip.date && (
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span className="font-medium text-white/90">
                    {formatDateShort(selectedBlip.date, selectedBlip.endDate)}
                  </span>
                </div>
              )}
            </div>

            {/* Highlights List */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block">
                CARACTÉRISTIQUES DE LA MISSION
              </span>
              <ul className="space-y-1.5">
                {selectedBlip.highlights.map((h, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-white/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA / Action Button */}
            <div className="pt-2">
              {selectedBlip.slug ? (
                <Link
                  href={`/evenements/${selectedBlip.slug}`}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-500 hover:via-pink-500 hover:to-orange-400 text-white font-extrabold text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_25px_rgba(219,39,119,0.35)] hover:shadow-[0_0_35px_rgba(219,39,119,0.5)] transition-all duration-300 active:scale-[0.98]"
                >
                  <span>Accéder à l'expérience</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/60 font-mono text-xs uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ouverture des accès imminente</span>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
