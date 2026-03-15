-- Custom Meal Program Tables

-- 1. Customer Meal Profiles
CREATE TABLE IF NOT EXISTS customer_meal_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  location VARCHAR(50) NOT NULL,
  address TEXT,
  delivery_time VARCHAR(100),
  order_channel VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id)
);

-- 2. Customer Dietary Preferences
CREATE TABLE IF NOT EXISTS customer_dietary_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_meal_profile_id UUID NOT NULL REFERENCES customer_meal_profiles(id) ON DELETE CASCADE,

  -- Allergies (array)
  allergies TEXT[] DEFAULT '{}',

  -- Meat preferences (array of selected options)
  meat_preferences TEXT[] DEFAULT '{}', -- chicken, beef, pork, seafood, fish, tofu, etc

  -- Spicy level (0-3)
  spicy_level INTEGER DEFAULT 1,

  -- Target calories per day
  target_calories_per_day INTEGER,

  -- Meals per day
  meals_per_day INTEGER DEFAULT 2,

  -- Special dietary notes
  special_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(customer_meal_profile_id)
);

-- 3. Meal Packages
CREATE TABLE IF NOT EXISTS meal_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_meal_profile_id UUID NOT NULL REFERENCES customer_meal_profiles(id) ON DELETE CASCADE,

  -- Package details
  meal_count INTEGER NOT NULL,
  meals_consumed INTEGER DEFAULT 0,
  price_per_meal DECIMAL(10, 2),
  total_package_price DECIMAL(10, 2),

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, expired

  -- Dates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  resumed_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  notes TEXT,

  UNIQUE(id)
);

-- 4. Meal Plan (Daily meal assignments)
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_meal_profile_id UUID NOT NULL REFERENCES customer_meal_profiles(id) ON DELETE CASCADE,
  meal_package_id UUID REFERENCES meal_packages(id) ON DELETE SET NULL,

  -- Meal details
  meal_name VARCHAR(255),
  meal_description TEXT,

  -- Nutrition
  calories INTEGER,
  protein_grams DECIMAL(5, 1),
  carbs_grams DECIMAL(5, 1),
  fat_grams DECIMAL(5, 1),

  -- Scheduling
  scheduled_date DATE NOT NULL,
  delivered_date DATE,

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, delivered, skipped, substituted

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Meal Library (Available meals)
CREATE TABLE IF NOT EXISTS meal_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  meal_name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Nutrition info
  calories INTEGER,
  protein_grams DECIMAL(5, 1),
  carbs_grams DECIMAL(5, 1),
  fat_grams DECIMAL(5, 1),

  -- Ingredients (array)
  ingredients TEXT[],

  -- Properties
  contains_meat VARCHAR(50), -- chicken, beef, pork, seafood, none
  is_vegetarian BOOLEAN DEFAULT FALSE,
  is_vegan BOOLEAN DEFAULT FALSE,

  -- Allergen info
  contains_allergens TEXT[] DEFAULT '{}', -- nuts, dairy, shellfish, etc

  -- Cooking time
  prep_time_minutes INTEGER,

  -- Status
  is_available BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Package Pause History
CREATE TABLE IF NOT EXISTS package_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_package_id UUID NOT NULL REFERENCES meal_packages(id) ON DELETE CASCADE,

  paused_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resume_date DATE,
  reason VARCHAR(255),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Meal Usage Tracking
CREATE TABLE IF NOT EXISTS meal_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  meal_package_id UUID NOT NULL REFERENCES meal_packages(id) ON DELETE CASCADE,

  delivered_at TIMESTAMP WITH TIME ZONE,
  delivery_address TEXT,
  delivery_time VARCHAR(100),

  status VARCHAR(50) DEFAULT 'pending', -- pending, delivered, received, cancelled

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_customer_profiles_location ON customer_meal_profiles(location);
CREATE INDEX IF NOT EXISTS idx_packages_customer ON meal_packages(customer_meal_profile_id);
CREATE INDEX IF NOT EXISTS idx_packages_status ON meal_packages(status);
CREATE INDEX IF NOT EXISTS idx_meal_plans_customer ON meal_plans(customer_meal_profile_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_scheduled_date ON meal_plans(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_meal_deliveries_status ON meal_deliveries(status);

-- Row Level Security (RLS)
ALTER TABLE customer_meal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_dietary_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own meal profiles"
  ON customer_meal_profiles FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can view own packages"
  ON meal_packages FOR SELECT
  USING (
    customer_meal_profile_id IN (
      SELECT id FROM customer_meal_profiles WHERE user_id = auth.uid()
    ) OR is_admin()
  );

CREATE POLICY "Users can view own meal plans"
  ON meal_plans FOR SELECT
  USING (
    customer_meal_profile_id IN (
      SELECT id FROM customer_meal_profiles WHERE user_id = auth.uid()
    ) OR is_admin()
  );
