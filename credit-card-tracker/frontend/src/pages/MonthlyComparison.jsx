import { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, Button } from '../components/ui';
import api from '../lib/api';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SECTION_LABELS = {
  living_expenses: 'Living Expenses',
  life_style: 'Life Style',
  monthly_payments: 'Monthly Payments',
  general_expenses: 'General Expenses'
};

export default function MonthlyComparison() {
  const [month1, setMonth1] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
  const [month2, setMonth2] = useState({ 
    month: new Date().getMonth() === 0 ? 11 : new Date().getMonth() - 1, 
    year: new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear() 
  });
  const [comparison, setComparison] = useState(null);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('compare'); // 'compare' or 'trends'

  useEffect(() => {
    if (activeView === 'compare') {
      fetchComparison();
    } else {
      fetchTrends();
    }
  }, [month1, month2, activeView]);

  const fetchComparison = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/compare', {
        params: {
          month1: month1.month + 1,
          year1: month1.year,
          month2: month2.month + 1,
          year2: month2.year
        }
      });
      setComparison(response.data.data);
    } catch (err) {
      console.error('Error fetching comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/trends', { params: { months: 6 } });
      setTrends(response.data.data || []);
    } catch (err) {
      console.error('Error fetching trends:', err);
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

  const formatPercent = (value) => {
    const num = parseFloat(value) || 0;
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  const getDifferenceColor = (diff, inverse = false) => {
    if (diff === 0) return 'text-gray-500';
    if (inverse) {
      return diff > 0 ? 'text-red-600' : 'text-green-600';
    }
    return diff > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getDifferenceIcon = (diff, inverse = false) => {
    if (diff === 0) return <Minus className="h-4 w-4" />;
    if (inverse) {
      return diff > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />;
    }
    return diff > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />;
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Monthly Comparison</h1>
          <p className="text-sm sm:text-base text-gray-600">Compare spending between months</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeView === 'compare' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveView('compare')}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Compare
          </Button>
          <Button 
            variant={activeView === 'trends' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveView('trends')}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Trends
          </Button>
        </div>
      </div>

      {activeView === 'compare' && (
        <>
          {/* Month Selectors */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Compare Month</label>
                  <div className="flex gap-2">
                    <select
                      value={month1.month}
                      onChange={(e) => setMonth1(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {months.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={month1.year}
                      onChange={(e) => setMonth1(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">With Month</label>
                  <div className="flex gap-2">
                    <select
                      value={month2.month}
                      onChange={(e) => setMonth2(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {months.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={month2.year}
                      onChange={(e) => setMonth2(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {comparison && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-blue-600 font-medium mb-1">Card Payments</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{months[month2.month]}</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(comparison.month2.total_card_payments)}</p>
                      </div>
                      <div className={`flex items-center gap-1 ${getDifferenceColor(comparison.differences.card_payments, true)}`}>
                        {getDifferenceIcon(comparison.differences.card_payments, true)}
                        <span className="text-sm font-semibold">{formatPercent(comparison.differences.card_payments_percent)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      vs {months[month1.month]}: {formatCurrency(comparison.month1.total_card_payments)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-green-600 font-medium mb-1">Budget</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{months[month2.month]}</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(comparison.month2.total_budget)}</p>
                      </div>
                      <div className={`flex items-center gap-1 ${getDifferenceColor(comparison.differences.budget)}`}>
                        {getDifferenceIcon(comparison.differences.budget)}
                        <span className="text-sm font-semibold">{formatCurrency(Math.abs(comparison.differences.budget))}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      vs {months[month1.month]}: {formatCurrency(comparison.month1.total_budget)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-purple-600 font-medium mb-1">Expenses Spent</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs text-gray-500">{months[month2.month]}</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(comparison.month2.total_spent)}</p>
                      </div>
                      <div className={`flex items-center gap-1 ${getDifferenceColor(comparison.differences.spent, true)}`}>
                        {getDifferenceIcon(comparison.differences.spent, true)}
                        <span className="text-sm font-semibold">{formatPercent(comparison.differences.spent_percent)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      vs {months[month1.month]}: {formatCurrency(comparison.month1.total_spent)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Section Comparison */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Spending by Section</h3>
                  <div className="space-y-4">
                    {Object.keys(SECTION_LABELS).map(section => {
                      const m1 = comparison.month1.sections[section] || { budgeted: 0, spent: 0 };
                      const m2 = comparison.month2.sections[section] || { budgeted: 0, spent: 0 };
                      const diff = m2.spent - m1.spent;
                      const maxValue = Math.max(m1.spent, m2.spent, 1);

                      return (
                        <div key={section} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">{SECTION_LABELS[section]}</span>
                            <div className={`flex items-center gap-1 text-sm ${getDifferenceColor(diff, true)}`}>
                              {diff !== 0 && getDifferenceIcon(diff, true)}
                              <span>{formatCurrency(Math.abs(diff))}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-500 w-12">{months[month1.month].slice(0, 3)}</span>
                            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-400 rounded-full transition-all"
                                style={{ width: `${(m1.spent / maxValue) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium w-24 text-right">{formatCurrency(m1.spent)}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-gray-500 w-12">{months[month2.month].slice(0, 3)}</span>
                            <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-400 rounded-full transition-all"
                                style={{ width: `${(m2.spent / maxValue) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium w-24 text-right">{formatCurrency(m2.spent)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {activeView === 'trends' && (
        <>
          {/* Trends Chart */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Last 6 Months Trend</h3>
              
              {trends.length > 0 ? (
                <div className="space-y-6">
                  {/* Simple Bar Chart */}
                  <div className="h-64 flex items-end justify-around gap-2">
                    {trends.map((month, index) => {
                      const maxValue = Math.max(...trends.map(t => t.total_cards));
                      const height = maxValue > 0 ? (month.total_cards / maxValue) * 100 : 0;
                      
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full flex flex-col items-center">
                            <span className="text-xs font-medium text-gray-700 mb-1">
                              {formatCurrency(month.total_cards)}
                            </span>
                            <div 
                              className="w-full bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg transition-all duration-500"
                              style={{ height: `${height}%`, minHeight: height > 0 ? '20px' : '4px' }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{month.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stats Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Average</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(trends.reduce((sum, t) => sum + t.total_cards, 0) / trends.length)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Lowest</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(Math.min(...trends.map(t => t.total_cards)))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Highest</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(Math.max(...trends.map(t => t.total_cards)))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Total (6 mo)</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(trends.reduce((sum, t) => sum + t.total_cards, 0))}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No trend data available</p>
                  <p className="text-xs">Add expenses to see trends</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Breakdown Table */}
          {trends.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Month</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Card Payments</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Expenses</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Change</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {trends.map((month, index) => {
                        const prevMonth = trends[index - 1];
                        const change = prevMonth ? month.total_cards - prevMonth.total_cards : 0;
                        const changePercent = prevMonth && prevMonth.total_cards > 0 
                          ? ((change / prevMonth.total_cards) * 100).toFixed(1) 
                          : 0;

                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{month.label}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(month.total_cards)}</td>
                            <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(month.total_expenses)}</td>
                            <td className="px-4 py-3">
                              {index > 0 && (
                                <div className={`flex items-center justify-center gap-1 ${getDifferenceColor(change, true)}`}>
                                  {change !== 0 && getDifferenceIcon(change, true)}
                                  <span className="text-sm">{formatPercent(changePercent)}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
