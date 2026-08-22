'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, Event } from '@/lib/supabase';
import { Calendar, MapPin, ArrowRight, Mail, ChevronRight, Music, Sparkles, ShieldCheck, HelpCircle } from 'lucide-react';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Audio / Visualizer state
  const [hasEntered, setHasEntered] = useState<'gate' | 'entering' | 'entered' | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);

  const faqItems = [
    {
      q: "Comment recevoir l'adresse secrète ?",
      a: "Une fois votre billet réservé et votre paiement PayPal effectué, votre code unique est activé automatiquement. Il vous suffit alors d'entrer ce code dans la section 'Lieu' de l'événement pour dévoiler l'adresse exacte en direct sur votre écran."
    },
    {
      q: "Le paiement en ligne est-il sécurisé ?",
      a: "Oui, à 100%. Les transactions s'effectuent directement via le protocole sécurisé de PayPal. Vos données bancaires sont cryptées de bout en bout et ne transitent jamais par notre site."
    },
    {
      q: "Puis-je acheter mon billet directement sur place ?",
      a: "Non, aucune billetterie n'est disponible sur place. Pour garantir l'ambiance intimiste et le respect des jauges de nos lieux d'exception, l'accès se fait exclusivement en prévente réservée en ligne."
    }
  ];

  useEffect(() => {
    // Check if user already clicked Enter in this session
    const entered = sessionStorage.getItem('fmb_has_entered') === 'true';
    setHasEntered(entered ? 'entered' : 'gate');

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

  const handleEnter = () => {
    try {
      // Play intro music
      const audio = new Audio('/intro.mp3');
      audio.loop = true;
      audio.volume = 0.4;

      // Fallback to Mixkit Tech House Vibes loop if local intro.mp3 does not exist
      audio.addEventListener('error', () => {
        console.log("Local intro.mp3 not found, falling back to CDN track...");
        audio.src = 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3';
        audio.play().catch(err => console.error("Audio playback blocked:", err));
      });

      audio.play()
        .then(() => {
          setAudioPlaying(true);
        })
        .catch(err => {
          console.error("Audio playback blocked:", err);
        });
      
      setAudioInstance(audio);
    } catch (e) {
      console.error("Erreur d'initialisation de l'audio:", e);
    }

    // Set transition state to trigger animation
    setHasEntered('entering');

    // Wait 2.2 seconds for transition to finish, then unmount overlay completely
    setTimeout(() => {
      sessionStorage.setItem('fmb_has_entered', 'true');
      setHasEntered('entered');
    }, 2200);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioInstance) {
        audioInstance.pause();
      }
    };
  }, [audioInstance]);

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
            <p className="text-white/40 text-xs">Chargement des soirées...</p>
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
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-400 border border-pink-500/30 uppercase tracking-widest mb-4">
                    🔥 Prochain Événement
                  </span>
                  
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
                    <span className="capitalize font-semibold">{formatDate(featuredEvent.event_date)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/80 text-sm">
                    <MapPin className="w-5 h-5 text-pink-400 flex-shrink-0" />
                    <span className="font-semibold">Lieu Secret (débloqué après achat)</span>
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
                    {otherUpcomingEvents.length} soirée{otherUpcomingEvents.length > 1 ? 's' : ''}
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
                            <h4 className="font-extrabold text-white text-sm uppercase tracking-wide group-hover:text-pink-400 transition-colors line-clamp-1">
                              {event.title}
                            </h4>
                            {event.subtitle && (
                              <p className="text-[11px] text-white/50 line-clamp-1">{event.subtitle}</p>
                            )}
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
                  FMB EXPÉRIENCE n'est pas qu'une simple soirée. C'est un concept événementiel éphémère conçu pour réunir les passionnés de nightlife autour de la meilleure sélection musicale et de cadres d'exception.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Concept 1 */}
                <div className="glass rounded-3xl border border-white/5 bg-white/[0.01] p-6 space-y-4 hover:border-purple-500/20 transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-white text-base uppercase tracking-wider">Lieux Secrets</h4>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Chaque événement se déroule dans un lieu unique et privatisé, tenu secret jusqu'au dernier moment. L'adresse exacte n'est révélée qu'aux détenteurs d'un billet vérifié.
                  </p>
                </div>

                {/* Concept 2 */}
                <div className="glass rounded-3xl border border-white/5 bg-white/[0.01] p-6 space-y-4 hover:border-pink-500/20 transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <Music className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-white text-base uppercase tracking-wider">Musique D'Élite</h4>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Vibrez au son d'une sélection musicale pointue distillée par des line-ups de DJs de premier plan et des invités de marque.
                  </p>
                </div>

                {/* Concept 3 */}
                <div className="glass rounded-3xl border border-white/5 bg-white/[0.01] p-6 space-y-4 hover:border-orange-500/20 transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="font-extrabold text-white text-base uppercase tracking-wider">Immersion Sécurisée</h4>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Des jauges intimistes et un système d'approbation manuelle des réservations pour vous assurer une sécurité totale et une ambiance de qualité tout au long de la nuit.
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
            <p className="mt-1 font-light">L'expérience exclusive de la nightlife.</p>
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

      {/* Floating Audio Controller */}
      {hasEntered === 'entered' && audioInstance && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 animate-fade-in">
          <button
            onClick={() => {
              if (audioPlaying) {
                audioInstance.pause();
                setAudioPlaying(false);
              } else {
                audioInstance.play().catch(e => console.error(e));
                setAudioPlaying(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-zinc-950/90 border border-white/10 hover:border-pink-500/30 text-white backdrop-blur-md transition-all shadow-lg text-[10px] font-black uppercase tracking-widest active:scale-95 duration-200"
          >
            {audioPlaying ? (
              <>
                <div className="flex gap-0.5 items-end h-3.5 w-4 pb-0.5">
                  <div className="w-0.5 bg-pink-500 rounded-full animate-[soundwave_0.8s_infinite_alternate]"></div>
                  <div className="w-0.5 bg-pink-400 rounded-full animate-[soundwave_0.5s_infinite_alternate_0.15s]"></div>
                  <div className="w-0.5 bg-purple-500 rounded-full animate-[soundwave_0.7s_infinite_alternate_0.3s]"></div>
                </div>
                <span>MUTE</span>
              </>
            ) : (
              <>
                <div className="flex gap-0.5 items-end h-3.5 w-4 pb-0.5">
                  <div className="w-0.5 h-1.5 bg-zinc-600 rounded-full"></div>
                  <div className="w-0.5 h-1 bg-zinc-600 rounded-full"></div>
                  <div className="w-0.5 h-2 bg-zinc-600 rounded-full"></div>
                </div>
                <span>PLAY</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Immersive Entry Gate */}
      {hasEntered !== 'entered' && hasEntered !== null && (
        <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050508] overflow-hidden ${
          hasEntered === 'entering' ? 'animate-portal-overlay' : ''
        }`}>
          {/* Neon background blobs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] animate-pulse"></div>
          
          <div className={`relative text-center space-y-8 z-10 p-6 max-w-sm transition-all duration-300 ${
            hasEntered === 'entering' ? 'animate-portal-logo' : ''
          }`}>
            {/* Animated Glow Logo */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest bg-pink-500/10 px-3 py-1 rounded-full border border-pink-500/20">
                Bienvenue dans l'Univers
              </span>
              <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-white uppercase select-none animate-pulse">
                FMB<br />
                <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-orange-400 bg-clip-text text-transparent">EXPÉRIENCE</span>
              </h1>
              <p className="text-[11px] text-pink-400/80 uppercase tracking-widest font-black">
                Une expérience à ne pas rater
              </p>
            </div>

            {/* Glowing button to enter */}
            <button
              onClick={handleEnter}
              className="glow-btn-primary w-full py-4.5 px-8 text-xs font-black uppercase tracking-widest rounded-2xl shadow-[0_0_40px_rgba(219,39,119,0.3)] transition-all transform active:scale-95 duration-300"
            >
              🔊 Activer le son & entrer
            </button>
            
            <p className="text-[9px] text-white/30 tracking-wider">
              Ce site contient des effets sonores immersifs.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
