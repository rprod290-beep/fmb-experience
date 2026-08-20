'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Event } from '@/lib/supabase';
import { 
  LogOut, 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  FileText, 
  MapPin, 
  ExternalLink 
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
        subtitle: 'Rap / Shatta / Dancehall',
        description: 'Description de la soirée...',
        contact_email: 'contact@fmb-experience.com',
        whatsapp_number: '33', // code international standard de base
        status: 'draft',
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

          <button
            onClick={handleCreateEvent}
            disabled={creating}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/15 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> {creating ? 'Création...' : 'Créer un nouvel événement'}
          </button>
        </div>

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
                    <div className="absolute top-3 left-3">
                      {event.status === 'draft' && (
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[9px] uppercase font-bold tracking-wider">
                          Brouillon
                        </span>
                      )}
                      {event.status === 'upcoming' && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] uppercase font-bold tracking-wider">
                          En ligne (À venir)
                        </span>
                      )}
                      {event.status === 'past' && (
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-500 text-[9px] uppercase font-bold tracking-wider">
                          Terminé (Passé)
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
                          {new Date(event.event_date).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
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
