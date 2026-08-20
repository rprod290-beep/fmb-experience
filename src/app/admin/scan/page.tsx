'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase, Buyer, Event } from '@/lib/supabase';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  QrCode, 
  ArrowLeft, 
  User, 
  Ticket, 
  Calendar,
  ShieldCheck,
  Loader2
} from 'lucide-react';

function ScanResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';

  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(true);
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Check Auth
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Rediriger vers login avec redirect
        const nextParam = encodeURIComponent(`/admin/scan?code=${code}`);
        router.replace(`/admin/login?next=${nextParam}`);
      } else {
        setAuthenticating(false);
        if (code) {
          loadBuyerData();
        } else {
          setLoading(false);
        }
      }
    }
    checkAuth();
  }, [code, router]);

  // 2. Load Buyer & Event Data
  async function loadBuyerData() {
    try {
      setLoading(true);
      setErrorMsg('');

      // Fetch buyer details
      const { data: buyerData, error: buyerError } = await supabase
        .from('buyers')
        .select('*')
        .eq('confirmation_code', code.toUpperCase().trim())
        .single();

      if (buyerError || !buyerData) {
        console.error(buyerError);
        setErrorMsg("Code de réservation introuvable.");
        setBuyer(null);
        return;
      }

      setBuyer(buyerData);

      // Fetch event details
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', buyerData.event_id)
        .single();

      if (eventData) {
        setEvent(eventData);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Erreur lors de la récupération des données.");
    } finally {
      setLoading(false);
    }
  }

  // 3. Mark buyer as checked-in (and optionally verify payment)
  const handleCheckIn = async (forceVerify = false) => {
    if (!buyer) return;
    setUpdating(true);

    try {
      const updates: any = {
        checked_in_at: new Date().toISOString()
      };

      if (forceVerify) {
        updates.status = 'verified';
      }

      const { data, error } = await supabase
        .from('buyers')
        .update(updates)
        .eq('id', buyer.id)
        .select()
        .single();

      if (error) {
        alert("Erreur lors de la validation : " + error.message);
      } else if (data) {
        setBuyer(data);
        alert(forceVerify ? "Billet validé & Entrée enregistrée !" : "Entrée enregistrée avec succès !");
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur s'est produite.");
    } finally {
      setUpdating(false);
    }
  };

  if (authenticating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0a0f] text-white">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase">Authentification admin...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f] text-white pb-12">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
            Scanner Portatif
          </span>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 mt-6">
        <div className="max-w-md w-full glass-panel border border-zinc-900 bg-zinc-950/40 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl text-center">
          
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
            <QrCode className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-xl font-black uppercase text-white tracking-wide">
              Contrôle d'accès
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Code scanné : <b className="font-mono text-zinc-300 tracking-widest uppercase">{code || 'aucun'}</b>
            </p>
          </div>

          {loading ? (
            <div className="py-8 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
              <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Vérification en base...</span>
            </div>
          ) : !code ? (
            <div className="p-4 bg-zinc-900/50 border border-zinc-850 rounded-2xl space-y-3">
              <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto" />
              <p className="text-xs text-zinc-400 leading-relaxed">
                Aucun code n'a été fourni dans l'URL. Veuillez scanner un QR code généré par l'application pour utiliser ce portail.
              </p>
            </div>
          ) : errorMsg ? (
            /* CASE: Code not found */
            <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-4">
              <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Billet Invalide</h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                  {errorMsg}
                </p>
              </div>
            </div>
          ) : buyer ? (
            /* CASE: Code found */
            <div className="space-y-6">
              
              {/* STATUS CARDS */}
              {/* 1. Status: Double check check_in_at first */}
              {buyer.checked_in_at ? (
                <div className="p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl space-y-3">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto animate-pulse" />
                  <div>
                    <h3 className="text-sm font-black text-yellow-500 uppercase tracking-wider">Billet Déjà Scanné !</h3>
                    <p className="text-[11px] text-zinc-400 mt-2">
                      Ce billet a déjà été validé à l'entrée le :<br />
                      <b className="text-zinc-200 mt-1 block">
                        {new Date(buyer.checked_in_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </b>
                    </p>
                  </div>
                </div>
              ) : buyer.status === 'pending' ? (
                <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-3">
                  <XCircle className="w-12 h-12 text-red-500 mx-auto" />
                  <div>
                    <h3 className="text-sm font-black text-red-400 uppercase tracking-wider">Paiement Non Vérifié</h3>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                      Ce billet a été réservé mais le paiement n'a pas encore été approuvé dans l'administration.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl space-y-3 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <div>
                    <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider">Billet Valide</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Accès autorisé.
                    </p>
                  </div>
                </div>
              )}

              {/* BUYER DETAILS CARD */}
              <div className="p-5 bg-zinc-900/40 border border-zinc-850 rounded-2xl text-left space-y-3.5 text-xs">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-pink-400 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Participant</span>
                    <span className="font-extrabold text-white uppercase text-sm">{buyer.name_or_pseudo || 'Sans nom'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Ticket className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Billet & Catégorie</span>
                    <span className="font-extrabold text-white text-xs">{buyer.ticket_tier_label || 'Non spécifié'}</span>
                  </div>
                </div>

                {event && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Événement</span>
                      <span className="font-semibold text-white text-xs leading-none">{event.title}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-2">
                {buyer.status === 'pending' ? (
                  <button
                    onClick={() => handleCheckIn(true)}
                    disabled={updating}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-colors shadow-lg flex items-center justify-center gap-2"
                  >
                    {updating ? 'Mise à jour...' : 'Forcer la validation & l\'entrée'}
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                ) : !buyer.checked_in_at ? (
                  <button
                    onClick={() => handleCheckIn(false)}
                    disabled={updating}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-colors shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2"
                  >
                    {updating ? 'Enregistrement...' : 'Valider l\'entrée (Check-In)'}
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="text-zinc-500 text-xs font-semibold py-2">
                    ✓ Participant enregistré à l'entrée
                  </div>
                )}
              </div>

            </div>
          ) : null}

          {/* BACK TO ADMIN BUTTON */}
          <div className="pt-4 border-t border-zinc-900">
            <Link 
              href="/admin" 
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all block"
            >
              Retour à l'Administration
            </Link>
          </div>

        </div>
      </main>

      <footer className="py-6 text-center text-[10px] text-zinc-600">
        FMB Expérience • Scanner d'accès
      </footer>
    </div>
  );
}

export default function ScanResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0a0f] text-white">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        <p className="text-zinc-500 text-xs font-semibold tracking-wider uppercase font-mono">Chargement du module de scan...</p>
      </div>
    }>
      <ScanResultContent />
    </Suspense>
  );
}
