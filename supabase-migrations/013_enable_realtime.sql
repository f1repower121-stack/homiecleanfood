-- Enable Supabase Realtime for orders and profiles tables
-- Run in Supabase SQL Editor if you get "relation not in publication" errors
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table profiles;
