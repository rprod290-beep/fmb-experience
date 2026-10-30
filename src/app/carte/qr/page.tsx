'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  Sparkles, 
  Sun, 
  Moon, 
  ExternalLink, 
  QrCode, 
  Share2,
  Smartphone
} from 'lucide-react';

export default function ServerQrPage() {
  const [copied, setCopied] = useState(false);
  const [highContrast, setHighContrast] = useState(true);
  const [carteUrl, setCarteUrl] = useState('https://fmb-experience.com/carte');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setCarteUrl(`${origin}/carte`);
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(carteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Carte des Boissons - FMB Expérience',
          text: 'Découvrez la carte des consommations pour votre soirée FMB :',
          url: carteUrl,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      handleCopy();
    }
  };

  // QR Code URL via QRServer API (Size 500x500 for ultra-sharp camera detection)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=20&data=${encodeURIComponent(carteUrl)}`;

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors duration-300 ${
      highContrast 
        ? 'bg-black text-white' 
        : 'bg-zinc-950 text-zinc-100'
    } selection:bg-pink-500 selection:text-white`}>
      
      {/* Top Header */}
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/10 bg-black/40 backdrop-blur-lg">
        <Link 
          href="/carte" 
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voir la Carte</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Toggle Contraste / Luminosité */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-zinc-300 border border-white/10 transition-all active:scale-95"
            title="Ajuster le contraste pour faciliter le scan dans le noir"
          >
            {highContrast ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Plein Éclat</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">Ambiance Sombre</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Scanner Card Display */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-lg mx-auto w-full">
        {/* Banner Staff */}
        <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(147,51,234,0.25)]">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Présentoir Serveur & Barman</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight mb-2">
          Scannez la <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">Carte du Bar</span>
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm max-w-xs mb-6">
          Pointez l’appareil photo du smartphone du client vers l'écran pour ouvrir la carte instantanément.
        </p>

        {/* High-Contrast QR Code Card */}
        <div className="relative group p-4 sm:p-5 rounded-3xl bg-white shadow-[0_0_50px_rgba(219,39,119,0.35)] border-4 border-purple-500/40 transition-transform active:scale-[0.99]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrImageUrl}
            alt="QR Code Carte des Boissons FMB"
            className="w-64 h-64 sm:w-72 sm:h-72 object-contain rounded-xl mx-auto block"
          />

          <div className="mt-3 pt-3 border-t border-zinc-200 flex items-center justify-center gap-2 text-zinc-900 font-extrabold text-[11px] uppercase tracking-wider">
            <Smartphone className="w-4 h-4 text-purple-600 animate-bounce" />
            <span>Appareil photo compatible iOS & Android</span>
          </div>
        </div>

        {/* Quick Actions for Staff */}
        <div className="mt-8 flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-white/10 text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-md"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-pink-400" />}
            <span>{copied ? 'Lien Copié !' : 'Copier le lien'}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-purple-600/25"
          >
            <Share2 className="w-4 h-4" />
            <span>Partager</span>
          </button>
        </div>

        {/* Link back to public view */}
        <div className="mt-4">
          <Link
            href="/carte"
            className="text-xs text-zinc-400 hover:text-white underline underline-offset-4 transition-colors"
          >
            Tester la carte en direct sur cet écran →
          </Link>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-4 text-center text-[11px] text-zinc-600 border-t border-white/5">
        <span>FMB Expérience • Mode Serveur Mobile</span>
      </footer>
    </div>
  );
}
