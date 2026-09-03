'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, Event, DJ, TicketTier, Buyer } from '@/lib/supabase';
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
  Users,
  Copy,
  Building2,
  Landmark,
  CheckCircle2
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
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [ticketCount, setTicketCount] = useState(1);
  const [participants, setParticipants] = useState<string[]>([]);
  const [registering, setRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState('');

  // Wire Transfer Modal State
  const [wireSuccessData, setWireSuccessData] = useState<{
    code: string;
    tierLabel: string;
    price: number;
    leader: string;
    participants: string[];
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
  const [activePaymentTab, setActivePaymentTab] = useState<'paypal' | 'wire'>('paypal');

  useEffect(() => {
    if (selectedTier && selectedTier.capacity && selectedTier.capacity > 1) {
      setParticipants(Array(selectedTier.capacity - 1).fill(''));
    } else {
      setParticipants([]);
    }
    if (event?.payment_mode === 'wire_transfer') {
      setActivePaymentTab('wire');
    } else {
      setActivePaymentTab('paypal');
    }
  }, [selectedTier, event]);

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

        // 3. Récupérer tous les tarifs (actifs ou inactifs pour afficher le statut Épuisé)
        const { data: tiersData, error: tiersError } = await supabase
          .from('ticket_tiers')
          .select('*')
          .eq('event_id', eventData.id)
          .order('display_order', { ascending: true });

        if (tiersError) {
          console.error("Erreur lors de la récupération des tarifs:", tiersError);
        } else {
          setTicketTiers(tiersData || []);
        }

        // 4. Récupérer les acheteurs pour calculer les places vendues
        const { data: buyersData, error: buyersError } = await supabase
          .from('buyers')
          .select('ticket_tier_label, ticket_count, ticket_tier_id, status')
          .eq('event_id', eventData.id);

        if (buyersError) {
          console.error("Erreur lors de la récupération des acheteurs:", buyersError);
        } else {
          setBuyers(buyersData || []);
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

  // Calcule le nombre d'unités vendues pour chaque catégorie
  const getSoldUnitsForTier = (tierId: string, tierLabel: string) => {
    return buyers
      .filter(b => (b.ticket_tier_id === tierId || (!b.ticket_tier_id && b.ticket_tier_label === tierLabel)) && b.status === 'verified')
      .reduce((sum, b) => sum + (b.ticket_count || 1), 0);
  };

  const getRemainingTicketsForTier = (tier: TicketTier) => {
    if (!tier.is_active) return 0;
    const sold = getSoldUnitsForTier(tier.id, tier.label);
    if (tier.stock_quantity !== null && tier.stock_quantity !== undefined) {
      return Math.max(0, tier.stock_quantity - sold);
    }
    const capacity = tier.max_capacity ?? 100;
    return Math.max(0, capacity - sold);
  };

  const isTierSoldOut = (tier: TicketTier) => {
    return !tier.is_active || getRemainingTicketsForTier(tier) <= 0;
  };

  const isEventSoldOut = () => {
    if (event?.status === 'sold_out') return true;
    if (ticketTiers.length === 0) return false;
    return ticketTiers.every(t => isTierSoldOut(t));
  };

  const handleRegisterFreeTicket = async () => {
    if (!event || !selectedTier || !buyerName.trim()) {
      setRegistrationError("Veuillez saisir votre nom.");
      return;
    }

    if (event.category === 'trip' && selectedTier.capacity && selectedTier.capacity > 1) {
      if (participants.some(p => !p.trim())) {
        setRegistrationError("Veuillez saisir le nom de tous les participants.");
        return;
      }
    }

    setRegistering(true);
    setRegistrationError('');

    try {
      const partsToSend = event.category === 'trip' && selectedTier.capacity && selectedTier.capacity > 1
        ? participants.map(p => p.trim())
        : null;

      const result = await registerBuyer(
        event.id, 
        buyerName.trim(), 
        selectedTier.label, 
        ticketCount, 
        'verified',
        selectedTier.id,
        partsToSend
      );

      if (result.success && result.confirmationCode) {
        const savedLabel = selectedTier.label;
        // Reset state
        setSelectedTier(null);
        setBuyerName('');
        setTicketCount(1);
        setParticipants([]);
        // Redirect to success page
        router.push(`/evenements/${event.slug}/merci?code=${result.confirmationCode}&tier=${encodeURIComponent(savedLabel)}&quantity=${ticketCount}`);
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

  const handleRegisterWireTransfer = async () => {
    if (!selectedTier || !event) return;

    if (!buyerName.trim()) {
      setRegistrationError("Veuillez saisir votre prénom avant de procéder à la réservation.");
      return;
    }

    if (event.category === 'trip' && selectedTier.capacity && selectedTier.capacity > 1) {
      if (participants.some(p => !p.trim())) {
        setRegistrationError("Veuillez renseigner les prénoms de tous les participants.");
        return;
      }
    }

    setRegistrationError('');
    setRegistering(true);

    try {
      const partsToSend = event.category === 'trip' && selectedTier.capacity && selectedTier.capacity > 1 
        ? participants.map(p => p.trim()) 
        : null;

      const result = await registerBuyer(
        event.id, 
        buyerName.trim(), 
        selectedTier.label, 
        ticketCount, 
        'pending',
        selectedTier.id,
        partsToSend
      );

      if (result.success && result.confirmationCode) {
        setWireSuccessData({
          code: result.confirmationCode,
          tierLabel: selectedTier.label,
          price: ticketCount * selectedTier.price,
          leader: buyerName.trim(),
          participants: partsToSend || []
        });
      } else {
        setRegistrationError(result.error || "Une erreur s'est produite lors de la réservation.");
      }
    } catch (err) {
      console.error(err);
      setRegistrationError("Erreur lors de la réservation.");
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString: string, endDateString?: string | null) => {
    const start = new Date(dateString);
    if (!endDateString) {
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      return start.toLocaleDateString('fr-FR', options);
    }

    const end = new Date(endDateString);
    const startOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    };
    const endOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };

    return `Du ${start.toLocaleDateString('fr-FR', startOptions)} au ${end.toLocaleDateString('fr-FR', endOptions)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#050508] text-white">
        <div className="w-12 h-12 rounded-full border-2 border-pink-500/20 border-t-pink-500 animate-spin"></div>
        <p className="text-white/40 text-xs">Chargement...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 max-w-md mx-auto text-center px-4 bg-[#050508] text-white">
        <h2 className="text-3xl font-extrabold text-white">Événement Introuvable</h2>
        <p className="text-white/60 text-sm leading-relaxed">Cet événement n'existe pas ou n'est plus en ligne.</p>
        <Link href="/" className="glow-btn-primary flex items-center gap-2 text-xs">
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>
      </div>
    );
  }

  return (
    <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "EUR", enableFunding: "applepay,card", components: "buttons,funding-eligibility" }}>
      <div className="min-h-screen flex flex-col bg-[#050508] text-white pb-20 relative overflow-hidden">
        {/* Dynamic Background Aurora Glow */}
        <div className="fixed inset-0 -z-30 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-15%] w-[75vw] h-[75vw] rounded-full bg-purple-600/12 blur-[130px] aurora-blob-1"></div>
          <div className="absolute bottom-[-15%] right-[-15%] w-[75vw] h-[75vw] rounded-full bg-pink-500/12 blur-[130px] aurora-blob-2"></div>
          <div className="absolute top-[35%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-orange-500/8 blur-[100px] aurora-blob-1"></div>
        </div>
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
          <div className="mb-3">
            {event.category === 'trip' ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                ✈️ Voyage
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-widest">
                🎵 Soirée
              </span>
            )}
          </div>
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
              <span className="capitalize">{formatDate(event.event_date, event.end_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-pink-400" />
              <span>
                {event.category === 'trip' 
                  ? (event.address || 'Adresse à venir') 
                  : 'Lieu Secret'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mt-6 md:mt-10">
        
        {/* Left pane: Lineup & Infos */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Line-up DJs */}
          {djs.length > 0 && (
            <div className="glass p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 space-y-6">
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
            <div className="glass p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 space-y-4">
              <h3 className="text-lg font-black uppercase tracking-wider text-white border-b border-white/5 pb-3">
                📖 Description
              </h3>
              <p className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          {/* Infos Pratiques */}
          <div className="glass p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 space-y-4">
            <h3 className="text-lg font-black uppercase tracking-wider text-white border-b border-white/5 pb-3">
              📍 Infos Pratiques
            </h3>
            <div className="space-y-3 text-xs leading-relaxed text-white/70">
              {event.category === 'party' && (
                <div className="p-3.5 bg-purple-500/5 border border-purple-500/10 rounded-2xl flex items-start gap-3">
                  <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <p>
                    <b>Adresse Communiquée Après Achat</b> : L'emplacement de la soirée est tenu secret. Une fois votre billet réservé et validé, vous obtiendrez l'accès immédiat à l'adresse exacte.
                  </p>
                </div>
              )}
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
                alt={event.category === 'trip' ? "Affiche officielle du voyage" : "Flyer officiel de la soirée"}
                className="w-full h-auto object-contain hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          )}

          <div className="glass p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
              <h3 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                {event.slug.includes('center-parcs') ? (
                  <>
                    <span className="text-emerald-400">🏠</span> Hébergements
                  </>
                ) : event.category === 'trip' ? (
                  <>
                    <span className="text-emerald-400">✈️</span> Formules
                  </>
                ) : (
                  <>
                    <span className="text-pink-500">🎟️</span> Tickets
                  </>
                )}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] uppercase font-bold tracking-widest animate-pulse">
                {event.slug.includes('center-parcs') ? 'Cottages limités' : 'Places limitées'}
              </span>
            </div>

            {ticketTiers.length === 0 ? (
              <p className="text-white/40 text-center py-6 text-xs">Aucun billet en vente pour le moment.</p>
            ) : event.slug.includes('center-parcs') ? (
              <div className="grid grid-cols-1 gap-4">
                {ticketTiers.map((tier) => {
                  const remaining = getRemainingTicketsForTier(tier);
                  const isSoldOut = isTierSoldOut(tier);

                  return (
                    <div
                      key={tier.id}
                      onClick={() => !isSoldOut && setSelectedTier(tier)}
                      className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-4 group ${
                        isSoldOut 
                          ? 'border-red-500/20 bg-red-500/5 opacity-60 cursor-not-allowed' 
                          : selectedTier?.id === tier.id 
                            ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)] cursor-pointer' 
                            : 'border-white/5 bg-white/[0.01] hover:border-white/20 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-lg">
                            🏠
                          </div>
                          <div className="text-left">
                            <span className="font-extrabold text-white text-sm uppercase tracking-wide group-hover:text-emerald-400 transition-colors block">
                              {tier.label}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold block">
                              Cottage tout équipé • {tier.capacity || 4} personnes
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-base text-emerald-400 block">
                            {tier.price.toFixed(2)} €
                          </span>
                          <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider block">
                            par hébergement
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-t border-white/5 pt-3">
                        {isSoldOut ? (
                          <span className="text-[10px] text-red-400 bg-red-500/15 px-2.5 py-1 rounded-full border border-red-500/30 font-black uppercase tracking-wider flex items-center gap-1">
                            🔴 ÉPUISÉ
                          </span>
                        ) : remaining <= 3 ? (
                          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider animate-pulse">
                            ⚠️ Plus que {remaining} cottage{remaining > 1 ? 's' : ''} !
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                            🟢 {remaining} cottage{remaining > 1 ? 's' : ''} disponible{remaining > 1 ? 's' : ''}
                          </span>
                        )}

                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          isSoldOut 
                            ? 'text-red-400 font-extrabold' 
                            : selectedTier?.id === tier.id ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-white'
                        }`}>
                          {isSoldOut ? 'Complet' : selectedTier?.id === tier.id ? 'Sélectionné ✓' : 'Choisir ce cottage →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
                {ticketTiers.map((tier) => {
                  const remaining = getRemainingTicketsForTier(tier);
                  const isSoldOut = isTierSoldOut(tier);

                  return (
                    <div
                      key={tier.id}
                      className={`p-4 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col justify-between gap-4 group transition-all duration-300 ${
                        isSoldOut ? 'opacity-60 bg-red-500/[0.02] border-red-500/20' : ''
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-extrabold text-white text-sm uppercase tracking-wide group-hover:text-pink-400 transition-colors">
                            {tier.label}
                          </span>
                          <span className="font-black text-base text-emerald-400">
                            {tier.price.toFixed(2)} €
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
                          {isSoldOut ? (
                            <span className="text-red-400 bg-red-500/15 px-2.5 py-0.5 rounded-full border border-red-500/30">
                              🔴 ÉPUISÉ
                            </span>
                          ) : remaining <= 5 ? (
                            <span className="text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 animate-pulse">
                              ⚠️ Plus que {remaining} {event.category === 'trip' && tier.stock_quantity !== null ? 'disponibles' : 'places'} !
                            </span>
                          ) : (
                            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              🟢 {remaining} {event.category === 'trip' && tier.stock_quantity !== null ? 'disponibles' : 'places restantes'}
                            </span>
                          )}
                        </div>
                      </div>

                      {isSoldOut ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 text-xs flex items-center justify-center gap-1.5 uppercase font-bold tracking-wider bg-zinc-800/40 text-zinc-500 border border-zinc-800/50 rounded-xl cursor-not-allowed"
                        >
                          Épuisé
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedTier(tier)}
                          className="glow-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-1.5 uppercase font-bold tracking-wider"
                        >
                          <Ticket className="w-3.5 h-3.5" /> Réserver
                        </button>
                      )}
                    </div>
                  );
                })}
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
                setWireSuccessData(null);
              }}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {wireSuccessData ? (
              <div className="p-6 sm:p-8 space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    Demande Enregistrée
                  </span>
                  <h3 className="text-xl font-black text-white uppercase mt-3">
                    Virement Bancaire Requis
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Votre réservation pour <b>{wireSuccessData.tierLabel}</b> est bien enregistrée. Effectuez votre virement pour valider vos places.
                  </p>
                </div>

                {/* Référence obligatoire */}
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-left space-y-1.5">
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                    ⚠️ Motif / Libellé obligatoire du virement :
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-black text-lg text-white tracking-widest select-all">
                      {wireSuccessData.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(wireSuccessData.code);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-[10px] font-bold uppercase transition-colors flex items-center gap-1.5"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                </div>

                {/* RIB / Coordonnées bancaires */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-emerald-400" /> RIB / Coordonnées Bancaires
                    </span>
                    <span className="text-xs font-black text-emerald-400">
                      {wireSuccessData.price.toFixed(2)} €
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">Titulaire du compte :</span>
                      <span className="font-bold text-white">FMB Experience</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 font-medium block">IBAN :</span>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm select-all">
                          FR76 2823 3000 0128 8413 5530 384
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('FR7628233000012884135530384');
                            setCopiedIban(true);
                            setTimeout(() => setCopiedIban(false), 2000);
                          }}
                          className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[9px] font-bold uppercase transition-colors flex items-center gap-1"
                        >
                          {copiedIban ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedIban ? 'Copié !' : 'Copier IBAN'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accompanists recap */}
                {wireSuccessData.participants.length > 0 && (
                  <div className="text-left space-y-1 bg-white/[0.02] p-3 rounded-xl border border-white/5 text-xs">
                    <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                      Groupe & Participants enregistrés :
                    </span>
                    <p className="text-white/80 font-medium leading-relaxed">
                      <b className="text-white">Responsable :</b> {wireSuccessData.leader}<br />
                      <b className="text-white">Autres occupants :</b> {wireSuccessData.participants.join(', ')}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setWireSuccessData(null);
                    setSelectedTier(null);
                    setBuyerName('');
                    setParticipants([]);
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                >
                  J'ai effectué mon virement (Fermer)
                </button>
              </div>
            ) : (
              <div className="p-5 sm:p-8 space-y-5 sm:space-y-6">
                <div>
                  <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                    Réservation
                  </span>
                  <h3 className="text-xl font-black text-white uppercase mt-2">
                    {event?.slug.includes('center-parcs') ? "Réservation du cottage" : "Qui réserve ce billet ?"}
                  </h3>
                  <p className="text-xs text-white/40 mt-1">
                    {event?.slug.includes('center-parcs') 
                      ? `Saisissez les prénoms des occupants pour votre cottage : ${selectedTier.label}` 
                      : `Vous avez choisi le tarif ${selectedTier.label} (${selectedTier.price.toFixed(2)} €).`}
                  </p>
                  {selectedTier.description && (
                    <p className="text-[11px] text-white/60 mt-3 bg-white/[0.03] p-3 rounded-xl border border-white/5 leading-relaxed font-medium">
                      {selectedTier.description}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-2">
                      {event?.slug.includes('center-parcs') ? "Responsable de la réservation (Prénom)" : (event?.category === 'trip' ? 'Responsable de la réservation' : 'Nom Complet ou Pseudo')}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: David"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-purple-500 transition-colors text-white"
                    />
                    <p className="text-[9px] text-white/30 mt-1.5 flex items-start gap-1">
                      <Info className="w-3.5 h-3.5 flex-shrink-0" />
                      {event?.slug.includes('center-parcs') 
                        ? "Ce prénom sera utilisé pour l'enregistrement principal du cottage." 
                        : "Ce nom permettra aux organisateurs d'associer votre paiement à votre billet."}
                    </p>
                  </div>

                  {event?.category === 'trip' && selectedTier && selectedTier.capacity && selectedTier.capacity > 1 && (
                    <div className="space-y-4 pt-4 border-t border-white/5 mt-4">
                      <span className="block text-xs font-bold text-emerald-400 uppercase tracking-widest">
                        {event?.slug.includes('center-parcs')
                          ? `Prénoms des autres personnes occupant le cottage (${selectedTier.capacity - 1} pers.)`
                          : `Prénoms des autres participants (${selectedTier.capacity - 1} pers.)`}
                      </span>
                      {participants.map((p, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">
                            Occupant {idx + 2}
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={`Prénom complet de l'occupant ${idx + 2}`}
                            value={p}
                            onChange={(e) => {
                              const newParts = [...participants];
                              newParts[idx] = e.target.value;
                              setParticipants(newParts);
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-base sm:text-sm focus:outline-none focus:border-emerald-500 transition-colors text-white"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {!event?.slug.includes('center-parcs') && (
                    <div>
                      <label className="block text-xs font-bold text-white/60 uppercase tracking-widest mb-2">
                        Nombre de Places
                      </label>
                      <select
                        value={ticketCount}
                        onChange={(e) => setTicketCount(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-purple-500 transition-colors text-white cursor-pointer"
                      >
                        {Array.from(
                          { length: Math.min(10, getRemainingTicketsForTier(selectedTier)) },
                          (_, i) => i + 1
                        ).map((num) => (
                          <option key={num} value={num} className="bg-zinc-950 text-white">
                            {num} {num === 1 ? 'place' : 'places'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-3 px-4 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-xs text-white/50">Total à payer :</span>
                    <span className="text-sm font-extrabold text-white">
                      {(ticketCount * selectedTier.price).toFixed(2)} € <span className="text-[10px] text-white/40 font-normal">({ticketCount} x {selectedTier.price.toFixed(2)} €)</span>
                    </span>
                  </div>

                  {registrationError && (
                    <p className="text-xs text-pink-500 font-semibold">{registrationError}</p>
                  )}

                  <div className="space-y-3 pt-2">
                    {/* Render Tab selector if mode is 'both' or fallback */}
                    {(!event?.payment_mode || event.payment_mode === 'both') && selectedTier.price > 0 && (
                      <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-3">
                        <button
                          type="button"
                          onClick={() => setActivePaymentTab('paypal')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            activePaymentTab === 'paypal'
                              ? 'bg-purple-600 text-white shadow-lg'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          💳 Carte / Apple Pay / PayPal
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePaymentTab('wire')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                            activePaymentTab === 'wire'
                              ? 'bg-emerald-600 text-white shadow-lg'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          🏦 Virement (RIB)
                        </button>
                      </div>
                    )}

                    {/* Mode Virement */}
                    {(event?.payment_mode === 'wire_transfer' || (event?.payment_mode !== 'paypal' && activePaymentTab === 'wire')) ? (
                      <button
                        type="button"
                        disabled={registering}
                        onClick={handleRegisterWireTransfer}
                        className="glow-btn-primary w-full py-4 text-xs flex items-center justify-center gap-2 uppercase font-black tracking-widest bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      >
                        <Landmark className="w-4 h-4" />
                        {registering ? 'Enregistrement...' : 'Confirmer la réservation par Virement'}
                      </button>
                    ) : selectedTier.price > 0 ? (
                      <div className="pt-2 space-y-3">
                        {/* Visual Badges for Payment Methods */}
                        <div className="flex items-center justify-center gap-2 py-2 px-3 bg-white/5 rounded-xl border border-white/10 text-center">
                          <span className="text-[11px] font-black text-white flex items-center gap-1">
                             Apple Pay
                          </span>
                          <span className="text-white/20">•</span>
                          <span className="text-[11px] font-black text-white flex items-center gap-1">
                            💳 Carte Bancaire
                          </span>
                          <span className="text-white/20">•</span>
                          <span className="text-[11px] font-black text-purple-400 flex items-center gap-1">
                            PayPal
                          </span>
                        </div>

                        <p className="text-[10px] text-zinc-400 text-center font-medium leading-relaxed">
                          💡 Cliquez sur <b className="text-white">Carte bancaire</b> ci-dessous pour régler directement par <b className="text-white">Apple Pay</b> ou <b className="text-white">Carte Bleue</b> (sans besoin de compte PayPal).
                        </p>

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
                            if (event?.category === 'trip' && selectedTier.capacity && selectedTier.capacity > 1) {
                              if (participants.some(p => !p.trim())) {
                                setRegistrationError("Veuillez renseigner le nom de tous les participants.");
                                return actions.reject();
                              }
                            }
                            setRegistrationError('');
                            return actions.resolve();
                          }}
                          onApprove={async (data, actions) => {
                            if (!actions.order) return;
                            setRegistering(true);
                            try {
                              const details = await actions.order.capture();
                              const partsToSend = event!.category === 'trip' && selectedTier.capacity && selectedTier.capacity > 1 
                                ? participants.map(p => p.trim()) 
                                : null;

                              const result = await registerBuyer(
                                event!.id, 
                                buyerName.trim(), 
                                selectedTier.label, 
                                ticketCount, 
                                'verified',
                                selectedTier.id,
                                partsToSend
                              );
                              if (result.success && result.confirmationCode) {
                                const savedLabel = selectedTier.label;
                                setSelectedTier(null);
                                setBuyerName('');
                                setTicketCount(1);
                                setParticipants([]);
                                router.push(`/evenements/${event!.slug}/merci?code=${result.confirmationCode}&tier=${encodeURIComponent(savedLabel)}&quantity=${ticketCount}`);
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
            )}
          </div>
        </div>
      )}
    </div>
    </PayPalScriptProvider>
  );
}
