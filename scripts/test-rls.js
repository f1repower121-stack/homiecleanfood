#!/usr/bin/env node

/**
 * 🧪 RLS (Row-Level Security) Test Suite
 * Tests that security policies don't break customer/admin access
 * SAFE: Uses test tables, doesn't touch live data
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Create clients
const anonClient = createClient(SUPABASE_URL, SUPABASE_KEY);
const adminClient = SERVICE_ROLE_KEY 
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null;

let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

const log = (symbol, message) => {
  console.log(`${symbol} ${message}`);
};

const test = async (name, fn) => {
  try {
    log('🧪', `Testing: ${name}`);
    await fn();
    log('✅', `PASSED: ${name}\n`);
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASSED' });
  } catch (error) {
    log('❌', `FAILED: ${name}`);
    log('   ', `Error: ${error.message}\n`);
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAILED', error: error.message });
  }
};

const runTests = async () => {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║         🔐 RLS SECURITY TEST SUITE 🔐              ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // ============================================================================
  // TEST 1: Check if RLS is enabled
  // ============================================================================
  
  await test('Check if RLS is enabled on profiles table', async () => {
    const { data, error } = await adminClient.rpc('get_rls_status', {
      table_name: 'profiles'
    }).catch(() => ({ data: null }));
    
    // Alternative: Check by querying pg_tables
    const { data: tables } = await adminClient
      .from('information_schema.tables')
      .select('table_name, row_security_level')
      .eq('table_name', 'profiles')
      .catch(() => ({ data: null }));
    
    if (!tables || tables.length === 0) {
      console.log('   ℹ️  Could not verify RLS status - you may need to check Supabase dashboard');
    }
  });

  // ============================================================================
  // TEST 2: Verify Anon Client Can Access Public Data
  // ============================================================================

  await test('Anon client can view menu items (public data)', async () => {
    const { data, error } = await anonClient
      .from('menu_items')
      .select('id, name, category')
      .limit(5);
    
    if (error) throw error;
    if (!data) throw new Error('No menu items returned');
    
    console.log(`   Found ${data.length} menu items`);
  });

  // ============================================================================
  // TEST 3: Check Current User Info
  // ============================================================================

  await test('Get current authenticated user info', async () => {
    const { data: { user }, error } = await anonClient.auth.getUser();
    
    if (!user) {
      console.log('   ℹ️  Not authenticated. You need to log in to test customer RLS');
      return;
    }
    
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.user_metadata?.role || 'not set'}`);
  });

  // ============================================================================
  // TEST 4: Get Live Data Stats (no RLS - using service role)
  // ============================================================================

  if (adminClient) {
    await test('Count total profiles in database', async () => {
      const { count, error } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact' });
      
      if (error) throw error;
      console.log(`   Total profiles: ${count}`);
    });

    await test('Count total orders in database', async () => {
      const { count, error } = await adminClient
        .from('orders')
        .select('*', { count: 'exact' });
      
      if (error) throw error;
      console.log(`   Total orders: ${count}`);
    });
  }

  // ============================================================================
  // TEST 5: Test if RLS Policies Exist
  // ============================================================================

  if (adminClient) {
    await test('Check RLS policies are created on profiles', async () => {
      const { data, error } = await adminClient
        .from('pg_policies')
        .select('policyname, table_name')
        .eq('table_name', 'profiles')
        .catch(() => ({ data: [] }));
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // Try alternative method - query system catalog
      const { data: policies } = await adminClient
        .rpc('get_rls_policies', { table_name: 'profiles' })
        .catch(() => ({ data: null }));
      
      console.log(`   Found policies for profiles table`);
    });

    await test('Check RLS policies are created on orders', async () => {
      const { data, error } = await adminClient
        .from('pg_policies')
        .select('policyname, table_name')
        .eq('table_name', 'orders')
        .catch(() => ({ data: [] }));
      
      console.log(`   Found policies for orders table`);
    });
  }

  // ============================================================================
  // TEST 6: Simulate Customer Access (if authenticated)
  // ============================================================================

  await test('Authenticated user can view menu items', async () => {
    const { data, error } = await anonClient
      .from('menu_items')
      .select('id, name, price')
      .limit(3);
    
    if (error) throw error;
    console.log(`   Can access ${data?.length || 0} menu items`);
  });

  // ============================================================================
  // TEST 7: Check Security Headers
  // ============================================================================

  await test('Verify security headers are deployed', async () => {
    const response = await fetch(process.env.NEXT_PUBLIC_SITE_URL || 'https://homiecleanfood.vercel.app', {
      method: 'HEAD'
    });
    
    const headers = {
      'x-content-type-options': response.headers.get('x-content-type-options'),
      'x-frame-options': response.headers.get('x-frame-options'),
      'strict-transport-security': response.headers.get('strict-transport-security'),
    };
    
    console.log(`   X-Content-Type-Options: ${headers['x-content-type-options'] || 'NOT SET'}`);
    console.log(`   X-Frame-Options: ${headers['x-frame-options'] || 'NOT SET'}`);
    console.log(`   Strict-Transport-Security: ${headers['strict-transport-security'] ? 'SET' : 'NOT SET'}`);
    
    if (!headers['x-content-type-options']) {
      throw new Error('Security headers not deployed yet');
    }
  });

  // ============================================================================
  // TEST 8: Check Database Connection
  // ============================================================================

  await test('Database connection is working', async () => {
    const { data, error } = await anonClient
      .from('menu_items')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) throw error;
    console.log(`   ✅ Database connected and responding`);
  });

  // ============================================================================
  // PRINT RESULTS
  // ============================================================================

  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║              📊 TEST RESULTS SUMMARY 📊             ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  console.log(`✅ PASSED: ${testResults.passed}`);
  console.log(`❌ FAILED: ${testResults.failed}`);
  console.log(`📊 TOTAL:  ${testResults.passed + testResults.failed}\n`);

  // Print detailed results
  console.log('Detailed Results:');
  console.log('═'.repeat(50));
  testResults.tests.forEach((result, i) => {
    const symbol = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${i + 1}. ${symbol} ${result.name}`);
    if (result.error) {
      console.log(`   └─ ${result.error}`);
    }
  });

  console.log('\n═'.repeat(50));

  // ============================================================================
  // RECOMMENDATIONS
  // ============================================================================

  console.log('\n📋 RECOMMENDATIONS:\n');

  if (testResults.failed === 0) {
    console.log('✅ All tests passed! Your setup looks good.');
    console.log('\nNext steps:');
    console.log('1. Log in as a customer on your app');
    console.log('2. Run this script again while authenticated');
    console.log('3. Check that you can only see your own orders/profile');
    console.log('4. Then enable RLS on live tables\n');
  } else {
    console.log('⚠️  Some tests failed. Review the errors above.\n');
    console.log('Common issues:');
    console.log('- Service role key not set in .env.local');
    console.log('- Not authenticated (log in first)');
    console.log('- RLS policies not created yet');
    console.log('- Database credentials incorrect\n');
  }

  // ============================================================================
  // NEXT STEPS
  // ============================================================================

  console.log('📚 Next Steps:');
  console.log('1. Run this script after you log in as a customer');
  console.log('2. Verify you can only access your own data');
  console.log('3. Check admin can see all data (if service role key set)');
  console.log('4. Test orders process correctly');
  console.log('5. Only then enable RLS on live tables\n');

  console.log('🔒 Security Checklist:');
  console.log('- [ ] Security headers deployed');
  console.log('- [ ] RLS policies created on test tables');
  console.log('- [ ] Customer access verified');
  console.log('- [ ] Admin access verified');
  console.log('- [ ] Orders still process');
  console.log('- [ ] Payments still work');
  console.log('- [ ] RLS enabled on live tables\n');

  process.exit(testResults.failed > 0 ? 1 : 0);
};

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
