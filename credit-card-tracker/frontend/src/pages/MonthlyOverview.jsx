import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight,
  CreditCard,
  Check,
  X,
  Edit2,
  Save,
  Plus,
  Trash2,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Copy,
  Settings,
  PiggyBank
} from 'lucide-react';
import { Card, CardContent, Button, Input, Modal, Select } from '../components/ui';
import api from '../lib/api';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const monthsES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const SECTION_COLORS = {
  living_expenses: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'bg-blue-100', name: 'Living Expenses' },
  life_style: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'bg-purple-100', name: 'Life Style' },
  monthly_payments: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'bg-green-100', name: 'Monthly Payments' },
  general_expenses: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: 'bg-orange-100', name: 'General Expenses' }
};

const STATUS_OPTIONS = [
  { value: 'paid', bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' },
  { value: 'pending', bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  { value: 'partial', bg: 'bg-orange-100', text: 'text-orange-700', label: 'Partial' }
];

const STATUS_STYLES = STATUS_OPTIONS.reduce((acc, s) => ({ ...acc, [s.value]: s }), {});

export default function MonthlyOverview() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [cardsData, setCardsData] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' or 'budget'
  
  // Card modal states
  const [editingCard, setEditingCard] = useState(null);
  const [cardForm, setCardForm] = useState({ current_balance: '', amount_to_pay: '' });
  
  // Budget modal states
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showCopySectionModal, setShowCopySectionModal] = useState(false);
  const [copySectionKey, setCopySectionKey] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  
  // Inline editing states
  const [inlineEditing, setInlineEditing] = useState(null); // { id, field }
  const [inlineValue, setInlineValue] = useState('');
  
  // Form states
  const [budgetForm, setBudgetForm] = useState({ total_budget: '' });
  const [expenseForm, setExpenseForm] = useState({
    section: '',
    expense_name: '',
    budgeted_amount: '',
    actual_spent: '',
    status: 'pending'
  });
  const [copyForm, setCopyForm] = useState({ from_month: '', from_year: '', include_actual: false });
  const [copySectionForm, setCopySectionForm] = useState({ from_month: '', from_year: '', include_actual: false });
  const [saving, setSaving] = useState(false);

  const currentMonth = currentDate.getMonth() + 1;
  const currentMonthName = months[currentDate.getMonth()];
  const currentMonthES = monthsES[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    fetchAllData();
  }, [currentMonth, currentYear]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [cardsRes, budgetRes] = await Promise.all([
        api.get(`/monthly-balances/overview/${currentMonth}/${currentYear}`),
        api.get(`/budget/${currentMonth}/${currentYear}`)
      ]);
      setCardsData(cardsRes.data.data);
      setBudgetData(budgetRes.data.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data');
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

  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // ============ CARD HANDLERS ============
  const togglePaymentStatus = async (cardId) => {
    try {
      await api.post('/monthly-balances/toggle-paid', {
        card_id: cardId,
        month: currentMonth,
        year: currentYear
      });
      fetchAllData();
    } catch (err) {
      console.error('Failed to toggle payment status:', err);
    }
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setCardForm({
      current_balance: card.current_balance || '',
      amount_to_pay: card.amount_to_pay || ''
    });
  };

  const handleSaveCard = async () => {
    if (!editingCard) return;
    setSaving(true);
    try {
      await api.post('/monthly-balances', {
        card_id: editingCard.card_id,
        month: currentMonth,
        year: currentYear,
        current_balance: parseFloat(cardForm.current_balance) || 0,
        amount_to_pay: parseFloat(cardForm.amount_to_pay) || 0,
        is_paid: editingCard.is_paid
      });
      setEditingCard(null);
      fetchAllData();
    } catch (err) {
      console.error('Failed to save balance:', err);
      alert('Failed to save balance');
    } finally {
      setSaving(false);
    }
  };

  // ============ BUDGET HANDLERS ============
  const handleSaveBudget = async () => {
    setSaving(true);
    try {
      await api.post('/budget', {
        month: currentMonth,
        year: currentYear,
        total_budget: parseFloat(budgetForm.total_budget) || 0
      });
      setShowBudgetModal(false);
      fetchAllData();
    } catch (err) {
      console.error('Error saving budget:', err);
      alert('Failed to save budget');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenExpenseModal = (section = null, expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        section: expense.section,
        expense_name: expense.expense_name,
        budgeted_amount: expense.budgeted_amount || '',
        actual_spent: expense.actual_spent || '',
        status: expense.status || 'pending'
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        section: section || '',
        expense_name: '',
        budgeted_amount: '',
        actual_spent: '',
        status: 'pending'
      });
    }
    setSelectedSection(section);
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async () => {
    if (!expenseForm.expense_name || !expenseForm.section) {
      alert('Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      if (editingExpense) {
        await api.put(`/budget/expense/${editingExpense.id}`, expenseForm);
      } else {
        await api.post('/budget/expense', {
          ...expenseForm,
          month: currentMonth,
          year: currentYear
        });
      }
      setShowExpenseModal(false);
      fetchAllData();
    } catch (err) {
      console.error('Error saving expense:', err);
      alert('Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  // State for delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const handleDeleteExpense = async (expenseId) => {
    try {
      await api.delete(`/budget/expense/${expenseId}`);
      
      // Update local state instead of refetching
      setBudgetData(prev => {
        if (!prev) return prev;
        const newSections = prev.sections.map(section => {
          const filteredExpenses = section.expenses.filter(exp => exp.id !== expenseId);
          return {
            ...section,
            expenses: filteredExpenses,
            total_budgeted: filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.budgeted_amount || 0), 0),
            total_spent: filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.actual_spent || 0), 0)
          };
        });
        
        const totalBudgeted = newSections.reduce((sum, s) => sum + s.total_budgeted, 0);
        const totalSpent = newSections.reduce((sum, s) => sum + s.total_spent, 0);
        
        return {
          ...prev,
          sections: newSections,
          overview: {
            ...prev.overview,
            total_budgeted: totalBudgeted,
            total_spent: totalSpent,
            remaining_budget: (prev.overview.total_budget || 0) - totalSpent,
            percentage_spent: prev.overview.total_budget > 0 
              ? (totalSpent / prev.overview.total_budget) * 100 
              : 0
          }
        };
      });
      
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  // ============ INLINE EDITING HANDLERS ============
  const startInlineEdit = (expense, field) => {
    setInlineEditing({ id: expense.id, field });
    if (field === 'status') {
      setInlineValue(expense.status);
    } else if (field === 'expense_name') {
      setInlineValue(expense.expense_name);
    } else if (field === 'budgeted_amount') {
      setInlineValue(expense.budgeted_amount || '');
    } else if (field === 'actual_spent') {
      setInlineValue(expense.actual_spent || '');
    }
  };

  const cancelInlineEdit = () => {
    setInlineEditing(null);
    setInlineValue('');
  };

  const saveInlineEdit = async (expense) => {
    if (!inlineEditing) return;
    
    const newValue = (inlineEditing.field === 'budgeted_amount' || inlineEditing.field === 'actual_spent')
      ? parseFloat(inlineValue) || 0 
      : inlineValue;
    
    const updates = {
      section: expense.section,
      expense_name: expense.expense_name,
      budgeted_amount: expense.budgeted_amount,
      actual_spent: expense.actual_spent,
      status: expense.status,
      [inlineEditing.field]: newValue
    };
    
    try {
      await api.put(`/budget/expense/${expense.id}`, updates);
      
      // Update local state instead of refetching
      setBudgetData(prev => {
        if (!prev) return prev;
        const newSections = prev.sections.map(section => ({
          ...section,
          expenses: section.expenses.map(exp => 
            exp.id === expense.id 
              ? { ...exp, [inlineEditing.field]: newValue }
              : exp
          ),
          total_budgeted: section.expenses.reduce((sum, exp) => 
            sum + (exp.id === expense.id && inlineEditing.field === 'budgeted_amount' 
              ? newValue 
              : parseFloat(exp.budgeted_amount || 0)), 0),
          total_spent: section.expenses.reduce((sum, exp) => 
            sum + (exp.id === expense.id && inlineEditing.field === 'actual_spent' 
              ? newValue 
              : parseFloat(exp.actual_spent || 0)), 0)
        }));
        
        const totalBudgeted = newSections.reduce((sum, s) => sum + s.total_budgeted, 0);
        const totalSpent = newSections.reduce((sum, s) => sum + s.total_spent, 0);
        
        return {
          ...prev,
          sections: newSections,
          overview: {
            ...prev.overview,
            total_budgeted: totalBudgeted,
            total_spent: totalSpent,
            remaining_budget: (prev.overview.total_budget || 0) - totalSpent,
            percentage_spent: prev.overview.total_budget > 0 
              ? (totalSpent / prev.overview.total_budget) * 100 
              : 0
          }
        };
      });
      
      setInlineEditing(null);
      setInlineValue('');
    } catch (err) {
      console.error('Error updating expense:', err);
    }
  };

  const handleInlineKeyDown = (e, expense) => {
    if (e.key === 'Enter') {
      saveInlineEdit(expense);
    } else if (e.key === 'Escape') {
      cancelInlineEdit();
    }
  };

  const handleCopyBudget = async () => {
    if (!copyForm.from_month || !copyForm.from_year) {
      alert('Please select source month and year');
      return;
    }
    setSaving(true);
    try {
      await api.post('/budget/copy', {
        from_month: parseInt(copyForm.from_month),
        from_year: parseInt(copyForm.from_year),
        to_month: currentMonth,
        to_year: currentYear,
        include_actual_spent: copyForm.include_actual
      });
      setShowCopyModal(false);
      fetchAllData();
    } catch (err) {
      console.error('Error copying budget:', err);
      alert('Failed to copy budget');
    } finally {
      setSaving(false);
    }
  };

  const handleCopySectionBudget = async () => {
    if (!copySectionForm.from_month || !copySectionForm.from_year || !copySectionKey) {
      alert('Please select source month and year');
      return;
    }
    setSaving(true);
    try {
      // Fetch source month budget data
      const response = await api.get(`/budget/${copySectionForm.from_month}/${copySectionForm.from_year}`);
      const sourceData = response.data.data;
      
      // Find the section to copy
      const sourceSection = sourceData?.sections?.find(s => s.key === copySectionKey);
      
      if (!sourceSection || sourceSection.expenses.length === 0) {
        alert('No expenses found in this section for the selected month');
        setSaving(false);
        return;
      }

      // Copy each expense from the section
      for (const expense of sourceSection.expenses) {
        await api.post('/budget/expense', {
          month: currentMonth,
          year: currentYear,
          section: copySectionKey,
          expense_name: expense.expense_name,
          budgeted_amount: expense.budgeted_amount,
          actual_spent: copySectionForm.include_actual ? expense.actual_spent : 0,
          status: 'pending'
        });
      }

      setShowCopySectionModal(false);
      setCopySectionKey(null);
      fetchAllData();
    } catch (err) {
      console.error('Error copying section budget:', err);
      alert('Failed to copy section budget');
    } finally {
      setSaving(false);
    }
  };

  // Data
  const cards = cardsData?.cards || [];
  const cardTotals = cardsData?.totals || { total_balance: 0, total_to_pay: 0, paid_count: 0, total_count: 0 };
  const budgetOverview = budgetData?.overview || {};
  const budgetSections = budgetData?.sections || [];

  // Calculate non-card expenses (pending/partial - not paid with card)
  const nonCardExpenses = budgetSections.reduce((total, section) => {
    return total + section.expenses.reduce((sum, expense) => {
      // Only add if NOT paid (paid means it was on a card)
      if (expense.status !== 'paid') {
        return sum + parseFloat(expense.actual_spent || 0);
      }
      return sum;
    }, 0);
  }, 0);

  // Combined totals
  const totalBudgetExpenses = budgetOverview.total_budgeted || 0;
  // Total outflow = cards to pay + expenses NOT paid with card
  const totalMonthlyOutflow = cardTotals.total_to_pay + nonCardExpenses;
  
  // Calculate unallocated amount (cards to pay - all budget expenses)
  const unallocatedAmount = cardTotals.total_to_pay - totalBudgetExpenses;

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Monthly Overview</h1>
          <p className="text-sm sm:text-base text-gray-600">Track credit cards and budget in one place</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCopyModal(true)}>
            <Copy className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Copy Budget</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            setBudgetForm({ total_budget: budgetOverview.total_budget || '' });
            setShowBudgetModal(true);
          }}>
            <Settings className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Set Budget</span>
          </Button>
        </div>
      </div>

      {/* Month Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <button onClick={goToPreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">{currentMonthES}</h2>
              <p className="text-gray-500">{currentYear}</p>
            </div>
            <button onClick={goToNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="h-6 w-6 text-gray-600" />
            </button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Budget Usage - Main Focus */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
            <p className="text-indigo-100 text-sm font-medium">BUDGET USAGE</p>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${(budgetOverview.total_budget || 0) >= cardTotals.total_to_pay ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'}`}>
              {(budgetOverview.total_budget || 0) >= cardTotals.total_to_pay ? '✓ Under Budget' : '⚠ Over Budget'}
            </div>
          </div>
          
          {/* Main Budget Display */}
          <div className="text-center py-2 sm:py-4">
            <p className="text-2xl sm:text-4xl font-bold">{formatCurrency(budgetOverview.total_spent || 0)}</p>
            <p className="text-indigo-200 text-base sm:text-lg">of {formatCurrency(budgetOverview.total_budget || 0)}</p>
            <p className="text-indigo-100 text-xs sm:text-sm mt-1">
              {(budgetOverview.percentage_spent || 0).toFixed(0)}% spent • {formatCurrency((budgetOverview.total_budget || 0) - (budgetOverview.total_spent || 0))} remaining
            </p>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${(budgetOverview.percentage_spent || 0) >= 100 ? 'bg-red-400' : (budgetOverview.percentage_spent || 0) >= 90 ? 'bg-yellow-400' : 'bg-green-400'}`}
                style={{ width: `${Math.min(budgetOverview.percentage_spent || 0, 100)}%` }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-center">
            <div className="bg-white/10 rounded-lg p-2 sm:p-3 flex sm:block items-center justify-between">
              <p className="text-indigo-100 text-xs">Cards to Pay</p>
              <p className="text-base sm:text-lg font-bold">{formatCurrency(cardTotals.total_to_pay)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 sm:p-3 flex sm:block items-center justify-between">
              <p className="text-indigo-100 text-xs">Pending to Pay</p>
              <p className="text-base sm:text-lg font-bold">{formatCurrency(nonCardExpenses)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-2 sm:p-3 flex sm:block items-center justify-between">
              <p className="text-indigo-100 text-xs">Total Outflow</p>
              <p className="text-base sm:text-lg font-bold">{formatCurrency(totalMonthlyOutflow)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between sm:block">
              <p className="text-xs sm:text-sm text-gray-500">Credit Cards</p>
              <p className="text-lg sm:text-xl font-bold text-blue-600">{formatCurrency(cardTotals.total_to_pay)}</p>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">Sum of all card payments this month</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between sm:block">
              <p className="text-xs sm:text-sm text-gray-500">Cards Paid</p>
              <p className="text-lg sm:text-xl font-bold text-cyan-600">{cardTotals.paid_count}/{cardTotals.total_count}</p>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">Cards marked as paid</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between sm:block">
              <p className="text-xs sm:text-sm text-gray-500">Pending to Pay</p>
              <p className="text-lg sm:text-xl font-bold text-amber-600">{formatCurrency(nonCardExpenses)}</p>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">Expenses pending to charge in card</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${(budgetOverview.total_budget || 0) >= cardTotals.total_to_pay ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between sm:block">
              <p className="text-xs sm:text-sm text-gray-500">Difference</p>
              <p className={`text-lg sm:text-xl font-bold ${(budgetOverview.total_budget || 0) >= cardTotals.total_to_pay ? 'text-green-600' : 'text-red-600'}`}>
                {(budgetOverview.total_budget || 0) >= cardTotals.total_to_pay 
                  ? formatCurrency((budgetOverview.total_budget || 0) - cardTotals.total_to_pay)
                  : `-${formatCurrency(cardTotals.total_to_pay - (budgetOverview.total_budget || 0))}`
                }
              </p>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">Budget minus cards</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between sm:block">
              <p className="text-xs sm:text-sm text-gray-500">Total Outflow</p>
              <p className="text-lg sm:text-xl font-bold text-orange-600">{formatCurrency(totalMonthlyOutflow)}</p>
            </div>
            <p className="text-xs text-gray-400 hidden sm:block">Cards + Pending combined</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('cards')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'cards' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CreditCard className="h-4 w-4 inline mr-2" />
          Credit Cards ({cards.length})
        </button>
        <button
          onClick={() => setActiveTab('budget')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'budget' 
              ? 'border-primary-600 text-primary-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <PiggyBank className="h-4 w-4 inline mr-2" />
          Budget Expenses
        </button>
      </div>

      {/* Credit Cards Tab */}
      {activeTab === 'cards' && (
        <Card>
          <CardContent className="p-0">
            {cards.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No cards yet</h3>
                <p className="text-gray-500">Add credit cards in the Cards tab</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Card</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">To Pay</th>
                      <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Total Balance</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cards.map((card) => (
                      <tr key={card.card_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-100 rounded-lg">
                              <CreditCard className="h-5 w-5 text-primary-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{card.card_name}</p>
                              <p className="text-sm text-gray-500">{card.bank}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-gray-900">
                          {formatCurrency(card.amount_to_pay)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {formatCurrency(card.current_balance)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => togglePaymentStatus(card.card_id)}
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                card.is_paid 
                                  ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                              }`}
                            >
                              {card.is_paid ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleEditCard(card)}
                              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold">
                      <td className="px-6 py-4">TOTAL</td>
                      <td className="px-6 py-4 text-right text-primary-600">{formatCurrency(cardTotals.total_to_pay)}</td>
                      <td className="px-6 py-4 text-right text-gray-700">{formatCurrency(cardTotals.total_balance)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-sm ${
                          cardTotals.paid_count === cardTotals.total_count && cardTotals.total_count > 0
                            ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {cardTotals.paid_count}/{cardTotals.total_count}
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Budget Tab */}
      {activeTab === 'budget' && (
        <div className="space-y-4">
          {/* Unallocated indicator */}
          {unallocatedAmount !== 0 && (
            <div className={`p-3 rounded-lg flex items-center justify-between ${
              unallocatedAmount > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className={`h-4 w-4 ${unallocatedAmount > 0 ? 'text-amber-600' : 'text-blue-600'}`} />
                <span className={`text-sm font-medium ${unallocatedAmount > 0 ? 'text-amber-700' : 'text-blue-700'}`}>
                  {unallocatedAmount > 0 ? 'Unallocated from Cards' : 'Expenses not identified'}
                </span>
              </div>
              <span className={`text-sm font-bold ${unallocatedAmount > 0 ? 'text-amber-700' : 'text-blue-700'}`}>
                {formatCurrency(Math.abs(unallocatedAmount))}
              </span>
            </div>
          )}

          {/* Budget Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {budgetSections.map((section) => {
              const colors = SECTION_COLORS[section.key] || SECTION_COLORS.general_expenses;
              const percentSpent = section.total_budgeted > 0 
                ? (section.total_spent / section.total_budgeted) * 100 : 0;
              
              return (
                <Card key={section.key} className={`${colors.border} border-2`}>
                  <CardContent className="p-0">
                    <div className={`${colors.bg} p-4 border-b ${colors.border}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 ${colors.icon} rounded-lg`}>
                            <DollarSign className={`h-5 w-5 ${colors.text}`} />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${colors.text}`}>{colors.name}</h3>
                            <p className="text-xs text-gray-500">
                              <span title="Total spent from this section">Spent: {formatCurrency(section.total_spent)}</span>
                              <span className="mx-1">•</span>
                              <span title="Total budgeted for this section">Budgeted: {formatCurrency(section.total_budgeted)}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              setCopySectionKey(section.key);
                              setCopySectionForm({ from_month: '', from_year: '', include_actual: false });
                              setShowCopySectionModal(true);
                            }}
                            title="Copy expenses from another month"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleOpenExpenseModal(section.key)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 h-2 bg-white/50 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            percentSpent >= 100 ? 'bg-red-500' : percentSpent >= 90 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(percentSpent, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="divide-y">
                      {section.expenses.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No expenses yet
                        </div>
                      ) : (
                        section.expenses.map((expense) => {
                          const statusStyle = STATUS_STYLES[expense.status] || STATUS_STYLES.pending;
                          const isEditingName = inlineEditing?.id === expense.id && inlineEditing?.field === 'expense_name';
                          const isEditingBudgeted = inlineEditing?.id === expense.id && inlineEditing?.field === 'budgeted_amount';
                          const isEditingSpent = inlineEditing?.id === expense.id && inlineEditing?.field === 'actual_spent';
                          const isEditingStatus = inlineEditing?.id === expense.id && inlineEditing?.field === 'status';
                          
                          return (
                            <div key={expense.id} className="p-3 hover:bg-gray-50">
                              <div className="flex items-center gap-2">
                                {/* Status - clickable to change */}
                                {isEditingStatus ? (
                                  <select
                                    autoFocus
                                    value={inlineValue}
                                    onChange={(e) => {
                                      const newStatus = e.target.value;
                                      setInlineValue(newStatus);
                                      // Update local state immediately
                                      setBudgetData(prev => ({
                                        ...prev,
                                        sections: prev.sections.map(s => ({
                                          ...s,
                                          expenses: s.expenses.map(exp => 
                                            exp.id === expense.id ? { ...exp, status: newStatus } : exp
                                          )
                                        }))
                                      }));
                                      // Save to server
                                      api.put(`/budget/expense/${expense.id}`, {
                                        ...expense,
                                        status: newStatus
                                      }).then(() => setInlineEditing(null));
                                    }}
                                    onBlur={cancelInlineEdit}
                                    className="text-xs px-1 py-0.5 rounded border border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  >
                                    {STATUS_OPTIONS.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <button
                                    onClick={() => startInlineEdit(expense, 'status')}
                                    className={`px-1.5 py-0.5 text-xs rounded cursor-pointer hover:opacity-80 ${statusStyle.bg} ${statusStyle.text}`}
                                    title="Click to change status"
                                  >
                                    {statusStyle.label}
                                  </button>
                                )}
                                
                                {/* Name - click to edit */}
                                {isEditingName ? (
                                  <input
                                    autoFocus
                                    type="text"
                                    value={inlineValue}
                                    onChange={(e) => setInlineValue(e.target.value)}
                                    onKeyDown={(e) => handleInlineKeyDown(e, expense)}
                                    onBlur={() => saveInlineEdit(expense)}
                                    className="flex-1 text-sm font-medium px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                ) : (
                                  <span
                                    onClick={() => startInlineEdit(expense, 'expense_name')}
                                    className="flex-1 font-medium text-gray-900 cursor-pointer hover:text-primary-600 truncate"
                                    title="Click to edit name"
                                  >
                                    {expense.expense_name}
                                  </span>
                                )}
                                
                                {/* Budgeted amount */}
                                {isEditingBudgeted ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    step="0.01"
                                    value={inlineValue}
                                    onChange={(e) => setInlineValue(e.target.value)}
                                    onKeyDown={(e) => handleInlineKeyDown(e, expense)}
                                    onBlur={() => saveInlineEdit(expense)}
                                    className="w-20 text-xs text-right px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                ) : (
                                  <span
                                    onClick={() => startInlineEdit(expense, 'budgeted_amount')}
                                    className="text-xs text-gray-500 cursor-pointer hover:text-primary-600 bg-gray-100 px-1.5 py-0.5 rounded"
                                    title="Budgeted amount - Click to edit"
                                  >
                                    <span className="text-gray-400">Budget:</span> {formatCurrency(expense.budgeted_amount)}
                                  </span>
                                )}
                                
                                {/* Actual spent */}
                                {isEditingSpent ? (
                                  <input
                                    autoFocus
                                    type="number"
                                    step="0.01"
                                    value={inlineValue}
                                    onChange={(e) => setInlineValue(e.target.value)}
                                    onKeyDown={(e) => handleInlineKeyDown(e, expense)}
                                    onBlur={() => saveInlineEdit(expense)}
                                    className="w-20 text-xs text-right px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                ) : (
                                  <span
                                    onClick={() => startInlineEdit(expense, 'actual_spent')}
                                    className="text-xs font-semibold cursor-pointer hover:text-primary-600 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"
                                    title="Actual spent - Click to edit"
                                  >
                                    <span className="font-normal text-blue-500">Spent:</span> {formatCurrency(expense.actual_spent)}
                                  </span>
                                )}
                                
                                {/* Delete button with inline confirm */}
                                {deleteConfirm === expense.id ? (
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={() => handleDeleteExpense(expense.id)}
                                      className="p-1 text-white bg-red-500 hover:bg-red-600 rounded text-xs"
                                      title="Confirm delete"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button 
                                      onClick={() => setDeleteConfirm(null)}
                                      className="p-1 text-gray-500 bg-gray-200 hover:bg-gray-300 rounded text-xs"
                                      title="Cancel"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setDeleteConfirm(expense.id)} 
                                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                                    title="Delete expense"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Card Modal */}
      <Modal isOpen={!!editingCard} onClose={() => setEditingCard(null)} title={`Edit - ${editingCard?.card_name}`}>
        <div className="space-y-4">
          <Input
            label="Amount to Pay"
            type="number"
            step="0.01"
            value={cardForm.amount_to_pay}
            onChange={(e) => setCardForm(prev => ({ ...prev, amount_to_pay: e.target.value }))}
            placeholder="0.00"
          />
          <Input
            label="Total Balance"
            type="number"
            step="0.01"
            value={cardForm.current_balance}
            onChange={(e) => setCardForm(prev => ({ ...prev, current_balance: e.target.value }))}
            placeholder="0.00"
          />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setEditingCard(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleSaveCard} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Set Budget Modal */}
      <Modal isOpen={showBudgetModal} onClose={() => setShowBudgetModal(false)} title="Set Monthly Budget">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Set your total budget for {currentMonthName} {currentYear}</p>
          <Input
            label="Total Budget"
            type="number"
            step="0.01"
            value={budgetForm.total_budget}
            onChange={(e) => setBudgetForm({ total_budget: e.target.value })}
            placeholder="0.00"
          />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowBudgetModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSaveBudget} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Expense Modal */}
      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title={editingExpense ? 'Edit Expense' : 'Add Expense'}>
        <div className="space-y-4">
          <Select
            label="Section"
            value={expenseForm.section}
            onChange={(e) => setExpenseForm(prev => ({ ...prev, section: e.target.value }))}
            disabled={!!selectedSection}
          >
            <option value="">Select section...</option>
            {Object.keys(SECTION_COLORS).map(key => (
              <option key={key} value={key}>{SECTION_COLORS[key].name}</option>
            ))}
          </Select>
          <Input
            label="Expense Name"
            value={expenseForm.expense_name}
            onChange={(e) => setExpenseForm(prev => ({ ...prev, expense_name: e.target.value }))}
            placeholder="e.g., Rent, Netflix"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Budgeted"
              type="number"
              step="0.01"
              value={expenseForm.budgeted_amount}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, budgeted_amount: e.target.value }))}
              placeholder="0.00"
            />
            <Input
              label="Spent"
              type="number"
              step="0.01"
              value={expenseForm.actual_spent}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, actual_spent: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <Select
            label="Status"
            value={expenseForm.status}
            onChange={(e) => setExpenseForm(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
          </Select>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowExpenseModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleSaveExpense} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Copy Budget Modal */}
      <Modal isOpen={showCopyModal} onClose={() => setShowCopyModal(false)} title="Copy Budget From Another Month">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Copy expenses to {currentMonthName} {currentYear}</p>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="From Month"
              value={copyForm.from_month}
              onChange={(e) => setCopyForm(prev => ({ ...prev, from_month: e.target.value }))}
            >
              <option value="">Select...</option>
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </Select>
            <Input
              label="From Year"
              type="number"
              value={copyForm.from_year}
              onChange={(e) => setCopyForm(prev => ({ ...prev, from_year: e.target.value }))}
              placeholder={currentYear.toString()}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={copyForm.include_actual}
              onChange={(e) => setCopyForm(prev => ({ ...prev, include_actual: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Include spent amounts</span>
          </label>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCopyModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCopyBudget} disabled={saving} className="flex-1">
              {saving ? 'Copying...' : 'Copy'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Copy Section Budget Modal */}
      <Modal 
        isOpen={showCopySectionModal} 
        onClose={() => {
          setShowCopySectionModal(false);
          setCopySectionKey(null);
        }} 
        title={`Copy ${copySectionKey ? SECTION_COLORS[copySectionKey]?.name : 'Section'} From Another Month`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Copy only <strong>{copySectionKey ? SECTION_COLORS[copySectionKey]?.name : ''}</strong> expenses to {currentMonthName} {currentYear}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="From Month"
              value={copySectionForm.from_month}
              onChange={(e) => setCopySectionForm(prev => ({ ...prev, from_month: e.target.value }))}
            >
              <option value="">Select...</option>
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </Select>
            <Input
              label="From Year"
              type="number"
              value={copySectionForm.from_year}
              onChange={(e) => setCopySectionForm(prev => ({ ...prev, from_year: e.target.value }))}
              placeholder={currentYear.toString()}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={copySectionForm.include_actual}
              onChange={(e) => setCopySectionForm(prev => ({ ...prev, include_actual: e.target.checked }))}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Include spent amounts</span>
          </label>
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => {
              setShowCopySectionModal(false);
              setCopySectionKey(null);
            }} className="flex-1">Cancel</Button>
            <Button onClick={handleCopySectionBudget} disabled={saving} className="flex-1">
              {saving ? 'Copying...' : 'Copy Section'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
