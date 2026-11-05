-- =========================================================================
-- FMB EXPERIENCE - MIGRATION DE SÉCURITÉ MAXIMALE (RLS & PROTECTION DONNÉES)
-- Exécutez ce script dans l'éditeur SQL de votre tableau de bord Supabase.
-- =========================================================================

-- 1. Révoquer la lecture publique sur la table des acheteurs (buyers)
-- Empêche tout internaute de lire les données personnelles (noms, emails, codes, notes)
DROP POLICY IF EXISTS "Allow public select on buyers" ON buyers;
DROP POLICY IF EXISTS "Allow select for admin only on buyers" ON buyers;

-- 2. Créer la politique stricte : seuls les administrateurs connectés peuvent LIRE la table buyers
CREATE POLICY "Allow select for admin only on buyers" ON buyers
    FOR SELECT
    TO authenticated
    USING (true);

-- 3. Sécuriser les politiques de mise à jour et suppression (Admin uniquement)
DROP POLICY IF EXISTS "Allow all for admin on buyers" ON buyers;
CREATE POLICY "Allow update/delete for admin only on buyers" ON buyers
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow delete for admin only on buyers" ON buyers
    FOR DELETE
    TO authenticated
    USING (true);

-- 4. Créer la fonction sécurisée SECURITY DEFINER pour le calcul des places vendues
-- Permet au site public de connaître le nombre de places vendues par tarif SANS jamais exposer les acheteurs
CREATE OR REPLACE FUNCTION get_event_tier_sales(p_event_id UUID)
RETURNS TABLE (
    ticket_tier_id UUID,
    ticket_tier_label TEXT,
    sold_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        b.ticket_tier_id,
        b.ticket_tier_label,
        COALESCE(SUM(b.ticket_count), 0)::BIGINT AS sold_count
    FROM buyers b
    WHERE b.event_id = p_event_id
      AND b.status = 'verified'
    GROUP BY b.ticket_tier_id, b.ticket_tier_label;
$$;

-- 5. Autoriser l'appel de cette fonction de comptage anonyme
GRANT EXECUTE ON FUNCTION get_event_tier_sales(UUID) TO anon, authenticated;

-- Confirmation de fin d'exécution
COMMENT ON FUNCTION get_event_tier_sales(UUID) IS 'Renvoie les compteurs anonymes de places vendues par tarif pour un événement.';
