-- FMB Experience - Database Schema
-- Execute this script in the Supabase SQL Editor.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. TABLES DEFINITIONS
-- =========================================================================

-- Table: events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    description TEXT,
    secret_address TEXT, -- Admin only, hidden from public queries
    cover_image_url TEXT,
    contact_email TEXT NOT NULL,
    instagram_url TEXT,
    whatsapp_number TEXT NOT NULL, -- Format: 33760304287
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'upcoming', 'past')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: djs
CREATE TABLE IF NOT EXISTS djs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    photo_url TEXT,
    instagram_url TEXT
);

-- Table: ticket_tiers
CREATE TABLE IF NOT EXISTS ticket_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- ex: "Vague 1", "Pack Table"
    description TEXT,
    price NUMERIC NOT NULL CHECK (price >= 0),
    payment_link TEXT NOT NULL, -- SumUp link
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Table: buyers
CREATE TABLE IF NOT EXISTS buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    confirmation_code TEXT UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text) from 1 for 8)),
    name_or_pseudo TEXT,
    ticket_tier_label TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'added_close_friends')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- 2. SECURITY & RLS CONFIGURATION
-- =========================================================================

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE djs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;

-- Clear any existing policies
DROP POLICY IF EXISTS "Allow select for authenticated" ON events;
DROP POLICY IF EXISTS "Allow all for authenticated" ON events;
DROP POLICY IF EXISTS "Allow public select on djs" ON djs;
DROP POLICY IF EXISTS "Allow all for admin on djs" ON djs;
DROP POLICY IF EXISTS "Allow public select on ticket_tiers" ON ticket_tiers;
DROP POLICY IF EXISTS "Allow all for admin on ticket_tiers" ON ticket_tiers;
DROP POLICY IF EXISTS "Allow public insert on buyers" ON buyers;
DROP POLICY IF EXISTS "Allow all for admin on buyers" ON buyers;

-- POLICY: events
-- Admins (authenticated) can perform any operation on events
CREATE POLICY "Allow all for admin on events" ON events
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- POLICY: djs
-- Public read access
CREATE POLICY "Allow public select on djs" ON djs
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Admins can do anything
CREATE POLICY "Allow all for admin on djs" ON djs
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- POLICY: ticket_tiers
-- Public read access
CREATE POLICY "Allow public select on ticket_tiers" ON ticket_tiers
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Admins can do anything
CREATE POLICY "Allow all for admin on ticket_tiers" ON ticket_tiers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- POLICY: buyers
-- Public can insert (needed when buying a ticket)
CREATE POLICY "Allow public insert on buyers" ON buyers
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Only admins can read/update/delete buyers
CREATE POLICY "Allow all for admin on buyers" ON buyers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Public can select (needed to get confirmation code after insert)
CREATE POLICY "Allow public select on buyers" ON buyers
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- =========================================================================
-- 3. SECURE VIEW FOR PUBLIC EVENTS (HIDES secret_address)
-- =========================================================================

-- Drop public view if it exists
DROP VIEW IF EXISTS public_events;

-- Create public view excluding secret_address
CREATE VIEW public_events AS
SELECT 
    id, 
    slug, 
    title, 
    subtitle, 
    event_date, 
    description, 
    cover_image_url, 
    contact_email, 
    instagram_url, 
    whatsapp_number, 
    status, 
    created_at
FROM events
WHERE status != 'draft';

-- Grant SELECT access on the public view to anonymous and authenticated users
GRANT SELECT ON public_events TO anon, authenticated;

-- =========================================================================
-- 4. SECURE FUNCTION TO VERIFY CONFIRMATION CODE & RETRIEVE ADDRESS
-- =========================================================================

CREATE OR REPLACE FUNCTION get_event_secret_address(p_event_id UUID, p_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with owner's privilege (bypass table RLS/permissions)
AS $$
DECLARE
    v_address TEXT;
    v_status TEXT;
BEGIN
    -- Look up the buyer record by event_id and uppercase code
    SELECT status INTO v_status
    FROM buyers
    WHERE event_id = p_event_id AND UPPER(confirmation_code) = UPPER(p_code);

    -- If the buyer exists and status is verified or added_close_friends, fetch the address
    IF v_status IN ('verified', 'added_close_friends') THEN
        SELECT secret_address INTO v_address
        FROM events
        WHERE id = p_event_id;
        
        RETURN v_address;
    ELSE
        RETURN NULL;
    END IF;
END;
$$;

-- Grant EXECUTE access on function to anon and authenticated
GRANT EXECUTE ON FUNCTION get_event_secret_address(UUID, TEXT) TO anon, authenticated;
