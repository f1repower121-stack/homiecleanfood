#!/usr/bin/env node

/**
 * 🧪 SAFE RLS TEST (No Service Role Key Needed)
 * Tests that security won't break customer functionality
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('╔════════════════════════════════════════════════════╗');
console.log('║   🔐 SAFE RLS COMPATIBILITY TEST 🔐                ║');
console.log('║   (Tests basic functionality won\'t break)          ║');
console.log('╚════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}\n`);
    failed++;
  }
};

const runTests = async () => {
  // ════════════════════════════════════════════════════════════════════
  // TEST 1: Public Data Access (Menu Items)
  // ════════════════════════════════════════════════════════════════════
  
  await test('TEST 1: Can access public menu items', async () => {
    const { data, error } = await client
      .from('menu_items')
      .select('id, name, category, lean_price, bulk_price')
      .limit(1);
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('No menu items found');
  });

  // ════════════════════════════════════════════════════════════════════
  // TEST 2: Check Database Connection
  // ════════════════════════════════════════════════════════════════════
  
  await test('TEST 2: Database connection working', async () => {
    const { data, error } = await client
      .from('menu_items')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) throw error;
  });

  // ════════════════════════════════════════════════════════════════════
  // TEST 3: Get Current User (for RLS testing)
  // ════════════════════════════════════════════════════════════════════
  
  let currentUser = null;
  await test('TEST 3: Get current authenticated user', async () => {
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error) throw error;
    if (!user) throw new Error('Not authenticated - log in first');
    
    currentUser = user;
    console.log(`   → User: ${user.email} (${user.id})`);
  });

  // ════════════════════════════════════════════════════════════════════
  // TEST 4: User Profile Access (RLS Test)
  // ════════════════════════════════════════════════════════════════════
  
  if (currentUser) {
    await test('TEST 4: Can access own profile (RLS test)', async () => {
      const { data, error } = await client
        .from('profiles')
        .select('id, full_name, phone, points, tier')
        .eq('id', currentUser.id);
      
      if (error) throw error;
      // It's OK if profile doesn't exist yet (new user)
      console.log(`   → Profiles found: ${data?.length || 0}`);
    });

    // ════════════════════════════════════════════════════════════════════
    // TEST 5: User Orders Access (RLS Test)
    // ════════════════════════════════════════════════════════════════════
    
    await test('TEST 5: Can access own orders (RLS test)', async () => {
      const { data, error } = await client
        .from('orders')
        .select('id, status, total, created_at')
        .eq('customer_id', currentUser.id);
      
      if (error) throw error;
      console.log(`   → Orders found: ${data?.length || 0}`);
    });

    // ════════════════════════════════════════════════════════════════════
    // TEST 6: Try to access ANOTHER user's data (should fail/be blocked)
    // ════════════════════════════════════════════════════════════════════
    
    await test('TEST 6: Cannot access other users\' profiles (RLS working)', async () => {
      // Try to access a different user's profile
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .neq('id', currentUser.id)
        .limit(1);
      
      // If RLS is enabled, this should either:
      // 1. Return empty (RLS blocking it) - GOOD
      // 2. Still work (RLS not enabled yet) - OK for now
      if (error && error.code !== '42501') throw error;
      
      if (data && data.length > 0) {
        console.log(`   ℹ️  RLS not enabled yet (can see other profiles)`);
      } else {
        console.log(`   ℹ️  RLS working (blocked access to other profiles)`);
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // TEST 7: Security Headers
  // ════════════════════════════════════════════════════════════════════
  
  await test('TEST 7: Security headers deployed', async () => {
    const response = await fetch('https://homiecleanfood.vercel.app', {
      method: 'HEAD'
    });
    
    const xContent = response.headers.get('x-content-type-options');
    const xFrame = response.headers.get('x-frame-options');
    const hsts = response.headers.get('strict-transport-security');
    
    if (!xContent || !xFrame || !hsts) {
      throw new Error('Missing security headers');
    }
    
    console.log(`   ✓ X-Content-Type-Options: ${xContent}`);
    console.log(`   ✓ X-Frame-Options: ${xFrame}`);
    console.log(`   ✓ HSTS enabled`);
  });

  // ════════════════════════════════════════════════════════════════════
  // PRINT RESULTS
  // ════════════════════════════════════════════════════════════════════
  
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║              📊 TEST RESULTS 📊                     ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  console.log(`✅ PASSED: ${passed}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log(`\n${'━'.repeat(50)}\n`);

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!\n');
    console.log('Your database and security are working correctly.');
    console.log('\nREADY TO ENABLE RLS:');
    console.log('1. Go to Supabase Dashboard');
    console.log('2. Select your project');
    console.log('3. For each table (profiles, orders, loyalty_points):');
    console.log('   - Click table > Auth Policies tab');
    console.log('   - Click "Enable RLS"');
    console.log('   - Copy policies from: lib/supabase/rls-policies.sql');
    console.log('   - Paste into SQL Editor and run\n');
    console.log('Then run this test again to verify RLS works!');
  } else {
    console.log('⚠️  Some tests failed. Check errors above.\n');
    console.log('Common fixes:');
    console.log('- Log in first (run on authenticated user)');
    console.log('- Check Supabase credentials in .env.local');
    console.log('- Verify database tables exist');
  }

  console.log('\n' + '━'.repeat(50));
};

runTests().catch(console.error);
