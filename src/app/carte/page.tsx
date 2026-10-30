'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Wine, 
  Flame, 
  Droplet, 
  ArrowLeft, 
  QrCode, 
  ShieldAlert, 
  CheckCircle2, 
  Copy, 
  Check, 
  ExternalLink,
  GlassWater,
  X,
  CreditCard,
  Zap
} from 'lucide-react';
import { BAR_MENU_ITEMS, MENU_CATEGORIES, MenuItem } from '@/data/barMenu';

export default function CartePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFlavors, setSelectedFlavors] = useState<string>('Pêche');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Filter items
  const filteredItems = selectedCategory === 'all' 
    ? BAR_MENU_ITEMS 
    : BAR_MENU_ITEMS.filter(item => item.category === selectedCategory);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const url = window.location.href.split('?')[0];
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const currentUrl = typeof window !== 'undefined' 
    ? window.location.href.split('?')[0] 
    : 'https://fmb-experience.com/carte';

  // High-res QR code URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=15&data=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="relative min-h-screen text-zinc-100 flex flex-col justify-between overflow-x-hidden selection:bg-pink-500 selection:text-white">
      {/* Background Animated Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-purple-600/15 rounded-full blur-[100px] aurora-blob-1" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] sm:w-[450px] h-[300px] sm:h-[450px] bg-pink-600/15 rounded-full blur-[100px] aurora-blob-2" />
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/60 border-b border-white/10 px-4 py-3 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-semibold uppercase tracking-wider transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>FMB Expérience</span>
          </Link>

          {/* Bouton Staff / Serveur */}
          <div className="flex items-center gap-2">
            <Link
              href="/carte/qr"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-900/60 to-pink-900/60 hover:from-purple-800/80 hover:to-pink-800/80 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all shadow-[0_0_12px_rgba(147,51,234,0.3)] active:scale-95"
            >
              <QrCode className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              <span>Écran Serveur QR</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 pt-6 pb-20">
        {/* Title & Brand Intro */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-pink-400 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bar & Nightlife</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase">
            La Carte des <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">Boissons</span>
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base max-w-md mx-auto">
            Consommations fraîches & formules exclusives préparées pour votre soirée.
          </p>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none sm:justify-center">
          {MENU_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 border ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-[0_0_20px_rgba(219,39,119,0.35)]'
                    : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-white/5'
                }`}
              >
                {cat.id === 'all' && <Sparkles className="w-3.5 h-3.5" />}
                {cat.id === 'verres' && <Wine className="w-3.5 h-3.5" />}
                {cat.id === 'bouteilles' && <Flame className="w-3.5 h-3.5" />}
                {cat.id === 'softs' && <Droplet className="w-3.5 h-3.5" />}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Menu Items List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-2xl p-5 bg-zinc-900/60 backdrop-blur-xl border border-white/10 hover:border-pink-500/40 hover:shadow-[0_0_25px_rgba(219,39,119,0.2)] transition-all duration-300"
            >
              {/* Glow Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-pink-500/20 transition-all pointer-events-none" />

              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="space-y-1">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {item.badge && (
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                        item.badgeColor === 'pink'
                          ? 'bg-pink-500/10 text-pink-400 border-pink-500/30'
                          : item.badgeColor === 'purple'
                          ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          : item.badgeColor === 'amber'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {item.alcoholic ? (
                      <span className="text-[10px] font-semibold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-full border border-purple-800/40">
                        Avec Alcool
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                        Sans Alcool
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-pink-200 transition-colors">
                    {item.name}
                  </h3>
                </div>

                {/* Price Tag */}
                <div className="flex-shrink-0 text-right">
                  <div className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-pink-500/30 text-white font-black text-xl shadow-[0_0_12px_rgba(219,39,119,0.25)]">
                    {item.price} €
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed mb-3">
                {item.description}
              </p>

              {/* Flavors Selector for Sirop à l'eau */}
              {item.flavors && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <span className="text-[11px] font-medium text-zinc-400 block mb-2">
                    Parfums disponibles au bar :
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.flavors.map((flavor) => (
                      <button
                        key={flavor}
                        onClick={() => setSelectedFlavors(flavor)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                          selectedFlavors === flavor
                            ? 'bg-pink-500 text-white font-bold shadow-[0_0_10px_rgba(219,39,119,0.5)]'
                            : 'bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5'
                        }`}
                      >
                        {flavor}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Card Footer with Volume */}
              {item.volume && (
                <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-zinc-500 font-medium">
                  <span className="flex items-center gap-1">
                    <GlassWater className="w-3 h-3 text-zinc-400" />
                    Format : {item.volume}
                  </span>
                  <span className="text-purple-400/80 font-semibold">FMB Bar</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Box Bar & Payments */}
        <div className="mt-10 rounded-2xl bg-zinc-900/40 border border-white/10 p-5 sm:p-6 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Commande & Règlement au Bar
                </h4>
                <p className="text-xs text-zinc-400">
                  Espèces et Carte Bancaire acceptées directement auprès du barman.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowQrModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold transition-all active:scale-95"
            >
              <QrCode className="w-4 h-4 text-pink-400" />
              <span>Afficher le QR Code</span>
            </button>
          </div>
        </div>

        {/* Prevention Notice */}
        <div className="mt-6 text-center text-[11px] text-zinc-600 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
          <span>L'abus d'alcool est dangereux pour la santé. À consommer avec modération.</span>
        </div>
      </main>

      {/* Staff Floating Shortcut */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-sm sm:hidden">
        <Link
          href="/carte/qr"
          className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white font-bold text-xs uppercase tracking-wider shadow-[0_4px_25px_rgba(219,39,119,0.5)] border border-white/20 active:scale-98 transition-all"
        >
          <QrCode className="w-4 h-4" />
          <span>Faire scanner le QR Code (Staff)</span>
        </Link>
      </div>

      {/* Modal Quick QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-zinc-950 border border-white/15 rounded-3xl p-6 text-center shadow-2xl">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2 mb-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-pink-400 bg-pink-500/10 px-2.5 py-0.5 rounded-full border border-pink-500/20">
                FMB Experience
              </span>
              <h3 className="text-lg font-bold text-white">QR Code de la Carte</h3>
              <p className="text-xs text-zinc-400">
                Faites viser ce code avec l'appareil photo du smartphone du client.
              </p>
            </div>

            {/* QR Code Frame */}
            <div className="p-4 bg-white rounded-2xl shadow-inner inline-block my-2 border-4 border-purple-500/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="QR Code Carte Bar"
                className="w-52 h-52 object-contain"
              />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all border border-white/10"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Lien copié dans le presse-papier !' : 'Copier le lien direct'}</span>
              </button>

              <Link
                href="/carte/qr"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30"
              >
                <Zap className="w-4 h-4" />
                <span>Ouvrir l'Écran Plein Jour Serveur</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 px-4 text-center text-xs text-zinc-500">
        <p>© {new Date().getFullYear()} FMB Expérience • Tous droits réservés.</p>
      </footer>
    </div>
  );
}
