import { useState, useEffect } from 'react';
import { 
  PiggyBank, 
  Plus, 
  Target,
  TrendingUp,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, Button, Input, Modal } from '../components/ui';
import api from '../lib/api';

const GOAL_CATEGORIES = [
  { value: 'emergency', label: 'Emergency Fund', color: '#ef4444', icon: '🚨' },
  { value: 'vacation', label: 'Vacation', color: '#f59e0b', icon: '✈️' },
  { value: 'house', label: 'House/Rent', color: '#10b981', icon: '🏠' },
  { value: 'car', label: 'Car', color: '#3b82f6', icon: '🚗' },
  { value: 'education', label: 'Education', color: '#8b5cf6', icon: '📚' },
  { value: 'retirement', label: 'Retirement', color: '#6366f1', icon: '🏖️' },
  { value: 'other', label: 'Other', color: '#6b7280', icon: '💰' },
  { value: 'general', label: 'General', color: '#64748b', icon: '🎯' }
];

export default function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [goalForm, setGoalForm] = useState({
    goal_name: '',
    target_amount: '',
    target_date: '',
    category: 'general',
    notes: ''
  });

  const [contributionForm, setContributionForm] = useState({
    amount: '',
    contribution_type: 'deposit',
    contribution_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [goalsRes, summaryRes] = await Promise.all([
        api.get('/savings'),
        api.get('/savings/summary')
      ]);
      setGoals(goalsRes.data.data || []);
      setSummary(summaryRes.data.data);
    } catch (err) {
      console.error('Error fetching savings data:', err);
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

  const handleOpenGoalModal = (goal = null) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalForm({
        goal_name: goal.goal_name,
        target_amount: goal.target_amount,
        target_date: goal.target_date || '',
        category: goal.category || 'general',
        notes: goal.notes || ''
      });
    } else {
      setEditingGoal(null);
      setGoalForm({
        goal_name: '',
        target_amount: '',
        target_date: '',
        category: 'general',
        notes: ''
      });
    }
    setShowGoalModal(true);
  };

  const handleSaveGoal = async () => {
    if (!goalForm.goal_name || !goalForm.target_amount) {
      alert('Please fill in goal name and target amount');
      return;
    }
    setSaving(true);
    try {
      if (editingGoal) {
        await api.put(`/savings/${editingGoal.id}`, goalForm);
      } else {
        await api.post('/savings', goalForm);
      }
      setShowGoalModal(false);
      fetchData();
    } catch (err) {
      console.error('Error saving goal:', err);
      alert('Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    try {
      await api.delete(`/savings/${goalId}`);
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  };

  const handleOpenContributionModal = (goal) => {
    setSelectedGoal(goal);
    setContributionForm({
      amount: '',
      contribution_type: 'deposit',
      contribution_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowContributionModal(true);
  };

  const handleSaveContribution = async () => {
    if (!contributionForm.amount || !selectedGoal) {
      alert('Please enter an amount');
      return;
    }
    setSaving(true);
    try {
      await api.post('/savings/contribution', {
        goal_id: selectedGoal.id,
        ...contributionForm
      });
      setShowContributionModal(false);
      fetchData();
    } catch (err) {
      console.error('Error saving contribution:', err);
      alert('Failed to save contribution');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryInfo = (category) => {
    return GOAL_CATEGORIES.find(c => c.value === category) || GOAL_CATEGORIES[7];
  };

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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Savings Goals</h1>
          <p className="text-sm sm:text-base text-gray-600">Track your financial goals and progress</p>
        </div>
        <Button onClick={() => handleOpenGoalModal()}>
          <Plus className="h-4 w-4 mr-1" />
          New Goal
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between sm:block">
                <p className="text-xs sm:text-sm text-indigo-600 font-medium">Active Goals</p>
                <p className="text-lg sm:text-2xl font-bold text-indigo-700">{summary.active_goals}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between sm:block">
                <p className="text-xs sm:text-sm text-green-600 font-medium">Completed</p>
                <p className="text-lg sm:text-2xl font-bold text-green-700">{summary.completed_goals}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between sm:block">
                <p className="text-xs sm:text-sm text-blue-600 font-medium">Total Saved</p>
                <p className="text-base sm:text-xl font-bold text-blue-700">{formatCurrency(summary.total_saved)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between sm:block">
                <p className="text-xs sm:text-sm text-amber-600 font-medium">Progress</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-700">{summary.overall_progress}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <PiggyBank className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No savings goals yet</h3>
            <p className="text-gray-500 mb-4">Start tracking your financial goals</p>
            <Button onClick={() => handleOpenGoalModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const categoryInfo = getCategoryInfo(goal.category);
            const progress = parseFloat(goal.progress_percentage) || 0;
            const isCompleted = goal.status === 'completed';

            return (
              <Card 
                key={goal.id} 
                className={`overflow-hidden ${isCompleted ? 'bg-green-50 border-green-200' : ''}`}
              >
                <div 
                  className="h-2" 
                  style={{ backgroundColor: categoryInfo.color, opacity: 0.3 }}
                />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{categoryInfo.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{goal.goal_name}</h3>
                        <p className="text-xs text-gray-500">{categoryInfo.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isCompleted ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Completed
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleOpenGoalModal(goal)}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(goal.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{formatCurrency(goal.current_amount)}</span>
                      <span className="text-gray-500">of {formatCurrency(goal.target_amount)}</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(progress, 100)}%`,
                          backgroundColor: categoryInfo.color
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">{progress}% complete</span>
                      <span className="text-xs text-gray-500">
                        {formatCurrency(goal.remaining)} remaining
                      </span>
                    </div>
                  </div>

                  {/* Target Date & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {goal.target_date && (
                        <>
                          <Calendar className="h-3 w-3" />
                          <span>
                            {goal.days_remaining !== null 
                              ? goal.days_remaining > 0 
                                ? `${goal.days_remaining} days left`
                                : 'Past due'
                              : new Date(goal.target_date).toLocaleDateString()
                            }
                          </span>
                        </>
                      )}
                    </div>
                    {!isCompleted && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedGoal(goal);
                            setContributionForm(prev => ({ ...prev, contribution_type: 'withdrawal' }));
                            setShowContributionModal(true);
                          }}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <ArrowDownRight className="h-3 w-3 mr-1" />
                          Withdraw
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleOpenContributionModal(goal)}
                        >
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 text-center">
              <Trash2 className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Goal?</h3>
              <p className="text-gray-500 mb-4">This action cannot be undone.</p>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleDeleteGoal(deleteConfirm)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Goal Modal */}
      <Modal 
        isOpen={showGoalModal} 
        onClose={() => setShowGoalModal(false)} 
        title={editingGoal ? 'Edit Goal' : 'New Savings Goal'}
      >
        <div className="space-y-4">
          <Input
            label="Goal Name"
            value={goalForm.goal_name}
            onChange={(e) => setGoalForm(prev => ({ ...prev, goal_name: e.target.value }))}
            placeholder="e.g., Emergency Fund"
          />
          <Input
            label="Target Amount"
            type="number"
            step="0.01"
            value={goalForm.target_amount}
            onChange={(e) => setGoalForm(prev => ({ ...prev, target_amount: e.target.value }))}
            placeholder="0.00"
          />
          <Input
            label="Target Date (Optional)"
            type="date"
            value={goalForm.target_date}
            onChange={(e) => setGoalForm(prev => ({ ...prev, target_date: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={goalForm.category}
              onChange={(e) => setGoalForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {GOAL_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Notes (Optional)"
            value={goalForm.notes}
            onChange={(e) => setGoalForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Any additional notes..."
          />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowGoalModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSaveGoal} disabled={saving} className="flex-1">
              {saving ? 'Saving...' : 'Save Goal'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Contribution Modal */}
      <Modal 
        isOpen={showContributionModal} 
        onClose={() => setShowContributionModal(false)} 
        title={contributionForm.contribution_type === 'deposit' ? 'Add to Savings' : 'Withdraw from Savings'}
      >
        <div className="space-y-4">
          {selectedGoal && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Goal: <strong>{selectedGoal.goal_name}</strong></p>
              <p className="text-xs text-gray-500">
                Current: {formatCurrency(selectedGoal.current_amount)} / {formatCurrency(selectedGoal.target_amount)}
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setContributionForm(prev => ({ ...prev, contribution_type: 'deposit' }))}
                className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                  contributionForm.contribution_type === 'deposit'
                    ? 'bg-green-100 border-green-300 text-green-700'
                    : 'bg-white border-gray-300 text-gray-600'
                }`}
              >
                <ArrowUpRight className="h-4 w-4 inline mr-1" />
                Deposit
              </button>
              <button
                onClick={() => setContributionForm(prev => ({ ...prev, contribution_type: 'withdrawal' }))}
                className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                  contributionForm.contribution_type === 'withdrawal'
                    ? 'bg-red-100 border-red-300 text-red-700'
                    : 'bg-white border-gray-300 text-gray-600'
                }`}
              >
                <ArrowDownRight className="h-4 w-4 inline mr-1" />
                Withdraw
              </button>
            </div>
          </div>
          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={contributionForm.amount}
            onChange={(e) => setContributionForm(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
          />
          <Input
            label="Date"
            type="date"
            value={contributionForm.contribution_date}
            onChange={(e) => setContributionForm(prev => ({ ...prev, contribution_date: e.target.value }))}
          />
          <Input
            label="Notes (Optional)"
            value={contributionForm.notes}
            onChange={(e) => setContributionForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="e.g., Monthly savings"
          />
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowContributionModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveContribution} 
              disabled={saving} 
              className={`flex-1 ${contributionForm.contribution_type === 'withdrawal' ? 'bg-red-600 hover:bg-red-700' : ''}`}
            >
              {saving ? 'Saving...' : contributionForm.contribution_type === 'deposit' ? 'Add Funds' : 'Withdraw'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
