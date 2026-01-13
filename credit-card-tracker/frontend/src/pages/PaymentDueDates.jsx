import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CreditCard, 
  AlertTriangle,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '../components/ui';
import api from '../lib/api';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PaymentDueDates() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await api.get('/cards');
      setCards(response.data.data || []);
    } catch (err) {
      console.error('Error fetching cards:', err);
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

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Empty cells for days before first of month
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null, payments: [] });
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const paymentsOnDay = cards.filter(card => card.payment_due_day === day);
      days.push({ day, payments: paymentsOnDay });
    }

    return days;
  };

  const getDayStatus = (payments) => {
    if (payments.length === 0) return 'empty';
    const today = new Date();
    const dayDate = new Date(currentYear, currentMonth, payments[0]?.payment_due_day);
    
    if (dayDate < today) return 'past';
    if (dayDate.toDateString() === today.toDateString()) return 'today';
    const daysUntil = Math.ceil((dayDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 3) return 'soon';
    return 'upcoming';
  };

  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const calendarDays = generateCalendarDays();

  // Get upcoming payments (next 30 days)
  const today = new Date();
  const upcomingPayments = cards
    .map(card => {
      let nextPaymentDate = new Date(currentYear, currentMonth, card.payment_due_day);
      if (nextPaymentDate < today) {
        nextPaymentDate = new Date(currentYear, currentMonth + 1, card.payment_due_day);
      }
      const daysUntil = Math.ceil((nextPaymentDate - today) / (1000 * 60 * 60 * 24));
      return { ...card, nextPaymentDate, daysUntil };
    })
    .filter(card => card.daysUntil <= 30 && card.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);

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
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Payment Due Dates</h1>
        <p className="text-sm sm:text-base text-gray-600">Track when your credit card payments are due</p>
      </div>

      {/* Upcoming Payments Alert */}
      {upcomingPayments.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">Upcoming Payments</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingPayments.slice(0, 6).map(card => (
                <div 
                  key={card.id} 
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    card.daysUntil === 0 ? 'bg-red-100 border border-red-200' :
                    card.daysUntil <= 3 ? 'bg-amber-100 border border-amber-200' :
                    'bg-white border border-gray-200'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{card.card_name}</p>
                    <p className="text-xs text-gray-500">{card.bank}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${
                      card.daysUntil === 0 ? 'text-red-600' :
                      card.daysUntil <= 3 ? 'text-amber-600' :
                      'text-gray-600'
                    }`}>
                      {card.daysUntil === 0 ? 'Today!' : 
                       card.daysUntil === 1 ? 'Tomorrow' :
                       `${card.daysUntil} days`}
                    </p>
                    <p className="text-xs text-gray-500">Day {card.payment_due_day}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-bold text-gray-900">
                {months[currentMonth]} {currentYear}
              </h2>
              <button 
                onClick={goToNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((dayInfo, index) => {
                const status = getDayStatus(dayInfo.payments);
                const isSelected = selectedDay === dayInfo.day;
                const isToday = dayInfo.day && 
                  new Date().getDate() === dayInfo.day && 
                  new Date().getMonth() === currentMonth &&
                  new Date().getFullYear() === currentYear;

                return (
                  <button
                    key={index}
                    onClick={() => dayInfo.day && setSelectedDay(dayInfo.day)}
                    disabled={!dayInfo.day}
                    className={`
                      aspect-square p-1 sm:p-2 rounded-lg relative transition-all
                      ${!dayInfo.day ? 'bg-transparent cursor-default' : 'hover:bg-gray-50'}
                      ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : ''}
                      ${isToday && !isSelected ? 'bg-blue-50 ring-1 ring-blue-300' : ''}
                    `}
                  >
                    {dayInfo.day && (
                      <>
                        <span className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                          {dayInfo.day}
                        </span>
                        {dayInfo.payments.length > 0 && (
                          <div className={`
                            absolute bottom-1 left-1/2 transform -translate-x-1/2
                            flex gap-0.5
                          `}>
                            {dayInfo.payments.slice(0, 3).map((_, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  status === 'today' ? 'bg-red-500' :
                                  status === 'soon' ? 'bg-amber-500' :
                                  status === 'past' ? 'bg-gray-400' :
                                  'bg-primary-500'
                                }`}
                              />
                            ))}
                            {dayInfo.payments.length > 3 && (
                              <span className="text-[8px] text-gray-500">+{dayInfo.payments.length - 3}</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Due Today</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Due Soon (≤3 days)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary-500" />
                <span>Upcoming</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span>Past</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Details Sidebar */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              {selectedDay ? `Payments on Day ${selectedDay}` : 'All Cards Due Dates'}
            </h3>
            
            <div className="space-y-3">
              {(selectedDay 
                ? cards.filter(c => c.payment_due_day === selectedDay)
                : cards.sort((a, b) => (a.payment_due_day || 0) - (b.payment_due_day || 0))
              ).map(card => (
                <div 
                  key={card.id}
                  className="p-3 rounded-lg border border-gray-200 hover:border-primary-200 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <CreditCard className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{card.card_name}</p>
                      <p className="text-xs text-gray-500">{card.bank}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          Closes: Day {card.closing_day || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          Due: Day {card.payment_due_day || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(card.current_balance)}
                      </p>
                      <p className="text-xs text-gray-500">Balance</p>
                    </div>
                  </div>
                </div>
              ))}

              {cards.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No cards found</p>
                  <p className="text-xs">Add cards in the Cards section</p>
                </div>
              )}

              {selectedDay && cards.filter(c => c.payment_due_day === selectedDay).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Check className="h-12 w-12 mx-auto mb-3 text-green-300" />
                  <p>No payments due</p>
                  <p className="text-xs">No cards have payment due on day {selectedDay}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
