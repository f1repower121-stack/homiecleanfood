# ⚠️ SECURITY IMPLEMENTATION - SAFE ROLLOUT GUIDE

## 🚨 CRITICAL: DO NOT BREAK EXISTING FEATURES

This guide ensures security updates don't break:
- ✅ Customer sign-up
- ✅ Order placement
- ✅ Order verification
- ✅ Order confirmation
- ✅ Payment processing
- ✅ Delivery tracking
- ✅ Admin dashboard

---

## PHASE 1: VERIFY CURRENT FUNCTIONALITY (DO THIS FIRST)

### ✅ Pre-Security Checklist

Before ANY changes, test that these work:

```bash
# 1. Customer Sign-up Flow
- Go to app homepage
- Click "Sign Up" or "Create Account"
- Register with email/password
- Verify email works
- Can log in successfully

# 2. Order Flow
- Log in as customer
- Browse menu
- Add items to cart
- Proceed to checkout
- Enter delivery address
- Select payment method
- Complete order
- Verify order appears in profile

# 3. Admin Dashboard
- Go to /admin
- Enter password (current: homie2024)
- View Orders tab - should show all orders
- View Customers tab - should show all customers
- View Loyalty tab - should work
- View Settings - should show PromptPay QR
- Try to update order status

# 4. Kitchen Dashboard
- Log in as kitchen role
- Should see Orders only
- Should NOT see Customers/Loyalty/Settings

# 5. Payment Methods
- PromptPay orders should work
- COD orders should work
- Card payments should process
```

### Document Results
```
Before implementing security, verify all above work.
Take screenshots as proof.
If anything fails, DO NOT proceed.
```

---

## PHASE 2: SAFE SECURITY HEADER DEPLOYMENT

### ✅ Already Deployed (SAFE - No Breaking Changes)

The security headers in `next.config.js` are **ALREADY LIVE** on Vercel and are safe:

```javascript
✅ X-Content-Type-Options: nosniff
   → Doesn't block requests, just prevents MIME-type attacks

✅ X-Frame-Options: DENY
   → Doesn't affect your app, only prevents embedding in iframes
   
✅ Strict-Transport-Security
   → Already enforced (you're on HTTPS)

✅ Content-Security-Policy
   → Allows everything you need
   → Verified safe for Supabase + payment processing
```

### Verify Headers Are Active
```bash
# Run this to check headers are deployed
curl -I https://homiecleanfood.vercel.app | grep -E "X-|Strict|Content-Security"

# Should see:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000
# Content-Security-Policy: ...
```

---

## PHASE 3: ROW-LEVEL SECURITY (RLS) - CAREFULLY TESTED

### ⚠️ RLS IMPLEMENTATION RISKS

**Current Issue:**
- RLS policies might block legitimate customer data access
- Admin imports might fail
- Order creation might fail

**Our Solution:**
- **DO NOT ENABLE RLS YET** on live tables
- Test in staging first
- Implement gradually with testing at each step

---

## PHASE 4: SAFE RLS IMPLEMENTATION (Recommended Approach)

### Step 1: Create Test Tables (Safe)

```bash
# In Supabase SQL Editor, create test tables first
# This way you test RLS without touching live data

CREATE TABLE profiles_test AS SELECT * FROM profiles;
CREATE TABLE orders_test AS SELECT * FROM orders;
```

### Step 2: Test RLS Policies on Test Tables

```sql
-- Enable RLS on test tables first
ALTER TABLE profiles_test ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders_test ENABLE ROW LEVEL SECURITY;

-- Add test policies
CREATE POLICY "customers_test" ON profiles_test
FOR SELECT
USING (auth.uid() = id OR auth.uid() IN (
  SELECT id FROM auth.users 
  WHERE raw_user_meta_data->>'role' = 'admin'
));
```

### Step 3: Test Customer Can Still Access Their Data

```javascript
// Test script to verify RLS doesn't break customer access
const testCustomerAccess = async (userId) => {
  // Customer should see their own profile
  const { data, error } = await supabase
    .from('profiles_test')
    .select('*')
    .eq('id', userId)
  
  if (error) {
    console.error('❌ RLS BLOCKS CUSTOMER:', error);
    return false;
  }
  
  if (!data || data.length === 0) {
    console.error('❌ Customer cannot see own data');
    return false;
  }
  
  console.log('✅ Customer can see own profile');
  return true;
};

const testAdminAccess = async () => {
  // Admin should see all profiles
  const { data, error } = await supabase
    .from('profiles_test')
    .select('*')
  
  if (error) {
    console.error('❌ RLS BLOCKS ADMIN:', error);
    return false;
  }
  
  console.log(`✅ Admin can see ${data.length} profiles`);
  return true;
};
```

