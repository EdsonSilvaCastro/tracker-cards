import { useState, useEffect } from 'react';
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Target,
  Award,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Card, CardContent, Button } from '../components/ui';
import api from '../lib/api';

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const fullMonths = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AnnualSummary() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnualData();
  }, [year]);

  const fetchAnnualData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/analytics/annual/${year}`);
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching annual data:', err);
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

  const formatCompact = (amount) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return formatCurrency(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const annual = data?.annual || {};
  const monthsData = data?.months || [];
  const maxMonthlyCards = Math.max(...monthsData.map(m => m.total_card_payments), 1);

  return (
    <div className="space-y-6">
      {/* Header with Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Annual Summary</h1>
          <p className="text-sm sm:text-base text-gray-600">Your financial overview for {year}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setYear(y => y - 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-xl font-bold text-gray-900 min-w-[80px] text-center">{year}</span>
          <button 
            onClick={() => setYear(y => y + 1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={year >= new Date().getFullYear()}
          >
            <ChevronRight className={`h-5 w-5 ${year >= new Date().getFullYear() ? 'text-gray-300' : 'text-gray-600'}`} />
          </button>
        </div>
      </div>

      {/* Annual Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-5 w-5 opacity-80" />
              <span className="text-sm opacity-80">Total Card Payments</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(annual.total_card_payments)}</p>
            <p className="text-xs opacity-70 mt-1">for the year</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-5 w-5 opacity-80" />
              <span className="text-sm opacity-80">Total Budget Set</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(annual.total_budget)}</p>
            <p className="text-xs opacity-70 mt-1">allocated for year</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 opacity-80" />
              <span className="text-sm opacity-80">Monthly Average</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(annual.average_monthly_cards)}</p>
            <p className="text-xs opacity-70 mt-1">card payments</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-5 w-5 opacity-80" />
              <span className="text-sm opacity-80">Under Budget</span>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{annual.months_under_budget}/12</p>
            <p className="text-xs opacity-70 mt-1">months</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Monthly Card Payments</h3>
          
          <div className="h-64 flex items-end justify-between gap-1 sm:gap-2">
            {monthsData.map((month, index) => {
              const height = maxMonthlyCards > 0 
                ? (month.total_card_payments / maxMonthlyCards) * 100 
                : 0;
              const isCurrentMonth = new Date().getMonth() === index && new Date().getFullYear() === year;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div className="relative w-full flex flex-col items-center">
                    <span className="text-[10px] sm:text-xs font-medium text-gray-600 mb-1 hidden sm:block">
                      {formatCompact(month.total_card_payments)}
                    </span>
                    <div 
                      className={`w-full rounded-t-lg transition-all duration-500 ${
                        month.budget_status === 'under' 
                          ? 'bg-gradient-to-t from-green-500 to-green-400'
                          : 'bg-gradient-to-t from-red-500 to-red-400'
                      } ${isCurrentMonth ? 'ring-2 ring-primary-500 ring-offset-1' : ''}`}
                      style={{ 
                        height: `${Math.max(height, 4)}%`,
                        minHeight: month.total_card_payments > 0 ? '16px' : '4px'
                      }}
                    />
                  </div>
                  <span className={`text-[10px] sm:text-xs ${isCurrentMonth ? 'font-bold text-primary-600' : 'text-gray-500'}`}>
                    {months[index]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4 pt-4 border-t text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Under Budget</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Over Budget</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Best & Worst Months */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {annual.lowest_spending_month && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Lowest Spending</p>
                  <p className="text-lg font-bold text-green-700">
                    {fullMonths[annual.lowest_spending_month.month - 1]}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Card Payments</span>
                  <span className="font-semibold text-green-700">
                    {formatCurrency(annual.lowest_spending_month.total_card_payments)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Budget</span>
                  <span className="text-gray-700">
                    {formatCurrency(annual.lowest_spending_month.total_budget)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Savings</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(annual.lowest_spending_month.difference)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {annual.highest_spending_month && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-red-600 font-medium">Highest Spending</p>
                  <p className="text-lg font-bold text-red-700">
                    {fullMonths[annual.highest_spending_month.month - 1]}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Card Payments</span>
                  <span className="font-semibold text-red-700">
                    {formatCurrency(annual.highest_spending_month.total_card_payments)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Budget</span>
                  <span className="text-gray-700">
                    {formatCurrency(annual.highest_spending_month.total_budget)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Over/Under</span>
                  <span className={`font-semibold ${annual.highest_spending_month.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(annual.highest_spending_month.difference)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Monthly Breakdown Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Month</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Card Payments</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Budget</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Expenses</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monthsData.map((month, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{fullMonths[index]}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(month.total_card_payments)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(month.total_budget)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(month.total_spent)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        month.budget_status === 'under'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {month.budget_status === 'under' ? '✓ Under' : '⚠ Over'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3 text-right text-primary-600">
                    {formatCurrency(annual.total_card_payments)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatCurrency(annual.total_budget)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {formatCurrency(annual.total_spent)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm">{annual.months_under_budget}/12</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
