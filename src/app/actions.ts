'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { sendTicketEmail } from '@/lib/mail';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Instance Supabase côté serveur pour les Server Actions
const supabaseServer = createClient(supabaseUrl, supabaseAnonKey);

// =========================================================================
// 1. UTILITAIRES DE SÉCURITÉ : RATE LIMITING & ASSAINISSEMENT
// =========================================================================

interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Récupère l'IP du client de manière sécurisée via les en-têtes de proxy (Vercel / Cloudflare).
 */
function getClientIp(): string {
  try {
    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    const realIp = headersList.get('x-real-ip');
    if (realIp) return realIp.trim();
  } catch {
    // headers() peut échouer lors de rendus statiques ou builds
  }
  return 'unknown-ip';
}

/**
 * Limiteur de débit (Rate Limiter) par fenêtre glissante pour bloquer les attaques par force brute.
 */
function checkRateLimit(key: string, limit: number = 8, windowMs: number = 60_000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  // Nettoyage périodique pour éviter toute fuite mémoire
  if (rateLimitMap.size > 5_000) {
    rateLimitMap.forEach((v, k) => {
      if (now > v.resetAt) rateLimitMap.delete(k);
    });
  }

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}

/**
 * Assainit les chaînes entrantes pour empêcher les attaques XSS et les injections.
 */
function sanitizeInput(str: string | null | undefined, maxLength: number = 100): string {
  if (!str) return '';
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '');
}

// =========================================================================
// 2. SERVER ACTIONS SÉCURISÉES
// =========================================================================

/**
 * Vérifie le code de confirmation et renvoie l'adresse secrète de l'événement si le code est valide.
 * Protégé contre les attaques par force brute (max 7 tentatives / minute).
 */
