-- ============================================================================
-- MARKET MAPPING FEATURE - Database Migration
-- ============================================================================
-- Description: Creates tables for visual market mapping feature
-- Author: GTM Map Team
-- Created: 2025-10-14
-- ============================================================================

-- Table 1: market_maps
-- Stores user-created market maps with axis configurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Untitled Map',
  x_axis_label VARCHAR(100) NOT NULL DEFAULT 'Conversion Rate',
  x_axis_min_label VARCHAR(100) DEFAULT 'Low',
  x_axis_max_label VARCHAR(100) DEFAULT 'High',
  y_axis_label VARCHAR(100) NOT NULL DEFAULT 'Traffic Share',
  y_axis_min_label VARCHAR(100) DEFAULT 'Low',
  y_axis_max_label VARCHAR(100) DEFAULT 'High',
  preset_type VARCHAR(50) DEFAULT 'custom', -- 'traffic_conversion', 'price_features', 'custom', etc.
  is_default BOOLEAN DEFAULT false, -- Only one default map per user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_market_maps_user_id ON market_maps(user_id);
CREATE INDEX idx_market_maps_default ON market_maps(user_id, is_default) WHERE is_default = true;

-- RLS Policies for market_maps
ALTER TABLE market_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own maps"
  ON market_maps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own maps"
  ON market_maps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own maps"
  ON market_maps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own maps"
  ON market_maps FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Table 2: market_map_positions
-- Stores x/y positions of companies on market maps
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_map_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_map_id UUID NOT NULL REFERENCES market_maps(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  x_position DECIMAL(5,2) NOT NULL CHECK (x_position >= 0 AND x_position <= 100), -- 0-100 percentage
  y_position DECIMAL(5,2) NOT NULL CHECK (y_position >= 0 AND y_position <= 100), -- 0-100 percentage
  notes TEXT, -- Optional user notes about this positioning
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_company_per_map UNIQUE(market_map_id, company_id) -- One position per company per map
);

-- Indexes for performance
CREATE INDEX idx_market_map_positions_map_id ON market_map_positions(market_map_id);
CREATE INDEX idx_market_map_positions_company_id ON market_map_positions(company_id);
CREATE UNIQUE INDEX idx_market_map_positions_unique ON market_map_positions(market_map_id, company_id);

-- RLS Policies for market_map_positions (inherit from market_maps)
ALTER TABLE market_map_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view positions on their maps"
  ON market_map_positions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM market_maps
      WHERE market_maps.id = market_map_positions.market_map_id
      AND market_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create positions on their maps"
  ON market_map_positions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM market_maps
      WHERE market_maps.id = market_map_positions.market_map_id
      AND market_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update positions on their maps"
  ON market_map_positions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM market_maps
      WHERE market_maps.id = market_map_positions.market_map_id
      AND market_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete positions on their maps"
  ON market_map_positions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM market_maps
      WHERE market_maps.id = market_map_positions.market_map_id
      AND market_maps.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Table 3: market_map_shares (Optional - for sharing feature)
-- Stores shareable links for market maps
-- ============================================================================

CREATE TABLE IF NOT EXISTS market_map_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_map_id UUID NOT NULL REFERENCES market_maps(id) ON DELETE CASCADE,
  share_token VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  view_count INTEGER DEFAULT 0,
  is_revoked BOOLEAN DEFAULT false
);

-- Index for token lookup
CREATE UNIQUE INDEX idx_market_map_shares_token ON market_map_shares(share_token) WHERE is_revoked = false;
CREATE INDEX idx_market_map_shares_map_id ON market_map_shares(market_map_id);

-- RLS Policies for market_map_shares
ALTER TABLE market_map_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shares for their maps"
  ON market_map_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM market_maps
      WHERE market_maps.id = market_map_shares.market_map_id
      AND market_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create shares for their maps"
  ON market_map_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM market_maps
      WHERE market_maps.id = market_map_shares.market_map_id
      AND market_maps.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update shares for their maps"
  ON market_map_shares FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM market_maps
      WHERE market_maps.id = market_map_shares.market_map_id
      AND market_maps.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Schema Updates: Add metadata columns to existing `companies` table
