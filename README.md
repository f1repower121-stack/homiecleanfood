# 🥗 Homie Clean Food — Website Setup Guide

Your complete website is ready! Follow these steps to go live.

---

## ✅ What's Built

- 🏠 **Homepage** — Hero, features, featured meals, how it works, loyalty CTA
- 🍽️ **Menu Page** — All 25 meals with macros, filters (chicken/beef/fish), add to cart
- 🛒 **Order Page** — Cart, delivery details, payment selection, order confirmation
- 👤 **Sign In / Register** — Customer accounts with Supabase Auth
- ⭐ **Loyalty Page** — Points system, tier progress, rewards catalog
- 📞 **Contact Page** — Form, map info, social links, office catering CTA

---

## 🚀 Deployment Steps (do these in order)

### STEP 1 — Install Tools on your Mac

Open **Terminal** (Cmd + Space → type "Terminal" → Enter):

```bash
# Install Homebrew (Mac package manager)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Verify
node --version   # Should show v20.x.x
```

---

### STEP 2 — Set Up the Project

```bash
# Go to your Desktop
cd Desktop

# Copy the homiecleanfood folder here (from the download)
# Then enter it:
cd homiecleanfood

# Install all dependencies
npm install
```

---

### STEP 3 — Create Supabase (Free Database)

1. Go to **supabase.com** → Sign up with Google
2. Click **New Project** → Name it "homiecleanfood" → Set a password → Create
3. Wait ~2 minutes for it to set up
4. Go to **SQL Editor** → paste the contents of `supabase-schema.sql` → Run
5. Go to **Settings → API** → copy:
   - `Project URL` (looks like `https://xxxxx.supabase.co`)
   - `anon public` key (long text starting with `eyJ...`)

---

### STEP 4 — Add Your Keys

In the `homiecleanfood` folder, create a file called `.env.local`:

```bash
# In Terminal (inside homiecleanfood folder):
cp .env.local.example .env.local
```

Open `.env.local` in TextEdit and fill in your Supabase values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_key...
```

---

### STEP 5 — Test Locally

```bash
npm run dev
```

Open your browser to **http://localhost:3000** — your website should be live! ✅

---

### STEP 6 — Deploy to Vercel (Free Hosting)

1. Go to **github.com** → Create account → New Repository → name it "homiecleanfood"
2. In Terminal:
```bash
# Install git if needed
brew install git

# Push your code to GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/homiecleanfood.git
git push -u origin main
```
3. Go to **vercel.com** → Sign in with GitHub → New Project → Import your repo
4. In Vercel, add your Environment Variables (same as .env.local)
5. Click **Deploy** → Wait 2 minutes → Your site is live! 🎉

---

### STEP 7 — Connect Your Domain

In Vercel:
1. Go to your project → **Settings → Domains**
2. Add your domain (e.g., homiecleanfood.com)
3. Vercel shows you DNS records to add
4. Go to your domain registrar → DNS settings → Add the records
5. Wait 24-48 hours → Done!

---

### STEP 8 — Set Up Omise Payments (Card Payments)

1. Go to **omise.co** → Sign up → Verify your business
2. Go to **Keys** → Copy your Public Key and Secret Key
3. Add to `.env.local`:
```
NEXT_PUBLIC_OMISE_PUBLIC_KEY=pkey_...
OMISE_SECRET_KEY=skey_...
```
4. Redeploy on Vercel (auto-deploys when you push to GitHub)

---

## 📞 Need Help?

If you get stuck on any step, come back here and tell me:
- Which step you're on
- What error message you see (copy & paste it)

I'll fix it immediately! 🙌

---

## 💡 Future Updates (Phase 2)

- Add food photos from your own photos
- Connect LINE Notify for order alerts
- Add PromptPay QR payment
- Build admin dashboard to manage orders
