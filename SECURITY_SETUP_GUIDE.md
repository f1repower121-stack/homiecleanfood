# 🔐 Homie Clean Food - Security Setup Guide

## Overview
This guide helps you implement enterprise-grade security for storing customer data, orders, and sensitive information safely.

---

## STEP 1: Database Row-Level Security (RLS)

### What is RLS?
RLS ensures that users can only access data they're authorized to see:
- **Customers** see only their own profile and orders
- **Admin** sees all data
- **Kitchen staff** sees orders assigned to them
- **Sensitive data** (payment info, loyalty points) stays protected

### How to Enable RLS

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Select your project: "homiecleanfood"

2. **Enable RLS on Tables**
   ```
   For each table (profiles, orders, loyalty_points):
   
   1. Click on table name
   2. Click "Auth Policies" tab
   3. Click "Enable RLS"
   4. Click "Create policy" for each policy below
   ```

3. **Copy & Apply Policies**
   - Open: `lib/supabase/rls-policies.sql`
   - Go to Supabase > SQL Editor
   - Create new query
   - Copy each policy block
   - Run the query

4. **Verify Policies**
   ```
   SELECT tablename, policyname FROM pg_policies 
   WHERE tablename IN ('profiles', 'orders', 'loyalty_points');
   ```

---

## STEP 2: Admin Authentication (Replace Hardcoded Password)

### Current Issue
```javascript
❌ Hardcoded password in app/admin/page.tsx
const ADMIN_PASSWORD = 'homie2024'
```

### Solution: Use Supabase Auth

1. **Create Admin User in Supabase**
   - Go to: Authentication > Users
   - Click "Add User"
   - Email: your@email.com
   - Password: Strong password (12+ chars)
   - Set metadata role: `admin`

2. **Update Admin Login** (Coming Soon)
   - Replace hardcoded password with Supabase Auth
   - Use email + password login
   - Add 2FA for extra security

---

## STEP 3: Session Security

### Current Issue
```javascript
❌ No session timeout
❌ Admin session persists forever
```

### Solution: Add Session Timeout

```javascript
// Add to admin/page.tsx
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const INACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

useEffect(() => {
  let lastActivity = Date.now();
  
  // Track user activity
  const trackActivity = () => {
    lastActivity = Date.now();
  };
  
  window.addEventListener('mousemove', trackActivity);
  window.addEventListener('keydown', trackActivity);
  
  // Check for inactivity
  const inactivityInterval = setInterval(() => {
    if (Date.now() - lastActivity > SESSION_TIMEOUT) {
      setAuthed(false);
      alert('Session expired due to inactivity');
      localStorage.removeItem('adminAuthed');
    }
  }, INACTIVITY_CHECK_INTERVAL);
  
  return () => {
    window.removeEventListener('mousemove', trackActivity);
    window.removeEventListener('keydown', trackActivity);
    clearInterval(inactivityInterval);
  };
}, []);
```

---

## STEP 4: API Security Headers

### What's Already Added
✅ Strict-Transport-Security (enforces HTTPS)
✅ X-Content-Type-Options (prevents MIME-type attacks)
✅ X-Frame-Options (prevents clickjacking)
✅ Content-Security-Policy (prevents XSS)
✅ Permissions-Policy (disables camera/microphone)

### Verification
```bash
# Check if headers are sent (after deployment)
curl -I https://homiecleanfood.vercel.app

# You should see security headers in response
```

---

## STEP 5: Environment Variables

### Add to .env.local

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://efvbudblbtayfszxgxhq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here  # ⭐ ADD THIS

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Site URL
NEXT_PUBLIC_SITE_URL=https://homiecleanfood.vercel.app
```

### How to Get SERVICE_ROLE_KEY
1. Supabase Dashboard > Settings > API
2. Copy "service_role" secret key
3. Add to .env.local as `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **IMPORTANT**: Never commit this key to Git!

---

## STEP 6: Data Encryption

### Sensitive Fields to Encrypt
- Delivery addresses
- Payment method details
- Customer phone numbers
- Internal notes

### Recommended: pgcrypto Extension

```sql
-- Enable in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt address before storing
UPDATE profiles 
SET address_encrypted = pgp_sym_encrypt(address, 'your_secret_key')
WHERE address IS NOT NULL;
```

### Or use at Application Level
```javascript
// Install: npm install crypto
const crypto = require('crypto');

function encryptData(data, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(data, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}
```

---

## STEP 7: Backups & Disaster Recovery

### Supabase Automatic Backups
✅ Daily backups (automatic)
✅ Point-in-time recovery (7 days)
✅ Geographic redundancy

### Manual Backups to Cloud Storage

