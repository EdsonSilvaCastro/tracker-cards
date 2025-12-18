import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  Wallet,
  CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import api from '../lib/api';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get current month and year
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [cardsRes, overviewRes] = await Promise.all([
        api.get('/cards'),
        api.get(`/monthly-balances/overview/${currentMonth}/${currentYear}`)
      ]);
      setCards(cardsRes.data.data || []);
      setOverview(overviewRes.data.data || null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  const getUtilizationColor = (percentage) => {
    if (percentage >= 80) return 'text-red-600 bg-red-100';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  // Calculate totals from monthly overview
  const totals = overview?.totals || { total_balance: 0, total_to_pay: 0, paid_count: 0, total_count: 0 };
  const monthlyCards = overview?.cards || [];
  
  // Calculate total credit limit from cards
  const totalCreditLimit = cards.reduce((sum, card) => sum + parseFloat(card.credit_limit || 0), 0);
  const totalAvailable = totalCreditLimit - totals.total_balance;
  const utilization = totalCreditLimit > 0 ? (totals.total_balance / totalCreditLimit) * 100 : 0;
  const unpaidCount = totals.total_count - totals.paid_count;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const stats = [
    {
      title: 'To Pay This Month',
      value: formatCurrency(totals.total_to_pay),
      icon: DollarSign,
      color: 'text-blue-600 bg-blue-100',
    },
    {
      title: 'Total Balance',
      value: formatCurrency(totals.total_balance),
      icon: Wallet,
      color: 'text-orange-600 bg-orange-100',
    },
    {
      title: 'Available Credit',
      value: formatCurrency(totalAvailable),
      icon: CreditCard,
      color: 'text-purple-600 bg-purple-100',
    },
    {
      title: 'Utilization',
      value: `${utilization.toFixed(1)}%`,
      icon: TrendingUp,
      color: getUtilizationColor(utilization),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your credit cards</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
          <CalendarDays className="h-4 w-4" />
          {monthNames[currentMonth - 1]} {currentYear}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      {unpaidCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">
              You have {unpaidCount} unpaid card(s) this month
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Total amount to pay: {formatCurrency(totals.total_to_pay)}
            </p>
            <Link 
              to="/" 
              className="text-sm text-yellow-800 hover:text-yellow-900 font-medium mt-2 inline-block"
            >
              Go to Monthly Overview →
            </Link>
          </div>
        </div>
      )}

      {/* Cards Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Cards</CardTitle>
          <Link 
            to="/cards" 
            className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {monthlyCards.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No cards added yet</p>
              <Link 
                to="/cards" 
                className="text-primary-600 hover:text-primary-700 text-sm mt-2 inline-block"
              >
                Add your first card
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {monthlyCards.slice(0, 5).map((card) => {
                const utilization = card.credit_limit > 0 
                  ? (card.current_balance / card.credit_limit) * 100 
                  : 0;
                return (
                  <div key={card.card_id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 rounded-lg">
                          <CreditCard className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{card.card_name}</p>
                          <p className="text-sm text-gray-500">{card.bank}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(card.amount_to_pay)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Balance: {formatCurrency(card.current_balance)}
                        </p>
                      </div>
                    </div>
                    {/* Utilization bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Utilization</span>
                        <span>{utilization.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            utilization >= 80 ? 'bg-red-500' : 
                            utilization >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
