-- =========================================================================
-- MIGRATION : CAPACITÉ DE GROUPE, SUIVI DE STOCKS & ACCOMPAGNANTS (VOYAGES)
-- =========================================================================

-- 1. Ajouter les colonnes de capacité et de stock à la table ticket_tiers
ALTER TABLE ticket_tiers ADD COLUMN IF NOT EXISTS capacity INT DEFAULT NULL;
ALTER TABLE ticket_tiers ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT NULL;

-- 2. Ajouter les colonnes de relation de tarif et d'accompagnants à la table buyers
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS ticket_tier_id UUID REFERENCES ticket_tiers(id) ON DELETE SET NULL;
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS additional_participants TEXT[] DEFAULT NULL;
