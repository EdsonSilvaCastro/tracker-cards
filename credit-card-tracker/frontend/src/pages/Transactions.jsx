import { useState, useEffect } from 'react';
import { 
  Receipt, 
  Plus, 
  Edit2, 
  Trash2,
  CreditCard,
  Calendar,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Modal, Input, Select } from '../components/ui';
import api from '../lib/api';
import { format } from 'date-fns';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filterCard, setFilterCard] = useState('');
  const [filterType, setFilterType] = useState('');
  const [formData, setFormData] = useState({
    card_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: '',
    category: '',
    amount: '',
    transaction_type: 'Purchase',
    merchant: '',
    installments: 1,
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const transactionTypes = ['Purchase', 'Payment', 'Refund', 'Fee', 'Interest'];
  
  const categories = [
    'Food & Dining',
    'Shopping',
    'Transportation',
    'Entertainment',
    'Bills & Utilities',
    'Health & Medical',
    'Travel',
    'Groceries',
    'Gas',
    'Subscriptions',
    'Education',
    'Other'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transactionsRes, cardsRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/cards')
      ]);
      setTransactions(transactionsRes.data.data || []);
      setCards(cardsRes.data.data || []);
    } catch (err) {
      setError('Failed to load data');
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

  const handleOpenModal = (transaction = null) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        card_id: transaction.card_id || '',
        transaction_date: transaction.transaction_date || new Date().toISOString().split('T')[0],
        description: transaction.description || '',
        category: transaction.category || '',
        amount: transaction.amount || '',
        transaction_type: transaction.transaction_type || 'Purchase',
        merchant: transaction.merchant || '',
        installments: transaction.installments || 1,
        notes: transaction.notes || ''
      });
    } else {
      setEditingTransaction(null);
      setFormData({
        card_id: cards[0]?.id || '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        category: '',
        amount: '',
        transaction_type: 'Purchase',
        merchant: '',
        installments: 1,
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount) || 0,
        installments: parseInt(formData.installments) || 1
      };

      if (editingTransaction) {
        await api.put(`/transactions/${editingTransaction.id}`, payload);
      } else {
        await api.post('/transactions', payload);
      }

      handleCloseModal();
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (transactionId) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      await api.delete(`/transactions/${transactionId}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete transaction');
    }
  };

  const getCardName = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    return card ? `${card.card_name}` : 'Unknown';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Purchase':
        return <ShoppingBag className="h-4 w-4" />;
      case 'Payment':
        return <TrendingDown className="h-4 w-4" />;
      case 'Refund':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Receipt className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Purchase':
        return 'bg-blue-100 text-blue-600';
      case 'Payment':
        return 'bg-green-100 text-green-600';
      case 'Refund':
        return 'bg-purple-100 text-purple-600';
      case 'Fee':
      case 'Interest':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (filterCard && t.card_id !== filterCard) return false;
    if (filterType && t.transaction_type !== filterType) return false;
    return true;
  });

  // Calculate totals
  const totalPurchases = transactions
    .filter(t => t.transaction_type === 'Purchase')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  
  const totalPayments = transactions
    .filter(t => t.transaction_type === 'Payment')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-600">Track all your credit card transactions</p>
        </div>
        <Button onClick={() => handleOpenModal()} disabled={cards.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPurchases)}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <ShoppingBag className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPayments)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <Receipt className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {transactions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterCard}
                onChange={(e) => setFilterCard(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Cards</option>
                {cards.map(card => (
                  <option key={card.id} value={card.id}>
                    {card.card_name} ({card.bank})
                  </option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Types</option>
                {transactionTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {(filterCard || filterType) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFilterCard(''); setFilterType(''); }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions List */}
      {cards.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cards added</h3>
            <p className="text-gray-500">Add a credit card first before recording transactions</p>
          </CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Receipt className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-500 mb-4">Record your first transaction to start tracking</p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              Transaction History
              {filteredTransactions.length !== transactions.length && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (showing {filteredTransactions.length} of {transactions.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${getTypeColor(transaction.transaction_type)}`}>
                        {getTypeIcon(transaction.transaction_type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(transaction.transaction_date), 'MMM d, yyyy')}
                          <span>•</span>
                          <CreditCard className="h-3 w-3" />
                          {getCardName(transaction.card_id)}
                          {transaction.category && (
                            <>
                              <span>•</span>
                              <span className="text-primary-600">{transaction.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-semibold ${
                          transaction.transaction_type === 'Payment' || transaction.transaction_type === 'Refund'
                            ? 'text-green-600'
                            : 'text-gray-900'
                        }`}>
                          {transaction.transaction_type === 'Payment' || transaction.transaction_type === 'Refund' ? '-' : ''}
                          {formatCurrency(transaction.amount)}
                        </p>
                        {transaction.installments > 1 && (
                          <p className="text-xs text-gray-500">
                            {transaction.current_installment || 1}/{transaction.installments} installments
                          </p>
                        )}
                        {transaction.merchant && (
                          <p className="text-xs text-gray-500">{transaction.merchant}</p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(transaction.transaction_type)}`}>
                        {transaction.transaction_type}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(transaction)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Credit Card"
            name="card_id"
            value={formData.card_id}
            onChange={handleChange}
            required
          >
            <option value="">Select a card</option>
            {cards.map(card => (
              <option key={card.id} value={card.id}>
                {card.card_name} ({card.bank})
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              name="transaction_date"
              type="date"
              value={formData.transaction_date}
              onChange={handleChange}
              required
            />
            <Select
              label="Type"
              name="transaction_type"
              value={formData.transaction_type}
              onChange={handleChange}
              required
            >
              {transactionTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </div>

          <Input
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="e.g., Grocery shopping"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount"
              name="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
            <Select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Merchant (optional)"
              name="merchant"
              value={formData.merchant}
              onChange={handleChange}
              placeholder="e.g., Amazon"
            />
            <Input
              label="Installments"
              name="installments"
              type="number"
              min="1"
              value={formData.installments}
              onChange={handleChange}
            />
          </div>

          <Input
            label="Notes (optional)"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any additional notes..."
          />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving...' : editingTransaction ? 'Update' : 'Add Transaction'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
