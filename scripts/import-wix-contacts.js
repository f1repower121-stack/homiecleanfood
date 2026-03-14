#!/usr/bin/env node

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

async function importContacts() {
  try {
    console.log('📥 Reading Wix contacts...');
    const contacts = JSON.parse(fs.readFileSync('/tmp/wix_contacts.json', 'utf-8'));
    
    console.log(`Found ${contacts.length} contacts\n`);
    
    // Filter valid contacts
    const validContacts = contacts.filter(c => c.full_name && c.phone);
    console.log(`Importing ${validContacts.length} valid contacts...\n`);
    
    // Prepare data WITHOUT id field - just the profile fields
    const profileData = validContacts.map(c => ({
      full_name: c.full_name,
      phone: c.phone,
      address: c.address || null,
      points: c.points || 0,
      tier: c.tier || 'Homie'
    }));
    
    // Try to insert
    const { data, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select();
    
    if (error) {
      console.error('❌ Direct insert failed:', error.message);
      console.error(`Error code: ${error.code}\n`);
      
      if (error.code === '42501') {
        console.log('⚠️  Row-level security (RLS) is preventing direct inserts.');
        console.log('To import contacts, you need:');
        console.log('1. Set SUPABASE_SERVICE_ROLE_KEY in .env.local');
        console.log('2. OR disable RLS temporarily on the profiles table');
        console.log('3. OR create auth users for each contact first\n');
        console.log(`Contacts ready to import (saved to /tmp/wix_contacts.json):`);
        console.log(JSON.stringify(profileData.slice(0, 3), null, 2));
      }
      return;
    }
    
    console.log(`✅ Successfully imported ${data.length} contacts!\n`);
    
    console.log('Imported contacts:');
    console.log('='.repeat(70));
    data.slice(0, 10).forEach((c, i) => {
      console.log(`${i+1}. ${c.full_name}`);
      console.log(`   📱 ${c.phone}`);
      if (c.address) console.log(`   📍 ${c.address.substring(0, 45)}`);
      console.log(`   ⭐ ${c.points} pts | Tier: ${c.tier}`);
      console.log();
    });
    
    if (data.length > 10) {
      console.log(`... and ${data.length - 10} more contacts`);
    }
    console.log('='.repeat(70));
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

importContacts();
