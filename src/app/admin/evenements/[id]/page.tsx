'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Event, DJ, TicketTier, Buyer } from '@/lib/supabase';
import { checkAndDisableTierIfOutOfStock } from '@/app/actions';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Pencil, 
  Plus, 
  Upload, 
  Calendar, 
  Users, 
  Music, 
  Ticket, 
  Check, 
  Clock, 
  UserCheck, 
  AlertTriangle,
  FileText,
  Sparkles
} from 'lucide-react';

interface PageProps {
  params: {
    id: string;
  };
}

export default function EditEventPage({ params }: PageProps) {
  const { id } = params;
  const router = useRouter();

  // Loaders & Errors
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Database Data
  const [event, setEvent] = useState<Partial<Event>>({});
  const [djs, setDjs] = useState<DJ[]>([]);
  const [ticketTiers, setTicketTiers] = useState<TicketTier[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);

  // Sub-forms states
  const [djForm, setDjForm] = useState({ name: '', photo_url: '', instagram_url: '' });
  const [tierForm, setTierForm] = useState({ 
    label: '', 
    description: '', 
    price: '', 
    payment_link: '', 
    paypal_link: '',
    display_order: '0', 
    is_active: true,
    capacity: '',
    stock_quantity: ''
  });
  const [editingTierId, setEditingTierId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuthAndLoad() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin/login');
      } else {
        loadAllData();
      }
    }
    checkAuthAndLoad();
  }, [id, router]);

  async function loadAllData() {
    try {
      setLoading(true);
      
      // 1. Charger l'événement
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (eventError || !eventData) {
        console.error("Erreur lors de la récupération de l'événement:", eventError);
        alert("Impossible de charger cet événement.");
        router.push('/admin');
        return;
      }

      // Convertir la date TIMESTAMPTZ en format YYYY-MM-DDThh:mm pour l'input datetime-local
      const localDate = new Date(eventData.event_date).toISOString().slice(0, 16);
      const localEndDate = eventData.end_date 
        ? new Date(eventData.end_date).toISOString().slice(0, 16) 
        : '';
      setEvent({
        ...eventData,
        event_date: localDate,
        end_date: localEndDate
      });

      // 2. Charger les DJs
      const { data: djsData } = await supabase
        .from('djs')
        .select('*')
        .eq('event_id', id);
      setDjs(djsData || []);

      // 3. Charger les Tarifs
      const { data: tiersData } = await supabase
        .from('ticket_tiers')
        .select('*')
        .eq('event_id', id)
        .order('display_order', { ascending: true });
      setTicketTiers(tiersData || []);

      // 4. Charger les Acheteurs
      const { data: buyersData } = await supabase
        .from('buyers')
        .select('*')
        .eq('event_id', id)
        .order('created_at', { ascending: false });
      setBuyers(buyersData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // =========================================================================
  // GENERAL INFO & COVER UPLOAD
  // =========================================================================
  const handleSaveGeneralInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Sauvegarder les infos de l'événement
      const isoDate = new Date(event.event_date || '').toISOString();
      const isoEndDate = event.end_date ? new Date(event.end_date).toISOString() : null;
      const payload = {
        title: event.title,
        slug: event.slug,
        subtitle: event.subtitle,
        description: event.description,
        secret_address: event.secret_address,
        cover_image_url: event.cover_image_url,
        contact_email: event.contact_email,
        instagram_url: event.instagram_url,
        whatsapp_number: event.whatsapp_number,
        status: event.status,
        category: event.category || 'party',
        event_date: isoDate,
        end_date: isoEndDate
      };

      const { error } = await supabase
        .from('events')
        .update(payload)
        .eq('id', id);

      if (error) {
        alert("Erreur lors de la sauvegarde : " + error.message);
        return;
      }

      // 2. Si l'utilisateur a saisi un DJ mais a oublié de cliquer sur le bouton d'ajout
      if (djForm.name.trim()) {
        const { data: djData, error: djError } = await supabase
          .from('djs')
          .insert([{
            event_id: id,
            name: djForm.name.trim(),
            photo_url: djForm.photo_url.trim() || null,
            instagram_url: djForm.instagram_url.trim() || null
          }])
          .select()
          .single();
          
        if (!djError && djData) {
          setDjs(prev => [...prev, djData]);
          setDjForm({ name: '', photo_url: '', instagram_url: '' });
        }
      }

      // 3. Si l'utilisateur a saisi un Tarif mais a oublié de cliquer sur le bouton d'ajout
      if (tierForm.label.trim() && tierForm.price) {
        const { data: tierData, error: tierError } = await supabase
          .from('ticket_tiers')
          .insert([{
            event_id: id,
            label: tierForm.label.trim(),
            description: tierForm.description.trim() || null,
            price: parseFloat(tierForm.price),
            payment_link: 'https://paypal.com',
            paypal_link: 'https://paypal.com',
            display_order: parseInt(tierForm.display_order) || 0,
            max_capacity: parseInt(tierForm.max_capacity) || 100,
            is_active: tierForm.is_active
          }])
          .select()
          .single();
          
        if (!tierError && tierData) {
          setTicketTiers(prev => [...prev, tierData].sort((a, b) => a.display_order - b.display_order));
          setTierForm({ label: '', description: '', price: '', payment_link: '', paypal_link: '', display_order: '0', max_capacity: '100', is_active: true });
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Une erreur s'est produite lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}-${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      // Upload fichier sur Supabase Storage (Bucket "covers")
      const { error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('covers')
        .getPublicUrl(filePath);

      setEvent(prev => ({ ...prev, cover_image_url: publicUrl }));
      alert("Image téléversée avec succès ! Pensez à cliquer sur 'Enregistrer les modifications' en bas du bloc pour sauvegarder.");

    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de l'upload : " + err.message + "\n\nAssurez-vous d'avoir créé un bucket PUBLIC nommé 'covers' dans l'onglet Storage de Supabase.");
    } finally {
      setUploading(false);
    }
  };

  // =========================================================================
  // DJs SECTION
  // =========================================================================
  const handleAddDj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!djForm.name) return;

    const { data, error } = await supabase
      .from('djs')
      .insert([{
        event_id: id,
        name: djForm.name.trim(),
        photo_url: djForm.photo_url.trim() || null,
        instagram_url: djForm.instagram_url.trim() || null
      }])
      .select()
      .single();

    if (error) {
      alert(error.message);
    } else if (data) {
      setDjs(prev => [...prev, data]);
      setDjForm({ name: '', photo_url: '', instagram_url: '' });
    }
  };

  const handleDeleteDj = async (djId: string) => {
    if (!confirm('Retirer ce DJ de la line-up ?')) return;

    const { error } = await supabase
      .from('djs')
      .delete()
      .eq('id', djId);

    if (error) {
      alert(error.message);
    } else {
      setDjs(prev => prev.filter(dj => dj.id !== djId));
    }
  };

  // =========================================================================
  // TICKET TIERS (VAGUES)
  // =========================================================================
  const getReservedCountForTier = (tierId: string, tierLabel: string) => {
    return buyers
      .filter(b => (b.ticket_tier_id === tierId || (!b.ticket_tier_id && b.ticket_tier_label === tierLabel)) && b.status === 'verified')
      .reduce((sum, b) => sum + (b.ticket_count || 1), 0);
  };

  const handleEditTierClick = (tier: any) => {
    setEditingTierId(tier.id);
    setTierForm({
      label: tier.label,
      description: tier.description || '',
      price: tier.price.toString(),
      payment_link: tier.payment_link || '',
      paypal_link: tier.paypal_link || '',
      display_order: tier.display_order.toString(),
      max_capacity: (tier.max_capacity ?? 100).toString(),
      is_active: tier.is_active,
      capacity: tier.capacity !== undefined && tier.capacity !== null ? tier.capacity.toString() : '',
      stock_quantity: tier.stock_quantity !== undefined && tier.stock_quantity !== null ? tier.stock_quantity.toString() : ''
    });
  };

  const handleCancelEditTier = () => {
    setEditingTierId(null);
    setTierForm({ label: '', description: '', price: '', payment_link: '', paypal_link: '', display_order: '0', max_capacity: '100', is_active: true, capacity: '', stock_quantity: '' });
  };

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierForm.label || !tierForm.price) return;

    const capacityValue = event.category === 'trip' && tierForm.capacity ? parseInt(tierForm.capacity) : null;
    const stockQuantityValue = event.category === 'trip' && tierForm.stock_quantity ? parseInt(tierForm.stock_quantity) : null;

    if (editingTierId) {
      // Mode modification
      const { data, error } = await supabase
        .from('ticket_tiers')
        .update({
          label: tierForm.label.trim(),
          description: tierForm.description.trim() || null,
          price: parseFloat(tierForm.price),
          display_order: parseInt(tierForm.display_order) || 0,
          max_capacity: parseInt(tierForm.max_capacity) || 100,
          is_active: tierForm.is_active,
          capacity: capacityValue,
          stock_quantity: stockQuantityValue
        })
        .eq('id', editingTierId)
        .select()
        .single();

      if (error) {
        alert(error.message);
      } else if (data) {
        setTicketTiers(prev => prev.map(t => t.id === editingTierId ? data : t).sort((a, b) => a.display_order - b.display_order));
        setEditingTierId(null);
        setTierForm({ label: '', description: '', price: '', payment_link: '', paypal_link: '', display_order: '0', max_capacity: '100', is_active: true, capacity: '', stock_quantity: '' });
      }
    } else {
      // Mode création
      const { data, error } = await supabase
        .from('ticket_tiers')
        .insert([{
          event_id: id,
          label: tierForm.label.trim(),
          description: tierForm.description.trim() || null,
          price: parseFloat(tierForm.price),
          payment_link: tierForm.payment_link.trim() || 'https://paypal.com',
          paypal_link: tierForm.paypal_link.trim() || 'https://paypal.com',
          display_order: parseInt(tierForm.display_order) || 0,
          max_capacity: parseInt(tierForm.max_capacity) || 100,
          is_active: tierForm.is_active,
          capacity: capacityValue,
          stock_quantity: stockQuantityValue
        }])
        .select()
        .single();

      if (error) {
        alert(error.message);
      } else if (data) {
        setTicketTiers(prev => [...prev, data].sort((a, b) => a.display_order - b.display_order));
        setTierForm({ label: '', description: '', price: '', payment_link: '', paypal_link: '', display_order: '0', max_capacity: '100', is_active: true, capacity: '', stock_quantity: '' });
      }
    }
  };

  const handleToggleTierActive = async (tierId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from('ticket_tiers')
      .update({ is_active: newStatus })
      .eq('id', tierId);

    if (error) {
      alert(error.message);
    } else {
      setTicketTiers(prev => prev.map(t => t.id === tierId ? { ...t, is_active: newStatus } : t));
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm('Supprimer ce tarif ?')) return;

    const { error } = await supabase
      .from('ticket_tiers')
      .delete()
      .eq('id', tierId);

    if (error) {
      alert(error.message);
    } else {
      setTicketTiers(prev => prev.filter(t => t.id !== tierId));
    }
  };

  // =========================================================================
  // BUYERS VERIFICATION
  // =========================================================================
  const handleUpdateBuyerStatus = async (buyerId: string, newStatus: Buyer['status']) => {
    const { error } = await supabase
      .from('buyers')
      .update({ status: newStatus })
      .eq('id', buyerId);

    if (error) {
      alert("Erreur: " + error.message);
    } else {
      setBuyers(prev => prev.map(b => b.id === buyerId ? { ...b, status: newStatus } : b));
      if (newStatus === 'verified') {
        const buyer = buyers.find(b => b.id === buyerId);
        if (buyer && buyer.ticket_tier_id) {
          await checkAndDisableTierIfOutOfStock(buyer.ticket_tier_id);
          // Recharger les ticket tiers pour refléter le changement d'état d'activation
          const { data: tiersData } = await supabase
            .from('ticket_tiers')
            .select('*')
            .eq('event_id', id)
            .order('display_order', { ascending: true });
          if (tiersData) setTicketTiers(tiersData);
        }
      }
    }
  };

  const handleUpdateBuyerNotes = async (buyerId: string, notes: string) => {
    const { error } = await supabase
      .from('buyers')
      .update({ notes })
      .eq('id', buyerId);

    if (error) {
      console.error(error);
    } else {
      setBuyers(prev => prev.map(b => b.id === buyerId ? { ...b, notes } : b));
    }
  };

  const handleUpdateBuyerName = async (buyerId: string, name: string) => {
    const { error } = await supabase
      .from('buyers')
      .update({ name_or_pseudo: name })
      .eq('id', buyerId);

    if (error) {
      console.error(error);
    } else {
      setBuyers(prev => prev.map(b => b.id === buyerId ? { ...b, name_or_pseudo: name } : b));
    }
  };

  const handleUpdateBuyerTier = async (buyerId: string, tierLabel: string) => {
    const { error } = await supabase
      .from('buyers')
      .update({ ticket_tier_label: tierLabel })
      .eq('id', buyerId);

    if (error) {
      console.error(error);
    } else {
      setBuyers(prev => prev.map(b => b.id === buyerId ? { ...b, ticket_tier_label: tierLabel } : b));
    }
  };

  const handleUpdateBuyerTicketCount = async (buyerId: string, count: number) => {
    if (count < 1) return;
    const { error } = await supabase
      .from('buyers')
      .update({ ticket_count: count })
      .eq('id', buyerId);

    if (error) {
      console.error(error);
    } else {
      setBuyers(prev => prev.map(b => b.id === buyerId ? { ...b, ticket_count: count } : b));
    }
  };

  const handleDeleteBuyer = async (buyerId: string) => {
    if (!confirm("Supprimer cet acheteur de la liste ?")) return;

    const { error } = await supabase
      .from('buyers')
      .delete()
      .eq('id', buyerId);

    if (error) {
      alert(error.message);
    } else {
      setBuyers(prev => prev.filter(b => b.id !== buyerId));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-950 text-white">
        <div className="w-10 h-10 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin"></div>
        <p className="text-zinc-400 text-xs">Chargement du configurateur...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans pb-20">
      
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 text-purple-400" /> Retour au Tableau de Bord
          </Link>
          
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-sm tracking-wider text-white">
              ÉDITEUR ÉVÉNEMENT
            </span>
          </div>
        </div>
      </header>

      {/* Configuration Core */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        
        {/* Title Block */}
        <div className="border-b border-zinc-800 pb-4">
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            {event.title || 'Soirée Vierge'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Configurez les détails, importez le flyer, gérez la line-up, configurez les vagues de billetterie et vérifiez les preuves de paiement.
          </p>
        </div>

        {/* 1. BLOC GENERAL INFO FORM */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" /> 1. Informations Générales
          </h3>

          <form onSubmit={handleSaveGeneralInfo} className="space-y-4 text-xs text-zinc-400">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">Titre de l'événement</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: DEAD OR ALIVE ou Center Parcs"
                  value={event.title || ''}
                  onChange={(e) => setEvent({ ...event, title: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">Slug URL unique (généré pour l'adresse /evenements/[slug])</label>
                <input
                  type="text"
                  required
                  placeholder="ex: dead-or-alive-2"
                  value={event.slug || ''}
                  onChange={(e) => setEvent({ ...event, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-') })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1.5 text-zinc-300">Sous-titre / Accroche</label>
              <input
                type="text"
                placeholder="Ex: L'expérience exclusive"
                value={event.subtitle || ''}
                onChange={(e) => setEvent({ ...event, subtitle: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">Catégorie</label>
                <select
                  value={event.category || 'party'}
                  onChange={(e: any) => setEvent({ ...event, category: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="party">🎵 Soirée</option>
                  <option value="trip">✈️ Voyage</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">Date de Début</label>
                <input
                  type="datetime-local"
                  required
                  value={event.event_date || ''}
                  onChange={(e) => setEvent({ ...event, event_date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">Date de Fin (Voyages)</label>
                <input
                  type="datetime-local"
                  value={event.end_date || ''}
                  onChange={(e) => setEvent({ ...event, end_date: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">Statut de publication</label>
                <select
                  value={event.status || 'draft'}
                  onChange={(e: any) => setEvent({ ...event, status: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="draft">Brouillon (Non visible sur le site public)</option>
                  <option value="upcoming">À venir (Visible à la une ou en liste)</option>
                  <option value="past">Passé (Visible dans la catégorie "Passés")</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">Adresse secrète / Lieu (dévoilé après validation)</label>
                <input
                  type="text"
                  placeholder="Ex: 45 Rue Pierre Charron, Paris ou Center Parcs"
                  value={event.secret_address || ''}
                  onChange={(e) => setEvent({ ...event, secret_address: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">Image de couverture (Flyer)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="URL de l'image de couverture..."
                    value={event.cover_image_url || ''}
                    onChange={(e) => setEvent({ ...event, cover_image_url: e.target.value })}
                    className="flex-grow bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                  <label className="flex items-center gap-1.5 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold cursor-pointer transition-colors border border-zinc-700 text-xs">
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? 'Upload...' : 'Uploader'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadCover}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1.5 text-zinc-300">Description</label>
              <textarea
                rows={4}
                placeholder="Description complète, directives, infos d'accès..."
                value={event.description || ''}
                onChange={(e) => setEvent({ ...event, description: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-zinc-800/80 pt-4">
              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">E-mail de contact organisateur</label>
                <input
                  type="email"
                  required
                  placeholder="contact@fmb-experience.com"
                  value={event.contact_email || ''}
                  onChange={(e) => setEvent({ ...event, contact_email: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">Lien du compte Instagram de l'événement</label>
                <input
                  type="url"
                  placeholder="https://instagram.com/fmb.experience"
                  value={event.instagram_url || ''}
                  onChange={(e) => setEvent({ ...event, instagram_url: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">WhatsApp Organisateur (Format international sans le +)</label>
                <input
                  type="text"
                  required
                  placeholder="ex: 33760304287"
                  value={event.whatsapp_number || ''}
                  onChange={(e) => setEvent({ ...event, whatsapp_number: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-zinc-800/80 gap-3 items-center">
              {saveSuccess && (
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Modifications enregistrées !
                </span>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all"
              >
                <Save className="w-4 h-4" /> {saving ? 'Sauvegarde...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </form>
        </div>

        {/* DJs & TICKET TIERS GRID SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* DJs COLUMN */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              {event.category === 'trip' ? (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-400" /> 2. Activités & Prestations incluses
                </>
              ) : (
                <>
                  <Music className="w-4 h-4 text-pink-500" /> 2. Gestion de la Line-up DJs
                </>
              )}
            </h3>

            {/* Add DJ Form */}
            <form onSubmit={handleAddDj} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3 text-xs text-zinc-400">
              <div>
                <label className="block font-semibold mb-1 text-zinc-300">
                  {event.category === 'trip' ? "Nom de la prestation ou de l'activité" : "Nom de scène du DJ"}
                </label>
                <input
                  type="text"
                  required
                  placeholder={event.category === 'trip' ? "Ex: Cottage VIP Premium 4 pers." : "DJ Snake"}
                  value={djForm.name}
                  onChange={(e) => setDjForm({ ...djForm, name: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-300">URL Photo (facultatif)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={djForm.photo_url}
                    onChange={(e) => setDjForm({ ...djForm, photo_url: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-zinc-300">
                    {event.category === 'trip' ? "Lien d'information (facultatif)" : "Lien Instagram (facultatif)"}
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={djForm.instagram_url}
                    onChange={(e) => setDjForm({ ...djForm, instagram_url: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> {event.category === 'trip' ? "Ajouter la prestation" : "Ajouter à la Line-up"}
              </button>
            </form>

            {/* DJs list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {djs.length === 0 ? (
                <p className="text-zinc-500 text-center py-6 text-xs font-medium">
                  {event.category === 'trip' ? "Aucune prestation configurée." : "Aucun DJ configuré."}
                </p>
              ) : (
                djs.map((dj) => (
                  <div key={dj.id} className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {dj.photo_url ? (
                        <img
                          src={dj.photo_url}
                          alt={dj.name}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-800"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-pink-500/10 text-pink-400 font-bold flex items-center justify-center">
                          {dj.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="font-extrabold text-white">{dj.name}</span>
                    </div>

                    <button
                      onClick={() => handleDeleteDj(dj.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/15 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TICKET TIERS COLUMN */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
              <Ticket className="w-4 h-4 text-pink-500" /> 3. Tarifs de Billetterie (Vagues de prix)
            </h3>

            {/* Add Tier Form */}
            <form onSubmit={handleAddTier} className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-3 text-xs text-zinc-400">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-300">Libellé du tarif</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Vague 1 - Early Bird"
                    value={tierForm.label}
                    onChange={(e) => setTierForm({ ...tierForm, label: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-zinc-300">Prix (€)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="20.00"
                    value={tierForm.price}
                    onChange={(e) => setTierForm({ ...tierForm, price: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-zinc-300">Description</label>
                <input
                  type="text"
                  placeholder="Ex: Entrée seule valable avant 23h"
                  value={tierForm.description}
                  onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-white focus:outline-none"
                />
              </div>
              {event.category === 'trip' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  <div>
                    <label className="block font-semibold mb-1 text-zinc-300">Capacité du tarif (nombre d'accompagnants)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Ex: 6 (pour un cottage de 6 personnes)"
                      value={tierForm.capacity}
                      onChange={(e) => setTierForm({ ...tierForm, capacity: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-zinc-300">Stock disponible (cottages/unités)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Ex: 5"
                      value={tierForm.stock_quantity}
                      onChange={(e) => setTierForm({ ...tierForm, stock_quantity: e.target.value })}
                      className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-white focus:outline-none"
                    />
                    <p className="text-[9px] text-zinc-500 mt-1">Laissez vide si vous n'avez pas encore de limite fixée.</p>
                  </div>
                </div>
              )}
              {/* Note: SumUp and PayPal links are now automated via the global PayPal integration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-zinc-300">Capacité (places)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="100"
                    value={tierForm.max_capacity}
                    onChange={(e) => setTierForm({ ...tierForm, max_capacity: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-zinc-300">Ordre d'affichage</label>
                  <input
                    type="number"
                    value={tierForm.display_order}
                    onChange={(e) => setTierForm({ ...tierForm, display_order: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-850 rounded-lg px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={tierForm.is_active}
                    onChange={(e) => setTierForm({ ...tierForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded bg-zinc-900 border-zinc-800 text-purple-600 focus:ring-0 focus:ring-offset-0 mr-2 cursor-pointer"
                  />
                  <label htmlFor="is_active" className="font-semibold cursor-pointer text-zinc-300">Activer ce tarif</label>
                </div>
              </div>
              {editingTierId ? (
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs shadow-md"
                  >
                    <Save className="w-3.5 h-3.5" /> Modifier le Tarif
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEditTier}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold rounded-lg transition-colors text-xs"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter la Catégorie
                </button>
              )}
            </form>

            {/* Ticket tiers list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {ticketTiers.length === 0 ? (
                <p className="text-zinc-500 text-center py-6 text-xs font-medium">Aucun tarif configuré.</p>
              ) : (
                ticketTiers.map((tier) => (
                  <div key={tier.id} className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white">{tier.label}</span>
                        <span className="font-bold text-emerald-400">{tier.price.toFixed(2)} €</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-semibold mt-1">
                        <span>Capacité : <b>{tier.max_capacity ?? 100}</b> places</span>
                        {event.category === 'trip' && tier.capacity && (
                          <span className="text-zinc-500">• Groupe : <b>{tier.capacity}</b> pers.</span>
                        )}
                        {event.category === 'trip' && tier.stock_quantity !== null && tier.stock_quantity !== undefined && (
                          <span className={`${getReservedCountForTier(tier.id, tier.label) >= tier.stock_quantity ? 'text-red-400 font-extrabold animate-pulse' : 'text-purple-400'} ml-1`}>
                            • Stock : <b>{getReservedCountForTier(tier.id, tier.label)} / {tier.stock_quantity}</b> {getReservedCountForTier(tier.id, tier.label) >= tier.stock_quantity ? 'COMPLET' : 'réservés'}
                          </span>
                        )}
                      </div>
                      {/* Payment tags removed since PayPal is integrated globally */}
                      {tier.description && (
                        <p className="text-[10px] text-zinc-500 mt-0.5">{tier.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleTierActive(tier.id, tier.is_active)}
                        className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase border transition-colors ${
                          tier.is_active 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                            : 'bg-zinc-800 text-zinc-500 border-zinc-750 hover:bg-zinc-700'
                        }`}
                      >
                        {tier.is_active ? 'Actif' : 'Inactif'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditTierClick(tier)}
                        className="p-1.5 text-zinc-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTier(tier.id)}
                        className="p-1.5 text-red-400 hover:bg-red-500/15 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* 4. BUYERS TABLE (VERIFICATION) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" /> 4. Liste des Acheteurs & Réservations
          </h3>

          {buyers.length === 0 ? (
            <p className="text-zinc-500 text-center py-10 text-xs font-medium border border-dashed border-zinc-800 rounded-2xl">
              Aucun acheteur enregistré pour cette soirée.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Code Unique</th>
                      <th className="px-6 py-4">Nom / Pseudo</th>
                      <th className="px-6 py-4">Tarif</th>
                      <th className="px-6 py-4">Places</th>
                      <th className="px-6 py-4">Statut</th>
                      <th className="px-6 py-4">Notes internes</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {buyers.map((buyer) => (
                      <tr key={buyer.id} className="hover:bg-zinc-900/40 transition-colors">
                        {/* Code */}
                        <td className="px-6 py-4 font-mono font-bold tracking-widest text-purple-400 text-sm select-all">
                          {buyer.confirmation_code}
                        </td>
                        {/* Name */}
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={buyer.name_or_pseudo || ''}
                            onChange={(e) => handleUpdateBuyerName(buyer.id, e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-zinc-800 focus:border-purple-500 focus:outline-none py-1 text-white font-semibold w-full text-xs"
                          />
                        </td>
                        {/* Tier Label */}
                        <td className="px-6 py-4">
                          <select
                            value={buyer.ticket_tier_label || ''}
                            onChange={(e) => handleUpdateBuyerTier(buyer.id, e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-zinc-850 focus:border-purple-500 focus:outline-none py-1 text-pink-400 font-semibold cursor-pointer w-full text-xs"
                          >
                            <option value="" className="bg-zinc-950 text-white">—</option>
                            {ticketTiers.map(tier => (
                              <option key={tier.id} value={tier.label} className="bg-zinc-950 text-white">
                                {tier.label} ({tier.price.toFixed(2)} €)
                              </option>
                            ))}
                          </select>
                        </td>
                        {/* Places Count */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={buyer.ticket_count || 1}
                              onChange={(e) => handleUpdateBuyerTicketCount(buyer.id, Number(e.target.value))}
                              className="bg-transparent border-b border-transparent hover:border-zinc-800 focus:border-purple-500 focus:outline-none py-1 text-zinc-300 font-semibold w-12 text-xs"
                            />
                            <span className="text-[10px] text-zinc-500 font-normal whitespace-nowrap">
                              {buyer.checked_in_count > 0 ? `(${buyer.checked_in_count} entrés)` : '(aucun entré)'}
                            </span>
                          </div>
                        </td>
                        {/* Status Select */}
                        <td className="px-6 py-4">
                          <select
                            value={buyer.status}
                            onChange={(e: any) => handleUpdateBuyerStatus(buyer.id, e.target.value)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase focus:outline-none cursor-pointer border ${
                              buyer.status === 'pending' 
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                                : buyer.status === 'verified'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                            }`}
                          >
                            <option value="pending" className="bg-zinc-950 text-amber-500">⏳ En attente</option>
                            <option value="verified" className="bg-zinc-950 text-emerald-400">✅ Payé / Vérifié</option>
                            <option value="added_close_friends" className="bg-zinc-950 text-pink-400">⭐️ Amis Proches</option>
                          </select>
                        </td>
                        {/* Notes Input */}
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={buyer.notes || ''}
                            placeholder="Ajouter une note..."
                            onChange={(e) => handleUpdateBuyerNotes(buyer.id, e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-zinc-800 focus:border-purple-500 focus:outline-none py-1 text-zinc-300 w-full text-xs"
                          />
                        </td>
                        {/* Delete Action */}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteBuyer(buyer.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Global Save Button at the Bottom */}
        <div className="flex justify-end pt-6 border-t border-zinc-800/80 gap-3 items-center">
          {saveSuccess && (
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5 animate-fade-in">
              <Check className="w-4 h-4" /> Modifications enregistrées !
            </span>
          )}
          <button
            onClick={() => handleSaveGeneralInfo()}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold rounded-2xl shadow-[0_0_30px_rgba(147,51,234,0.3)] hover:shadow-[0_0_40px_rgba(147,51,234,0.5)] transition-all duration-300 active:scale-[0.98] text-sm uppercase tracking-wider"
          >
            <Save className="w-4 h-4" /> {saving ? 'Sauvegarde...' : 'Enregistrer tout l\'événement'}
          </button>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-[10px] text-zinc-500">
        FMB Expérience Admin Portal • © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
