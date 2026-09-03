import { createClient } from '@supabase/supabase-js';

// Types pour la base de données Supabase
export interface Event {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  event_date: string;
  end_date: string | null;
  category: 'party' | 'trip';
  description: string | null;
  secret_address: string | null; // Note: null pour les requêtes publiques via la vue
  address: string | null; // Adresse publique pour les voyages
  cover_image_url: string | null;
  contact_email: string;
  instagram_url: string | null;
  whatsapp_number: string;
  status: 'draft' | 'upcoming' | 'sold_out' | 'past';
  payment_mode?: 'paypal' | 'wire_transfer' | 'both';
  created_at: string;
}

export interface DJ {
  id: string;
  event_id: string;
  name: string;
  photo_url: string | null;
  instagram_url: string | null;
}

export interface TicketTier {
  id: string;
  event_id: string;
  label: string;
  description: string | null;
  price: number;
  payment_link: string;
  paypal_link?: string | null;
  display_order: number;
  is_active: boolean;
  max_capacity: number;
  capacity: number | null;
  stock_quantity: number | null;
}

export interface Buyer {
  id: string;
  event_id: string;
  confirmation_code: string;
  name_or_pseudo: string | null;
  ticket_tier_label: string | null;
  ticket_tier_id: string | null;
  additional_participants: string[] | null;
  status: 'pending' | 'verified' | 'added_close_friends';
  notes: string | null;
  ticket_count: number;
  checked_in_count: number;
  checked_in_at: string | null;
  email: string | null;
  created_at: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing from environment variables.');
}

// Client unique pour l'application
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
