-- ============================================================
-- Landing Page Dynamic Content Tables
-- Date: 2026-04-24
-- ============================================================

-- 1. landing_testimonials
CREATE TABLE IF NOT EXISTS landing_testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    company TEXT,
    quote TEXT NOT NULL,
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. landing_faqs
CREATE TABLE IF NOT EXISTS landing_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. landing_partners
CREATE TABLE IF NOT EXISTS landing_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tagline TEXT,
    logo_url TEXT,
    website_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. landing_news
CREATE TABLE IF NOT EXISTS landing_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT,
    image_url TEXT,
    link_url TEXT,
    published_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. landing_metrics
CREATE TABLE IF NOT EXISTS landing_metrics (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    label TEXT,
    unit TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Add category to jobs if not exists
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS category TEXT;

-- Enable RLS
ALTER TABLE landing_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_metrics ENABLE ROW LEVEL SECURITY;

-- Public Read Access
CREATE POLICY "Public read landing_testimonials" ON landing_testimonials FOR SELECT USING (true);
CREATE POLICY "Public read landing_faqs" ON landing_faqs FOR SELECT USING (true);
CREATE POLICY "Public read landing_partners" ON landing_partners FOR SELECT USING (true);
CREATE POLICY "Public read landing_news" ON landing_news FOR SELECT USING (true);
CREATE POLICY "Public read landing_metrics" ON landing_metrics FOR SELECT USING (true);

-- Insert initial metrics
INSERT INTO landing_metrics (key, value, label, unit) VALUES
('years_of_service', '25', 'Years Serving GSC', 'years'),
('avg_time_to_interview', '48', 'Avg Time to Interview', 'hrs'),
('satisfaction_rate', '94.5', 'User Satisfaction', '%')
ON CONFLICT (key) DO NOTHING;
