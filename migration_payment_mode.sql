-- =========================================================================
-- MIGRATION : PARAMÉTRAGE DU MODE DE PAIEMENT PAR ÉVÉNEMENT
-- =========================================================================

-- 1. Ajouter la colonne payment_mode à la table events
ALTER TABLE events ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'both' CHECK (payment_mode IN ('paypal', 'wire_transfer', 'both'));

-- 2. Mettre à jour la vue public_events pour inclure payment_mode
CREATE OR REPLACE VIEW public_events AS
SELECT 
    id, 
    slug, 
    title, 
    subtitle, 
    event_date, 
    end_date, 
    category, 
    description, 
    cover_image_url, 
    contact_email, 
    instagram_url, 
    whatsapp_number, 
    status, 
    created_at,
    address,
    payment_mode
FROM events;