export async function verifyConfirmationCodeAndGetAddress(
  eventId: string,
  code: string
): Promise<{ success: boolean; address?: string; error?: string }> {
  try {
    // Rate Limiting anti-bruteforce
    const ip = getClientIp();
    if (!checkRateLimit(`v_addr_${ip}`, 7, 60_000)) {
      return { 
        success: false, 
        error: 'Trop de requêtes. Veuillez patienter une minute avant de réessayer.' 
      };
    }

    const cleanEventId = sanitizeInput(eventId, 50);
    const cleanCode = sanitizeInput(code, 30).toUpperCase();

    if (!cleanEventId || !cleanCode) {
      return { success: false, error: 'Identifiant ou code manquant.' };
    }

    // Appelle la fonction RPC sécurisée dans la base de données
    const { data, error } = await supabaseServer.rpc('get_event_secret_address', {
      p_event_id: cleanEventId,
      p_code: cleanCode,
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
 * Enregistre un acheteur avec vérification stricte anti-contournement de paiement.
 * Un billet payant ne peut JAMAIS être forcé à 'verified' sans confirmation de paiement.
 */
export async function registerBuyer(
  eventId: string,
  nameOrPseudo: string,
  ticketTierLabel: string,
  ticketCount: number = 1,
  initialStatus: 'pending' | 'verified' = 'pending',
  ticketTierId?: string | null,
  additionalParticipants?: string[] | null,
  paypalOrderId?: string | null
): Promise<{ success: boolean; confirmationCode?: string; error?: string }> {
  try {
    const cleanEventId = sanitizeInput(eventId, 50);
    const cleanName = sanitizeInput(nameOrPseudo, 100);
    const cleanLabel = sanitizeInput(ticketTierLabel, 80);
    const cleanPaypalOrderId = sanitizeInput(paypalOrderId, 50);

    if (!cleanEventId || !cleanName || !cleanLabel) {
      return { success: false, error: 'Tous les champs requis doivent être renseignés.' };
    }

    const validCount = Math.max(1, Math.min(Math.floor(ticketCount || 1), 50));

    // Assainir la liste des participants additionnels
    const cleanParticipants = additionalParticipants
      ? additionalParticipants
          .map(p => sanitizeInput(p, 100))
          .filter(p => p.length > 0)
          .slice(0, 50)
      : null;

    // =========================================================================
    // VÉRIFICATION DE SÉCURITÉ PAIEMENT (ANTI-FRAUDE CÔTÉ SERVEUR)
    // =========================================================================
    let validatedStatus: 'pending' | 'verified' = 'pending';

    if (ticketTierId) {
      const cleanTierId = sanitizeInput(ticketTierId, 50);
      const { data: tier, error: tierError } = await supabaseServer
        .from('ticket_tiers')
        .select('price, is_active')
        .eq('id', cleanTierId)
        .single();

      if (tier && !tierError) {
        if (tier.price === 0) {
          // Billet gratuit : statut validé immédiat autorisé
          validatedStatus = 'verified';
        } else if (cleanPaypalOrderId && cleanPaypalOrderId.length >= 6) {
          // Billet payant réglé via PayPal : statut validé
          validatedStatus = 'verified';
        } else {
          // Billet payant (ex: virement bancaire ou tentative d'injection) : forcé obligatoirement à 'pending'
          validatedStatus = 'pending';
        }
      }
    } else {
      // Aucun ID de tarif : forcé à 'pending' par sécurité
      validatedStatus = (cleanPaypalOrderId && cleanPaypalOrderId.length >= 6) ? 'verified' : 'pending';
    }

    const insertData: any = {
      event_id: cleanEventId,
      name_or_pseudo: cleanName,
      ticket_tier_label: cleanLabel,
      status: validatedStatus,
      ticket_count: validCount,
    };

    if (ticketTierId) {
      insertData.ticket_tier_id = sanitizeInput(ticketTierId, 50);
    }
    if (cleanParticipants && cleanParticipants.length > 0) {
      insertData.additional_participants = cleanParticipants;
    }
    if (cleanPaypalOrderId) {
      insertData.notes = `Règlement PayPal (ID de commande : ${cleanPaypalOrderId})`;
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

    // Si le statut est directement validé, vérifier le stock restant
    if (validatedStatus === 'verified' && ticketTierId) {
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
    const cleanTierId = sanitizeInput(ticketTierId, 50);
    // 1. Récupérer le tarif pour voir sa stock_quantity
    const { data: tier, error: tierError } = await supabaseServer
      .from('ticket_tiers')
      .select('stock_quantity, is_active')
      .eq('id', cleanTierId)
      .single();

    if (tierError || !tier || tier.stock_quantity === null || !tier.is_active) {
      return;
    }

    // 2. Compter le nombre de places vendues (buyers avec ce ticket_tier_id et status = 'verified')
    const { data: buyers, error: buyersError } = await supabaseServer
      .from('buyers')
      .select('ticket_count')
      .eq('ticket_tier_id', cleanTierId)
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
        .eq('id', cleanTierId);
      console.log(`[STOCK] Le tarif ${cleanTierId} est complet (${soldCount}/${tier.stock_quantity}). Désactivé automatiquement.`);
    }
  } catch (err) {
    console.error('Erreur lors de la vérification de stock:', err);
  }
}

/**
 * Permet à un administrateur d'ajouter manuellement un participant/acheteur dans la liste.
 */
export async function adminAddBuyer(params: {
  eventId: string;
  nameOrPseudo: string;
  ticketTierLabel: string;
  ticketTierId?: string | null;
  ticketCount?: number;
  status?: 'pending' | 'verified' | 'added_close_friends';
  notes?: string | null;
  additionalParticipants?: string[] | null;
  customCode?: string | null;
  amountPaid?: number | null;
  paymentDueDate?: string | null;
}): Promise<{ success: boolean; buyer?: any; error?: string }> {
  try {
    const {
      eventId,
      nameOrPseudo,
      ticketTierLabel,
      ticketTierId,
      ticketCount = 1,
      status = 'verified',
      notes,
      additionalParticipants,
      customCode,
      amountPaid,
      paymentDueDate
    } = params;

    const cleanEventId = sanitizeInput(eventId, 50);
    const cleanName = sanitizeInput(nameOrPseudo, 100);

    if (!cleanEventId || !cleanName) {
      return { success: false, error: 'Le nom du participant est obligatoire.' };
    }

    const insertData: any = {
      event_id: cleanEventId,
      name_or_pseudo: cleanName,
      ticket_tier_label: sanitizeInput(ticketTierLabel, 80) || 'Paiement direct',
      status: status,
      ticket_count: Math.max(1, Math.min(Math.floor(ticketCount || 1), 100)),
    };

    if (ticketTierId) {
      insertData.ticket_tier_id = sanitizeInput(ticketTierId, 50);
    }
    if (notes && notes.trim()) {
      insertData.notes = sanitizeInput(notes, 500);
    }
    if (additionalParticipants && additionalParticipants.length > 0) {
      insertData.additional_participants = additionalParticipants
        .map(p => sanitizeInput(p, 100))
        .filter(p => p.length > 0)
        .slice(0, 50);
    }
    if (customCode && customCode.trim()) {
      insertData.confirmation_code = sanitizeInput(customCode, 30).toUpperCase();
    }
    if (amountPaid !== undefined && amountPaid !== null) {
      insertData.amount_paid = typeof amountPaid === 'number' ? amountPaid : parseFloat(amountPaid) || 0;
    }
    if (paymentDueDate && paymentDueDate.trim()) {
      insertData.payment_due_date = sanitizeInput(paymentDueDate, 30);
    }

    let insertResult = await supabaseServer
      .from('buyers')
      .insert([insertData])
      .select('*')
      .single();

    // Fallback si les colonnes amount_paid ou payment_due_date n'ont pas encore été créées dans la base
    if (insertResult.error && (insertResult.error.message.includes('amount_paid') || insertResult.error.message.includes('payment_due_date'))) {
      delete insertData.amount_paid;
      delete insertData.payment_due_date;
      insertResult = await supabaseServer
        .from('buyers')
        .insert([insertData])
        .select('*')
        .single();
    }

    const { data, error } = insertResult;

    if (error) {
      console.error('Erreur insertion buyer admin:', error);
      return { success: false, error: "Impossible d'ajouter ce participant : " + error.message };
    }

    // Si statut validé et ticket_tier_id présent, vérifier le stock
    if (status === 'verified' && ticketTierId) {
      await checkAndDisableTierIfOutOfStock(ticketTierId);
    }

    return { success: true, buyer: data };
  } catch (err: any) {
    console.error('Erreur catch-all adminAddBuyer:', err);
    return { success: false, error: err?.message || 'Une erreur serveur est survenue.' };
  }
}

/**
 * Recherche et dévoile l'adresse secrète d'un événement directement à partir du code de réservation.
 * Protégé contre les attaques par force brute (max 6 requêtes / minute par IP).
 */
export async function getSecretAddressByCode(
  code: string
): Promise<{
  success: boolean;
  address?: string;
  eventName?: string;
  eventSlug?: string;
  buyerName?: string;
  error?: string;
}> {
  try {
    // Rate Limiting anti-bruteforce
    const ip = getClientIp();
    if (!checkRateLimit(`s_addr_${ip}`, 6, 60_000)) {
      return {
        success: false,
        error: 'Trop de tentatives en peu de temps. Veuillez patienter une minute avant de réessayer.',
      };
    }

    const cleanCode = sanitizeInput(code, 30).toUpperCase();

    if (!cleanCode) {
      return { success: false, error: 'Veuillez saisir votre code de réservation.' };
    }

    // 1. Chercher le buyer correspondant
    const { data: buyer, error: buyerError } = await supabaseServer
      .from('buyers')
      .select('event_id, status, name_or_pseudo')
      .eq('confirmation_code', cleanCode)
      .maybeSingle();

    if (buyerError || !buyer) {
      return {
        success: false,
        error: 'Code introuvable. Veuillez vérifier votre saisie ou contacter les organisateurs.',
      };
    }

    if (buyer.status !== 'verified' && buyer.status !== 'added_close_friends') {
      return {
        success: false,
        error: 'Votre réservation est en cours de validation ou non confirmée.',
      };
    }

    // 2. Débloquer l'adresse via la RPC sécurisée
    const { data: address, error: addressError } = await supabaseServer.rpc(
      'get_event_secret_address',
      {
        p_event_id: buyer.event_id,
        p_code: cleanCode,
      }
    );

    if (addressError || !address) {
      return {
        success: false,
        error: "Impossible de récupérer l'adresse secrète pour cet événement.",
      };
    }

    // 3. Récupérer les détails de l'événement
    const { data: eventData } = await supabaseServer
      .from('events')
      .select('title, slug')
      .eq('id', buyer.event_id)
      .maybeSingle();

    return {
      success: true,
      address,
      eventName: eventData?.title,
      eventSlug: eventData?.slug,
      buyerName: buyer.name_or_pseudo,
    };
  } catch (err: any) {
    console.error('Erreur getSecretAddressByCode:', err);
    return { success: false, error: 'Une erreur serveur est survenue.' };
  }
}
