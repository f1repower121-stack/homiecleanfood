-- HomieClean Complete Meal Prep + Loyalty System
-- Version: 1.0.0
-- Description: Enterprise meal prep platform with loyalty, admin controls, and mobile-ready design

-- ============ CONFIGURATION TABLES ============

CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES auth.users(id)
);

-- Brand & Design Configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
('brand_colors', '{"primary":"#10b981","secondary":"#1e293b","accent":"#d4af37","success":"#059669","warning":"#d97706"}', 'Brand color palette'),
('typography', '{"headline":"Sora","body":"Inter","accent":"Space Mono"}', 'Font family configuration'),
('delivery_areas', '["Bangkok","Chiang Mai","Phuket","Pattaya"]', 'Delivery service areas'),
('currencies', '{"primary":"THB","symbol":"฿"}', 'Currency settings'),
('timezone', '"Asia/Bangkok"', 'System timezone');

-- ============ MEAL PROGRAM MANAGEMENT ============

CREATE TABLE IF NOT EXISTS meal_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  category VARCHAR(100), -- 'weight_loss', 'muscle_gain', 'general_health', 'athlete', 'vegetarian', 'keto'
  description TEXT,
  detailed_description JSONB, -- Rich text content
  duration_days INT NOT NULL,
  meals_per_day INT DEFAULT 2,
  total_meals INT GENERATED ALWAYS AS (duration_days * meals_per_day) STORED,
  target_demographic VARCHAR(100),
  difficulty_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced'

  -- Nutrition Targets
  nutrition_targets JSONB, -- {protein_grams, carbs_grams, fat_grams, calories}
  dietary_restrictions JSONB, -- {gluten_free, dairy_free, vegan, keto, etc}

  -- Pricing
  price_per_meal DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  discount_percent INT DEFAULT 0,

  -- Loyalty
  points_earned INT DEFAULT 0, -- Points per meal completion
  points_bonus INT DEFAULT 500, -- Bonus for completing program

  -- Media
  featured_image_url VARCHAR(255),
  gallery_images JSONB, -- Array of image URLs

  -- Availability & Limits
  is_available BOOLEAN DEFAULT true,
  max_capacity INT,
  current_enrollments INT DEFAULT 0,
  start_date DATE,
  end_date DATE,

  -- Admin Settings
  is_featured BOOLEAN DEFAULT false,
  display_order INT,
  created_by UUID REFERENCES auth.users(id),
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'archived'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS program_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES meal_programs(id) ON DELETE CASCADE,
  meal_id UUID REFERENCES meals(id),
  day_number INT NOT NULL,
  meal_sequence INT NOT NULL, -- 1=breakfast, 2=lunch, 3=dinner, 4=snack
  meal_name VARCHAR(255),
  meal_description TEXT,
  meal_image_url VARCHAR(255),

  -- Nutrition Info
  nutrition_info JSONB, -- {protein, carbs, fat, calories, fiber}
  ingredients JSONB, -- Array of ingredients
  allergens JSONB, -- Array of allergen warnings

  -- Timing
  prep_instructions TEXT,
  storage_instructions TEXT,
  shelf_life_days INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS program_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES meal_programs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rating INT CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  review_text TEXT,

  -- Result Summary (optional)
  result_weight_change DECIMAL(5, 2),
  result_energy_improvement INT, -- 1-100 percentage
  would_recommend BOOLEAN,

  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ CUSTOMER PROGRAM ENROLLMENT ============