-- ============================================================================

DO $$ 
BEGIN
  -- Add traffic_share_estimate column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'traffic_share_estimate'
  ) THEN
    ALTER TABLE companies ADD COLUMN traffic_share_estimate INTEGER CHECK (traffic_share_estimate >= 0 AND traffic_share_estimate <= 100);
  END IF;

  -- Add conversion_rate_estimate column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'conversion_rate_estimate'
  ) THEN
    ALTER TABLE companies ADD COLUMN conversion_rate_estimate DECIMAL(5,2) CHECK (conversion_rate_estimate >= 0 AND conversion_rate_estimate <= 100);
  END IF;

  -- Add last_matrix_update column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'companies' AND column_name = 'last_matrix_update'
  ) THEN
    ALTER TABLE companies ADD COLUMN last_matrix_update TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- ============================================================================
-- Functions & Triggers
-- ============================================================================

-- Function: Update updated_at timestamp on market_maps
CREATE OR REPLACE FUNCTION update_market_maps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_market_maps_updated_at
  BEFORE UPDATE ON market_maps
  FOR EACH ROW
  EXECUTE FUNCTION update_market_maps_updated_at();

-- Function: Update updated_at timestamp on market_map_positions
CREATE OR REPLACE FUNCTION update_market_map_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_market_map_positions_updated_at
  BEFORE UPDATE ON market_map_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_market_map_positions_updated_at();

-- Function: Ensure only one default map per user
CREATE OR REPLACE FUNCTION ensure_single_default_map()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset is_default for all other maps of this user
    UPDATE market_maps
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_map
  BEFORE INSERT OR UPDATE ON market_maps
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_map();

-- ============================================================================
-- Sample Data (Optional - for testing)
-- ============================================================================

-- Uncomment to insert sample preset configurations
/*
INSERT INTO market_maps (user_id, name, x_axis_label, x_axis_min_label, x_axis_max_label, y_axis_label, y_axis_min_label, y_axis_max_label, preset_type, is_default)
VALUES (
  auth.uid(),
  'Traffic vs Conversion',
  'Conversion Rate',
  'Low conversion',
  'High conversion',
  'Traffic Share',
  'Low traffic',
  'High traffic',
  'traffic_conversion',
  true
);
*/

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('market_maps', 'market_map_positions', 'market_map_shares');

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('market_maps', 'market_map_positions', 'market_map_shares');

-- Verify indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('market_maps', 'market_map_positions', 'market_map_shares');

-- ============================================================================
-- Rollback Instructions (if needed)
-- ============================================================================

/*
-- To rollback this migration:

DROP TRIGGER IF EXISTS trigger_ensure_single_default_map ON market_maps;
DROP TRIGGER IF EXISTS trigger_market_map_positions_updated_at ON market_map_positions;
DROP TRIGGER IF EXISTS trigger_market_maps_updated_at ON market_maps;

DROP FUNCTION IF EXISTS ensure_single_default_map();
DROP FUNCTION IF EXISTS update_market_map_positions_updated_at();
DROP FUNCTION IF EXISTS update_market_maps_updated_at();

DROP TABLE IF EXISTS market_map_shares CASCADE;
DROP TABLE IF EXISTS market_map_positions CASCADE;
DROP TABLE IF EXISTS market_maps CASCADE;

ALTER TABLE companies DROP COLUMN IF EXISTS traffic_share_estimate;
ALTER TABLE companies DROP COLUMN IF EXISTS conversion_rate_estimate;
ALTER TABLE companies DROP COLUMN IF EXISTS last_matrix_update;
*/

-- ============================================================================
-- Migration Complete
-- ============================================================================

