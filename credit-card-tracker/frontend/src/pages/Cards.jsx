import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Edit2, 
  Trash2,
  Building,
  Calendar,
  Percent
} from 'lucide-react';
import { Card, CardContent, Button, Modal, Input, Select } from '../components/ui';
import api from '../lib/api';

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [formData, setFormData] = useState({
    card_name: '',
    bank: '',
    card_type: 'Credit',
    credit_limit: '',
    interest_rate: '',
    annual_fee: '',
    closing_day: '',
    payment_due_day: '',
    card_number_last4: '',
    status: 'Active'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cards');
      setCards(response.data.data || []);
    } catch (err) {
      setError('Failed to load cards');
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

  const handleOpenModal = (card = null) => {
    if (card) {
      setEditingCard(card);
      setFormData({
        card_name: card.card_name || '',
        bank: card.bank || '',
        card_type: card.card_type || 'Credit',
        credit_limit: card.credit_limit || '',
        interest_rate: card.interest_rate || '',
        annual_fee: card.annual_fee || '',
        closing_day: card.closing_day || '',
        payment_due_day: card.payment_due_day || '',
        card_number_last4: card.card_number_last4 || '',
        status: card.status || 'Active'
      });
    } else {
      setEditingCard(null);
      setFormData({
        card_name: '',
        bank: '',
        card_type: 'Credit',
        credit_limit: '',
        interest_rate: '',
        annual_fee: '',
        closing_day: '',
        payment_due_day: '',
        card_number_last4: '',
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCard(null);
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
        credit_limit: parseFloat(formData.credit_limit) || 0,
        interest_rate: parseFloat(formData.interest_rate) || 0,
        annual_fee: parseFloat(formData.annual_fee) || 0,
        closing_day: parseInt(formData.closing_day) || null,
        payment_due_day: parseInt(formData.payment_due_day) || null,
      };

      if (editingCard) {
        await api.put(`/cards/${editingCard.id}`, payload);
      } else {
        await api.post('/cards', payload);
      }

      handleCloseModal();
      fetchCards();
    } catch (err) {
      console.error(err);
      alert('Failed to save card');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cardId) => {
    if (!confirm('Are you sure you want to delete this card? All monthly balance data will also be deleted.')) return;

    try {
      await api.delete(`/cards/${cardId}`);
      fetchCards();
    } catch (err) {
      console.error(err);
      alert('Failed to delete card');
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Credit Cards</h1>
          <p className="text-gray-600">Manage your credit cards. Monthly balances are tracked in Monthly Overview.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Card
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Cards Grid */}
      {cards.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cards yet</h3>
            <p className="text-gray-500 mb-4">Add your first credit card to start tracking</p>
            <Button onClick={() => handleOpenModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Card key={card.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <CreditCard className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{card.card_name}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {card.bank}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    card.status === 'Active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {card.status}
                  </span>
                </div>

                {/* Card Type Badge */}
                <div className="mb-4">
                  <span className="px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded-full">
                    {card.card_type}
                  </span>
                  {card.card_number_last4 && (
                    <span className="ml-2 text-sm text-gray-500">
                      •••• {card.card_number_last4}
                    </span>
                  )}
                </div>

                {/* Credit Limit */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Credit Limit</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(card.credit_limit)}
                  </p>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  {card.closing_day && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-3 w-3" />
                      <span>Closes: Day {card.closing_day}</span>
                    </div>
                  )}
                  {card.payment_due_day && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-3 w-3" />
                      <span>Due: Day {card.payment_due_day}</span>
                    </div>
                  )}
                  {card.interest_rate > 0 && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <Percent className="h-3 w-3" />
                      <span>Rate: {card.interest_rate}%</span>
                    </div>
                  )}
                  {card.annual_fee > 0 && (
                    <div className="flex items-center gap-1 text-gray-600">
                      <span>Annual Fee: {formatCurrency(card.annual_fee)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleOpenModal(card)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handleDelete(card.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingCard ? 'Edit Card' : 'Add New Card'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Card Name"
              name="card_name"
              value={formData.card_name}
              onChange={handleChange}
              placeholder="e.g., AMEX Gold"
              required
            />
            <Input
              label="Bank"
              name="bank"
              value={formData.bank}
              onChange={handleChange}
              placeholder="e.g., American Express"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Card Type"
              name="card_type"
              value={formData.card_type}
              onChange={handleChange}
            >
              <option value="Credit">Credit</option>
              <option value="Debit">Debit</option>
              <option value="Loan">Loan</option>
            </Select>
            <Select
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Closed">Closed</option>
            </Select>
          </div>

          <Input
            label="Credit Limit"
            name="credit_limit"
            type="number"
            step="0.01"
            value={formData.credit_limit}
            onChange={handleChange}
            placeholder="0.00"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Interest Rate (%)"
              name="interest_rate"
              type="number"
              step="0.01"
              value={formData.interest_rate}
              onChange={handleChange}
              placeholder="0.00"
            />
            <Input
              label="Annual Fee"
              name="annual_fee"
              type="number"
              step="0.01"
              value={formData.annual_fee}
              onChange={handleChange}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Closing Day"
              name="closing_day"
              type="number"
              min="1"
              max="31"
              value={formData.closing_day}
              onChange={handleChange}
              placeholder="1-31"
            />
            <Input
              label="Payment Due Day"
              name="payment_due_day"
              type="number"
              min="1"
              max="31"
              value={formData.payment_due_day}
              onChange={handleChange}
              placeholder="1-31"
            />
          </div>

          <Input
            label="Last 4 Digits (optional)"
            name="card_number_last4"
            value={formData.card_number_last4}
            onChange={handleChange}
            placeholder="1234"
            maxLength={4}
          />

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? 'Saving...' : editingCard ? 'Update Card' : 'Add Card'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
