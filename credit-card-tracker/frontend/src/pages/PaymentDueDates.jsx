import { useState, useEffect } from 'react';
import {
  CreditCard,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui';
import api from '../lib/api';
import { DEMO_MODE, mockCards } from '../lib/mockData';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Returns up-to-2-letter initials for a card name */
function initials(name = '') {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Stable background color per card index */
const CARD_COLORS = ['#ffdb33', '#60C9F8', '#F87171', '#4ADE80', '#C084FC', '#FB923C'];
function cardColor(idx) {
  return CARD_COLORS[idx % CARD_COLORS.length];
}

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
      if (DEMO_MODE) {
        setCards(mockCards);
        setLoading(false);
        return;
      }
      const response = await api.get('/cards');
      setCards(response.data.data || []);
    } catch (err) {
      console.error('Error fetching cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

  // Build color map keyed by card id
  const cardColorMap = Object.fromEntries(cards.map((c, i) => [c.id, cardColor(i)]));

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null, payments: [] });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const paymentsOnDay = cards.filter((card) => card.payment_due_day === day);
      days.push({ day, payments: paymentsOnDay });
    }
    return days;
  };

  const getDayStatus = (day) => {
    const today = new Date();
    const dayDate = new Date(currentYear, currentMonth, day);
    if (dayDate < today && dayDate.toDateString() !== today.toDateString()) return 'past';
    if (dayDate.toDateString() === today.toDateString()) return 'today';
    const daysUntil = Math.ceil((dayDate - today) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 3) return 'soon';
    return 'upcoming';
  };

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const calendarDays = generateCalendarDays();
  const today = new Date();

  // Upcoming payments (next 30 days)
  const upcomingPayments = cards
    .map((card) => {
      let nextPaymentDate = new Date(currentYear, currentMonth, card.payment_due_day);
      if (nextPaymentDate < today) {
        nextPaymentDate = new Date(currentYear, currentMonth + 1, card.payment_due_day);
      }
      const daysUntil = Math.ceil((nextPaymentDate - today) / (1000 * 60 * 60 * 24));
      return { ...card, nextPaymentDate, daysUntil };
    })
    .filter((c) => c.daysUntil <= 30 && c.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  const selectedCards = selectedDay
    ? cards.filter((c) => c.payment_due_day === selectedDay)
    : [...cards].sort((a, b) => (a.payment_due_day || 0) - (b.payment_due_day || 0));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-black border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b-2 border-black pb-4">
        <h1 className="font-head text-2xl font-black">Payment Due Dates</h1>
        <p className="text-sm text-gray-600 font-bold mt-1">Track when your credit card payments are due</p>
      </div>

      {/* Upcoming Payments Alert */}
      {upcomingPayments.length > 0 && (
        <div className="border-2 border-black bg-(--color-primary) shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b-2 border-black">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <h3 className="font-head font-bold text-base">Upcoming Payments</h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {upcomingPayments.slice(0, 6).map((card) => (
              <div
                key={card.id}
                className={`flex items-center justify-between p-3 border-2 border-black ${
                  card.daysUntil === 0
                    ? 'bg-red-400'
                    : card.daysUntil <= 3
                    ? 'bg-orange-300'
                    : 'bg-white'
                }`}
              >
                <div>
                  <p className="font-bold text-sm">{card.card_name}</p>
                  <p className="text-xs">{card.bank}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black">
                    {card.daysUntil === 0 ? 'HOY!' : card.daysUntil === 1 ? 'Mañana' : `${card.daysUntil}d`}
                  </p>
                  <p className="text-xs font-bold">Day {card.payment_due_day}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Calendar + Card List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compact Calendar */}
        <Card>
          <CardContent className="p-0">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black bg-(--color-primary)">
              <button
                onClick={goToPreviousMonth}
                className="p-1.5 border-2 border-black bg-white hover:bg-(--color-accent) transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="font-head text-base font-black">
                {MONTHS[currentMonth]} {currentYear}
              </h2>
              <button
                onClick={goToNextMonth}
                className="p-1.5 border-2 border-black bg-white hover:bg-(--color-accent) transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b-2 border-black">
              {DAYS_OF_WEEK.map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] font-black py-2 border-r-2 border-black last:border-r-0"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((dayInfo, index) => {
                const isSelected = selectedDay === dayInfo.day;
                const isToday =
                  dayInfo.day &&
                  today.getDate() === dayInfo.day &&
                  today.getMonth() === currentMonth &&
                  today.getFullYear() === currentYear;
                const hasPayments = dayInfo.payments.length > 0;
                const isLastInRow = (index + 1) % 7 === 0;

                return (
                  <button
                    key={index}
                    onClick={() => dayInfo.day && setSelectedDay(isSelected ? null : dayInfo.day)}
                    disabled={!dayInfo.day}
                    className={`
                      relative flex flex-col items-center pt-1 pb-2 min-h-[52px] transition-colors
                      border-b-2 border-black ${isLastInRow ? '' : 'border-r-2'}
                      ${!dayInfo.day ? 'bg-gray-50 cursor-default' : 'cursor-pointer'}
                      ${isSelected ? 'bg-black text-white' : ''}
                      ${isToday && !isSelected ? 'bg-(--color-primary)' : ''}
                      ${!isSelected && !isToday && dayInfo.day ? 'hover:bg-(--color-primary)/30' : ''}
                    `}
                  >
                    {dayInfo.day && (
                      <>
                        <span className={`text-xs font-black leading-tight ${isSelected ? 'text-white' : ''}`}>
                          {dayInfo.day}
                        </span>
                        {hasPayments && (
                          <div className="flex flex-wrap justify-center gap-px mt-0.5 px-0.5">
                            {dayInfo.payments.slice(0, 2).map((card) => (
                              <span
                                key={card.id}
                                title={card.card_name}
                                style={{
                                  backgroundColor: isSelected ? '#fff' : cardColorMap[card.id],
                                }}
                                className="text-[7px] font-black px-0.5 border border-black leading-tight"
                              >
                                {initials(card.card_name)}
                              </span>
                            ))}
                            {dayInfo.payments.length > 2 && (
                              <span className={`text-[7px] font-black leading-tight ${isSelected ? 'text-white' : ''}`}>
                                +{dayInfo.payments.length - 2}
                              </span>
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
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 border-t-2 border-black text-[10px] font-bold">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-black bg-(--color-primary)" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-black bg-black" />
                <span>Selected</span>
              </div>
              {cards.slice(0, 4).map((card) => (
                <div key={card.id} className="flex items-center gap-1">
                  <div
                    className="w-4 h-3 border border-black flex items-center justify-center text-[6px] font-black"
                    style={{ backgroundColor: cardColorMap[card.id] }}
                  >
                    {initials(card.card_name)}
                  </div>
                  <span className="truncate max-w-[60px]">{card.card_name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card Details Panel */}
        <Card>
          <CardContent className="p-0">
            {/* Panel header */}
            <div className="px-4 py-3 border-b-2 border-black bg-(--color-cream) flex items-center justify-between">
              <h3 className="font-head font-bold">
                {selectedDay ? `Payments — Day ${selectedDay}` : 'All Cards'}
              </h3>
              {selectedDay && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-xs font-bold border-2 border-black px-2 py-0.5 hover:bg-(--color-primary) transition-colors"
                >
                  Show all
                </button>
              )}
            </div>

            <div className="divide-y-2 divide-black">
              {selectedCards.map((card) => (
                <div key={card.id} className="flex items-start gap-3 p-4 hover:bg-(--color-primary)/10 transition-colors">
                  <div
                    className="w-10 h-10 flex-shrink-0 border-2 border-black flex items-center justify-center font-head font-black text-xs"
                    style={{ backgroundColor: cardColorMap[card.id] }}
                  >
                    {initials(card.card_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{card.card_name}</p>
                    <p className="text-xs text-gray-600">{card.bank}</p>
                    <div className="flex flex-wrap gap-x-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs font-bold">
                        <Clock className="h-3 w-3" />
                        Closes: Day {card.closing_day || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-bold">
                        <CalendarIcon className="h-3 w-3" />
                        Due: Day {card.payment_due_day || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black">{formatCurrency(card.current_balance)}</p>
                    <p className="text-xs text-gray-500">Balance</p>
                  </div>
                </div>
              ))}

              {cards.length === 0 && (
                <div className="text-center py-12 px-4">
                  <CreditCard className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-bold">No cards found</p>
                  <p className="text-xs text-gray-500">Add cards in the Cards section</p>
                </div>
              )}

              {selectedDay && selectedCards.length === 0 && (
                <div className="text-center py-12 px-4">
                  <CalendarIcon className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-bold">No payments due on day {selectedDay}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
