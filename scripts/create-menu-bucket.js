#!/usr/bin/env node
/**
 * Create the menu-images storage bucket for admin menu image uploads.
 * Requires: SUPABASE_SERVICE_ROLE_KEY in .env.local (Dashboard → Settings → API → service_role)
 *
 * Usage: npm run db:menu-bucket
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    console.error('');
    console.error('Get service_role key from: Supabase Dashboard → Settings → API → service_role (secret)');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data, error } = await supabase.storage.createBucket('menu-images', {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    fileSizeLimit: 5242880, // 5MB
  });

  if (error) {
    if (error.message?.includes('already exists') || error.message?.includes('Bucket already exists')) {
      console.log('✅ menu-images bucket already exists');
    } else {
      console.error('❌ Failed to create bucket:', error.message);
      process.exit(1);
    }
  } else {
    console.log('✅ menu-images bucket created successfully');
  }
}

run();
