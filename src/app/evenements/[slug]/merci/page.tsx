'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase, Event } from '@/lib/supabase';
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
  
  const code = searchParams.get('code') || '';
  const tier = searchParams.get('tier') || '';

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

  if (!event || !code) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center px-4 bg-[#050508] text-white">
        <AlertTriangle className="w-12 h-12 text-pink-500 mx-auto" />
        <h2 className="text-3xl font-extrabold text-white uppercase tracking-tight">Erreur de Réservation</h2>
        <p className="text-white/60 text-sm leading-relaxed">
          Aucun code de réservation valide ou aucun événement trouvé dans cette session.
        </p>
        <Link href="/" className="glow-btn-primary flex items-center gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>
      </div>
    );
  }

  // Encodage du message WhatsApp
  const whatsappMessage = `Bonjour, je viens d'acheter mon billet pour ${event.title}, voici ma preuve d'achat 👇 (Code: ${code})`;
  const encodedWhatsappMessage = encodeURIComponent(whatsappMessage);
  const whatsappUrl = `https://wa.me/${event.whatsapp_number}?text=${encodedWhatsappMessage}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#050508] text-white pb-20">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4 text-pink-500" /> Accueil
          </Link>
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
              Merci pour votre commande !
            </h2>
            <p className="text-xs text-white/50 max-w-sm mx-auto mt-2 leading-relaxed">
              Votre billet pour la catégorie <b>{tier}</b> a été réservé. Suivez les étapes ci-dessous pour débloquer votre accès.
            </p>
          </div>

          {/* CODE COMPONENT */}
          <div className="glass p-6 rounded-3xl border border-white/10 space-y-3 shadow-[0_0_30px_rgba(147,51,234,0.1)] relative group">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
              Votre Code de Confirmation Unique
            </p>
            <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white uppercase select-all py-2 neon-text-purple">
              {code}
            </div>
            
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors mx-auto pt-2 border-t border-white/5 w-full justify-center"
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

          {/* Validation Instructions */}
          <div className="glass p-6 rounded-3xl border border-white/5 text-left space-y-4 text-xs leading-relaxed text-white/80">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider border-b border-white/5 pb-2">
              🚨 Comment valider votre place ?
            </h3>
            <ol className="list-decimal list-inside space-y-3">
              <li>
                Effectuez le paiement sur la page SumUp ouverte dans l'autre onglet (si vous ne l'avez pas fait).
              </li>
              <li>
                Prenez une <b>capture d'écran de votre reçu de paiement</b>.
              </li>
              <li>
                Envoyez-nous la capture d'écran accompagnée de votre <b>Code Unique ({code})</b> via Instagram ou WhatsApp ci-dessous.
              </li>
              <li>
                Dès validation par l'organisateur, vous pourrez entrer votre code sur la page de l'événement pour débloquer la <b>localisation exacte</b>.
              </li>
            </ol>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(16,185,129,0.25)] transition-all duration-300 active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4 fill-white text-emerald-600" /> Envoyer sur WhatsApp <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Instagram */}
            {event.instagram_url && (
              <a
                href={event.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold text-sm uppercase tracking-widest transition-all duration-300 active:scale-[0.98]"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                Envoyer sur Instagram <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="pt-4 flex flex-wrap gap-6 justify-center text-xs text-white/40">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span className="capitalize">{new Date(event.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-pink-400" />
              <span>Adresse débloquée après validation</span>
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
