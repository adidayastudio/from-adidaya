-- Create resource_regional_prices table
CREATE TABLE IF NOT EXISTS resource_regional_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID REFERENCES pricing_resources(id) ON DELETE CASCADE,
    city TEXT NOT NULL,
    year INTEGER NOT NULL,
    price DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(resource_id, city, year)
);

ALTER TABLE resource_regional_prices DISABLE ROW LEVEL SECURITY;