```bash
# Install AWS CLI
brew install awscli

# Export database to S3 weekly
pg_dump postgresql://user:password@host/db | gzip | \
  aws s3 cp - s3://your-backup-bucket/backup-$(date +%Y%m%d).sql.gz
```

---

## STEP 8: Compliance Checklist

### GDPR Compliance (if serving EU)
- [ ] Privacy policy published on website
- [ ] User consent for data collection
- [ ] Right to access own data
- [ ] Right to be forgotten (data deletion)
- [ ] Data processing agreement with Supabase

### Thailand Data Protection
- [ ] Notify users of data collection
- [ ] Secure storage (RLS enabled)
- [ ] Limited data retention (3 years for orders)
- [ ] Data controller policy

### Template Privacy Policy
```
We collect: Name, Phone, Address, Email
We store: Securely in Supabase with encryption
We use: Only for order fulfillment
We delete: Inactive data after 1 year
We share: Never with third parties
```

---

## STEP 9: Admin Safety Checklist

### Before Going Live
- [ ] Change hardcoded admin password
- [ ] Enable RLS on all tables
- [ ] Add session timeout (30 min)
- [ ] Enable Supabase Auth
- [ ] Set up 2FA
- [ ] Create privacy policy
- [ ] Document data retention policy
- [ ] Test RLS with different user roles
- [ ] Verify HTTPS on all pages
- [ ] Check security headers with curl

### Monthly Tasks
- [ ] Rotate API keys
- [ ] Review access logs
- [ ] Test data backups
- [ ] Check Supabase metrics
- [ ] Update dependencies

### Quarterly Tasks
- [ ] Security audit
- [ ] Penetration testing
- [ ] Review and update RLS policies
- [ ] Security training for team
- [ ] Update incident response plan

---

## STEP 10: Testing RLS Policies

### Test as Customer
```javascript
// Customer should only see their own profile
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', 'their-id')

// Customer should NOT see other users
const { data: other } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', 'other-id')
// Should return empty/error
```

### Test as Admin
```javascript
// Admin should see all profiles
const { data: all } = await supabase
  .from('profiles')
  .select('*')
// Should return all profiles
```

---

## STEP 11: Incident Response Plan

### If Data Breach Occurs
1. **Immediately Rotate Keys**
   - Supabase: Settings > API > Regenerate keys
   - Update .env.local

2. **Notify Users**
   - Send email to affected users
   - Explain what data was accessed
   - Steps they should take (change password)

3. **Enable Audit Logging**
   - Set up logs for all data access
   - Monitor for suspicious activity

4. **Report to Authorities** (if required)
   - Thailand PDPA: Within 30 days
   - EU GDPR: Within 72 hours

---

## STEP 12: Security Monitoring

### Set Up Alerts
```bash
# Monitor failed login attempts
SELECT count(*) FROM auth_logs 
WHERE status = 'failed_login' 
AND created_at > now() - interval '1 hour'

# Monitor database changes
SELECT * FROM audit_log 
WHERE action IN ('UPDATE', 'DELETE')
ORDER BY created_at DESC
```

### Enable Supabase Monitoring
1. Dashboard > Database > Logs
2. Set up email alerts for errors
3. Monitor API usage for spikes

---

## Support & Next Steps

### Questions?
- Supabase Docs: https://supabase.com/docs
- OWASP Top 10: https://owasp.org/Top10/

### Quick Commands

```bash
# Deploy latest security changes
git add -A && git commit -m "Security: Add RLS policies and headers"
git push origin main

# Check deployed headers
curl -I https://homiecleanfood.vercel.app

# Test RLS (after enabling)
npm run test:rls
```

---

## Summary: Security Layers

```
┌─────────────────────────────────────────┐
│     🔒 HTTPS/TLS Encryption             │ Transport Security
├─────────────────────────────────────────┤
│  🔒 Security Headers (CSP, HSTS, etc.)  │ Browser Protection
├─────────────────────────────────────────┤
│  🔒 Row-Level Security (RLS)            │ Database Access Control
├─────────────────────────────────────────┤
│  🔒 Session Timeout (30 min)            │ Session Security
├─────────────────────────────────────────┤
│  🔒 Password Hashing (Supabase Auth)    │ Authentication
├─────────────────────────────────────────┤
│  🔒 API Key Rotation                    │ Key Management
├─────────────────────────────────────────┤
│  🔒 Data Encryption (At Rest)           │ Data Protection
├─────────────────────────────────────────┤
│  🔒 Audit Logging & Monitoring          │ Compliance
├─────────────────────────────────────────┤
│  🔒 Automated Backups                   │ Disaster Recovery
└─────────────────────────────────────────┘
```

---

**Questions or issues? Check the SECURITY_SETUP_GUIDE.md file or contact support.**

