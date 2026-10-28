'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase, Event } from '@/lib/supabase';
import { verifyConfirmationCodeAndGetAddress } from '@/app/actions';
import { 
  Check, 
  ArrowLeft, 
  MessageCircle, 
  ExternalLink,
  Info,
  Calendar,
  MapPin,
  Clipboard,
  AlertTriangle
} from 'lucide-react';

interface PageProps {
  params: {
    slug: string;
  };
}

export default function ThankYouPage({ params }: PageProps) {
  const { slug } = params;
  const searchParams = useSearchParams();
  
  const queryCode = (searchParams.get('code') || '').trim();
  const [activeCode, setActiveCode] = useState(queryCode);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const tier = searchParams.get('tier') || '';
  const payLink = searchParams.get('payLink') || '';
  const quantity = Number(searchParams.get('quantity') || '1');

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Secret Address states
  const [secretAddress, setSecretAddress] = useState<string | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  useEffect(() => {
    if (queryCode) {
      setActiveCode(queryCode);
    }
  }, [queryCode]);

  useEffect(() => {
    async function fetchEvent() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('public_events')
          .select('*')
          .eq('slug', slug)
          .single();

        if (error) {
          console.error(error);
        } else {
          setEvent(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchEvent();
    }
  }, [slug]);

  // Déblocage automatique de l'adresse secrète dès que l'événement et le code sont disponibles
  useEffect(() => {
    async function loadSecretAddress() {
      if (!event || !activeCode) return;
      
      if (event.category === 'trip') {
        setSecretAddress(event.address || null);
        return;
      }

      try {
        setAddressLoading(true);
        setAddressError(null);
        const res = await verifyConfirmationCodeAndGetAddress(event.id, activeCode);
        if (res.success && res.address) {
          setSecretAddress(res.address);
        } else {
          setAddressError(res.error || "Adresse non disponible ou réservation en cours de validation.");
        }
      } catch (err) {
        console.error("Erreur lors de la récupération de l'adresse secrète:", err);
        setAddressError("Impossible de charger l'adresse secrète.");
      } finally {
        setAddressLoading(false);
      }
    }

    loadSecretAddress();
  }, [event, activeCode]);

  const handleCopyCode = () => {
    if (activeCode) {
      navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyAddress = () => {
    if (secretAddress) {
      navigator.clipboard.writeText(secretAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2500);
    }
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCodeInput.trim()) {
      setActiveCode(manualCodeInput.trim().toUpperCase());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#050508] text-white">
        <div className="w-12 h-12 rounded-full border-2 border-pink-500/20 border-t-pink-500 animate-spin"></div>
        <p className="text-white/40 text-xs">Génération du code de confirmation...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center px-4 bg-[#050508] text-white">
        <AlertTriangle className="w-12 h-12 text-pink-500 mx-auto" />
        <h2 className="text-3xl font-extrabold text-white uppercase tracking-tight">Événement Introuvable</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          Cet événement n'existe pas ou n'est plus en ligne.
        </p>
        <Link href="/" className="glow-btn-primary flex items-center gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>
      </div>
    );
  }

  // Si aucun code n'est fourni dans l'URL ou saisi, on invite la personne à le renseigner plutôt que de la bloquer
  if (!activeCode) {
    return (
      <div className="min-h-screen flex flex-col bg-[#050508] text-white">
        <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center">
            <Link href={`/evenements/${event.slug}`} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
              <ArrowLeft className="w-4 h-4 text-pink-500" /> Retour à l'événement
            </Link>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full glass p-8 rounded-3xl border border-white/10 text-center space-y-6 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
              <MapPin className="w-8 h-8 text-pink-400" />
            </div>

            <div>
              <h2 className="text-2xl font-black uppercase text-white tracking-tight">
                Accéder à mon Billet & Lieu Secret
              </h2>
              <p className="text-xs text-white/60 mt-2 leading-relaxed">
                Entrez votre <b>Code Unique</b> de réservation pour afficher votre QR code d'entrée et dévoiler l'adresse secrète de la soirée <b>{event.title}</b>.
              </p>
            </div>

            <form onSubmit={handleManualCodeSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Ex: 67F39168"
                  value={manualCodeInput}
                  onChange={(e) => setManualCodeInput(e.target.value.toUpperCase().trim())}
                  className="w-full bg-black/60 border border-white/15 focus:border-purple-500 rounded-2xl px-4 py-3.5 text-center text-lg font-mono font-black tracking-widest text-white uppercase focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-500 hover:to-orange-400 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-98 cursor-pointer"
              >
                Déverrouiller mon billet & l'adresse
              </button>
            </form>

            <div className="pt-2">
              <Link href={`/evenements/${event.slug}`} className="text-xs text-white/40 hover:text-white transition-colors">
                ← Retour à la page de la soirée
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Encodage du message WhatsApp
  const whatsappMessage = `Bonjour, je viens d'acheter mon billet pour ${event.title}, voici ma preuve d'achat 👇 (Code: ${activeCode})`;
  const encodedWhatsappMessage = encodeURIComponent(whatsappMessage);
  const whatsappUrl = `https://wa.me/${event.whatsapp_number}?text=${encodedWhatsappMessage}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#050508] text-white pb-20">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href={`/evenements/${event.slug}`} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4 text-pink-500" /> Page de l'Événement
          </Link>
          <span className="font-extrabold text-xs tracking-wider text-purple-400 uppercase">
            Billet Numérique
          </span>
        </div>
      </header>

      {/* Main thank you card */}
      <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 mt-6">
        <div className="max-w-xl w-full text-center space-y-8 animate-fade-in">
          
          {/* Header check badge */}
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>

          <div>
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
              Réservation Enregistrée
            </span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight mt-4">
              Votre Billet d'Accès
            </h2>
            <p className="text-xs text-white/50 max-w-sm mx-auto mt-2 leading-relaxed">
              {event.title} • {tier ? `Catégorie ${tier}` : 'Entrée Validée'} ({quantity} {quantity === 1 ? 'place' : 'places'})
            </p>
          </div>

          {payLink && (
            <div className="pt-2">
              <a
                href={payLink}
                target="_blank"
                rel="noopener noreferrer"
                className="glow-btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-[0_0_25px_rgba(219,39,119,0.35)] transition-all duration-300 animate-pulse active:scale-[0.98]"
              >
                💳 CLIQUER ICI POUR PAYER LE BILLET <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* 1. SECRET LOCATION CARD (LIEU SECRET DÉVOILÉ) */}
          <div className="glass p-6 sm:p-7 rounded-3xl border border-purple-500/30 space-y-4 shadow-[0_0_40px_rgba(147,51,234,0.15)] relative overflow-hidden text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-pink-400 font-extrabold text-xs uppercase tracking-wider">
                <MapPin className="w-4 h-4 text-pink-500" />
                {event.category === 'trip' ? 'Destination & Lieu' : '📍 Lieu Secret de la Soirée'}
              </div>
              <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase">
                {secretAddress ? 'Débloqué' : 'En attente'}
              </span>
            </div>

            {addressLoading ? (
              <div className="py-6 flex items-center justify-center gap-3 text-white/50 text-xs">
                <div className="w-4 h-4 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin"></div>
                <span>Déverrouillage de l'adresse avec votre code...</span>
              </div>
            ) : secretAddress ? (
              <div className="space-y-4">
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 sm:p-5">
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider mb-1">
                    Adresse exacte :
                  </p>
                  <p className="text-white font-black text-lg sm:text-xl tracking-tight select-all">
                    {secretAddress}
                  </p>
                </div>

                {/* Boutons d'itinéraire Maps */}
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(secretAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[130px] px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Google Maps
                  </a>
                  <a
                    href={`https://maps.apple.com/?q=${encodeURIComponent(secretAddress)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[130px] px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-95"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Apple Plans
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-95 cursor-pointer"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copiée !
                      </>
                    ) : (
                      <>
                        <Clipboard className="w-3.5 h-3.5" />
                        Copier
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-200/90 leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  Adresse en attente de validation
                </p>
                <p className="text-[11px] text-amber-200/80">
                  {addressError || "Votre paiement ou virement doit être validé par les organisateurs pour dévoiler l'adresse secrète. Dès validation, l'adresse s'affichera directement ici."}
                </p>
              </div>
            )}
          </div>

          {/* 2. CODE COMPONENT */}
          <div className="glass p-6 rounded-3xl border border-white/10 space-y-3 shadow-[0_0_30px_rgba(147,51,234,0.1)] relative group">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
              Votre Code de Confirmation Unique
            </p>
            <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white uppercase select-all py-2 neon-text-purple">
              {activeCode}
            </div>
            
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors mx-auto pt-2 border-t border-white/5 w-full justify-center cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copié dans le presse-papiers !
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5" />
                  Copier le code
                </>
              )}
            </button>
          </div>

          {/* 3. QR CODE CARD */}
          <div className="glass p-6 rounded-3xl border border-white/10 space-y-4 shadow-[0_0_40px_rgba(219,39,119,0.05)]">
            <p className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">
              Votre QR Code d'Entrée
            </p>
            
            <div className="bg-white p-3 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg relative group">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  typeof window !== 'undefined' 
                    ? window.location.origin + '/admin/scan?code=' + activeCode 
                    : 'https://fmb-experience.vercel.app/admin/scan?code=' + activeCode
                )}`}
                alt="QR Code de confirmation"
                className="w-[180px] h-[180px]"
              />
            </div>
            
            <p className="text-[10px] text-white/40 max-w-xs mx-auto leading-relaxed">
              Présentez ce QR Code à l'entrée de la soirée. L'équipe d'organisation le scannera pour valider votre entrée.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-4 items-center pt-2">
            <Link
              href={`/evenements/${event.slug}`}
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-extrabold text-xs uppercase tracking-widest border border-white/10 transition-all active:scale-[0.98] w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" /> Voir la page de l'événement
            </Link>

            <div className="flex items-center gap-4 text-xs text-white/50 mt-2">
              <span>Besoin d'aide ?</span>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-400 hover:underline flex items-center gap-1"
              >
                WhatsApp
              </a>
              {event.instagram_url && (
                <>
                  <span>•</span>
                  <a
                    href={event.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-400 hover:underline flex items-center gap-1"
                  >
                    Instagram
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="pt-4 flex flex-wrap gap-6 justify-center text-xs text-white/40">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span className="capitalize">{new Date(event.event_date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-pink-400" />
              <span>{secretAddress || 'Lieu Secret'}</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-[10px] text-white/20">
        FMB Expérience • Tous droits réservés.
      </footer>
    </div>
  );
}
