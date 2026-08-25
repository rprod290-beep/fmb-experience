-- MIGRATION : Support des Voyages / Center Parcs
-- À exécuter dans le SQL Editor de Supabase (https://supabase.com)

-- 1. Ajouter les colonnes category et end_date à la table events
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'party' CHECK (category IN ('party', 'trip'));
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- 2. Recréer la vue publique sécurisée pour y inclure ces nouveaux champs
DROP VIEW IF EXISTS public_events;
CREATE VIEW public_events AS
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
    created_at
FROM events
WHERE status != 'draft';

-- 3. Redonner les droits de lecture sur la vue aux utilisateurs anonymes et connectés
GRANT SELECT ON public_events TO anon, authenticated;
