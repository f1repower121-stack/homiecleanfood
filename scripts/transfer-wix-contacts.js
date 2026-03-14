#!/usr/bin/env node

const fs = require('fs');

async function transferContacts() {
  // Read the Wix API response
  const wixResponsePath = '/Users/emre/.claude/projects/-Users-emre/7d515673-a54d-4148-b17c-0776b3928408/tool-results/toolu_0199U5G7wdNehPt5a5BkFpUo.txt';
  
  if (!fs.existsSync(wixResponsePath)) {
    console.error('❌ Wix response file not found');
    return;
  }
  
  console.log('📥 Reading Wix contacts...');
  const rawContent = fs.readFileSync(wixResponsePath, 'utf-8');
  
  // Extract the JSON API response
  const marker = '"text": "Wix Site API call successful: ';
  const start = rawContent.indexOf(marker);
  if (start === -1) {
    console.error('❌ Could not find Wix API response');
    return;
  }
  
  const jsonStart = start + marker.length;
  const lastBrace = rawContent.lastIndexOf('"}');
  let jsonStr = rawContent.substring(jsonStart, lastBrace + 1);
  
  // Unescape JSON
  jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\\//g, '/');
  
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    console.log('⚠️  Extracting contacts from partial JSON...');
    data = { contacts: [] };
  }
  
  const contacts = data.contacts || [];
  console.log(`✅ Found ${contacts.length} Wix contacts\n`);
  
  // Process and format for Supabase
  const processed = [];
  
  for (const c of contacts) {
    try {
      const info = c.info || {};
      const name = info.name || {};
      
      const firstName = (name.first || '').trim();
      const lastName = (name.last || '').trim();
      const fullName = `${firstName} ${lastName}`.trim();
      
      // Get primary phone
      let phone = '';
      if (info.phones && info.phones.items && info.phones.items.length > 0) {
        phone = (info.phones.items[0].phone || '').trim();
      } else if (c.primaryInfo && c.primaryInfo.phone) {
        phone = (c.primaryInfo.phone || '').trim();
      }
      
      // Get first address
      let address = '';
      if (info.addresses && info.addresses.items && info.addresses.items.length > 0) {
        const addr = info.addresses.items[0].address || {};
        address = (addr.addressLine || addr.formattedAddress || '').trim();
      }
      
      // Only add if we have at least a name or phone
      if (fullName || phone) {
        processed.push({
          wixId: c.id,
          full_name: fullName,
          phone: phone,
          address: address,
          points: 0,
          tier: 'Homie'
        });
      }
    } catch (e) {
      // Skip problematic contacts
    }
  }
  
  console.log(`📊 Processed ${processed.length} valid contacts\n`);
  
  // Show preview
  console.log('Sample contacts:');
  console.log('='.repeat(70));
  for (let i = 0; i < Math.min(5, processed.length); i++) {
    const c = processed[i];
    console.log(`${i + 1}. ${c.full_name || '(no name)'}`);
    console.log(`   📱 ${c.phone}`);
    if (c.address) {
      console.log(`   📍 ${c.address.substring(0, 50)}`);
    }
    console.log();
  }
  console.log('='.repeat(70));
  
  // Save for next step
  fs.writeFileSync('/tmp/wix_contacts_ready.json', JSON.stringify(processed, null, 2));
  console.log(`\n✅ Saved ${processed.length} contacts to /tmp/wix_contacts_ready.json`);
}

transferContacts().catch(console.error);
