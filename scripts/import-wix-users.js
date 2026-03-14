#!/usr/bin/env node

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function importWixUsers() {
  try {
    console.log('📥 Reading Wix contacts...');
    const contacts = JSON.parse(fs.readFileSync('/tmp/wix_contacts.json', 'utf-8'));

    console.log(`Found ${contacts.length} contacts\n`);

    // Filter valid contacts (need name and phone for verification)
    const validContacts = contacts.filter(c => c.full_name && c.phone);
    console.log(`Creating auth users for ${validContacts.length} valid contacts...\n`);

    const createdUsers = [];
    const failedUsers = [];

    // Create auth users one by one
    for (const contact of validContacts) {
      try {
        // Use phone as email (Wix doesn't have emails for all contacts)
        // Format: phone@wix-import.local (won't conflict with real emails)
        const email = `${contact.phone.replace(/[^0-9]/g, '')}@wix-import.local`;

        // Create user with a random password (won't be used for login)
        const tempPassword = Math.random().toString(36).slice(-16);

        const { data, error } = await supabase.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true, // Mark as confirmed since it's an import
          user_metadata: {
            wix_import: true,
            full_name: contact.full_name,
            phone: contact.phone,
            address: contact.address || null
          }
        });

        if (error) {
          console.error(`❌ Failed to create user for ${contact.full_name}: ${error.message}`);
          failedUsers.push({ contact, error: error.message });
        } else {
          // Now create the profile with the user's ID
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id, // Use the auth user ID
              full_name: contact.full_name,
              phone: contact.phone,
              address: contact.address || null,
              points: contact.points || 0,
              tier: contact.tier || 'Homie'
            })
            .select();

          if (profileError) {
            console.error(`❌ Failed to create profile for ${contact.full_name}: ${profileError.message}`);
            failedUsers.push({ contact, error: `Profile: ${profileError.message}` });
          } else {
            console.log(`✅ ${contact.full_name} (${contact.phone})`);
            createdUsers.push({ user: data.user, profile: profileData[0] });
          }
        }
      } catch (err) {
        console.error(`❌ Error processing ${contact.full_name}: ${err.message}`);
        failedUsers.push({ contact, error: err.message });
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successfully imported: ${createdUsers.length}`);
    console.log(`   ❌ Failed: ${failedUsers.length}`);

    if (createdUsers.length > 0) {
      console.log(`\nImported contacts:`);
      createdUsers.slice(0, 10).forEach((item, i) => {
        console.log(`${i+1}. ${item.profile.full_name}`);
        console.log(`   📱 ${item.profile.phone}`);
        console.log(`   📧 ${item.user.email}`);
        if (item.profile.address) console.log(`   📍 ${item.profile.address.substring(0, 45)}`);
        console.log(`   ⭐ ${item.profile.points} pts | Tier: ${item.profile.tier}`);
        console.log();
      });

      if (createdUsers.length > 10) {
        console.log(`... and ${createdUsers.length - 10} more contacts\n`);
      }
    }

    if (failedUsers.length > 0) {
      console.log(`\n⚠️  Failed to import:`);
      failedUsers.slice(0, 5).forEach((item, i) => {
        console.log(`${i+1}. ${item.contact.full_name} - ${item.error}`);
      });
      if (failedUsers.length > 5) {
        console.log(`... and ${failedUsers.length - 5} more failures`);
      }
    }

    console.log('\n' + '='.repeat(70));

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

importWixUsers();
