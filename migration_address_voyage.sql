-- =========================================================================
-- MIGRATION : AJOUT D'UNE ADRESSE PUBLIQUE POUR LES VOYAGES
-- =========================================================================

-- 1. Ajouter la colonne address à la table events
ALTER TABLE events ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;

-- 2. Recréer la vue public_events en incluant la colonne address
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
    address
FROM events;