CREATE TABLE IF NOT EXISTS customer_meal_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  program_id UUID NOT NULL REFERENCES meal_programs(id),

  -- Enrollment Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- Progress
  meals_consumed INT DEFAULT 0,
  days_completed INT DEFAULT 0,

  -- Pause/Resume
  paused_until DATE,
  pause_reason TEXT,

  -- Loyalty
  points_earned INT DEFAULT 0,
  bonus_points_claimed BOOLEAN DEFAULT false,

  -- Health Metrics
  initial_weight DECIMAL(5, 2),
  initial_energy_level INT, -- 1-100

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ LOYALTY POINTS SYSTEM ============

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Points Balance
  current_points INT DEFAULT 0,
  lifetime_points INT DEFAULT 0,

  -- Tier System
  tier VARCHAR(50) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  tier_progress_percent INT DEFAULT 0,
  tier_updated_at TIMESTAMP,

  -- Milestones
  total_meals_completed INT DEFAULT 0,
  total_programs_completed INT DEFAULT 0,
  total_referrals_successful INT DEFAULT 0,

  -- Settings
  referral_code VARCHAR(50) UNIQUE,
  referral_link VARCHAR(255),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,

  transaction_type VARCHAR(50) NOT NULL, -- 'earn', 'redeem', 'bonus', 'referral'
  source VARCHAR(100), -- 'meal_consumed', 'program_completed', 'review', 'social_share', 'referral', 'birthday'

  points_amount INT NOT NULL,
  points_balance_before INT,
  points_balance_after INT,

  -- Redemption Details
  redeemed_for VARCHAR(100), -- 'discount', 'free_meal', 'free_program', 'tier_unlock'
  reward_value DECIMAL(10, 2),

  -- References
  related_program_id UUID REFERENCES meal_programs(id),
  related_order_id UUID,

  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_tier_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier VARCHAR(50) NOT NULL UNIQUE,

  -- Progression
  min_points INT NOT NULL,
  max_points INT,

  -- Benefits
  discount_percent INT DEFAULT 0,
  free_delivery BOOLEAN DEFAULT false,
  free_delivery_days INT, -- NULL = forever
  priority_support BOOLEAN DEFAULT false,
  early_access_days INT, -- Days before program launch
  exclusive_programs BOOLEAN DEFAULT false,

  -- Rewards
  special_benefits JSONB, -- Additional benefits as JSON

  -- Customization
  tier_color VARCHAR(7),
  tier_emoji VARCHAR(2),
  badge_image_url VARCHAR(255),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  reward_type VARCHAR(50) NOT NULL, -- 'discount', 'free_meal', 'free_program', 'feature_unlock'
  reward_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Cost in Points
  points_required INT NOT NULL,

  -- Reward Value
  discount_amount DECIMAL(10, 2), -- For discounts
  discount_percent INT, -- For percentage discounts
  free_meal_count INT DEFAULT 1, -- For free meals
  free_program_days INT, -- For free programs

  -- Availability
  is_available BOOLEAN DEFAULT true,
  max_redemptions INT, -- NULL = unlimited
  redemptions_count INT DEFAULT 0,

  -- Restrictions
  valid_from DATE,
  valid_until DATE,
  applicable_programs JSONB, -- NULL = all programs
  minimum_order_value DECIMAL(10, 2),

  -- Display
  reward_emoji VARCHAR(2),
  reward_icon_url VARCHAR(255),
  display_order INT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id),
  referred_user_id UUID REFERENCES auth.users(id),

  referral_code VARCHAR(50) NOT NULL,
  referral_link VARCHAR(255),

  -- Milestones
  signup_completed BOOLEAN DEFAULT false,
  signup_completed_at TIMESTAMP,
  first_program_completed BOOLEAN DEFAULT false,
  first_program_completed_at TIMESTAMP,

  -- Points & Rewards
  signup_points_earned INT DEFAULT 500,
  signup_points_claimed BOOLEAN DEFAULT false,
  completion_points_earned INT DEFAULT 500,
  completion_points_claimed BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'signup_complete', 'active', 'completed'

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ CUSTOMER HEALTH METRICS ============

CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID REFERENCES meal_programs(id),

  -- Measurements
  date DATE NOT NULL,
  weight DECIMAL(5, 2),
  energy_level INT, -- 1-100
  sleep_quality INT, -- 1-5
  mood_score INT, -- 1-5

  -- Custom Metrics
  custom_metrics JSONB, -- User-defined metrics

  -- Notes
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ ADMIN DASHBOARD TABLES ============

