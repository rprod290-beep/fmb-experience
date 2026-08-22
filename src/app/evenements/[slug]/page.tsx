'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, Event, DJ, TicketTier } from '@/lib/supabase';
import { registerBuyer } from '@/app/actions';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'BAAzIRcORaDPy0QiXRb9We8sFVS2MhA3BlKS5JsgjS8Sen5EuZPENuMmsserQ3-ift8uqgMT1qX9zx-O6M';
import { 
  Calendar, 
  MapPin, 
  ArrowLeft, 
  Mail, 
  Check, 
  Ticket, 
  MessageCircle, 
  X, 
  ExternalLink,
  Info,
  Users
} from 'lucide-react';

interface PageProps {
  params: {
    slug: string;
  };
}

export default function EventDetailsPage({ params }: PageProps) {
  const { slug } = params;
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [djs, setDjs] = useState<DJ[]>([]);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [ticketCount, setTicketCount] = useState(1);
  const [registering, setRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState('');

  useEffect(() => {
    async function fetchEventData() {
      try {
        setLoading(true);
        // 1. Récupérer l'événement depuis la vue publique (qui n'inclut PAS secret_address)
        const { data: eventData, error: eventError } = await supabase
          .from('public_events')
          .select('*')
          .eq('slug', slug)
          .single();

        if (eventError || !eventData) {
          console.error("Erreur lors de la récupération de l'événement:", eventError);
          return;
        }

        setEvent(eventData);

        // 2. Récupérer les DJs
        const { data: djsData, error: djsError } = await supabase
          .from('djs')
          .select('*')
          .eq('event_id', eventData.id);

        if (djsError) {
          console.error("Erreur lors de la récupération des DJs:", djsError);
        } else {
          setDjs(djsData || []);
        }

        // 3. Récupérer les tarifs actifs
        const { data: tiersData, error: tiersError } = await supabase
          .from('ticket_tiers')
          .select('*')
          .eq('event_id', eventData.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (tiersError) {
          console.error("Erreur lors de la récupération des tarifs:", tiersError);
        } else {
          setTicketTiers(tiersData || []);
        }
      } catch (err) {
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchEventData();
    }
  }, [slug]);

  const handleRegisterFreeTicket = async () => {
    if (!event || !selectedTier || !buyerName.trim()) {
      setRegistrationError("Veuillez saisir votre nom.");
      return;
    }

    setRegistering(true);
    setRegistrationError('');

    try {
      const result = await registerBuyer(event.id, buyerName.trim(), selectedTier.label, ticketCount, 'verified');

      if (result.success && result.confirmationCode) {
        // Reset state
        setSelectedTier(null);
        setBuyerName('');
        setTicketCount(1);
        // Redirect to success page
        router.push(`/evenements/${event.slug}/merci?code=${result.confirmationCode}&tier=${encodeURIComponent(selectedTier.label)}&quantity=${ticketCount}`);
      } else {
        setRegistrationError(result.error || "Une erreur s'est produite lors de l'enregistrement.");
      }
    } catch (err) {
      console.error(err);
      setRegistrationError("Erreur lors de la réservation.");
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#050508] text-white">
        <div className="w-12 h-12 rounded-full border-2 border-pink-500/20 border-t-pink-500 animate-spin"></div>
        <p className="text-white/40 text-xs">Chargement de la soirée...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center px-4 bg-[#050508] text-white">
        <h2 className="text-3xl font-extrabold text-white">Soirée Introuvable</h2>
        <p className="text-white/60 text-sm leading-relaxed">Cette soirée n'existe pas ou n'est plus en ligne.</p>
        <Link href="/" className="glow-btn-primary flex items-center gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "EUR" }}>
      <div className="min-h-screen flex flex-col bg-[#050508] text-white pb-20 relative">
      {/* Blurred background bleed from flyer colors */}
      {event.cover_image_url && (
        <div className="fixed inset-0 -z-30 pointer-events-none overflow-hidden opacity-[0.08]">
          <img
            src={event.cover_image_url}
            alt=""
            className="w-full h-full object-cover scale-150 blur-[150px]"
          />
        </div>
      )}
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4 text-pink-500" /> Tous les Événements
          </Link>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="relative w-full h-[45vh] sm:h-[55vh] flex items-end overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 -z-20">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full h-full object-cover opacity-40"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-950/40 via-black to-pink-950/40"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-transparent"></div>
        </div>

        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4 uppercase tracking-widest">
            🎵 concepto
          </span>
          
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white mb-2 leading-none neon-text-purple">
            {event.title}
          </h1>
          
          {event.subtitle && (
            <p className="text-pink-400 font-extrabold text-sm sm:text-lg tracking-widest uppercase mb-4">
              {event.subtitle}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-white/60">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span className="capitalize">{formatDate(event.event_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-pink-400" />
              <span>Lieu Secret</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
        
        {/* Left pane: Lineup & Infos */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Line-up DJs */}
          {djs.length > 0 && (
            <div className="glass p-6 rounded-3xl border border-white/5 space-y-6">
              <h3 className="text-lg font-black uppercase tracking-wider text-white border-b border-white/5 pb-3">
                🎧 Line-up
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {djs.map((dj) => (
                  <div key={dj.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      {dj.photo_url ? (
                        <img
                          src={dj.photo_url}
                          alt={dj.name}
                          className="w-12 h-12 rounded-full object-cover bg-white/10 border border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 font-black flex items-center justify-center text-sm uppercase">
                          {dj.name.slice(0, 2)}
                        </div>
                      )}
                      <span className="font-extrabold text-white text-sm uppercase tracking-wide group-hover:text-pink-400 transition-colors">
                        {dj.name}
                      </span>
                    </div>

                    {dj.instagram_url && (
                      <a
                        href={dj.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/30 hover:text-white transition-colors"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                        </svg>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="glass p-6 rounded-3xl border border-white/5 space-y-4">
              <h3 className="text-lg font-black uppercase tracking-wider text-white border-b border-white/5 pb-3">
                📖 Description
              </h3>
              <p className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          {/* Infos Pratiques */}
          <div className="glass p-6 rounded-3xl border border-white/5 space-y-4">
            <h3 className="text-lg font-black uppercase tracking-wider text-white border-b border-white/5 pb-3">
              📍 Infos Pratiques
            </h3>
            <div className="space-y-3 text-xs leading-relaxed text-white/70">
              <div className="p-3.5 bg-purple-500/5 border border-purple-500/10 rounded-2xl flex items-start gap-3">
                <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <p>
                  <b>Adresse Communiquée Après Achat</b> : L'emplacement de la soirée est tenu secret. Une fois votre billet réservé et validé, vous obtiendrez l'accès immédiat à l'adresse exacte.
                </p>
              </div>
              <div className="p-3.5 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex items-start gap-3">
                <Users className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <p>
                  <b>Accompagnement WhatsApp/Instagram</b> : Une question ? Vous pouvez contacter l'organisation par email à <a href={`mailto:${event.contact_email}`} className="text-pink-400 hover:underline">{event.contact_email}</a> ou via nos réseaux en cas de besoin.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right pane: Ticket Shop */}
        <div className="space-y-6">
          {/* Sharp Flyer Card */}
          {event.cover_image_url && (
            <div className="glass rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
              <img
                src={event.cover_image_url}
                alt="Flyer officiel de la soirée"
                className="w-full h-auto object-contain hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          )}

          <div className="glass p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-lg font-black uppercase tracking-wider text-white">
                🎟️ Tickets
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] uppercase font-bold tracking-widest animate-pulse">
                Places limitées
              </span>
            </div>

            {ticketTiers.length === 0 ? (
              <p className="text-white/40 text-center py-6 text-xs">Aucun billet en vente pour le moment.</p>
            ) : (
              <div className="space-y-4">
                {ticketTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between gap-4 group"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-extrabold text-white text-sm uppercase tracking-wide group-hover:text-pink-400 transition-colors">
                          {tier.label}
                        </span>
                        <span className="font-black text-base text-emerald-400">
                          {tier.price} €
                        </span>
                      </div>
                      {tier.description && (
                        <p className="text-[11px] text-white/50 mt-1 leading-relaxed">{tier.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedTier(tier)}
                      className="glow-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5 uppercase font-bold tracking-wider"
                    >
                      <Ticket className="w-3.5 h-3.5" /> Acheter
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buyer Signup Modal */}
      {selectedTier && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex justify-center items-start sm:items-center p-4 py-10">
          <div className="glass max-w-md w-full rounded-3xl border border-white/10 shadow-2xl relative my-auto overflow-hidden">
            <button
              onClick={() => {
                setSelectedTier(null);
                setBuyerName('');
                setTicketCount(1);
                setRegistrationError('');
              }}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                  Réservation
                </span>
                <h3 className="text-xl font-black text-white uppercase mt-2">
                  Qui réserve ce billet ?
                </h3>
                <p className="text-xs text-white/40 mt-1">
                  Vous avez choisi le tarif <b>{selectedTier.label}</b> ({selectedTier.price} €).
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-2">
                    Nom Complet ou Pseudo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: David Laroche"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white"
                  />
                  <p className="text-[9px] text-white/30 mt-1.5 flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 flex-shrink-0" />
                    Ce nom permettra aux organisateurs d'associer votre paiement à votre billet.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-2">
                    Nombre de Places
                  </label>
                  <select
                    value={ticketCount}
                    onChange={(e) => setTicketCount(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white cursor-pointer"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num} className="bg-zinc-950 text-white">
                        {num} {num === 1 ? 'place' : 'places'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between items-center py-3 px-4 bg-white/5 rounded-xl border border-white/5">
                  <span className="text-xs text-white/50">Total à payer :</span>
                  <span className="text-sm font-extrabold text-white">
                    {ticketCount * selectedTier.price} € <span className="text-[10px] text-white/40 font-normal">({ticketCount} x {selectedTier.price} €)</span>
                  </span>
                </div>

                {registrationError && (
                  <p className="text-xs text-pink-500 font-semibold">{registrationError}</p>
                )}

                <div className="space-y-3 pt-2">
                  {selectedTier.price > 0 ? (
                    <div className="pt-2">
                      <PayPalButtons
                        style={{ layout: "vertical", shape: "rect", label: "pay" }}
                        createOrder={(data, actions) => {
                          return actions.order.create({
                            purchase_units: [{
                              amount: {
                                currency_code: "EUR",
                                value: (ticketCount * selectedTier.price).toString()
                              },
                              description: `Billet ${selectedTier.label} - ${ticketCount} place(s) pour FMB Experience`
                            }]
                          });
                        }}
                        onClick={(data, actions) => {
                          if (!buyerName.trim()) {
                            setRegistrationError("Veuillez saisir votre nom complet avant de procéder au paiement.");
                            return actions.reject();
                          }
                          setRegistrationError('');
                          return actions.resolve();
                        }}
                        onApprove={async (data, actions) => {
                          if (!actions.order) return;
                          setRegistering(true);
                          try {
                            const details = await actions.order.capture();
                            // Payment is captured successfully!
                            // Register the buyer with 'verified' (paid) status directly
                            const result = await registerBuyer(event!.id, buyerName.trim(), selectedTier.label, ticketCount, 'verified');
                            if (result.success && result.confirmationCode) {
                              // Reset state
                              setSelectedTier(null);
                              setBuyerName('');
                              setTicketCount(1);
                              // Redirect to success page
                              router.push(`/evenements/${event!.slug}/merci?code=${result.confirmationCode}&tier=${encodeURIComponent(selectedTier.label)}&quantity=${ticketCount}`);
                            } else {
                              setRegistrationError(result.error || "Paiement réussi mais échec de l'enregistrement. Contactez le support.");
                            }
                          } catch (err) {
                            console.error(err);
                            setRegistrationError("Une erreur s'est produite lors de la validation du paiement.");
                          } finally {
                            setRegistering(false);
                          }
                        }}
                        onError={(err) => {
                          console.error("PayPal Error:", err);
                          setRegistrationError("Échec du traitement par PayPal. Veuillez réessayer.");
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={registering}
                      onClick={handleRegisterFreeTicket}
                      className="glow-btn-primary w-full py-3.5 text-xs flex items-center justify-center gap-1.5 uppercase font-bold tracking-widest"
                    >
                      {registering ? 'Création...' : 'Réserver ma place gratuite'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </PayPalScriptProvider>
  );
}
