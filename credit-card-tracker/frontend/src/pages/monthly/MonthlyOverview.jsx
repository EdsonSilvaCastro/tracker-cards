import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Copy, Settings, AlertCircle } from 'lucide-react';
import api from '../../lib/api';

import MonthlyHero from './MonthlyHero';
import MonthlyStats from './MonthlyStats';
import CardsGrid from './CardsGrid';
import CategoryAccordion from './CategoryAccordion';
import EditCardBalanceModal from './modals/EditCardBalanceModal';
import ExpenseFormModal from './modals/ExpenseFormModal';
import SetBudgetModal from './modals/SetBudgetModal';
import CopyBudgetModal from './modals/CopyBudgetModal';

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

export default function MonthlyOverview() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Data
  const [cardsData, setCardsData] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [spendingAnalysis, setSpendingAnalysis] = useState(null);
  const [allCards, setAllCards] = useState([]); // all user's credit cards for paid_with selector

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Accordion expand state
  const [expandedSections, setExpandedSections] = useState({});
  const expandInitialized = useRef(false);

  // Inline editing
  const [inlineEditing, setInlineEditing] = useState(null); // { id, field }
  const [inlineValue, setInlineValue] = useState('');

  // Card modal
  const [editingCard, setEditingCard] = useState(null);
  const [cardForm, setCardForm] = useState({ current_balance: '', amount_to_pay: '' });

  // Budget modal
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetFormValue, setBudgetFormValue] = useState('');

  // Expense modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    section: '',
    expense_name: '',
    budgeted_amount: '',
    actual_spent: '',
    status: 'pending',
    paid_with: null,
  });

  // Copy budget modal
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyForm, setCopyForm] = useState({ from_month: '', from_year: '', include_actual: false });

  // Copy section modal
  const [showCopySectionModal, setShowCopySectionModal] = useState(false);
  const [copySectionKey, setCopySectionKey] = useState(null);
  const [copySectionForm, setCopySectionForm] = useState({ from_month: '', from_year: '', include_actual: false });

  // Derived values
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  const currentMonthName = MONTHS_EN[currentDate.getMonth()];

  const today = new Date();
  const isCurrentMonth =
    currentDate.getMonth() === today.getMonth() &&
    currentDate.getFullYear() === today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const currentDayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;
  const remainingDays = Math.max(0, daysInMonth - currentDayOfMonth);

  const cards = cardsData?.cards || [];
  const budgetSections = budgetData?.sections || [];
  const totalBudget = budgetData?.overview?.total_budget || 0;
  const totalSpentOnCards = spendingAnalysis?.total_spent_on_cards ?? (cardsData?.totals?.total_to_pay || 0);
  const totalInPlan = spendingAnalysis?.total_in_plan ?? 0;
  const totalOutOfPlan = spendingAnalysis?.total_out_of_plan ?? 0;

  // Reset expand state when month changes
  useEffect(() => {
    expandInitialized.current = false;
    setExpandedSections({});
  }, [currentMonth, currentYear]);

  // Auto-expand sections at risk on first data load
  useEffect(() => {
    if (!budgetData || expandInitialized.current) return;
    expandInitialized.current = true;
    const autoExpand = {};
    budgetData.sections?.forEach((s) => {
      const pct = s.total_budgeted > 0 ? (s.total_spent / s.total_budgeted) * 100 : 0;
      autoExpand[s.key] = pct > 85;
    });
    setExpandedSections(autoExpand);
  }, [budgetData]);

  useEffect(() => {
    fetchAllData();
  }, [currentMonth, currentYear]);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      api.get(`/monthly-balances/overview/${currentMonth}/${currentYear}`),
      api.get(`/budget/${currentMonth}/${currentYear}`),
      api.get('/cards'),
      api.get(`/budget/${currentMonth}/${currentYear}/spending-analysis`),
    ]);

    if (results[0].status === 'fulfilled') setCardsData(results[0].value.data.data);
    if (results[1].status === 'fulfilled') setBudgetData(results[1].value.data.data);
    if (results[2].status === 'fulfilled') setAllCards(results[2].value.data.data || []);
    if (results[3].status === 'fulfilled') setSpendingAnalysis(results[3].value.data.data);

    if (results[0].status === 'rejected' || results[1].status === 'rejected') {
      setError('Failed to load data');
    }
    setLoading(false);
  };

  const refreshAnalysis = async () => {
    try {
      const res = await api.get(`/budget/${currentMonth}/${currentYear}/spending-analysis`);
      setSpendingAnalysis(res.data.data);
    } catch { /* non-critical */ }
  };

  // ============ NAVIGATION ============
  const goToPreviousMonth = () =>
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () =>
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  // ============ CARD HANDLERS ============
  const handleTogglePaid = async (cardId) => {
    try {
      await api.post('/monthly-balances/toggle-paid', {
        card_id: cardId,
        month: currentMonth,
        year: currentYear,
      });
      fetchAllData();
    } catch (err) {
      console.error('Failed to toggle payment status:', err);
    }
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setCardForm({ current_balance: card.current_balance || '', amount_to_pay: card.amount_to_pay || '' });
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
        is_paid: editingCard.is_paid,
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
        total_budget: parseFloat(budgetFormValue) || 0,
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

  // ============ EXPENSE HANDLERS ============
  const handleOpenExpenseModal = (section = null, expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        section: expense.section,
        expense_name: expense.expense_name,
        budgeted_amount: expense.budgeted_amount || '',
        actual_spent: expense.actual_spent || '',
        status: expense.status || 'pending',
        paid_with: expense.paid_with || null,
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        section: section || '',
        expense_name: '',
        budgeted_amount: '',
        actual_spent: '',
        status: 'pending',
        paid_with: null,
      });
    }
    setSelectedSection(section);
    setShowExpenseModal(true);
  };

  const handleExpenseFormChange = (field, value) =>
    setExpenseForm((prev) => ({ ...prev, [field]: value }));

  const handleSaveExpense = async () => {
    if (!expenseForm.expense_name || !expenseForm.section) {
      alert('Por favor completa los campos requeridos');
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
          year: currentYear,
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

  const handleDeleteExpense = async (expenseId) => {
    try {
      await api.delete(`/budget/expense/${expenseId}`);
      setBudgetData((prev) => {
        if (!prev) return prev;
        const newSections = prev.sections.map((section) => {
          const filtered = section.expenses.filter((e) => e.id !== expenseId);
          return {
            ...section,
            expenses: filtered,
            total_budgeted: filtered.reduce((s, e) => s + parseFloat(e.budgeted_amount || 0), 0),
            total_spent: filtered.reduce((s, e) => s + parseFloat(e.actual_spent || 0), 0),
          };
        });
        const totalBudgeted = newSections.reduce((s, sec) => s + sec.total_budgeted, 0);
        const totalSpent = newSections.reduce((s, sec) => s + sec.total_spent, 0);
        return {
          ...prev,
          sections: newSections,
          overview: {
            ...prev.overview,
            total_budgeted: totalBudgeted,
            total_spent: totalSpent,
            remaining_budget: (prev.overview.total_budget || 0) - totalSpent,
            percentage_spent:
              prev.overview.total_budget > 0
                ? (totalSpent / prev.overview.total_budget) * 100
                : 0,
          },
        };
      });
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  // ============ INLINE EDITING ============
  const startInlineEdit = (expense, field) => {
    setInlineEditing({ id: expense.id, field });
    const val =
      field === 'expense_name'
        ? expense.expense_name
        : field === 'budgeted_amount'
        ? expense.budgeted_amount || ''
        : expense.actual_spent || '';
    setInlineValue(val);
  };

  const saveInlineEdit = async (expense) => {
    if (!inlineEditing) return;
    const newValue =
      inlineEditing.field === 'budgeted_amount' || inlineEditing.field === 'actual_spent'
        ? parseFloat(inlineValue) || 0
        : inlineValue;

    const updates = {
      section: expense.section,
      expense_name: expense.expense_name,
      budgeted_amount: expense.budgeted_amount,
      actual_spent: expense.actual_spent,
      status: expense.status,
      paid_with: expense.paid_with,
      [inlineEditing.field]: newValue,
    };

    try {
      await api.put(`/budget/expense/${expense.id}`, updates);
      setBudgetData((prev) => {
        if (!prev) return prev;
        const field = inlineEditing.field;
        const newSections = prev.sections.map((section) => {
          const newExpenses = section.expenses.map((exp) =>
            exp.id === expense.id ? { ...exp, [field]: newValue } : exp
          );
          return {
            ...section,
            expenses: newExpenses,
            total_budgeted: newExpenses.reduce((s, e) => s + parseFloat(e.budgeted_amount || 0), 0),
            total_spent: newExpenses.reduce((s, e) => s + parseFloat(e.actual_spent || 0), 0),
          };
        });
        const totalBudgeted = newSections.reduce((s, sec) => s + sec.total_budgeted, 0);
        const totalSpent = newSections.reduce((s, sec) => s + sec.total_spent, 0);
        return {
          ...prev,
          sections: newSections,
          overview: {
            ...prev.overview,
            total_budgeted: totalBudgeted,
            total_spent: totalSpent,
            remaining_budget: (prev.overview.total_budget || 0) - totalSpent,
            percentage_spent:
              prev.overview.total_budget > 0
                ? (totalSpent / prev.overview.total_budget) * 100
                : 0,
          },
        };
      });
    } catch (err) {
      console.error('Error updating expense:', err);
    } finally {
      setInlineEditing(null);
      setInlineValue('');
    }
  };

  const handleInlineKeyDown = (e, expense) => {
    if (e.key === 'Enter') saveInlineEdit(expense);
    else if (e.key === 'Escape') { setInlineEditing(null); setInlineValue(''); }
  };

  // ============ STATUS CYCLE ============
  const handleCycleStatus = async (expense) => {
    const nextStatus = expense.status === 'pending' ? 'paid' : 'pending';
    try {
      await api.put(`/budget/expense/${expense.id}`, { ...expense, status: nextStatus });
      setBudgetData((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          expenses: s.expenses.map((exp) =>
            exp.id === expense.id ? { ...exp, status: nextStatus } : exp
          ),
        })),
      }));
    } catch (err) {
      console.error('Error cycling status:', err);
    }
  };

  // ============ QUICK PAY ============
  const handleQuickPay = async (expense) => {
    const updates = { ...expense, status: 'paid', actual_spent: expense.budgeted_amount || 0 };
    try {
      await api.put(`/budget/expense/${expense.id}`, updates);
      setBudgetData((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          expenses: s.expenses.map((exp) =>
            exp.id === expense.id
              ? { ...exp, status: 'paid', actual_spent: expense.budgeted_amount || 0 }
              : exp
          ),
          total_spent: s.expenses.reduce(
            (sum, exp) =>
              sum +
              parseFloat(
                exp.id === expense.id ? expense.budgeted_amount || 0 : exp.actual_spent || 0
              ),
            0
          ),
        })),
      }));
    } catch (err) {
      console.error('Error on quick pay:', err);
    }
  };

  // ============ ASSIGN CARD (paid_with) ============
  const handleAssignCard = async (expense, paidWith) => {
    try {
      await api.put(`/budget/expense/${expense.id}`, { ...expense, paid_with: paidWith });
      setBudgetData((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          expenses: s.expenses.map((exp) =>
            exp.id === expense.id ? { ...exp, paid_with: paidWith } : exp
          ),
        })),
      }));
      refreshAnalysis();
    } catch (err) {
      console.error('Error assigning card:', err);
    }
  };

  // ============ COPY BUDGET ============
  const handleCopyBudget = async () => {
    if (!copyForm.from_month || !copyForm.from_year) {
      alert('Por favor selecciona mes y año de origen');
      return;
    }
    setSaving(true);
    try {
      await api.post('/budget/copy', {
        from_month: parseInt(copyForm.from_month),
        from_year: parseInt(copyForm.from_year),
        to_month: currentMonth,
        to_year: currentYear,
        include_actual_spent: copyForm.include_actual,
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
      alert('Por favor selecciona mes y año de origen');
      return;
    }
    setSaving(true);
    try {
      const response = await api.get(
        `/budget/${copySectionForm.from_month}/${copySectionForm.from_year}`
      );
      const sourceSection = response.data.data?.sections?.find((s) => s.key === copySectionKey);

      if (!sourceSection || sourceSection.expenses.length === 0) {
        alert('No hay gastos en esta sección para el mes seleccionado');
        setSaving(false);
        return;
      }

      for (const expense of sourceSection.expenses) {
        await api.post('/budget/expense', {
          month: currentMonth,
          year: currentYear,
          section: copySectionKey,
          expense_name: expense.expense_name,
          budgeted_amount: expense.budgeted_amount,
          actual_spent: copySectionForm.include_actual ? expense.actual_spent : 0,
          status: 'pending',
          paid_with: null,
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

  // ============ RENDER ============
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const prevMonthName = MONTHS_EN[(currentDate.getMonth() + 11) % 12];

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Resumen del mes</h1>
          <p className="text-sm text-gray-500">
            {currentMonthName} {currentYear} · día {currentDayOfMonth} de {daysInMonth} · {remainingDays} días restantes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month navigation */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            </button>
            <span className="px-3 text-sm font-medium text-gray-700">
              {currentMonthName} {currentYear}
            </span>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          <button
            onClick={() => {
              setCopyForm({ from_month: '', from_year: '', include_actual: false });
              setShowCopyModal(true);
            }}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Copiar de mes anterior</span>
          </button>

          <button
            onClick={() => {
              setBudgetFormValue(totalBudget || '');
              setShowBudgetModal(true);
            }}
            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Editar presupuesto</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* ── Hero ── */}
      <MonthlyHero
        totalBudget={totalBudget}
        totalSpentOnCards={totalSpentOnCards}
        currentDayOfMonth={currentDayOfMonth}
        daysInMonth={daysInMonth}
        remainingDays={remainingDays}
        formatCurrency={formatCurrency}
      />

      {/* ── Stats ── */}
      <MonthlyStats
        totalSpentOnCards={totalSpentOnCards}
        totalInPlan={totalInPlan}
        totalOutOfPlan={totalOutOfPlan}
        totalBudget={totalBudget}
        currentDayOfMonth={currentDayOfMonth}
        daysInMonth={daysInMonth}
        formatCurrency={formatCurrency}
      />

      {/* ── Cards grid ── */}
      <CardsGrid
        cards={cards}
        spendingAnalysis={spendingAnalysis}
        onTogglePaid={handleTogglePaid}
        onEditCard={handleEditCard}
        formatCurrency={formatCurrency}
      />

      {/* ── Budget categories ── */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Categorías de presupuesto</h2>
        <div className="space-y-3">
          {budgetSections.map((section) => (
            <CategoryAccordion
              key={section.key}
              section={section}
              isExpanded={!!expandedSections[section.key]}
              onToggle={() =>
                setExpandedSections((prev) => ({ ...prev, [section.key]: !prev[section.key] }))
              }
              inlineEditing={inlineEditing}
              inlineValue={inlineValue}
              deleteConfirm={deleteConfirm}
              allCards={allCards}
              onStartInlineEdit={startInlineEdit}
              onInlineChange={setInlineValue}
              onInlineKeyDown={handleInlineKeyDown}
              onSaveInlineEdit={saveInlineEdit}
              onCycleStatus={handleCycleStatus}
              onQuickPay={handleQuickPay}
              onDeleteConfirm={setDeleteConfirm}
              onDeleteCancel={() => setDeleteConfirm(null)}
              onDelete={handleDeleteExpense}
              onAssignCard={handleAssignCard}
              onAddExpense={(sectionKey) => handleOpenExpenseModal(sectionKey)}
              onCopySection={(sectionKey) => {
                setCopySectionKey(sectionKey);
                setCopySectionForm({ from_month: '', from_year: '', include_actual: false });
                setShowCopySectionModal(true);
              }}
              formatCurrency={formatCurrency}
            />
          ))}
          {budgetSections.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
              No hay categorías de presupuesto. Configura el presupuesto del mes.
            </div>
          )}
        </div>
      </div>

      {/* ── Payment cycle notice ── */}
      <div className="text-center py-2">
        <p className="text-xs text-gray-400">
          💳 <span className="font-medium">Ciclo de pago:</span> En {currentMonthName} pagas los gastos de {prevMonthName}
        </p>
      </div>

      {/* ── Modals ── */}
      <EditCardBalanceModal
        card={editingCard}
        form={cardForm}
        onFormChange={(field, value) => setCardForm((prev) => ({ ...prev, [field]: value }))}
        onSave={handleSaveCard}
        onClose={() => setEditingCard(null)}
        saving={saving}
      />

      <ExpenseFormModal
        isOpen={showExpenseModal}
        editingExpense={editingExpense}
        form={expenseForm}
        onFormChange={handleExpenseFormChange}
        allCards={allCards}
        onSave={handleSaveExpense}
        onClose={() => setShowExpenseModal(false)}
        saving={saving}
        sectionLocked={selectedSection}
      />

      <SetBudgetModal
        isOpen={showBudgetModal}
        value={budgetFormValue}
        onChange={setBudgetFormValue}
        onSave={handleSaveBudget}
        onClose={() => setShowBudgetModal(false)}
        saving={saving}
        monthName={currentMonthName}
        year={currentYear}
      />

      {/* Full budget copy */}
      <CopyBudgetModal
        isOpen={showCopyModal}
        sectionKey={null}
        form={copyForm}
        onFormChange={(field, value) => setCopyForm((prev) => ({ ...prev, [field]: value }))}
        onCopy={handleCopyBudget}
        onClose={() => setShowCopyModal(false)}
        saving={saving}
        currentMonthName={currentMonthName}
        currentYear={currentYear}
      />

      {/* Section copy */}
      <CopyBudgetModal
        isOpen={showCopySectionModal}
        sectionKey={copySectionKey}
        form={copySectionForm}
        onFormChange={(field, value) => setCopySectionForm((prev) => ({ ...prev, [field]: value }))}
        onCopy={handleCopySectionBudget}
        onClose={() => { setShowCopySectionModal(false); setCopySectionKey(null); }}
        saving={saving}
        currentMonthName={currentMonthName}
        currentYear={currentYear}
      />
    </div>
  );
}
