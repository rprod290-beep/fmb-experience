'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Event } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  LogOut, 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  FileText, 
  MapPin, 
  ExternalLink,
  QrCode,
  XCircle
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Camera Scanner Inline States
  const [scannerOpen, setScannerOpen] = useState(false);
  const [inlineBuyer, setInlineBuyer] = useState<any>(null);
  const [inlineEvent, setInlineEvent] = useState<any>(null);
  const [inlineLoading, setInlineLoading] = useState(false);
  const [inlineUpdating, setInlineUpdating] = useState(false);
  const [scanError, setScanError] = useState<string>('');
  const scannerRef = useRef<any>(null);

  // Vérifier la session
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin/login');
      } else {
        fetchEvents();
      }
    }
    checkAuth();
  }, [router]);

  async function fetchEvents() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Erreur lors du chargement des événements:', error);
      } else {
        setEvents(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const handleCreateEvent = async () => {
    try {
      setCreating(true);
      const timestamp = Date.now();
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const newEventPayload = {
        title: 'Nouvel Événement (Brouillon)',
        slug: `brouillon-${timestamp}`,
        event_date: nextWeek,
        subtitle: 'L\'expérience exclusive',
        description: 'Description de la soirée...',
        contact_email: 'contact@fmb-experience.com',
        whatsapp_number: '33', // code international standard de base
        status: 'draft',
        category: 'party',
      };

      const { data, error } = await supabase
        .from('events')
        .insert([newEventPayload])
        .select('id')
        .single();

      if (error) {
        alert("Erreur lors de la création de l'événement : " + error.message);
      } else if (data) {
        // Redirige vers la page d'édition dédiée
        router.push(`/admin/evenements/${data.id}`);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur s'est produite.");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ? Cela supprimera également les DJs, les tarifs et les acheteurs associés.')) return;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) {
      alert("Erreur lors de la suppression de l'événement : " + error.message);
    } else {
      setEvents(prev => prev.filter(e => e.id !== eventId));
    }
  };

  // =========================================================================
  // CAMERA SCANNER LOGIC (html5-qrcode)
  // =========================================================================
  useEffect(() => {
    let html5QrCode: any;
    
    if (scannerOpen) {
      setInlineBuyer(null);
      setInlineEvent(null);
      setScanError('');
      
      // Initialize html5-qrcode
      html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      
      html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        async (decodedText: string) => {
          try {
            let code = decodedText.trim();
            // Parse code out of URL if scanned from web address
            if (code.includes('?code=')) {
              const urlParams = new URLSearchParams(code.split('?')[1]);
              code = urlParams.get('code') || code;
            }
            
            // Pause camera scan detection during verification
            await html5QrCode.pause(true);
            
            // Verify guest in DB
            verifyGuestInline(code);
          } catch (e) {
            console.error(e);
          }
        },
        (errorMessage: string) => {
          // Ignore verbose scanner errors
        }
      ).catch((err: any) => {
        console.error("Impossible de lancer la caméra:", err);
        setScanError("Erreur d'accès à la caméra. Vérifiez les permissions.");
      });
    }
    
    return () => {
      if (html5QrCode) {
        if (html5QrCode.isScanning) {
          html5QrCode.stop().catch((e: any) => console.error(e));
        }
      }
    };
  }, [scannerOpen]);

  const verifyGuestInline = async (code: string) => {
    try {
      setInlineLoading(true);
      setInlineBuyer(null);
      setInlineEvent(null);
      setScanError('');

      // Fetch buyer details
      const { data: buyerData, error: buyerError } = await supabase
        .from('buyers')
        .select('*')
        .eq('confirmation_code', code.toUpperCase().trim())
        .single();

      if (buyerError || !buyerData) {
        setScanError(`Code de réservation "${code.toUpperCase()}" introuvable.`);
        return;
      }

      setInlineBuyer(buyerData);

      // Fetch event details
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', buyerData.event_id)
        .single();

      if (eventData) {
        setInlineEvent(eventData);
      }
    } catch (err) {
      console.error(err);
      setScanError("Erreur réseau lors de la vérification.");
    } finally {
      setInlineLoading(false);
    }
  };

  const handleInlineCheckIn = async (forceVerify = false, incrementAmount = 1, checkInAll = false) => {
    if (!inlineBuyer) return;
    setInlineUpdating(true);

    try {
      const currentCheckedIn = inlineBuyer.checked_in_count || 0;
      const totalTickets = inlineBuyer.ticket_count || 1;
      
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
        .eq('id', inlineBuyer.id)
        .select()
        .single();

      if (error) {
        alert("Erreur lors de la validation : " + error.message);
      } else if (data) {
        setInlineBuyer(data);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur s'est produite.");
    } finally {
      setInlineUpdating(false);
    }
  };

  const handleNextScan = () => {
    setInlineBuyer(null);
    setInlineEvent(null);
    setScanError('');
    // Resume camera detection
    if (scannerRef.current) {
      try {
        scannerRef.current.resume();
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-950 text-white">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin"></div>
        <p className="text-zinc-400 text-xs">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-lg tracking-wider text-white">
              FMB EXPÉRIENCE
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] uppercase font-bold tracking-wider">
              Administration
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              Voir le site public <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 bg-zinc-900 px-4 py-2 rounded-xl transition-all duration-300"
            >
              <LogOut className="w-3.5 h-3.5" /> Se déconnecter
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-grow space-y-8">
        
        {/* Title bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Gestion des Événements</h2>
            <p className="text-xs text-zinc-400 mt-1">Créez, modifiez et gérez vos événements ainsi que les listes d'acheteurs.</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setScannerOpen(!scannerOpen)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] border ${
                scannerOpen 
                  ? 'bg-zinc-800 text-white border-zinc-700 shadow-[0_0_15px_rgba(147,51,234,0.1)]' 
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 hover:border-zinc-750'
              }`}
            >
              <QrCode className="w-4 h-4 text-purple-400" />
              {scannerOpen ? 'Fermer le Scanner' : 'Scanner un Billet'}
            </button>

            <button
              onClick={handleCreateEvent}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/15 transition-all active:scale-[0.98] disabled:opacity-50 flex-grow sm:flex-grow-0 justify-center"
            >
              <Plus className="w-4 h-4" /> {creating ? 'Création...' : 'Créer un événement'}
            </button>
          </div>
        </div>

        {/* Camera Scanner Panel */}
        {scannerOpen && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-xl animate-fade-in">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-400 animate-pulse" />
                <h3 className="font-extrabold text-white text-sm uppercase tracking-wide">Scanner de Billets Appareil Photo</h3>
              </div>
              <button
                onClick={() => setScannerOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase"
              >
                Fermer le Scanner
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left column: Camera Viewport */}
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl bg-black border border-zinc-800 aspect-square max-w-sm mx-auto relative flex items-center justify-center">
                  <div id="reader" className="w-full h-full object-cover"></div>
                  
                  {/* Overlay text if showing scan result */}
                  {(inlineBuyer || inlineLoading || scanError) && (
                    <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4">
                      <div className="text-center space-y-4 w-full">
                        {inlineLoading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-6 h-6 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin"></div>
                            <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Vérification...</span>
                          </div>
                        ) : scanError ? (
                          <div className="space-y-3">
                            <XCircle className="w-10 h-10 text-red-500 mx-auto" />
                            <p className="text-xs text-red-400 font-bold">{scanError}</p>
                            <button
                              onClick={handleNextScan}
                              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all"
                            >
                              Scanner suivant
                            </button>
                          </div>
                        ) : inlineBuyer ? (
                          <div className="space-y-4 text-left p-4 bg-zinc-950/90 border border-zinc-850 rounded-2xl max-w-xs mx-auto">
                            <div className="text-center pb-2 border-b border-zinc-800">
                              {inlineBuyer.checked_in_count >= (inlineBuyer.ticket_count || 1) ? (
                                <span className="text-yellow-500 text-xs font-black uppercase tracking-wider block animate-pulse">⚠️ GROUPE COMPLET ({inlineBuyer.ticket_count}/{inlineBuyer.ticket_count})</span>
                              ) : inlineBuyer.status === 'pending' ? (
                                <span className="text-red-500 text-xs font-black uppercase tracking-wider block">❌ PAIEMENT REQUIS</span>
                              ) : (
                                <span className="text-emerald-400 text-xs font-black uppercase tracking-wider block">✅ BILLET VALIDE ({inlineBuyer.checked_in_count || 0}/{inlineBuyer.ticket_count || 1})</span>
                              )}
                            </div>

                            <div className="space-y-2 text-xs pt-1">
                              <p className="text-zinc-400">Nom : <b className="text-white uppercase font-extrabold">{inlineBuyer.name_or_pseudo}</b></p>
                              <p className="text-zinc-400">Billet : <b className="text-white font-bold">{inlineBuyer.ticket_tier_label}</b> ({inlineBuyer.ticket_count} {inlineBuyer.ticket_count > 1 ? 'places' : 'place'})</p>
                              {inlineEvent && <p className="text-zinc-400">Soirée : <b className="text-white font-bold">{inlineEvent.title}</b></p>}
                              {inlineBuyer.checked_in_count >= (inlineBuyer.ticket_count || 1) && inlineBuyer.checked_in_at && (
                                <p className="text-yellow-500/80 text-[10px] bg-yellow-500/5 p-1.5 rounded border border-yellow-500/10 mt-1">
                                  Dernier scan le : <b>{new Date(inlineBuyer.checked_in_at).toLocaleTimeString('fr-FR')}</b>
                                </p>
                              )}
                            </div>

                            <div className="pt-2 flex flex-col gap-2">
                              {inlineBuyer.status === 'pending' ? (
                                <>
                                  <button
                                    onClick={() => handleInlineCheckIn(true, 1, false)}
                                    disabled={inlineUpdating}
                                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs uppercase"
                                  >
                                    {inlineUpdating ? 'Validation...' : inlineBuyer.ticket_count > 1 ? 'Forcer & Valider 1 entrée' : 'Forcer & Valider'}
                                  </button>
                                  {inlineBuyer.ticket_count > 1 && (
                                    <button
                                      onClick={() => handleInlineCheckIn(true, 0, true)}
                                      disabled={inlineUpdating}
                                      className="w-full py-2 bg-red-800 hover:bg-red-750 text-white font-bold rounded-lg text-[10px] uppercase"
                                    >
                                      {inlineUpdating ? 'Validation...' : `Forcer & Valider groupe (${inlineBuyer.ticket_count})`}
                                    </button>
                                  )}
                                </>
                              ) : inlineBuyer.checked_in_count < (inlineBuyer.ticket_count || 1) ? (
                                <>
                                  <button
                                    onClick={() => handleInlineCheckIn(false, 1, false)}
                                    disabled={inlineUpdating}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs uppercase"
                                  >
                                    {inlineUpdating ? 'Validation...' : inlineBuyer.ticket_count > 1 ? `Valider entrée (${inlineBuyer.checked_in_count + 1}/${inlineBuyer.ticket_count})` : 'Valider l\'entrée'}
                                  </button>
                                  {inlineBuyer.ticket_count > 1 && (inlineBuyer.ticket_count - inlineBuyer.checked_in_count) > 1 && (
                                    <button
                                      onClick={() => handleInlineCheckIn(false, 0, true)}
                                      disabled={inlineUpdating}
                                      className="w-full py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] uppercase"
                                    >
                                      {inlineUpdating ? 'Validation...' : `Valider tout le groupe (${inlineBuyer.ticket_count - inlineBuyer.checked_in_count})`}
                                    </button>
                                  )}
                                </>
                              ) : null}
                              
                              <button
                                onClick={handleNextScan}
                                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all border border-zinc-700"
                              >
                                Suivant
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 text-center">
                  Visez le QR Code d'un participant avec la caméra arrière de votre téléphone pour lancer la détection.
                </p>
              </div>

              {/* Right column: Instructions & Manual Entry */}
              <div className="space-y-4 text-xs leading-relaxed text-zinc-400">
                <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-2xl space-y-2">
                  <h4 className="font-bold text-white uppercase text-[10px] tracking-wider">💡 Mode d'emploi</h4>
                  <p>1. Autorisez le site à accéder à votre appareil photo.</p>
                  <p>2. Visez le QR code d'un billet.</p>
                  <p>3. Les détails du billet se chargeront immédiatement à l'écran.</p>
                  <p>4. Appuyez sur le bouton vert/rouge pour valider l'entrée et passer au scanneur suivant.</p>
                </div>

                <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-2xl space-y-3">
                  <h4 className="font-bold text-white uppercase text-[10px] tracking-wider">⌨️ Saisie Manuelle</h4>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const target = e.currentTarget.elements.namedItem('manualCode') as HTMLInputElement;
                      const val = target.value.trim().toUpperCase();
                      if (val) {
                        if (scannerRef.current) {
                          try {
                            await scannerRef.current.pause(true);
                          } catch (err) {
                            console.log("Scanner pause error:", err);
                          }
                        }
                        verifyGuestInline(val);
                        target.value = '';
                      }
                    }}
                    className="space-y-2.5 text-left"
                  >
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Valider un code de billet
                    </label>
                    <div className="flex gap-2">
                      <input
                        name="manualCode"
                        type="text"
                        required
                        maxLength={8}
                        placeholder="EX: AB12CD34"
                        className="flex-grow bg-zinc-900/60 border border-zinc-800 focus:border-purple-500/50 rounded-xl px-4 py-3 text-xs focus:outline-none text-white font-mono tracking-widest uppercase text-center"
                      />
                      <button
                        type="submit"
                        className="px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all active:scale-95"
                      >
                        Valider
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="p-16 border border-dashed border-zinc-800 rounded-3xl text-center space-y-3">
            <Calendar className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="font-bold text-white text-sm">Aucun événement</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Commencez par créer votre premier événement en cliquant sur le bouton ci-dessus.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col justify-between overflow-hidden hover:border-zinc-700 transition-colors group"
              >
                <div>
                  {/* Image cover preview or gradient fallback */}
                  <div className="relative aspect-[16/9] w-full bg-zinc-950 border-b border-zinc-800">
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
                        Aucun visuel de couverture
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      {event.status === 'draft' && (
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[9px] uppercase font-bold tracking-wider">
                          Brouillon
                        </span>
                      )}
                      {event.status === 'upcoming' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-bold tracking-wider">
                          En ligne
                        </span>
                      )}
                      {event.status === 'past' && (
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 text-[9px] uppercase font-bold tracking-wider">
                          Terminé
                        </span>
                      )}
                      
                      {event.category === 'trip' ? (
                        <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] uppercase font-bold tracking-wider">
                          ✈️ Voyage
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] uppercase font-bold tracking-wider">
                          🎵 Soirée
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="p-5 space-y-3">
                    <h4 className="font-extrabold text-white text-base line-clamp-1 group-hover:text-purple-400 transition-colors">
                      {event.title}
                    </h4>
                    {event.subtitle && (
                      <p className="text-xs text-zinc-400 font-semibold line-clamp-1">{event.subtitle}</p>
                    )}

                    <div className="space-y-1.5 pt-2 text-[11px] text-zinc-400 border-t border-zinc-800/60">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <span className="line-clamp-1">
                          {event.category === 'trip' && event.end_date ? (
                            `Du ${new Date(event.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${new Date(event.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          ) : (
                            new Date(event.event_date).toLocaleString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <span className="line-clamp-1">
                          Lieu : <b>{event.secret_address || 'Non spécifié'}</b>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <span className="line-clamp-1 font-mono">
                          Slug : {event.slug}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="p-5 pt-0 flex gap-2">
                  <Link
                    href={`/admin/evenements/${event.id}`}
                    className="flex-grow py-2 px-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Gérer & Éditer
                  </Link>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs transition-colors flex items-center justify-center"
                    title="Supprimer la soirée"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-[10px] text-zinc-500">
        FMB Expérience Admin Dashboard • © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
