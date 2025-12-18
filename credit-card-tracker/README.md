# Credit Card Tracker - Full Stack Application

A comprehensive credit card management system built with **Node.js**, **Supabase**, and **React**.

## 🎯 Features

- ✅ Multi-card management with real-time balance tracking
- ✅ Monthly statement tracking
- ✅ Payment history with late fee tracking
- ✅ Transaction categorization and merchant tracking
- ✅ Credit utilization monitoring with trends
- ✅ Installment payment tracking
- ✅ User authentication with Supabase Auth
- ✅ Row Level Security (RLS) for data privacy
- ✅ Beautiful responsive UI with Tailwind CSS
- ✅ Interactive charts with Recharts

## 🏗️ Tech Stack

### Backend
- **Node.js** + **Express.js** - REST API server
- **Supabase** (PostgreSQL) - Database and authentication
- **JWT** - Secure authentication tokens

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing
- **Axios** - API requests
- **Recharts** - Data visualization
- **Lucide React** - Icons

## 📁 Project Structure

```
credit-card-tracker/
├── backend/
│   ├── config/
│   │   └── supabase.js           # Supabase client configuration
│   ├── controllers/
│   │   ├── cardsController.js    # Credit cards CRUD
│   │   ├── statementsController.js
│   │   ├── paymentsController.js
│   │   └── transactionsController.js
│   ├── middleware/
│   │   └── auth.js                # Authentication middleware
│   ├── routes/
│   │   └── api.js                 # API routes
│   ├── .env.example
│   ├── package.json
│   └── server.js                  # Main server file
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx
│   │   ├── lib/
│   │   │   ├── api.js             # API utilities
│   │   │   └── supabase.js        # Supabase client
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── supabase-schema.sql            # Database schema
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- npm or yarn package manager

### 1. Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the `supabase-schema.sql` file to create all tables
4. Get your project URL and API keys from Settings > API

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Supabase credentials
# SUPABASE_URL=your_project_url
# SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_SERVICE_KEY=your_service_role_key

# Start the server
npm run dev

# Server will run on http://localhost:3001
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_SUPABASE_URL=your_supabase_url" > .env
echo "VITE_SUPABASE_ANON_KEY=your_anon_key" >> .env
echo "VITE_API_BASE_URL=http://localhost:3001/api" >> .env

# Start development server
npm run dev

# App will open at http://localhost:3000
```

## 🔐 Authentication

The app uses Supabase Auth with email/password authentication:

1. Sign up with email and password
2. Verify email (check spam folder)
3. Sign in to access the dashboard
4. JWT tokens are automatically handled

## 📊 API Endpoints

### Credit Cards
```
GET    /api/cards              - Get all cards
GET    /api/cards/summary      - Get summary with stats
GET    /api/cards/:id          - Get card by ID
GET    /api/cards/:id/utilization - Get utilization trend
POST   /api/cards              - Create new card
PUT    /api/cards/:id          - Update card
DELETE /api/cards/:id          - Delete card
```

### Monthly Statements
```
GET    /api/statements         - Get all statements
GET    /api/statements/:id     - Get statement by ID
POST   /api/statements         - Create statement
PUT    /api/statements/:id     - Update statement
PATCH  /api/statements/:id/pay - Mark as paid
DELETE /api/statements/:id     - Delete statement
```

### Payment History
```
GET    /api/payments           - Get all payments
GET    /api/payments/stats     - Get payment statistics
GET    /api/payments/:id       - Get payment by ID
POST   /api/payments           - Record payment
PUT    /api/payments/:id       - Update payment
DELETE /api/payments/:id       - Delete payment
```

### Transactions
```
GET    /api/transactions       - Get all transactions
GET    /api/transactions/stats - Get transaction statistics
GET    /api/transactions/:id   - Get transaction by ID
POST   /api/transactions       - Create transaction
PUT    /api/transactions/:id   - Update transaction
DELETE /api/transactions/:id   - Delete transaction
```

## 💳 Loading Your December Data

After signing up, you can use the API to load your December credit cards:

```javascript
// Example: Add your cards
const cards = [
  { card_name: 'AMEX', bank: 'American Express', 
    credit_limit: 100161, current_balance: 33387 },
  { card_name: 'AMEX GOLD', bank: 'American Express', 
    credit_limit: 71958, current_balance: 23986 },
  // ... more cards
];

for (const card of cards) {
  await cardsApi.create(card);
}
```

## 🔒 Security Features

- **Row Level Security (RLS)** - Users can only access their own data
- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - Handled by Supabase Auth
- **CORS Protection** - Configured for allowed origins
- **SQL Injection Protection** - Parameterized queries

## 📈 Key Features Explained

### Credit Utilization Tracking
- Automatically calculated on every balance change
- Historical tracking for trend analysis
- Alerts when utilization > 30%

### Installment Tracking
- Track purchases paid over time
- Monitor current installment vs total
- Calculate remaining payments

### Statement Management
- Link payments to specific statements
- Track partial vs full payments
- Auto-update status based on payment

## 🎨 UI Features

- **Dashboard** - Overview of all cards and balances
- **Card Details** - Deep dive into individual card data
- **Payment Calendar** - Upcoming payment due dates
- **Charts** - Visualize spending and utilization trends
- **Dark Mode Support** - (if implemented)

## 📱 Responsive Design

The app is fully responsive and works on:
- 📱 Mobile phones
- 📱 Tablets
- 💻 Desktops
- 🖥️ Large screens

## 🚢 Deployment

### Backend Deployment (Railway/Heroku/DigitalOcean)

1. Set environment variables
2. Deploy Node.js app
3. Update frontend API_BASE_URL

### Frontend Deployment (Vercel/Netlify)

1. Connect GitHub repository
2. Set environment variables
3. Build command: `npm run build`
4. Deploy!

## 🧪 Testing

```bash
# Backend tests (when implemented)
cd backend
npm test

# Frontend tests (when implemented)
cd frontend
npm test
```

## 📝 Environment Variables

### Backend (.env)
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend (.env)
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:3001/api
```

## 🤝 Contributing

This is a personal project, but suggestions are welcome!

## 📄 License

MIT License - Feel free to use for your own projects

## 👨‍💻 Author

**Ed** - Building towards financial freedom 🎯
- Target: 50,000 MXN monthly passive income
- Strategy: 45% savings rate + systematic DCA investing

---

**Made with ❤️ for financial independence**