CREATE TABLE IF NOT EXISTS admin_dashboard_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Widget Configuration
  featured_programs_limit INT DEFAULT 6,
  show_analytics BOOLEAN DEFAULT true,
  show_referral_stats BOOLEAN DEFAULT true,
  show_health_metrics BOOLEAN DEFAULT true,

  -- Notification Settings
  low_stock_alert_threshold INT DEFAULT 10,
  new_review_notification BOOLEAN DEFAULT true,

  -- Promotional Settings
  promotion_banner_enabled BOOLEAN DEFAULT true,
  promotion_banner_text TEXT,
  promotion_banner_cta_text VARCHAR(100),
  promotion_discount_percent INT,

  -- Email Settings
  order_confirmation_template_id UUID,
  delivery_reminder_enabled BOOLEAN DEFAULT true,
  program_completion_reward_enabled BOOLEAN DEFAULT true,

  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(255) UNIQUE NOT NULL,
  template_type VARCHAR(50), -- 'order_confirmation', 'delivery_reminder', 'milestone', 'referral'

  subject TEXT NOT NULL,
  body TEXT NOT NULL, -- HTML content

  -- Customization
  can_customize BOOLEAN DEFAULT true,
  variables JSONB, -- Available variables for template

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),

  action VARCHAR(100) NOT NULL, -- 'create_program', 'edit_program', 'manage_loyalty', etc
  entity_type VARCHAR(100), -- 'program', 'user', 'loyalty', etc
  entity_id UUID,

  changes JSONB, -- What changed
  reason TEXT, -- Why it changed

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============ INDICES FOR PERFORMANCE ============

CREATE INDEX idx_meal_programs_category ON meal_programs(category) WHERE is_available = true;
CREATE INDEX idx_meal_programs_status ON meal_programs(status);
CREATE INDEX idx_customer_meal_programs_user ON customer_meal_programs(user_id);
CREATE INDEX idx_customer_meal_programs_status ON customer_meal_programs(status);
CREATE INDEX idx_loyalty_accounts_user ON loyalty_accounts(user_id);
CREATE INDEX idx_loyalty_accounts_tier ON loyalty_accounts(tier);
CREATE INDEX idx_loyalty_transactions_account ON loyalty_transactions(loyalty_account_id);
CREATE INDEX idx_loyalty_transactions_created ON loyalty_transactions(created_at);
CREATE INDEX idx_health_metrics_user_date ON health_metrics(user_id, date);
CREATE INDEX idx_program_reviews_program ON program_reviews(program_id);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_user_id);

-- ============ ENABLE RLS (Row Level Security) ============

ALTER TABLE meal_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_meal_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- Public can view active programs
CREATE POLICY "public_view_programs" ON meal_programs
  FOR SELECT USING (is_available = true AND status = 'active');

-- Authenticated users can view their own programs
CREATE POLICY "users_view_own_programs" ON customer_meal_programs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only view their own loyalty data
CREATE POLICY "users_view_own_loyalty" ON loyalty_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only view their own transactions
CREATE POLICY "users_view_own_transactions" ON loyalty_transactions
  FOR SELECT USING (
    loyalty_account_id IN (
      SELECT id FROM loyalty_accounts WHERE user_id = auth.uid()
    )
  );

-- Users can only view their own health metrics
CREATE POLICY "users_view_own_metrics" ON health_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Admin can view all data (handled via role-based access in application)
-- Admin operations use service role key

-- ============ FUNCTIONS FOR BUSINESS LOGIC ============

CREATE OR REPLACE FUNCTION update_loyalty_tier(user_id UUID)
RETURNS TABLE (new_tier VARCHAR, points INT) AS $$
DECLARE
  total_points INT;
  new_tier_name VARCHAR;
BEGIN
  SELECT lifetime_points INTO total_points
  FROM loyalty_accounts WHERE loyalty_accounts.user_id = update_loyalty_tier.user_id;

  -- Determine tier based on points
  new_tier_name := CASE
    WHEN total_points >= 3001 THEN 'platinum'
    WHEN total_points >= 1201 THEN 'gold'
    WHEN total_points >= 301 THEN 'silver'
    ELSE 'bronze'
  END;

  -- Update tier if changed
  UPDATE loyalty_accounts
  SET tier = new_tier_name, tier_updated_at = CURRENT_TIMESTAMP
  WHERE loyalty_accounts.user_id = update_loyalty_tier.user_id
  AND tier != new_tier_name;

  RETURN QUERY SELECT new_tier_name, total_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add loyalty points
