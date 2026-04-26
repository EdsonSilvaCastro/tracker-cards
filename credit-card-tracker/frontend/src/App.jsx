import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import pages (to be created)
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import Cards from './pages/Cards';
import Statements from './pages/Statements';
import Payments from './pages/Payments';
import Transactions from './pages/Transactions';
import MonthlyOverview from './pages/monthly/MonthlyOverview';
import PaymentDueDates from './pages/PaymentDueDates';
import MonthlyComparison from './pages/MonthlyComparison';
import SavingsGoals from './pages/SavingsGoals';
import AnnualSummary from './pages/AnnualSummary';
import Layout from './components/Layout';

// Protected Route component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

// Public Route component (redirect to dashboard if logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return !user ? children : <Navigate to="/dashboard" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignUp />
              </PublicRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/monthly" />} />
            <Route path="monthly" element={<MonthlyOverview />} />
            <Route path="due-dates" element={<PaymentDueDates />} />
            <Route path="compare" element={<MonthlyComparison />} />
            <Route path="savings" element={<SavingsGoals />} />
            <Route path="annual" element={<AnnualSummary />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="cards" element={<Cards />} />
            <Route path="statements" element={<Statements />} />
            <Route path="payments" element={<Payments />} />
            <Route path="transactions" element={<Transactions />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
