# Credit Card Tracker Full Stack Application

A comprehensive credit card management system built with React, Node.js, and Supabase.

## 🚀 Features

- **Dashboard**: Real-time overview of your credit card portfolio
- **Card Management**: Track multiple credit cards with detailed information
- **Transaction Tracking**: Monitor all your credit card transactions
- **Statement Management**: Organize and track monthly statements
- **Payment Processing**: Record and manage credit card payments
- **Monthly Overview**: Analyze spending patterns and balances
- **Budget Tracking**: Set and monitor budget limits

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **React Router** - Routing
- **Recharts** - Data visualization
- **Axios** - HTTP client
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Supabase** - Database and authentication
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## 📁 Project Structure

```
credit-card-tracker-fullstack/
├── credit-card-tracker/
│   ├── backend/           # Node.js/Express API
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Express middleware
│   │   └── routes/        # API routes
│   └── frontend/          # React application
│       └── src/
│           ├── components/ # Reusable components
│           ├── contexts/   # React contexts
│           ├── lib/        # Utility libraries
│           └── pages/      # Page components
├── supabase-schema.sql    # Database schema
└── migration-*.sql        # Database migrations
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account

### Backend Setup

1. Navigate to the backend directory:
```bash
cd credit-card-tracker/backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
PORT=3000
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd credit-card-tracker/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Database Setup

1. Create a Supabase project
2. Run the schema file:
```bash
psql -h your-project.supabase.co -U postgres -d postgres -f supabase-schema.sql
```
3. Run migrations if needed:
```bash
psql -h your-project.supabase.co -U postgres -d postgres -f migration-budget-expenses.sql
psql -h your-project.supabase.co -U postgres -d postgres -f migration-monthly-balances.sql
```

## 📝 API Endpoints

- `GET /api/health` - Health check
- `GET /api/cards` - Get all cards
- `POST /api/cards` - Create a new card
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create a transaction
- `GET /api/statements` - Get all statements
- `GET /api/payments` - Get all payments
- `GET /api/budget` - Get budget information
- `GET /api/monthly-balances` - Get monthly balances

## 🔒 Environment Variables

### Backend
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `PORT` - Server port (default: 3000)

### Frontend
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_API_URL` - Backend API URL

## 📦 Build for Production

### Backend
```bash
cd credit-card-tracker/backend
npm start
```

### Frontend
```bash
cd credit-card-tracker/frontend
npm run build
```

The build output will be in the `dist/` directory.

## 🚀 AWS Deployment

See [AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

## 📄 License

MIT

## 👤 Author

Ed

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
