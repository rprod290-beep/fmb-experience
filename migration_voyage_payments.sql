-- =========================================================================
-- MIGRATION : SUIVI DES RÈGLEMENTS, ACOMPTES ET ÉCHÉANCES (VOYAGES)
-- =========================================================================
-- À exécuter dans le SQL Editor de Supabase (https://supabase.com)

-- 1. Ajouter les colonnes de suivi financier à la table buyers
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT NULL;
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS payment_due_date TEXT DEFAULT NULL;
