-- =========================================================================
-- MIGRATION : GESTION DES ÉVÉNEMENTS ÉPUISÉS (SOLD OUT)
-- =========================================================================

-- 1. Mettre à jour la contrainte check sur events.status
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'upcoming', 'sold_out', 'past'));

-- 2. Mettre à jour la vue public_events
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