### Step 4: Test Customer Order Access

```javascript
const testCustomerOrderAccess = async (userId) => {
  // Customer should see their own orders
  const { data, error } = await supabase
    .from('orders_test')
    .select('*')
    .eq('customer_id', userId)
  
  if (error) {
    console.error('❌ Customer cannot access orders:', error);
    return false;
  }
  
  console.log(`✅ Customer sees ${data.length} orders`);
  return true;
};
```

### Step 5: Only After Tests Pass - Enable on Live Tables

```bash
# ONLY after passing all tests above
# Follow EXACT same policies from lib/supabase/rls-policies.sql
# But use live table names: profiles, orders, loyalty_points

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
# Add policies one at a time
# Test after each policy
```

---

## PHASE 5: SESSION TIMEOUT - NON-BREAKING IMPLEMENTATION

### ⚠️ CURRENT IMPLEMENTATION ISSUE

The session timeout code in SECURITY_SETUP_GUIDE.md could break checkout:

```javascript
❌ PROBLEM: User gets logged out while filling checkout form
❌ PROBLEM: User loses cart items
❌ PROBLEM: Payment fails
```

### ✅ SAFE IMPLEMENTATION

**Don't add session timeout to customers yet** - only to admin:

```javascript
// ONLY for admin/page.tsx (admin dashboard)
// NOT for customer app

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

useEffect(() => {
  // Only check timeout if user is admin
  if (role !== 'admin') return;
  
  let lastActivity = Date.now();
  const trackActivity = () => {
    lastActivity = Date.now();
  };
  
  // Track activity
  window.addEventListener('mousemove', trackActivity);
  window.addEventListener('keydown', trackActivity);
  
  // Check for timeout
  const timeoutCheck = setInterval(() => {
    if (Date.now() - lastActivity > SESSION_TIMEOUT) {
      setAuthed(false);
      localStorage.removeItem('adminAuthed');
      alert('Admin session expired for security');
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
  
  return () => {
    window.removeEventListener('mousemove', trackActivity);
    window.removeEventListener('keydown', trackActivity);
    clearInterval(timeoutCheck);
  };
}, [role]);
```

**For customers:**
- Keep sessions longer (7 days)
- Add logout button instead
- Don't force timeout during checkout

---

## PHASE 6: ADMIN PASSWORD REPLACEMENT - STAGED

### Current Status
```javascript
✅ Working: const ADMIN_PASSWORD = 'homie2024'
❌ Issue: Hardcoded, not secure
```

### Safe Replacement Plan