CREATE OR REPLACE FUNCTION add_loyalty_points(
  user_id UUID,
  points INT,
  source_type VARCHAR,
  program_id UUID DEFAULT NULL
)
RETURNS TABLE (new_balance INT, tier_upgraded BOOLEAN) AS $$
DECLARE
  loyalty_id UUID;
  old_tier VARCHAR;
  new_tier VARCHAR;
  old_balance INT;
BEGIN
  -- Get loyalty account
  SELECT id INTO loyalty_id
  FROM loyalty_accounts WHERE loyalty_accounts.user_id = add_loyalty_points.user_id;

  IF loyalty_id IS NULL THEN
    INSERT INTO loyalty_accounts (user_id) VALUES (add_loyalty_points.user_id)
    RETURNING id INTO loyalty_id;
  END IF;

  -- Get old tier
  SELECT tier, current_points INTO old_tier, old_balance
  FROM loyalty_accounts WHERE id = loyalty_id;

  -- Add points
  UPDATE loyalty_accounts
  SET current_points = current_points + points,
      lifetime_points = lifetime_points + points
  WHERE id = loyalty_id;

  -- Record transaction
  INSERT INTO loyalty_transactions (
    loyalty_account_id, transaction_type, source, points_amount,
    points_balance_before, related_program_id
  ) VALUES (
    loyalty_id, 'earn', source_type, points,
    old_balance, program_id
  );

  -- Update tier
  SELECT tier INTO new_tier FROM update_loyalty_tier(add_loyalty_points.user_id);

  -- Return new balance and if tier upgraded
  RETURN QUERY
  SELECT current_points, (old_tier != new_tier)::BOOLEAN
  FROM loyalty_accounts WHERE id = loyalty_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============ VIEWS FOR ANALYTICS ============

CREATE OR REPLACE VIEW program_analytics AS
SELECT
  p.id,
  p.program_name,
  p.category,
  COUNT(DISTINCT cmp.user_id) as total_enrollments,
  COUNT(DISTINCT CASE WHEN cmp.status = 'completed' THEN cmp.user_id END) as completions,
  ROUND(
    COUNT(DISTINCT CASE WHEN cmp.status = 'completed' THEN cmp.user_id END)::NUMERIC /
    COUNT(DISTINCT cmp.user_id) * 100, 1
  ) as completion_rate,
  AVG(pr.rating) as avg_rating,
  COUNT(pr.id) as total_reviews,
  p.total_price * COUNT(DISTINCT cmp.user_id) as total_revenue
FROM meal_programs p
LEFT JOIN customer_meal_programs cmp ON p.id = cmp.program_id
LEFT JOIN program_reviews pr ON p.id = pr.program_id
GROUP BY p.id, p.program_name, p.category, p.total_price;

CREATE OR REPLACE VIEW loyalty_analytics AS
SELECT
  tier,
  COUNT(*) as customer_count,
  AVG(lifetime_points) as avg_lifetime_points,
  AVG(total_programs_completed) as avg_programs_completed,
  AVG(total_referrals_successful) as avg_referrals,
  COUNT(CASE WHEN tier_updated_at > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_to_tier_30d
FROM loyalty_accounts
GROUP BY tier;

-- ============ INITIAL DATA ============

-- Insert default loyalty tier benefits
INSERT INTO loyalty_tier_benefits (tier, min_points, max_points, discount_percent, tier_color, tier_emoji) VALUES
('bronze', 0, 300, 0, '#6b7280', '⭕'),
('silver', 301, 1200, 5, '#c0c0c0', '⭐'),
('gold', 1201, 3000, 10, '#d4af37', '👑'),
('platinum', 3001, NULL, 15, '#10b981', '💎');

-- Insert default rewards
INSERT INTO loyalty_rewards (reward_type, reward_name, points_required, discount_amount, reward_emoji) VALUES
('discount', '฿50 Off Next Program', 300, 50.00, '🎁'),
('free_meal', '1 Free Meal', 500, NULL, '🍜'),
('discount', 'Free Delivery 1 Month', 500, NULL, '🚚'),
('discount', '฿200 Off Any Program', 1000, 200.00, '💰'),
('free_program', '1 Free 30-Day Program', 1200, NULL, '🎯'),
('free_program', '1 Free 60-Day Program', 3000, NULL, '🏆');

COMMIT;
