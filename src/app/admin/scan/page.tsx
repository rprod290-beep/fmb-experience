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
  const handleCheckIn = async (forceVerify = false, incrementAmount = 1, checkInAll = false) => {
    if (!buyer) return;
    setUpdating(true);

    try {
      const currentCheckedIn = buyer.checked_in_count || 0;
      const totalTickets = buyer.ticket_count || 1;
      
      const newCheckedInCount = checkInAll 
        ? totalTickets 
        : Math.min(totalTickets, currentCheckedIn + incrementAmount);

      const updates: any = {
        checked_in_count: newCheckedInCount
      };

      // Si toutes les places ont été scannées, on remplit checked_in_at
      if (newCheckedInCount >= totalTickets) {
        updates.checked_in_at = new Date().toISOString();
      }

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
        if (checkInAll || newCheckedInCount >= totalTickets) {
          alert(forceVerify ? "Groupe validé & Entrées enregistrées !" : "Toutes les entrées du groupe ont été enregistrées !");
        } else {
          alert(`Entrée enregistrée (${newCheckedInCount} / ${totalTickets} personnes à l'intérieur).`);
        }
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
              {buyer.checked_in_count >= (buyer.ticket_count || 1) ? (
                <div className="p-6 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl space-y-3">
                  <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto animate-pulse" />
                  <div>
                    <h3 className="text-sm font-black text-yellow-500 uppercase tracking-wider">Groupe Complet !</h3>
                    <p className="text-[11px] text-zinc-400 mt-2">
                      Toutes les places de cette réservation ({buyer.ticket_count} {buyer.ticket_count > 1 ? 'places' : 'place'}) ont déjà été validées.<br />
                      Dernier scan enregistré à :<br />
                      <b className="text-zinc-200 mt-1 block">
                        {buyer.checked_in_at ? new Date(buyer.checked_in_at).toLocaleTimeString('fr-FR') : '—'}
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
                      Ce billet ({buyer.ticket_count} {buyer.ticket_count > 1 ? 'places' : 'place'}) a été réservé mais le paiement n'a pas encore été approuvé.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-emerald-500/5 border border-emerald-500/15 rounded-2xl space-y-3 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <div>
                    <h3 className="text-sm font-black text-emerald-400 uppercase tracking-wider">Billet Valide ({buyer.checked_in_count || 0} / {buyer.ticket_count || 1} entrés)</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Accès autorisé pour le reste du groupe ({ (buyer.ticket_count || 1) - (buyer.checked_in_count || 0) } places restantes).
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
                    <span className="font-extrabold text-white text-xs">{buyer.ticket_tier_label || 'Non spécifié'} ({buyer.ticket_count} {buyer.ticket_count > 1 ? 'places' : 'place'})</span>
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
              <div className="space-y-3 pt-2">
                {buyer.status === 'pending' ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleCheckIn(true, 1, false)}
                      disabled={updating}
                      className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                      {updating ? 'Mise à jour...' : buyer.ticket_count > 1 ? 'Forcer & Valider 1 entrée' : 'Forcer la validation & l\'entrée'}
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    
                    {buyer.ticket_count > 1 && (
                      <button
                        onClick={() => handleCheckIn(true, 0, true)}
                        disabled={updating}
                        className="w-full py-3 bg-red-800 hover:bg-red-750 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-colors shadow-md flex items-center justify-center gap-2"
                      >
                        {updating ? 'Mise à jour...' : `Forcer & Valider tout le groupe (${buyer.ticket_count} places)`}
                      </button>
                    )}
                  </div>
                ) : buyer.checked_in_count < (buyer.ticket_count || 1) ? (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleCheckIn(false, 1, false)}
                      disabled={updating}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl transition-colors shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2"
                    >
                      {updating ? 'Enregistrement...' : buyer.ticket_count > 1 ? `Valider 1 entrée (${buyer.checked_in_count + 1}/${buyer.ticket_count})` : 'Valider l\'entrée (Check-In)'}
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    {buyer.ticket_count > 1 && (buyer.ticket_count - buyer.checked_in_count) > 1 && (
                      <button
                        onClick={() => handleCheckIn(false, 0, true)}
                        disabled={updating}
                        className="w-full py-3 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-colors flex items-center justify-center gap-2"
                      >
                        {updating ? 'Enregistrement...' : `Valider tout le groupe (${buyer.ticket_count - buyer.checked_in_count} places)`}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-zinc-500 text-xs font-semibold py-2">
                    ✓ Toutes les places de ce groupe ({buyer.ticket_count}) sont entrées
                  </div>
                )}
              </div>

            </div>
          ) : null}

          {/* Manual Input Form - always visible except when loading */}
          {!loading && (
            <div className="pt-4 border-t border-zinc-900/60">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget.elements.namedItem('manualCode') as HTMLInputElement;
                  const val = target.value;
                  if (val.trim()) {
                    router.push(`/admin/scan?code=${val.trim().toUpperCase()}`);
                    target.value = '';
                  }
                }}
                className="space-y-2.5 text-left"
              >
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Valider un code manuellement
                </label>
                <div className="flex gap-2">
                  <input
                    name="manualCode"
                    type="text"
                    required
                    maxLength={8}
                    placeholder="CODE UNIQUE (EX: AB12CD34)"
                    className="flex-grow bg-zinc-900/60 border border-zinc-800 focus:border-pink-500/50 rounded-xl px-4 py-3 text-xs focus:outline-none text-white font-mono tracking-widest uppercase text-center"
                  />
                  <button
                    type="submit"
                    className="px-4 py-3 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 hover:border-pink-500/20 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95"
                  >
                    Rechercher
                  </button>
                </div>
              </form>
            </div>
          )}

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
