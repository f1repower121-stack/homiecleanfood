-- Create push subscriptions table for Web Push notifications
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL UNIQUE,
  auth_key TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert their own subscription
CREATE POLICY "Allow insert push subscriptions" ON push_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow anyone to delete their own subscription
CREATE POLICY "Allow delete push subscriptions" ON push_subscriptions
  FOR DELETE
  USING (true);

-- Create policy to view all subscriptions (for server-side push)
CREATE POLICY "Allow select push subscriptions" ON push_subscriptions
  FOR SELECT
  USING (true);

-- Create index on endpoint for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);
