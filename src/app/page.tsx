'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, Event } from '@/lib/supabase';
import { Calendar, MapPin, ArrowRight, Mail, ChevronRight, Music, Sparkles, ShieldCheck, HelpCircle } from 'lucide-react';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);



  const faqItems = [
    {
      q: "Comment fonctionne la réservation d'un événement ou d'un séjour ?",
      a: "Sélectionnez simplement la soirée ou le voyage de votre choix. Selon l'événement, vous pouvez régler par Carte / PayPal ou effectuer un virement bancaire sur le RIB avec votre code de référence unique."
    },
    {
      q: "Les paiements sont-ils sécurisés ?",
      a: "Oui, à 100%. Les transactions par carte s'effectuent via le protocole sécurisé de PayPal. Pour les virements bancaires, la validation s'effectue manuellement dès réception des fonds par l'organisation."
    },
    {
      q: "Puis-je réserver sur place le jour même ?",
      a: "Non, aucune billetterie n'est disponible sur place. Pour garantir la qualité des prestations, la gestion des cottages et le respect des jauges, l'accès se fait exclusivement sur réservation préalable en ligne."
    }
  ];

  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        // On récupère depuis la vue sécurisée public_events
        const { data, error } = await supabase
          .from('public_events')
          .select('*')
          .order('event_date', { ascending: true });

        if (error) {
          console.error('Erreur lors de la récupération des événements:', error);
        } else {
          setEvents(data || []);
        }
      } catch (err) {
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  // Filtrer les événements à venir (upcoming)
  const upcomingEvents = events.filter(e => e.status === 'upcoming');
  
  // L'événement le plus proche à la une (le premier trié par date ascendante)
  const featuredEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;
  
  // Les autres événements à venir (tous sauf le premier)
  const otherUpcomingEvents = upcomingEvents.length > 1 ? upcomingEvents.slice(1) : [];



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

  const getDayAndMonth = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
    return { day, month };
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#050508] text-white relative overflow-hidden">
      {/* Dynamic Background Aurora Glow */}
      <div className="fixed inset-0 -z-30 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-15%] w-[75vw] h-[75vw] rounded-full bg-purple-600/12 blur-[130px] aurora-blob-1"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[75vw] h-[75vw] rounded-full bg-pink-500/12 blur-[130px] aurora-blob-2"></div>
        <div className="absolute top-[35%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-orange-500/8 blur-[100px] aurora-blob-1"></div>
      </div>
      {/* Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="font-black text-2xl tracking-widest bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-transparent group-hover:brightness-110 transition-all duration-300 drop-shadow-[0_0_15px_rgba(219,39,119,0.35)]">
              FMB EXPÉRIENCE
            </span>
          </Link>

          <Link
            href="/admin"
            className="flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white border border-white/10 hover:border-purple-500/30 hover:bg-purple-600/5 px-4 py-2 rounded-xl transition-all duration-300"
          >
            Espace Admin
          </Link>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-10 sm:space-y-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-pink-500/20 border-t-pink-500 animate-spin"></div>
            <p className="text-white/40 text-xs">Chargement des événements et séjours...</p>
          </div>
        ) : !featuredEvent ? (
          // Empty State
          <div className="glass-card text-center py-20 max-w-md mx-auto rounded-3xl border border-white/5 mt-10">
            <Music className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Aucun événement à venir</h3>
            <p className="text-white/50 text-sm mb-8 leading-relaxed">
              Nous préparons actuellement nos prochains concepts exclusifs. Restez connectés pour ne rien rater !
            </p>
            <div className="w-12 h-12 rounded-full bg-pink-600/10 blur-[10px] mx-auto pointer-events-none"></div>
          </div>
        ) : (
          <>
            {/* 1. FEATURED EVENT (A LA UNE) */}
            <section className="relative rounded-3xl overflow-hidden glass border border-white/10 hover:border-pink-500/30 shadow-[0_0_40px_rgba(147,51,234,0.1)] hover:shadow-[0_0_60px_rgba(219,39,119,0.3)] transition-all duration-500 group animate-fade-in">
              <div className="absolute inset-0 -z-10">
                {featuredEvent.cover_image_url ? (
                  <img
                    src={featuredEvent.cover_image_url}
                    alt={featuredEvent.title}
                    className="w-full h-full object-cover opacity-35 group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-900/20 via-zinc-950 to-pink-900/20"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/60 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#050508] via-transparent to-transparent hidden md:block"></div>
              </div>

              {/* Card Details */}
              <div className="p-6 sm:p-12 lg:p-16 flex flex-col justify-end min-h-[50vh] sm:min-h-[55vh] md:min-h-[60vh] max-w-3xl space-y-4 sm:space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 uppercase tracking-widest">
                      🔥 Prochain Événement
                    </span>
                    {featuredEvent.category === 'trip' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                        ✈️ Voyage
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-widest">
                        🎵 Soirée
                      </span>
                    )}
                  </div>
                  
                  <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white mb-2 leading-none">
                    {featuredEvent.title}
                  </h2>
                  
                  {featuredEvent.subtitle && (
                    <p className="text-orange-400 font-bold text-xs sm:text-lg tracking-wider mb-3 sm:mb-4 uppercase">
                      {featuredEvent.subtitle}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-white/80 text-sm">
                    <Calendar className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <span className="capitalize font-semibold">{formatDate(featuredEvent.event_date, featuredEvent.end_date)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/80 text-sm">
                    <MapPin className="w-5 h-5 text-pink-400 flex-shrink-0" />
                    <span className="font-semibold">
                      {featuredEvent.category === 'trip' 
                        ? (featuredEvent.address || 'Adresse à venir') 
                        : 'Lieu Secret (débloqué après achat)'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 sm:pt-4">
                  <Link
                    href={`/evenements/${featuredEvent.slug}`}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-500 hover:via-pink-500 hover:to-orange-400 text-white font-extrabold text-xs sm:text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(219,39,119,0.35)] hover:shadow-[0_0_40px_rgba(219,39,119,0.5)] transition-all duration-300 active:scale-[0.98]"
                  >
                    Voir l'événement <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Glowing Corner Accents */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-pink-500/10 to-transparent blur-[40px] pointer-events-none"></div>
            </section>

            {/* 2. OTHER UPCOMING EVENTS */}
            {otherUpcomingEvents.length > 0 && (
              <section className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white/90">
                    Aussi à l'affiche
                  </h3>
                  <span className="text-xs text-white/40 uppercase tracking-widest font-semibold">
                    {otherUpcomingEvents.length} événement{otherUpcomingEvents.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherUpcomingEvents.map((event) => {
                    const { day, month } = getDayAndMonth(event.event_date);
                    return (
                      <Link
                        key={event.id}
                        href={`/evenements/${event.slug}`}
                        className="glass rounded-2xl border border-white/5 bg-white/[0.02] p-5 flex items-center justify-between group hover:border-pink-500/30 hover:shadow-[0_0_20px_rgba(219,39,119,0.15)] hover:bg-white/[0.04] transition-all duration-300"
                      >
                        <div className="flex items-center gap-4">
                          {/* Compact Date Box */}
                          <div className="w-14 h-14 rounded-xl bg-white/5 flex flex-col items-center justify-center flex-shrink-0 border border-white/5 text-center uppercase">
                            <span className="text-lg font-black text-white leading-none">{day}</span>
                            <span className="text-[10px] font-bold text-orange-400 leading-none mt-1">{month}</span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {event.category === 'trip' ? (
                                <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">✈️ Voyage</span>
                              ) : (
                                <span className="text-[9px] font-black text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 uppercase tracking-wider">🎵 Soirée</span>
                              )}
                            </div>
                            <h4 className="font-extrabold text-white text-sm uppercase tracking-wide group-hover:text-pink-400 transition-colors line-clamp-1">
                              {event.title}
                            </h4>
                            <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wide">
                              {formatDate(event.event_date, event.end_date)}
                            </p>
                          </div>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-pink-600 flex items-center justify-center flex-shrink-0 transition-all duration-300 text-white/60 group-hover:text-white">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
        {/* ========================================== */}
        {/* 3. CONCEPT & VALEURS SECTION               */}
        {/* ========================================== */}
        {!loading && (
          <>
            <section className="pt-12 border-t border-white/5 space-y-8">
              <div className="text-center max-w-3xl mx-auto space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" /> L'Esprit FMB EXPÉRIENCE
                </span>
                <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                  Bienvenue dans l'inédit
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  FMB EXPÉRIENCE crée des moments d'exception. Que ce soit pour une soirée privée mémorable ou un séjour immersif entre amis (voyages, cottages, escapades), nous sélectionnons des cadres d'exception et une ambiance inégalée.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Concept 1 */}
                <div className="glass rounded-3xl border border-white/5 bg-white/[0.01] p-6 space-y-4 hover:border-purple-500/20 transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-white text-base uppercase tracking-wider">Lieux & Destinations Exclusifs</h4>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Des domaines privatisés aux hébergements haut de gamme (villas, cottages, séjours), chaque événement ou voyage se déroule dans un cadre d'exception soigneusement sélectionné.
                  </p>
                </div>

                {/* Concept 2 */}
                <div className="glass rounded-3xl border border-white/5 bg-white/[0.01] p-6 space-y-4 hover:border-pink-500/20 transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <Music className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-white text-base uppercase tracking-wider">Ambiances Sur-Mesure</h4>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Vibrez au son d'une atmosphère raffinée, rythmée par nos meilleures sélections musicales, line-ups de DJs de premier plan et animations exclusives.
                  </p>
                </div>

                {/* Concept 3 */}
                <div className="glass rounded-3xl border border-white/5 bg-white/[0.01] p-6 space-y-4 hover:border-orange-500/20 transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-white text-base uppercase tracking-wider">Immersion & Sécurité</h4>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Des jauges maîtrisées, un système d'enregistrement sur-mesure pour les groupes et un accompagnement dédié pour vous garantir une expérience inoubliable.
                  </p>
                </div>
              </div>
            </section>

            {/* ========================================== */}
            {/* 4. FAQ ACCORDION SECTION                   */}
            {/* ========================================== */}
            <section className="pt-12 border-t border-white/5 space-y-8">
              <div className="text-center max-w-3xl mx-auto space-y-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-pink-500/10 text-pink-400 border border-pink-500/20 uppercase tracking-widest">
                  <HelpCircle className="w-3.5 h-3.5" /> Des questions ?
                </span>
                <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                  Foire Aux Questions
                </h3>
              </div>

              <div className="max-w-3xl mx-auto space-y-4">
                {faqItems.map((item, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div 
                      key={idx}
                      className="glass border rounded-2xl bg-white/[0.01] overflow-hidden transition-all duration-305"
                      style={{ borderColor: isOpen ? 'rgba(219, 39, 119, 0.3)' : 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                      >
                        <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">{item.q}</span>
                        <ChevronRight 
                          className="w-5 h-5 text-pink-400 transition-transform duration-300 flex-shrink-0 ml-4" 
                          style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        />
                      </button>
                      
                      <div 
                        className="transition-all duration-300 ease-in-out"
                        style={{ 
                          maxHeight: isOpen ? '200px' : '0px',
                          opacity: isOpen ? 1 : 0,
                          visibility: isOpen ? 'visible' : 'hidden'
                        }}
                      >
                        <p className="px-6 pb-5 text-white/50 text-xs sm:text-sm leading-relaxed border-t border-white/5 pt-4">
                          {item.a}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 bg-black/50 text-white/40 mt-auto text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <span className="font-black tracking-widest text-sm text-white/80">FMB EXPÉRIENCE</span>
            <p className="mt-1 font-light">Créateur d'événements, séjours & expériences d'exception.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            {featuredEvent && (
              <a
                href={`mailto:${featuredEvent.contact_email}`}
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
              >
                <Mail className="w-4 h-4 text-purple-400" />
                {featuredEvent.contact_email}
              </a>
            )}
            
            {featuredEvent && featuredEvent.instagram_url && (
              <a
                href={featuredEvent.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-pink-400 transition-colors"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-pink-400">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                Instagram
              </a>
            )}
          </div>

          <div className="text-center md:text-right">
            <p>© {new Date().getFullYear()} FMB Expérience. Tous droits réservés.</p>
          </div>
        </div>
      </footer>


    </div>
  );
}
