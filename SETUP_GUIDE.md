# 🚀 Credit Card Tracker - Quick Setup Guide

## Step-by-Step Setup (15 minutes)

### 1️⃣ Create Supabase Project (5 min)

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Choose a name (e.g., "credit-card-tracker")
4. Create a strong database password
5. Select region closest to you (Mexico → US West)
6. Wait for project to be created (~2 min)

### 2️⃣ Setup Database (2 min)

1. In your Supabase dashboard, click "SQL Editor"
2. Click "New Query"
3. Copy entire contents of `supabase-schema.sql`
4. Paste and click "Run"
5. You should see "Success. No rows returned"

### 3️⃣ Get API Keys (1 min)

1. Go to Settings (⚙️) → API
2. Copy these values:
   - **Project URL** (looks like: https://xxx.supabase.co)
   - **anon public** key (starts with: eyJ...)
   - **service_role** key (starts with: eyJ... but different)

### 4️⃣ Backend Setup (3 min)

```bash
cd credit-card-tracker/backend

# Install dependencies
npm install

# Create .env file
cat > .env << 'ENVEOF'
SUPABASE_URL=your_project_url_here
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
ENVEOF

# Edit .env and paste your actual values
nano .env  # or use your preferred editor

# Start the server
npm run dev
```

You should see:
```
╔════════════════════════════════════════════════════════╗
║   Credit Card Tracker API Server                      ║
║   Server is ready to accept connections 🚀            ║
╚════════════════════════════════════════════════════════╝
```

### 5️⃣ Frontend Setup (3 min)

Open a NEW terminal window:

```bash
cd credit-card-tracker/frontend

# Install dependencies
npm install

# Create .env file
cat > .env << 'ENVEOF'
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_BASE_URL=http://localhost:3001/api
ENVEOF

# Edit .env and paste your actual values
nano .env

# Start the development server
npm run dev
```

Your browser will automatically open to http://localhost:3000

### 6️⃣ Create Your Account (1 min)

1. Click "Sign Up"
2. Enter your email and password
3. Check your email for verification link
4. Click the link to verify
5. Return to app and sign in

### 7️⃣ Add Your First Card

1. Click "Add Card" button
2. Fill in details:
   - Card Name: AMEX
   - Bank: American Express
   - Credit Limit: 100161
   - Current Balance: 33387
3. Click "Save"

## 🎉 You're Done!

Your credit card tracker is now running locally with:
- ✅ Secure authentication
- ✅ Private database
- ✅ Full API backend
- ✅ Beautiful React frontend

## 📱 Using the App

### Dashboard
- View all your cards
- See total debt and utilization
- Quick stats overview

### Add Statement
1. Select a card
2. Enter statement details
3. Set due date
4. Track payment status

### Record Payment
1. Go to "Payments"
2. Click "Add Payment"
3. Select card and amount
4. Payment automatically updates balance

### View Analytics
- Credit utilization trends
- Spending by category
- Payment history

## 🔧 Troubleshooting

### Backend won't start
- Check .env file has correct Supabase credentials
- Ensure port 3001 is not in use
- Run `npm install` again

### Frontend won't start
- Check .env file has VITE_ prefix on variables
- Ensure port 3000 is not in use
- Clear browser cache and try again

### Can't sign in
- Check email for verification link
- Verify Supabase Auth is enabled in dashboard
- Try password reset

### API errors
- Verify backend is running on port 3001
- Check browser console for error messages
- Verify CORS settings in backend .env

## 📊 Loading Your December Data

You can either:

**Option 1: Use the UI**
- Manually add each card through the interface

**Option 2: Use the API** (Faster for multiple cards)
```javascript
// In browser console after signing in
const cards = [
  { card_name: 'AMEX', bank: 'American Express', 
    credit_limit: 100161, current_balance: 33387, interest_rate: 0 },
  { card_name: 'AMEX GOLD', bank: 'American Express', 
    credit_limit: 71958, current_balance: 23986, interest_rate: 0 },
  { card_name: 'BANAMEX', bank: 'Banamex', 
    credit_limit: 3300, current_balance: 1100, interest_rate: 0 },
  { card_name: 'SANTANDER', bank: 'Santander', 
    credit_limit: 2400, current_balance: 800, interest_rate: 0 },
  { card_name: 'NU', bank: 'Nu Bank', 
    credit_limit: 19305, current_balance: 6435, interest_rate: 0 },
  { card_name: 'BANAMEX LOAN', bank: 'Banamex', 
    credit_limit: 6987, current_balance: 2329, interest_rate: 0, card_type: 'Loan' }
];

// Add all cards
for (const card of cards) {
  const response = await fetch('http://localhost:3001/api/cards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
    },
    body: JSON.stringify(card)
  });
  console.log('Added:', card.card_name);
}
```

## 🌐 Next Steps

1. **Customize**: Modify colors in `tailwind.config.js`
2. **Deploy**: Follow deployment guides for Vercel/Railway
3. **Integrate**: Connect with Notion using API
4. **Extend**: Add budgeting features or investment tracking

## 💡 Pro Tips

- Set up payment reminders using browser notifications
- Export data regularly as JSON backup
- Use categories to track spending patterns
- Monitor utilization to keep it below 30%
- Link statements to payments for better tracking

## 🆘 Need Help?

- Check the main README.md for detailed documentation
- Review API endpoints in README
- Check Supabase dashboard for database issues
- Look at browser console for frontend errors
- Check terminal for backend errors

---

**Happy Tracking! 💳🎯**
