-- Simplified Meal Program Tables - Admin Creates Plans Manually

-- 1. MEAL LIBRARY (Preset Meals)
CREATE TABLE IF NOT EXISTS meal_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  meal_name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,

  -- Nutrition
  calories INTEGER,
  protein_grams DECIMAL(5, 1),
  carbs_grams DECIMAL(5, 1),
  fat_grams DECIMAL(5, 1),

  -- Properties
  contains_meat VARCHAR(50), -- chicken, beef, pork, seafood, none
  ingredients TEXT[] DEFAULT '{}',
  contains_allergens TEXT[] DEFAULT '{}', -- nuts, dairy, shellfish, fish

  -- Availability
  is_available BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MEAL PROGRAMS (Admin Creates These)
CREATE TABLE IF NOT EXISTS meal_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  program_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Program Configuration
  total_days INTEGER NOT NULL, -- How many days the program runs
  meals_per_day INTEGER NOT NULL, -- How many meals per day
  total_meals INTEGER NOT NULL, -- How many meals total
  package_duration_days INTEGER NOT NULL, -- How long before it expires

  -- Pricing
  price_per_meal DECIMAL(10, 2),
  total_price DECIMAL(10, 2),

  -- Status
  is_available BOOLEAN DEFAULT TRUE,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. MEAL PROGRAM ITEMS (Which meals in the program)
CREATE TABLE IF NOT EXISTS meal_program_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  meal_program_id UUID NOT NULL REFERENCES meal_programs(id) ON DELETE CASCADE,
  meal_library_id UUID NOT NULL REFERENCES meal_library(id),

  -- Day and meal number (e.g., Day 1, Meal 1)
  day_number INTEGER NOT NULL,
  meal_number INTEGER NOT NULL, -- 1st, 2nd, 3rd meal of the day

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CUSTOMER MEAL PROFILES
CREATE TABLE IF NOT EXISTS customer_meal_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  location VARCHAR(50) NOT NULL, -- BKK, PT, etc
  address TEXT,
  delivery_time VARCHAR(100), -- "5-6 pm", "10-12 am"
  order_channel VARCHAR(50), -- Messenger, Whatsapp, Instagram, Line

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- 5. CUSTOMER DIETARY PREFERENCES (Reference Only)
CREATE TABLE IF NOT EXISTS customer_dietary_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_meal_profile_id UUID NOT NULL REFERENCES customer_meal_profiles(id) ON DELETE CASCADE,

  -- Reference information only - Admin uses this when creating meal plans
  allergies TEXT[] DEFAULT '{}',
  meat_preferences TEXT[] DEFAULT '{}',
  spicy_level INTEGER DEFAULT 1, -- 0-3
  target_calories_per_day INTEGER,
  meals_per_day INTEGER,
  special_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(customer_meal_profile_id)
);

-- 6. CUSTOMER PACKAGES (Active Package Assignment)
CREATE TABLE IF NOT EXISTS customer_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_meal_profile_id UUID NOT NULL REFERENCES customer_meal_profiles(id) ON DELETE CASCADE,
  meal_program_id UUID NOT NULL REFERENCES meal_programs(id),

  -- Package Status
  status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, cancelled

  -- Meal Tracking
  total_meals INTEGER NOT NULL, -- From meal_program
  meals_consumed INTEGER DEFAULT 0,

  -- Dates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  paused_at TIMESTAMP WITH TIME ZONE,
  resumed_at TIMESTAMP WITH TIME ZONE,
  paused_until_date DATE, -- Auto-resume on this date
  ended_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- Program expires on this date

  -- Metadata
  notes TEXT
);

-- 7. MEAL DELIVERIES (Daily Delivery Tracking)
CREATE TABLE IF NOT EXISTS meal_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_package_id UUID NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,
  meal_library_id UUID NOT NULL REFERENCES meal_library(id),

  -- Schedule
  scheduled_date DATE NOT NULL,
  delivered_date DATE,
  delivery_time VARCHAR(100),

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, delivered, skipped, cancelled

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. PAUSE HISTORY (Track pauses/resumes)
CREATE TABLE IF NOT EXISTS package_pause_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  customer_package_id UUID NOT NULL REFERENCES customer_packages(id) ON DELETE CASCADE,

  paused_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resume_date DATE NOT NULL,
  reason VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_meal_programs_available ON meal_programs(is_available);
CREATE INDEX IF NOT EXISTS idx_meal_program_items_program ON meal_program_items(meal_program_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_location ON customer_meal_profiles(location);
CREATE INDEX IF NOT EXISTS idx_customer_packages_customer ON customer_packages(customer_meal_profile_id);
CREATE INDEX IF NOT EXISTS idx_customer_packages_status ON customer_packages(status);
CREATE INDEX IF NOT EXISTS idx_meal_deliveries_customer ON meal_deliveries(customer_package_id);
CREATE INDEX IF NOT EXISTS idx_meal_deliveries_date ON meal_deliveries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_meal_deliveries_status ON meal_deliveries(status);

-- ROW LEVEL SECURITY
ALTER TABLE meal_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_program_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_meal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_dietary_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_pause_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Meal library is readable by all"
  ON meal_library FOR SELECT
  USING (true);

CREATE POLICY "Meal programs readable by all"
  ON meal_programs FOR SELECT
  USING (true);

CREATE POLICY "Users see own customer profile"
  ON customer_meal_profiles FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users see own packages"
  ON customer_packages FOR SELECT
  USING (
    customer_meal_profile_id IN (
      SELECT id FROM customer_meal_profiles WHERE user_id = auth.uid()
    ) OR is_admin()
  );

CREATE POLICY "Users see own deliveries"
  ON meal_deliveries FOR SELECT
  USING (
    customer_package_id IN (
      SELECT id FROM customer_packages
      WHERE customer_meal_profile_id IN (
        SELECT id FROM customer_meal_profiles WHERE user_id = auth.uid()
      )
    ) OR is_admin()
  );

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() ->> 'email')::text LIKE '%@admin%' OR
         (SELECT COUNT(*) FROM auth.users WHERE id = auth.uid() AND email LIKE '%@admin%') > 0;
END;
$$ LANGUAGE PLPGSQL SECURITY DEFINER;
