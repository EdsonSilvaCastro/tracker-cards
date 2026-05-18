// DEMO MODE — remove this file and revert api.js + AuthContext.jsx when done

export const DEMO_MODE = false;

export const mockCards = [
  { id: 1, card_name: 'Visa Platinum', bank: 'BBVA', color: '#004A97', payment_due_day: 5, closing_day: 28, current_balance: 15200, is_active: true },
  { id: 2, card_name: 'Mastercard Gold', bank: 'Banamex', color: '#EB001B', payment_due_day: 12, closing_day: 5, current_balance: 8750, is_active: true },
  { id: 3, card_name: 'American Express', bank: 'Santander', color: '#EC0000', payment_due_day: 20, closing_day: 13, current_balance: 22100, is_active: true },
];

export const mockCardsData = {
  cards: [
    { card_id: 1, card_name: 'Visa Platinum', bank: 'BBVA', current_balance: 15200, amount_to_pay: 5200, is_paid: false },
    { card_id: 2, card_name: 'Mastercard Gold', bank: 'Banamex', current_balance: 8750, amount_to_pay: 3100, is_paid: true },
    { card_id: 3, card_name: 'American Express', bank: 'Santander', current_balance: 22100, amount_to_pay: 7800, is_paid: false },
  ],
  totals: { total_balance: 46050, total_to_pay: 16100 },
};

export const mockBudgetData = {
  overview: { total_budget: 25000 },
  sections: [
    {
      key: 'living_expenses',
      total_budgeted: 9000,
      total_spent: 7600,
      expenses: [
        { id: 1, expense_name: 'Renta', budgeted_amount: 5000, actual_spent: 5000, status: 'paid', paid_with: 1, auto_created: false },
        { id: 2, expense_name: 'Supermercado', budgeted_amount: 2500, actual_spent: 1800, status: 'partial', paid_with: null, auto_created: false },
        { id: 3, expense_name: 'Gasolina', budgeted_amount: 1000, actual_spent: 800, status: 'pending', paid_with: 2, auto_created: true },
        { id: 4, expense_name: 'Agua y Luz', budgeted_amount: 500, actual_spent: 0, status: 'pending', paid_with: null, auto_created: false },
      ],
    },
    {
      key: 'life_style',
      total_budgeted: 6000,
      total_spent: 5800,
      expenses: [
        { id: 5, expense_name: 'Gimnasio', budgeted_amount: 800, actual_spent: 800, status: 'paid', paid_with: 1, auto_created: false },
        { id: 6, expense_name: 'Restaurantes', budgeted_amount: 2500, actual_spent: 2800, status: 'paid', paid_with: 3, auto_created: false },
        { id: 7, expense_name: 'Spotify & Netflix', budgeted_amount: 400, actual_spent: 400, status: 'paid', paid_with: 2, auto_created: false },
        { id: 8, expense_name: 'Ropa', budgeted_amount: 2300, actual_spent: 1800, status: 'partial', paid_with: null, auto_created: false },
      ],
    },
    {
      key: 'monthly_payments',
      total_budgeted: 5000,
      total_spent: 4800,
      expenses: [
        { id: 9, expense_name: 'Internet', budgeted_amount: 600, actual_spent: 600, status: 'paid', paid_with: 1, auto_created: false },
        { id: 10, expense_name: 'Seguro del Carro', budgeted_amount: 1800, actual_spent: 1800, status: 'paid', paid_with: 2, auto_created: false },
        { id: 11, expense_name: 'Celular', budgeted_amount: 900, actual_spent: 900, status: 'paid', paid_with: 1, auto_created: false },
        { id: 12, expense_name: 'Crédito Personal', budgeted_amount: 1700, actual_spent: 1500, status: 'partial', paid_with: null, auto_created: false },
      ],
    },
    {
      key: 'general_expenses',
      total_budgeted: 5000,
      total_spent: 5900,
      expenses: [
        { id: 13, expense_name: 'Médico', budgeted_amount: 1000, actual_spent: 2400, status: 'paid', paid_with: 3, auto_created: true },
        { id: 14, expense_name: 'Farmacia', budgeted_amount: 500, actual_spent: 320, status: 'paid', paid_with: 1, auto_created: false },
        { id: 15, expense_name: 'Mantenimiento casa', budgeted_amount: 2000, actual_spent: 2200, status: 'paid', paid_with: 2, auto_created: false },
        { id: 16, expense_name: 'Varios', budgeted_amount: 1500, actual_spent: 980, status: 'pending', paid_with: null, auto_created: false },
      ],
    },
  ],
};

export const mockSpendingAnalysis = {
  total_spent_on_cards: 16100,
  total_in_plan: 13400,
  total_out_of_plan: 2700,
  cards_breakdown: [
    { card_id: 1, in_plan: 4100, out_of_plan: 1100, in_plan_percentage: 79 },
    { card_id: 2, in_plan: 5200, out_of_plan: 0, in_plan_percentage: 100 },
    { card_id: 3, in_plan: 4100, out_of_plan: 1600, in_plan_percentage: 72 },
  ],
};

// Map URL patterns to mock responses
export function getMockResponse(url) {
  if (/\/monthly-balances\/overview\/\d+\/\d+/.test(url)) return { data: { data: mockCardsData } };
  if (/\/budget\/\d+\/\d+\/spending-analysis/.test(url)) return { data: { data: mockSpendingAnalysis } };
  if (/\/budget\/\d+\/\d+/.test(url)) return { data: { data: mockBudgetData } };
  if (/\/cards$/.test(url)) return { data: { data: mockCards } };
  return null;
}
