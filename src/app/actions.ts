'use server';

import { createClient } from '@supabase/supabase-js';
import { sendTicketEmail } from '@/lib/mail';

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
  email: string | null = null
): Promise<{ success: boolean; confirmationCode?: string; error?: string }> {
  try {
    if (!eventId || !nameOrPseudo || !ticketTierLabel) {
      return { success: false, error: 'Tous les champs sont requis.' };
    }

    // Insère le buyer dans Supabase
    // Le code de confirmation sera généré automatiquement par la base de données (valeur par défaut)
    const { data, error } = await supabaseServer
      .from('buyers')
      .insert([
        {
          event_id: eventId,
          name_or_pseudo: nameOrPseudo.trim(),
          ticket_tier_label: ticketTierLabel,
          status: initialStatus,
          ticket_count: ticketCount,
          email: email ? email.trim() : null,
        },
      ])
      .select('confirmation_code')
      .single();

    if (error) {
      console.error('Erreur insertion buyer:', error);
      return { success: false, error: 'Impossible de valider votre réservation.' };
    }

    // Si le statut initial est directement vérifié (ex: gratuit ou paiement PayPal capturé), on envoie l'e-mail
    if (initialStatus === 'verified' && email) {
      try {
        const { data: eventData } = await supabaseServer
          .from('events')
          .select('title, event_date, slug')
          .eq('id', eventId)
          .single();

        if (eventData) {
          const dateStr = new Date(eventData.event_date).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          // On lance l'envoi en arrière-plan sans bloquer
          sendTicketEmail(
            email.trim(),
            nameOrPseudo.trim(),
            eventData.title,
            ticketTierLabel,
            ticketCount,
            data.confirmation_code,
            dateStr,
            eventData.slug
          ).catch(mailErr => {
            console.error("Échec d'envoi d'e-mail:", mailErr);
          });
        }
      } catch (eventErr) {
        console.error("Erreur récupération événement pour e-mail:", eventErr);
      }
    }

    return { success: true, confirmationCode: data.confirmation_code };
  } catch (err) {
    console.error('Erreur catch-all registerBuyer:', err);
    return { success: false, error: 'Une erreur serveur est survenue.' };
  }
}
