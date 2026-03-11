-- Run this SQL in your Supabase dashboard > SQL Editor

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'Homie',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  items JSONB NOT NULL,
  total INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'cod',
  status TEXT DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Loyalty transactions
CREATE TABLE loyalty_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  points INTEGER NOT NULL,
  reason TEXT,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see their own data
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own loyalty" ON loyalty_transactions FOR SELECT USING (auth.uid() = user_id);

-- Menu items (for admin management)
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text DEFAULT 'chicken',
  lean_price integer DEFAULT 215,
  bulk_price integer DEFAULT 250,
  description text,
  image_url text,
  calories_lean integer,
  protein_lean integer,
  carb_lean integer,
  fat_lean integer,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read menu_items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert menu_items" ON menu_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update menu_items" ON menu_items FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete menu_items" ON menu_items FOR DELETE USING (true);

-- Push subscriptions (for admin order notifications)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint text UNIQUE NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can manage push_subscriptions" ON push_subscriptions FOR ALL USING (true) WITH CHECK (true);
