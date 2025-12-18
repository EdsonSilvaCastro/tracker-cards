import { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Edit2, 
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Modal, Input, Select } from '../components/ui';
import api from '../lib/api';
import { format } from 'date-fns';

export default function Statements() {
  const [statements, setStatements] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatement, setEditingStatement] = useState(null);
  const [formData, setFormData] = useState({
    card_id: '',
    statement_month: '',
    statement_year: new Date().getFullYear(),
    total_balance: '',
    minimum_payment: '',
    payment_due_date: '',
    status: 'NOT PAID',
    paid_amount: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statementsRes, cardsRes] = await Promise.all([
        api.get('/statements'),
        api.get('/cards')
      ]);
      setStatements(statementsRes.data.data || []);
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

  const handleOpenModal = (statement = null) => {
    if (statement) {
      setEditingStatement(statement);
      setFormData({
        card_id: statement.card_id || '',
        statement_month: statement.statement_month || '',
        statement_year: statement.statement_year || new Date().getFullYear(),
        total_balance: statement.total_balance || '',
        minimum_payment: statement.minimum_payment || '',
        payment_due_date: statement.payment_due_date || '',
        status: statement.status || 'NOT PAID',
        paid_amount: statement.paid_amount || '',
        notes: statement.notes || ''
      });
    } else {
      setEditingStatement(null);
      setFormData({
        card_id: cards[0]?.id || '',
        statement_month: months[new Date().getMonth()],
        statement_year: new Date().getFullYear(),
        total_balance: '',
        minimum_payment: '',
        payment_due_date: '',
        status: 'NOT PAID',
        paid_amount: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStatement(null);
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
        statement_year: parseInt(formData.statement_year),
        total_balance: parseFloat(formData.total_balance) || 0,
        minimum_payment: parseFloat(formData.minimum_payment) || 0,
        paid_amount: parseFloat(formData.paid_amount) || 0,
      };

      if (editingStatement) {
        await api.put(`/statements/${editingStatement.id}`, payload);
      } else {
        await api.post('/statements', payload);
      }

      handleCloseModal();
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to save statement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (statementId) => {
    if (!confirm('Are you sure you want to delete this statement?')) return;

    try {
      await api.delete(`/statements/${statementId}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete statement');
    }
  };

  const handleMarkAsPaid = async (statement) => {
    try {
      await api.put(`/statements/${statement.id}`, {
        ...statement,
        status: 'PAID',
        paid_amount: statement.total_balance,
        paid_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update statement');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'NOT PAID':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'PARTIAL':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'PAID': 'bg-green-100 text-green-700',
      'NOT PAID': 'bg-red-100 text-red-700',
      'PARTIAL': 'bg-yellow-100 text-yellow-700',
      'OPEN': 'bg-blue-100 text-blue-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getCardName = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    return card ? `${card.card_name} (${card.bank})` : 'Unknown Card';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Group statements by status
  const unpaidStatements = statements.filter(s => s.status === 'NOT PAID' || s.status === 'PARTIAL');
  const paidStatements = statements.filter(s => s.status === 'PAID');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statements</h1>
          <p className="text-gray-600">Track your monthly credit card statements</p>
        </div>
        <Button onClick={() => handleOpenModal()} disabled={cards.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Add Statement
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {cards.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cards added</h3>
            <p className="text-gray-500">Add a credit card first before creating statements</p>
          </CardContent>
        </Card>
      ) : statements.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No statements yet</h3>
            <p className="text-gray-500 mb-4">Add your first statement to start tracking</p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Statement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Unpaid Statements */}
          {unpaidStatements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Pending Payments ({unpaidStatements.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200">
                  {unpaidStatements.map((statement) => (
                    <div key={statement.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {getStatusIcon(statement.status)}
                          <div>
                            <p className="font-medium text-gray-900">
                              {getCardName(statement.card_id)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {statement.statement_month} {statement.statement_year}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(statement.total_balance)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Min: {formatCurrency(statement.minimum_payment)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(statement.status)}`}>
                            {statement.status}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsPaid(statement)}
                              title="Mark as paid"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(statement)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(statement.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {statement.payment_due_date && (
                        <p className="text-sm text-gray-500 mt-2 ml-9">
                          Due: {format(new Date(statement.payment_due_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Paid Statements */}
          {paidStatements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Paid Statements ({paidStatements.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-200">
                  {paidStatements.map((statement) => (
                    <div key={statement.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {getStatusIcon(statement.status)}
                          <div>
                            <p className="font-medium text-gray-900">
                              {getCardName(statement.card_id)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {statement.statement_month} {statement.statement_year}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(statement.paid_amount)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(statement.status)}`}>
                            {statement.status}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(statement)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(statement.id)}
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
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingStatement ? 'Edit Statement' : 'Add New Statement'}
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
            <Select
              label="Month"
              name="statement_month"
              value={formData.statement_month}
              onChange={handleChange}
              required
            >
              {months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </Select>
            <Input
              label="Year"
              name="statement_year"
              type="number"
              min="2020"
              max="2030"
              value={formData.statement_year}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Total Balance"
              name="total_balance"
              type="number"
              step="0.01"
              value={formData.total_balance}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
            <Input
              label="Minimum Payment"
              name="minimum_payment"
              type="number"
              step="0.01"
              value={formData.minimum_payment}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
          </div>

          <Input
            label="Payment Due Date"
            name="payment_due_date"
            type="date"
            value={formData.payment_due_date}
            onChange={handleChange}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="NOT PAID">Not Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
              <option value="OPEN">Open</option>
            </Select>
            <Input
              label="Paid Amount"
              name="paid_amount"
              type="number"
              step="0.01"
              value={formData.paid_amount}
              onChange={handleChange}
              placeholder="0.00"
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
              {saving ? 'Saving...' : editingStatement ? 'Update' : 'Add Statement'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
