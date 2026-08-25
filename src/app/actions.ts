'use server';

import { createClient } from '@supabase/supabase-js';
import { sendTicketEmail } from '@/lib/mail';

// Force a Vercel rebuild to load the new RESEND_API_KEY env variable
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Instance Supabase côté serveur pour les Server Actions
const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Vérifie le code de confirmation et renvoie l'adresse secrète de l'événement si le code est valide.
 */
export async function verifyConfirmationCodeAndGetAddress(
  eventId: string,
  code: string
): Promise<{ success: boolean; address?: string; error?: string }> {
  try {
    if (!eventId || !code) {
      return { success: false, error: 'Identifiant ou code manquant.' };
    }

    // Appelle la fonction RPC sécurisée dans la base de données
    const { data, error } = await supabaseServer.rpc('get_event_secret_address', {
      p_event_id: eventId,
      p_code: code.trim().toUpperCase(),
    });

    if (error) {
      console.error('Erreur RPC get_event_secret_address:', error);
      return { success: false, error: 'Une erreur est survenue lors de la vérification.' };
    }

    if (data) {
      return { success: true, address: data };
    } else {
      return {
        success: false,
        error: 'Code incorrect ou non vérifié. Assurez-vous que votre paiement a bien été validé et que votre code est valide.',
      };
    }
  } catch (err) {
    console.error('Erreur catch-all verifyConfirmationCode:', err);
    return { success: false, error: 'Une erreur serveur est survenue.' };
  }
}

/**
 * Enregistre un acheteur potentiel avec le statut 'pending' avant paiement.
 */
export async function registerBuyer(
  eventId: string,
  nameOrPseudo: string,
  ticketTierLabel: string,
  ticketCount: number = 1,
  initialStatus: 'pending' | 'verified' = 'pending',
  ticketTierId?: string | null,
  additionalParticipants?: string[] | null
): Promise<{ success: boolean; confirmationCode?: string; error?: string }> {
  try {
    if (!eventId || !nameOrPseudo || !ticketTierLabel) {
      return { success: false, error: 'Tous les champs sont requis.' };
    }

    // Insère le buyer dans Supabase
    // Le code de confirmation sera généré automatiquement par la base de données (valeur par défaut)
    const insertData: any = {
      event_id: eventId,
      name_or_pseudo: nameOrPseudo.trim(),
      ticket_tier_label: ticketTierLabel,
      status: initialStatus,
      ticket_count: ticketCount,
    };

    if (ticketTierId) {
      insertData.ticket_tier_id = ticketTierId;
    }
    if (additionalParticipants) {
      insertData.additional_participants = additionalParticipants;
    }

    const { data, error } = await supabaseServer
      .from('buyers')
      .insert([insertData])
      .select('confirmation_code')
      .single();

    if (error) {
      console.error('Erreur insertion buyer:', error);
      return { success: false, error: 'Impossible de valider votre réservation.' };
    }

    // Si le statut est directement validé, vérifier et potentiellement désactiver le tarif si hors stock
    if (initialStatus === 'verified' && ticketTierId) {
      await checkAndDisableTierIfOutOfStock(ticketTierId);
    }

    return { success: true, confirmationCode: data.confirmation_code };
  } catch (err) {
    console.error('Erreur catch-all registerBuyer:', err);
    return { success: false, error: 'Une erreur serveur est survenue.' };
  }
}

/**
 * Vérifie si le stock d'un tarif est épuisé et désactive automatiquement le tarif si c'est le cas.
 */
export async function checkAndDisableTierIfOutOfStock(ticketTierId: string): Promise<void> {
  try {
    // 1. Récupérer le tarif pour voir sa stock_quantity
    const { data: tier, error: tierError } = await supabaseServer
      .from('ticket_tiers')
      .select('stock_quantity, is_active')
      .eq('id', ticketTierId)
      .single();

    if (tierError || !tier || tier.stock_quantity === null || !tier.is_active) {
      return;
    }

    // 2. Compter le nombre de places vendues (buyers avec ce ticket_tier_id et status = 'verified')
    const { data: buyers, error: buyersError } = await supabaseServer
      .from('buyers')
      .select('ticket_count')
      .eq('ticket_tier_id', ticketTierId)
      .eq('status', 'verified');

    if (buyersError || !buyers) {
      return;
    }

    const soldCount = buyers.reduce((sum, b) => sum + (b.ticket_count || 1), 0);

    // 3. Si le stock est atteint ou dépassé, désactiver le tarif
    if (soldCount >= tier.stock_quantity) {
      await supabaseServer
        .from('ticket_tiers')
        .update({ is_active: false })
        .eq('id', ticketTierId);
      console.log(`[STOCK] Le tarif ${ticketTierId} est complet (${soldCount}/${tier.stock_quantity}). Désactivé automatiquement.`);
    }
  } catch (err) {
    console.error('Erreur lors de la vérification de stock:', err);
  }
}