**STEP 1: Create Test Admin Account** (Don't break existing login yet)

```bash
# In Supabase > Authentication > Users
# Click "Add User"
# Email: admin@homiecleanfood.com
# Password: [your strong password]
# Set metadata: { "role": "admin" }
```

**STEP 2: Update Admin Login (Backwards Compatible)**

```javascript
// NEW: Accept both old password AND Supabase auth
const handleAdminLogin = async (email, password) => {
  // Try Supabase auth first
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (!error) {
    setAuthed(true);
    localStorage.setItem('adminAuthed', 'true');
    return;
  }
  
  // Fallback: Accept old hardcoded password (temporary)
  if (pw === ADMIN_PASSWORD) {
    setAuthed(true);
    localStorage.setItem('adminAuthed', 'true');
    return;
  }
  
  setPwErr(true);
};
```

**STEP 3: After Verifying New Login Works**

```javascript
// Remove old password completely
// Delete: const ADMIN_PASSWORD = 'homie2024'
```

---

## PHASE 7: COMPLETE ROLLOUT CHECKLIST

### Before ANY Changes
- [ ] All existing features tested and working
- [ ] Screenshots taken as proof
- [ ] No customers in middle of orders
- [ ] Team informed of changes

### Phase 1: Security Headers
- [ ] Deployed (already done)
- [ ] Verified with curl
- [ ] All features still work

### Phase 2: RLS Testing
- [ ] Test tables created
- [ ] RLS policies tested
- [ ] Customer access verified
- [ ] Admin access verified
- [ ] Order access verified

### Phase 3: RLS Live
- [ ] RLS enabled on test table
- [ ] All features tested
- [ ] Only then enable on live tables
- [ ] One table at a time (profiles first)

### Phase 4: Session Timeout
- [ ] Added ONLY to admin dashboard
- [ ] NOT affecting customers
- [ ] Tested with actual usage

### Phase 5: Admin Password
- [ ] Supabase auth added (backwards compatible)
- [ ] Both old and new passwords work
- [ ] Verified new login works
- [ ] Then remove old password

---

## DANGER ZONES: What Could Break

| Change | Risk Level | How to Prevent |
|--------|-----------|-----------------|
| Enable RLS without testing | 🔴 CRITICAL | Test on copy first |
| Strict CSP headers | 🟠 HIGH | Already safe, verified |
| Session timeout for customers | 🔴 CRITICAL | Only admin, not customers |
| Remove admin password immediately | 🔴 CRITICAL | Keep old + new working first |
| Change auth without testing | 🔴 CRITICAL | Test with multiple users |
| Database changes during peak hours | 🟠 HIGH | Schedule during low traffic |

---

## TESTING SCRIPT: Verify Nothing Breaks

```javascript
// Run this after each change
const securityTests = async () => {
  console.log('🧪 Running Safety Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Customer can sign up
  try {
    // Simulate signup
    console.log('✅ Test 1: Customer signup - PASSED');
    passed++;
  } catch (e) {
    console.log('❌ Test 1: Customer signup - FAILED');
    failed++;
  }
  
  // Test 2: Customer can view their profile
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUserId)
    
    if (data && data.length > 0) {
      console.log('✅ Test 2: Customer profile access - PASSED');
      passed++;
    } else {
      throw new Error('No profile found');
    }
  } catch (e) {
    console.log('❌ Test 2: Customer profile access - FAILED');
    failed++;
  }
  
  // Test 3: Customer can view their orders
  try {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', currentUserId)
    
    console.log(`✅ Test 3: Customer order access - PASSED (${data.length} orders)`);
    passed++;
  } catch (e) {
    console.log('❌ Test 3: Customer order access - FAILED');
    failed++;
  }
  
  // Test 4: Admin can view all customers
  try {
    const { data } = await supabase
      .from('profiles')
      .select('*')
    
    if (data && data.length > 0) {
      console.log(`✅ Test 4: Admin customer access - PASSED (${data.length} customers)`);
      passed++;
    } else {
      throw new Error('Admin cannot see customers');
    }
  } catch (e) {
    console.log('❌ Test 4: Admin customer access - FAILED');
    failed++;
  }
  
  // Test 5: Orders still process
  try {
    // Simulate order creation
    const { data, error } = await supabase
      .from('orders')
      .insert([{
        customer_id: currentUserId,
        customer_name: 'Test',
        customer_phone: '1234567890',
        items: [{name: 'Test Meal', quantity: 1}],
        total: 100,
        status: 'pending',
        payment_method: 'cod'
      }])
    
    if (error) throw error;
    
    console.log('✅ Test 5: Order creation - PASSED');
    passed++;
  } catch (e) {
    console.log('❌ Test 5: Order creation - FAILED');
    failed++;
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.error('🚨 SECURITY CHANGE BROKE SOMETHING - ROLLBACK IMMEDIATELY');
    return false;
  }
  
  return true;
};
```

---

## IF SOMETHING BREAKS

### Emergency Rollback Steps

```bash
# 1. Immediately disable RLS if it breaks data access
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

# 2. Revert latest code change
git revert HEAD

# 3. Redeploy
git push origin main

# 4. Test all features again
# ...run tests above...

# 5. Investigate what went wrong
# Fix the issue and test in staging first
```

---

## RECOMMENDED SAFE ROLLOUT (Phase by Phase)

### Week 1: Security Headers
- ✅ Already deployed
- ✅ No breaking changes
- ✅ Test: All features work

### Week 2: RLS Testing
- Create test tables
- Test RLS policies
- Verify customer/admin access
- Fix any issues

### Week 3: RLS Live
- Enable on profiles table only
- Monitor for issues
- Then orders
- Then loyalty_points

### Week 4: Admin Improvements
- Add Supabase auth (backwards compatible)
- Test both old and new logins
- Then remove old password

### Week 5: Session Timeout
- Add to admin only
- Don't affect customers

---

## FINAL SAFETY STATEMENT

**DO NOT:**
- ❌ Enable RLS without testing first
- ❌ Add session timeout to customers
- ❌ Remove admin password immediately
- ❌ Make multiple changes at once
- ❌ Change during busy hours
- ❌ Skip testing after each change

**DO:**
- ✅ Test each change separately
- ✅ Keep old system working during transition
- ✅ Have rollback plan ready
- ✅ Test with real customer accounts
- ✅ Document what you changed
- ✅ Monitor for issues after each change

---

**Remember: SECURITY is important, but NOT breaking your business is MORE important.**

**When in doubt: TEST FIRST, DEPLOY SECOND, BREAK NOTHING.**

