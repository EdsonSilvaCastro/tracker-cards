import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Plus, 
  Edit2, 
  Trash2,
  CreditCard,
  Calendar,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Modal, Input, Select } from '../components/ui';
import api from '../lib/api';
import { format } from 'date-fns';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [cards, setCards] = useState([]);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [formData, setFormData] = useState({
    card_id: '',
    statement_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount_paid: '',
    payment_method: '',
    reference_number: '',
    late_payment: false,
    late_fee: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const paymentMethods = [
    'Bank Transfer',
    'Direct Debit',
    'Online Banking',
    'Mobile App',
    'Cash',
    'Check',
    'Other'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, cardsRes, statementsRes] = await Promise.all([
        api.get('/payments'),
        api.get('/cards'),
        api.get('/statements')
      ]);
      setPayments(paymentsRes.data.data || []);
      setCards(cardsRes.data.data || []);
      setStatements(statementsRes.data.data || []);
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

  const handleOpenModal = (payment = null) => {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        card_id: payment.card_id || '',
        statement_id: payment.statement_id || '',
        payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
        amount_paid: payment.amount_paid || '',
        payment_method: payment.payment_method || '',
        reference_number: payment.reference_number || '',
        late_payment: payment.late_payment || false,
        late_fee: payment.late_fee || '',
        notes: payment.notes || ''
      });
    } else {
      setEditingPayment(null);
      setFormData({
        card_id: cards[0]?.id || '',
        statement_id: '',
        payment_date: new Date().toISOString().split('T')[0],
        amount_paid: '',
        payment_method: '',
        reference_number: '',
        late_payment: false,
        late_fee: '',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        amount_paid: parseFloat(formData.amount_paid) || 0,
        late_fee: parseFloat(formData.late_fee) || 0,
        statement_id: formData.statement_id || null
      };

      if (editingPayment) {
        await api.put(`/payments/${editingPayment.id}`, payload);
      } else {
        await api.post('/payments', payload);
      }

      handleCloseModal();
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (paymentId) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      await api.delete(`/payments/${paymentId}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete payment');
    }
  };

  const getCardName = (cardId) => {
    const card = cards.find(c => c.id === cardId);
    return card ? `${card.card_name} (${card.bank})` : 'Unknown Card';
  };

  const getStatementLabel = (statementId) => {
    const statement = statements.find(s => s.id === statementId);
    return statement ? `${statement.statement_month} ${statement.statement_year}` : null;
  };

  const getCardStatements = (cardId) => {
    return statements.filter(s => s.card_id === cardId);
  };

  // Calculate totals
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);
  const totalLateFees = payments.reduce((sum, p) => sum + (parseFloat(p.late_fee) || 0), 0);
  const latePaymentsCount = payments.filter(p => p.late_payment).length;

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
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Track your credit card payments</p>
        </div>
        <Button onClick={() => handleOpenModal()} disabled={cards.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
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
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Payments Made</p>
                <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <CheckCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Late Fees</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalLateFees)}</p>
                {latePaymentsCount > 0 && (
                  <p className="text-xs text-red-500">{latePaymentsCount} late payment(s)</p>
                )}
              </div>
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      {cards.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cards added</h3>
            <p className="text-gray-500">Add a credit card first before recording payments</p>
          </CardContent>
        </Card>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments recorded</h3>
            <p className="text-gray-500 mb-4">Record your first payment to start tracking</p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${payment.late_payment ? 'bg-red-100' : 'bg-green-100'}`}>
                        <DollarSign className={`h-5 w-5 ${payment.late_payment ? 'text-red-600' : 'text-green-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {getCardName(payment.card_id)}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                          {payment.statement_id && (
                            <span className="text-primary-600">
                              • {getStatementLabel(payment.statement_id)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(payment.amount_paid)}
                        </p>
                        {payment.payment_method && (
                          <p className="text-xs text-gray-500">{payment.payment_method}</p>
                        )}
                        {payment.late_payment && (
                          <p className="text-xs text-red-500">
                            Late fee: {formatCurrency(payment.late_fee)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(payment)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(payment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {payment.notes && (
                    <p className="text-sm text-gray-500 mt-2 ml-11">{payment.notes}</p>
                  )}
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
        title={editingPayment ? 'Edit Payment' : 'Record Payment'}
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

          {formData.card_id && getCardStatements(formData.card_id).length > 0 && (
            <Select
              label="Statement (optional)"
              name="statement_id"
              value={formData.statement_id}
              onChange={handleChange}
            >
              <option value="">No specific statement</option>
              {getCardStatements(formData.card_id).map(statement => (
                <option key={statement.id} value={statement.id}>
                  {statement.statement_month} {statement.statement_year} - {formatCurrency(statement.total_balance)}
                </option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Payment Date"
              name="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={handleChange}
              required
            />
            <Input
              label="Amount Paid"
              name="amount_paid"
              type="number"
              step="0.01"
              value={formData.amount_paid}
              onChange={handleChange}
              placeholder="0.00"
              required
            />
          </div>

          <Select
            label="Payment Method"
            name="payment_method"
            value={formData.payment_method}
            onChange={handleChange}
          >
            <option value="">Select method</option>
            {paymentMethods.map(method => (
              <option key={method} value={method}>{method}</option>
            ))}
          </Select>

          <Input
            label="Reference Number (optional)"
            name="reference_number"
            value={formData.reference_number}
            onChange={handleChange}
            placeholder="e.g., confirmation number"
          />

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="late_payment"
                checked={formData.late_payment}
                onChange={handleChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Late Payment</span>
            </label>
            {formData.late_payment && (
              <Input
                name="late_fee"
                type="number"
                step="0.01"
                value={formData.late_fee}
                onChange={handleChange}
                placeholder="Late fee amount"
                className="flex-1"
              />
            )}
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
              {saving ? 'Saving...' : editingPayment ? 'Update' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
