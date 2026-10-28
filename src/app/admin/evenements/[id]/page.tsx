'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, Event, DJ, TicketTier, Buyer } from '@/lib/supabase';
import { checkAndDisableTierIfOutOfStock, adminAddBuyer } from '@/app/actions';
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
  Sparkles,
  UserPlus,
  Copy,
  ExternalLink,
  X
} from 'lucide-react';

interface PageProps {
  params: {
    id: string;
  };
}

const toParisDateTimeLocal = (dateString?: string | null): string => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const formatter = new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
};

const formatToDateTimeLocal = toParisDateTimeLocal;

const parseParisDateTimeToISO = (str?: string | null): string | null => {
  if (!str) return null;
  // If already full ISO with Z
  if (str.includes('Z')) return new Date(str).toISOString();

  // Format is YYYY-MM-DD or YYYY-MM-DDTHH:mm
  const [datePart, timePart = '22:00'] = str.split('T');
  if (!datePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 22, minute = 0] = timePart.split(':').map(Number);

  // Compute exact timestamp in Europe/Paris
  const approx = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parisHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false }).format(approx));
  const diffHours = (parisHour - hour + 24) % 24;
  const offsetHours = diffHours > 12 ? diffHours - 24 : diffHours;
  const exact = new Date(approx.getTime() - offsetHours * 60 * 60 * 1000);
  return exact.toISOString();
};

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
    max_capacity: '100',
    stock_quantity: ''
  });
  const [editingTierId, setEditingTierId] = useState<string | null>(null);

  // Manual Buyer Addition States
  const [showAddBuyer, setShowAddBuyer] = useState(false);
  const [addingBuyer, setAddingBuyer] = useState(false);
  const [copiedBuyerId, setCopiedBuyerId] = useState<string | null>(null);
  const [newBuyerSuccess, setNewBuyerSuccess] = useState<{
    code: string;
    name: string;
    tier: string;
    count: number;
  } | null>(null);
  const [buyerAddForm, setBuyerAddForm] = useState({
    name_or_pseudo: '',
    ticket_tier_id: '',
    ticket_tier_label: '',
    ticket_count: 1,
    status: 'verified' as Buyer['status'],
    notes: '',
    additional_participants: [] as string[],
    custom_code: ''
  });

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

      // Convertir la date TIMESTAMPTZ en format local YYYY-MM-DDThh:mm pour l'input datetime-local sans décalage UTC
      const localDate = formatToDateTimeLocal(eventData.event_date);
      const localEndDate = formatToDateTimeLocal(eventData.end_date);
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
      // 1. Sauvegarder les infos de l'événement (conversion sécurisée en heure de Paris)
      const isoDate = parseParisDateTimeToISO(event.event_date);
      const isoEndDate = event.end_date ? parseParisDateTimeToISO(event.end_date) : null;
      if (!isoDate) {
        alert("Veuillez sélectionner une date valide pour l'événement.");
        setSaving(false);
        return;
      }
      const payload = {
        title: event.title,
        slug: event.slug,
        subtitle: event.subtitle,
        description: event.description,
        secret_address: event.category === 'trip' ? null : event.secret_address,
        address: event.category === 'trip' ? event.address : null,
        cover_image_url: event.cover_image_url,
        contact_email: event.contact_email,
        instagram_url: event.instagram_url,
        whatsapp_number: event.whatsapp_number,
        status: event.status,
        payment_mode: event.payment_mode || 'both',
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

      // Synchroniser le formulaire avec la date exacte en heure de Paris
      setEvent(prev => ({
        ...prev,
        event_date: toParisDateTimeLocal(isoDate),
        end_date: isoEndDate ? toParisDateTimeLocal(isoEndDate) : null
      }));

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
          setTierForm({ label: '', description: '', price: '', payment_link: '', paypal_link: '', display_order: '0', max_capacity: '100', is_active: true, capacity: '', stock_quantity: '' });
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
    setBuyers(prev => prev.map(b => b.id === buyerId ? { ...b, notes } : b));
    try {
      const { error } = await supabase
        .from('buyers')
        .update({ notes })
        .eq('id', buyerId);
      if (error) console.error("Erreur mise à jour notes:", error);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBuyerName = async (buyerId: string, name: string) => {
    setBuyers(prev => prev.map(b => b.id === buyerId ? { ...b, name_or_pseudo: name } : b));
    try {
      const { error } = await supabase
        .from('buyers')
        .update({ name_or_pseudo: name })
        .eq('id', buyerId);
      if (error) console.error("Erreur mise à jour nom acheteur:", error);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBuyerParticipant = async (buyerId: string, partIndex: number, newName: string) => {
    let updatedParts: string[] = [];
    setBuyers(prev => prev.map(b => {
      if (b.id !== buyerId) return b;
      const totalTickets = b.ticket_count || 1;
      const slots = Math.max(b.additional_participants?.length || 0, totalTickets > 1 ? totalTickets - 1 : 0);
      const parts = [...(b.additional_participants || [])];
      while (parts.length < slots) parts.push('');
      parts[partIndex] = newName;
      updatedParts = parts;
      return { ...b, additional_participants: parts };
    }));

    try {
      const { error } = await supabase
        .from('buyers')
        .update({ additional_participants: updatedParts })
        .eq('id', buyerId);
      if (error) console.error("Erreur mise à jour participant:", error);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBuyerTier = async (buyerId: string, tierLabel: string) => {
    setBuyers(prev => prev.map(b => b.id === buyerId ? { ...b, ticket_tier_label: tierLabel } : b));
    try {
      const { error } = await supabase
        .from('buyers')
        .update({ ticket_tier_label: tierLabel })
        .eq('id', buyerId);
      if (error) console.error("Erreur mise à jour tarif:", error);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBuyerTicketCount = async (buyerId: string, count: number) => {
    if (count < 1) return;
    setBuyers(prev => prev.map(b => {
      if (b.id !== buyerId) return b;
      const currentParts = [...(b.additional_participants || [])];
      if (count > 1) {
        while (currentParts.length < count - 1) currentParts.push('');
      }
      return { ...b, ticket_count: count, additional_participants: currentParts };
    }));

    try {
      const { error } = await supabase
        .from('buyers')
        .update({ ticket_count: count })
        .eq('id', buyerId);
      if (error) console.error("Erreur mise à jour nombre de places:", error);
    } catch (err) {
      console.error(err);
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

  const getTicketUrl = (b: Buyer | { confirmation_code: string; ticket_tier_label?: string | null; ticket_count?: number }) => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const tier = b.ticket_tier_label || '';
    const count = b.ticket_count || 1;
    return `${origin}/evenements/${event.slug}/merci?code=${b.confirmation_code}&tier=${encodeURIComponent(tier)}&quantity=${count}`;
  };

  const handleCopyTicketLink = (b: Buyer) => {
    const url = getTicketUrl(b);
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedBuyerId(b.id);
      setTimeout(() => setCopiedBuyerId(null), 2500);
    }
  };

  const handleAddManualBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerAddForm.name_or_pseudo.trim()) {
      alert("Veuillez renseigner le prénom et nom du titulaire.");
      return;
    }

    setAddingBuyer(true);
    try {
      const selectedTier = ticketTiers.find(t => t.id === buyerAddForm.ticket_tier_id);
      let tierLabel = 'Paiement direct';
      if (selectedTier) {
        tierLabel = selectedTier.label;
      } else if (buyerAddForm.ticket_tier_label.trim()) {
        tierLabel = buyerAddForm.ticket_tier_label.trim();
      }

      const filteredParticipants = buyerAddForm.additional_participants
        .map(p => p.trim())
        .filter(Boolean);

      const res = await adminAddBuyer({
        eventId: id,
        nameOrPseudo: buyerAddForm.name_or_pseudo,
        ticketTierLabel: tierLabel,
        ticketTierId: buyerAddForm.ticket_tier_id && buyerAddForm.ticket_tier_id !== '__custom__' ? buyerAddForm.ticket_tier_id : null,
        ticketCount: Number(buyerAddForm.ticket_count) || 1,
        status: buyerAddForm.status,
        notes: buyerAddForm.notes.trim() || null,
        additionalParticipants: filteredParticipants.length > 0 ? filteredParticipants : null,
        customCode: buyerAddForm.custom_code.trim() || null
      });

      if (!res.success || !res.buyer) {
        alert(res.error || "Erreur lors de l'ajout du participant.");
        return;
      }

      // Ajouter en tête de liste
      setBuyers(prev => [res.buyer, ...prev]);

      // Si le statut est validé et qu'un ticket_tier_id était sélectionné, recharger les tarifs
      if (buyerAddForm.status === 'verified' && buyerAddForm.ticket_tier_id && buyerAddForm.ticket_tier_id !== '__custom__') {
        const { data: tiersData } = await supabase
          .from('ticket_tiers')
          .select('*')
          .eq('event_id', id)
          .order('display_order', { ascending: true });
        if (tiersData) setTicketTiers(tiersData);
      }

      // Afficher message de succès avec lien
      setNewBuyerSuccess({
        code: res.buyer.confirmation_code,
        name: res.buyer.name_or_pseudo || 'Invité',
        tier: res.buyer.ticket_tier_label || tierLabel,
        count: res.buyer.ticket_count || 1
      });

      // Réinitialiser le formulaire
      setBuyerAddForm({
        name_or_pseudo: '',
        ticket_tier_id: '',
        ticket_tier_label: '',
        ticket_count: 1,
        status: 'verified',
        notes: '',
        additional_participants: [],
        custom_code: ''
      });
      setShowAddBuyer(false);
    } catch (err: any) {
      console.error(err);
      alert("Une erreur est survenue : " + (err?.message || err));
    } finally {
      setAddingBuyer(false);
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">Statut de publication</label>
                <select
                  value={event.status || 'draft'}
                  onChange={(e: any) => setEvent({ ...event, status: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="draft">Brouillon (Non visible sur le site public)</option>
                  <option value="upcoming">À venir (Visible à la une ou en liste)</option>
                  <option value="sold_out">🔴 Épuisé (Complet - Réservations bloquées)</option>
                  <option value="past">Passé (Visible dans la catégorie "Passés")</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1.5 text-zinc-300">Paiements acceptés</label>
                <select
                  value={event.payment_mode || 'both'}
                  onChange={(e: any) => setEvent({ ...event, payment_mode: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="both">⚡️ Tous (PayPal/Carte + Virement)</option>
                  <option value="wire_transfer">🏦 Virement bancaire (RIB) uniquement</option>
                  <option value="paypal">💳 PayPal / Carte uniquement</option>
                </select>
              </div>

              {event.category === 'trip' ? (
                <div>
                  <label className="block font-semibold mb-1.5 text-zinc-300">Adresse / Destination (Public)</label>
                  <input
                    type="text"
                    placeholder="Ex: Center Parcs - Sologne, France"
                    value={event.address || ''}
                    onChange={(e) => setEvent({ ...event, address: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-semibold mb-1.5 text-zinc-300">Adresse secrète / Lieu (dévoilé après validation)</label>
                  <input
                    type="text"
                    placeholder="Ex: 45 Rue Pierre Charron, Paris"
                    value={event.secret_address || ''}
                    onChange={(e) => setEvent({ ...event, secret_address: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

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
                        {tier.is_active ? '🟢 En vente' : '🔴 Épuisé'}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800 gap-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" /> 4. Liste des Acheteurs & Réservations
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1">
                Gérez les places, validez les paiements et ajoutez les personnes ayant payé en direct (espèces, Lydia, virement...).
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddBuyer(!showAddBuyer)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {showAddBuyer ? 'Masquer le formulaire' : '+ Ajouter un participant'}
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3">
              <span className="text-[10px] text-zinc-500 font-bold uppercase block">Total Réservations</span>
              <span className="text-lg font-black text-white">{buyers.length}</span>
            </div>
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3">
              <span className="text-[10px] text-emerald-400/80 font-bold uppercase block">Places Validées</span>
              <span className="text-lg font-black text-emerald-400">
                {buyers.filter(b => b.status === 'verified').reduce((sum, b) => sum + (b.ticket_count || 1), 0)}
              </span>
            </div>
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3">
              <span className="text-[10px] text-amber-400/80 font-bold uppercase block">Places en Attente</span>
              <span className="text-lg font-black text-amber-400">
                {buyers.filter(b => b.status === 'pending').reduce((sum, b) => sum + (b.ticket_count || 1), 0)}
              </span>
            </div>
            <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-2xl p-3">
              <span className="text-[10px] text-purple-400/80 font-bold uppercase block">Scannés / Entrés</span>
              <span className="text-lg font-black text-purple-400">
                {buyers.reduce((sum, b) => sum + (b.checked_in_count || 0), 0)}
              </span>
            </div>
          </div>

          {/* Success Banner after adding buyer */}
          {newBuyerSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <p className="font-bold text-white">
                    <span className="text-emerald-400">{newBuyerSuccess.name}</span> a été ajouté(e) avec succès ({newBuyerSuccess.count} place{newBuyerSuccess.count > 1 ? 's' : ''} - {newBuyerSuccess.tier}) !
                  </p>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    Code Unique : <span className="font-mono font-bold text-purple-400 select-all">{newBuyerSuccess.code}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : '';
                    const url = `${origin}/evenements/${event.slug}/merci?code=${newBuyerSuccess.code}&tier=${encodeURIComponent(newBuyerSuccess.tier)}&quantity=${newBuyerSuccess.count}`;
                    navigator.clipboard.writeText(url);
                    setCopiedBuyerId('NEW_' + newBuyerSuccess.code);
                    setTimeout(() => setCopiedBuyerId(null), 2500);
                  }}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-md text-xs cursor-pointer"
                >
                  {copiedBuyerId === 'NEW_' + newBuyerSuccess.code ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Lien copié !
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copier le lien du billet
                    </>
                  )}
                </button>
                <a
                  href={`/evenements/${event.slug}/merci?code=${newBuyerSuccess.code}&tier=${encodeURIComponent(newBuyerSuccess.tier)}&quantity=${newBuyerSuccess.count}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                  title="Ouvrir le billet"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setNewBuyerSuccess(null)}
                  className="p-2 text-zinc-500 hover:text-white rounded-xl transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Add Manual Buyer Form */}
          {showAddBuyer && (
            <form onSubmit={handleAddManualBuyer} className="p-5 bg-zinc-950 border border-purple-500/30 rounded-2xl space-y-4 text-xs animate-fade-in shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-pink-400" /> Ajouter une personne manuellement
                </h4>
                <span className="text-[10px] text-zinc-400">Paiement direct (espèces, Lydia, virement à un orga...)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Prénom et Nom du titulaire */}
                <div>
                  <label className="block font-semibold mb-1 text-zinc-300">
                    Prénom et Nom du titulaire (Place 1) <span className="text-pink-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alain Dupont"
                    value={buyerAddForm.name_or_pseudo}
                    onChange={(e) => setBuyerAddForm({ ...buyerAddForm, name_or_pseudo: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Tarif */}
                <div>
                  <label className="block font-semibold mb-1 text-zinc-300">
                    Tarif / Catégorie de billet
                  </label>
                  <select
                    value={buyerAddForm.ticket_tier_id}
                    onChange={(e) => {
                      const tier = ticketTiers.find(t => t.id === e.target.value);
                      setBuyerAddForm({
                        ...buyerAddForm,
                        ticket_tier_id: e.target.value,
                        ticket_tier_label: tier ? tier.label : ''
                      });
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="">— Sélectionner un tarif —</option>
                    {ticketTiers.map((tier) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.label} ({tier.price.toFixed(2)} €)
                      </option>
                    ))}
                    <option value="__custom__">Autre / Nom personnalisé</option>
                  </select>
                  {buyerAddForm.ticket_tier_id === '__custom__' && (
                    <input
                      type="text"
                      placeholder="Ex: Invité orga, Pack VIP..."
                      value={buyerAddForm.ticket_tier_label}
                      onChange={(e) => setBuyerAddForm({ ...buyerAddForm, ticket_tier_label: e.target.value })}
                      className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  )}
                </div>

                {/* Nombre de places */}
                <div>
                  <label className="block font-semibold mb-1 text-zinc-300">
                    Nombre de places
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={buyerAddForm.ticket_count}
                    onChange={(e) => {
                      const count = Math.max(1, parseInt(e.target.value) || 1);
                      setBuyerAddForm(prev => {
                        const currentParts = [...prev.additional_participants];
                        if (count > 1) {
                          while (currentParts.length < count - 1) currentParts.push('');
                          currentParts.splice(count - 1);
                        } else {
                          currentParts.length = 0;
                        }
                        return {
                          ...prev,
                          ticket_count: count,
                          additional_participants: currentParts
                        };
                      });
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Accompagnants si places > 1 */}
              {buyerAddForm.ticket_count > 1 && (
                <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2">
                  <label className="block text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                    Prénom & Nom des {buyerAddForm.ticket_count - 1} autre{buyerAddForm.ticket_count > 2 ? 's' : ''} participant{buyerAddForm.ticket_count > 2 ? 's' : ''} (Places 2 à {buyerAddForm.ticket_count}) :
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {Array.from({ length: buyerAddForm.ticket_count - 1 }).map((_, idx) => (
                      <input
                        key={idx}
                        type="text"
                        placeholder={`Place #${idx + 2} - Prénom et Nom (Ex: Sophie Martin)`}
                        value={buyerAddForm.additional_participants[idx] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBuyerAddForm(prev => {
                            const parts = [...prev.additional_participants];
                            parts[idx] = val;
                            return { ...prev, additional_participants: parts };
                          });
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-purple-500"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Statut */}
                <div>
                  <label className="block font-semibold mb-1 text-zinc-300">
                    Statut de la réservation
                  </label>
                  <select
                    value={buyerAddForm.status}
                    onChange={(e: any) => setBuyerAddForm({ ...buyerAddForm, status: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 cursor-pointer font-semibold"
                  >
                    <option value="verified" className="text-emerald-400">✅ Payé / Validé (reçu en direct)</option>
                    <option value="pending" className="text-amber-400">⏳ En attente de paiement</option>
                    <option value="added_close_friends" className="text-pink-400">⭐️ Amis Proches / Invité VIP</option>
                  </select>
                </div>

                {/* Notes internes */}
                <div>
                  <label className="block font-semibold mb-1 text-zinc-300">
                    Notes internes / Mode de règlement
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Payé 20€ espèces à Alex, Lydia, etc."
                    value={buyerAddForm.notes}
                    onChange={(e) => setBuyerAddForm({ ...buyerAddForm, notes: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Code Unique personnalisé (optionnel) */}
                <div>
                  <label className="block font-semibold mb-1 text-zinc-300">
                    Code Unique (laisser vide = automatique)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto (ou taper 8 lettres/chiffres)"
                    value={buyerAddForm.custom_code}
                    onChange={(e) => setBuyerAddForm({ ...buyerAddForm, custom_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-purple-300 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBuyer(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-colors text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addingBuyer}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {addingBuyer ? 'Ajout en cours...' : 'Ajouter à la liste'}
                </button>
              </div>
            </form>
          )}

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
                      <th className="px-6 py-4 min-w-[280px]">Participants (Prénom & Nom) ({buyers.reduce((sum, b) => sum + (b.ticket_count || 1), 0)} places)</th>
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
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold tracking-widest text-purple-400 text-sm select-all">
                              {buyer.confirmation_code}
                            </span>
                            <button
                              type="button"
                              title="Copier le lien direct du billet (avec QR code)"
                              onClick={() => handleCopyTicketLink(buyer)}
                              className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                            >
                              {copiedBuyerId === buyer.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <a
                              href={getTicketUrl(buyer)}
                              target="_blank"
                              rel="noreferrer"
                              title="Ouvrir le billet / QR code"
                              className="p-1 text-zinc-500 hover:text-purple-400 hover:bg-zinc-800 rounded transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          {copiedBuyerId === buyer.id && (
                            <span className="text-[9px] text-emerald-400 font-bold block mt-0.5 animate-fade-in">Lien copié !</span>
                          )}
                        </td>
                        {/* Name & Participants */}
                        <td className="px-6 py-4 min-w-[300px]">
                          {(() => {
                            const totalCount = buyer.ticket_count || 1;
                            const currentParts = buyer.additional_participants || [];
                            const neededSlots = Math.max(currentParts.length, totalCount > 1 ? totalCount - 1 : 0);
                            const missingCompanionCount = Array.from({ length: neededSlots }).filter((_, idx) => !currentParts[idx]?.trim()).length;

                            return (
                              <div className="space-y-2.5">
                                {/* Badge de groupe si multi-places */}
                                {totalCount > 1 && (
                                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-zinc-800/80">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                                      🎟️ Groupe de {totalCount} places
                                    </span>
                                    {missingCompanionCount > 0 ? (
                                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                        ⚠️ {missingCompanionCount} participant{missingCompanionCount > 1 ? 's' : ''} à renseigner
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        ✓ Tous les participants saisis
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Titulaire / Place 1 */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
                                      👤 Place 1 {totalCount > 1 ? '(Titulaire / Acheteur principal)' : ''} :
                                    </span>
                                    {!buyer.name_or_pseudo?.trim() && (
                                      <span className="text-[9px] text-amber-400 font-semibold">⚠️ Prénom et nom manquants</span>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={buyer.name_or_pseudo || ''}
                                    placeholder="Prénom et Nom du titulaire (Ex: Alain Dupont)"
                                    onChange={(e) => handleUpdateBuyerName(buyer.id, e.target.value)}
                                    className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-purple-500 focus:outline-none px-2.5 py-1.5 rounded-lg text-white font-semibold w-full text-xs transition-colors"
                                  />
                                  {buyer.email && (
                                    <span className="text-[10px] text-zinc-400 block pl-0.5">📧 {buyer.email}</span>
                                  )}
                                </div>

                                {/* Accompagnants pour chaque place supplémentaire */}
                                {neededSlots > 0 && (
                                  <div className="pt-2 border-t border-zinc-800/60 space-y-2">
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 block">
                                      Prénom & Nom des autres participants ({neededSlots}) :
                                    </span>
                                    {Array.from({ length: neededSlots }).map((_, pIdx) => {
                                      const partName = currentParts[pIdx] || '';
                                      const isMissing = !partName.trim();
                                      return (
                                        <div key={pIdx} className="space-y-0.5">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-purple-300/80 font-mono">
                                              Place {pIdx + 2} - Prénom et Nom :
                                            </span>
                                            {isMissing && (
                                              <span className="text-[9px] text-amber-400 font-bold">
                                                À renseigner
                                              </span>
                                            )}
                                          </div>
                                          <input
                                            type="text"
                                            value={partName}
                                            placeholder={`Prénom et Nom Place ${pIdx + 2} (Ex: Sophie Martin)`}
                                            onChange={(e) => handleUpdateBuyerParticipant(buyer.id, pIdx, e.target.value)}
                                            className={`bg-zinc-900/90 border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors w-full ${
                                              isMissing 
                                                ? 'border-amber-500/40 focus:border-amber-400 placeholder:text-amber-500/50' 
                                                : 'border-zinc-800 hover:border-zinc-700 focus:border-purple-500 text-purple-200 font-medium'
                                            }`}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
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
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase focus:outline-none cursor-pointer border w-full ${
                              buyer.status === 'pending' 
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                                : buyer.status === 'verified'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                            }`}
                          >
                            <option value="pending" className="bg-zinc-950 text-amber-500">⏳ En attente</option>
                            <option value="verified" className="bg-zinc-950 text-emerald-400">✅ Payé / Validé</option>
                            <option value="added_close_friends" className="bg-zinc-950 text-pink-400">⭐️ Amis Proches</option>
                          </select>
                          {buyer.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateBuyerStatus(buyer.id, 'verified')}
                              className="mt-1.5 px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-[9px] font-bold uppercase transition-colors flex items-center gap-1 w-full justify-center cursor-pointer"
                            >
                              🟢 Valider le virement
                            </button>
                          )}
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
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Supprimer"
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
