import express from 'express';
import authenticateUser from '../middleware/auth.js';
import * as cardsController from '../controllers/cardsController.js';
import * as statementsController from '../controllers/statementsController.js';
import * as paymentsController from '../controllers/paymentsController.js';
import * as transactionsController from '../controllers/transactionsController.js';
import * as monthlyBalancesController from '../controllers/monthlyBalancesController.js';
import * as budgetController from '../controllers/budgetController.js';
import * as savingsController from '../controllers/savingsController.js';
import * as analyticsController from '../controllers/analyticsController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);

// ==================== Credit Cards Routes ====================
router.get('/cards', cardsController.getAllCards);
router.get('/cards/summary', cardsController.getCardSummary);
router.get('/cards/:id', cardsController.getCardById);
router.get('/cards/:id/utilization', cardsController.getUtilizationTrend);
router.post('/cards', cardsController.createCard);
router.put('/cards/:id', cardsController.updateCard);
router.delete('/cards/:id', cardsController.deleteCard);

// ==================== Monthly Balances Routes ====================
router.get('/monthly-balances', monthlyBalancesController.getMonthlyBalances);
router.get('/monthly-balances/overview/:month/:year', monthlyBalancesController.getMonthlyOverview);
router.post('/monthly-balances', monthlyBalancesController.upsertMonthlyBalance);
router.post('/monthly-balances/toggle-paid', monthlyBalancesController.togglePaymentStatus);
router.put('/monthly-balances/:id', monthlyBalancesController.updateMonthlyBalance);
router.delete('/monthly-balances/:id', monthlyBalancesController.deleteMonthlyBalance);

// ==================== Budget Routes ====================
router.get('/budget/:month/:year', budgetController.getMonthlyBudget);
router.post('/budget', budgetController.upsertMonthlyBudget);
router.post('/budget/expense', budgetController.upsertExpense);
router.post('/budget/copy', budgetController.copyBudget);
router.put('/budget/expense/:id', budgetController.updateExpense);
router.delete('/budget/expense/:id', budgetController.deleteExpense);

// ==================== Monthly Statements Routes ====================
router.get('/statements', statementsController.getAllStatements);
router.get('/statements/:id', statementsController.getStatementById);
router.post('/statements', statementsController.createStatement);
router.put('/statements/:id', statementsController.updateStatement);
router.patch('/statements/:id/pay', statementsController.markStatementPaid);
router.delete('/statements/:id', statementsController.deleteStatement);

// ==================== Payment History Routes ====================
router.get('/payments', paymentsController.getAllPayments);
router.get('/payments/stats', paymentsController.getPaymentStats);
router.get('/payments/:id', paymentsController.getPaymentById);
router.post('/payments', paymentsController.createPayment);
router.put('/payments/:id', paymentsController.updatePayment);
router.delete('/payments/:id', paymentsController.deletePayment);

// ==================== Transactions Routes ====================
router.get('/transactions', transactionsController.getAllTransactions);
router.get('/transactions/stats', transactionsController.getTransactionStats);
router.get('/transactions/:id', transactionsController.getTransactionById);
router.post('/transactions', transactionsController.createTransaction);
router.put('/transactions/:id', transactionsController.updateTransaction);
router.delete('/transactions/:id', transactionsController.deleteTransaction);

// ==================== Savings Goals Routes ====================
router.get('/savings', savingsController.getSavingsGoals);
router.get('/savings/summary', savingsController.getSavingsSummary);
router.get('/savings/:id', savingsController.getSavingsGoalById);
router.post('/savings', savingsController.createSavingsGoal);
router.post('/savings/contribution', savingsController.addContribution);
router.put('/savings/:id', savingsController.updateSavingsGoal);
router.delete('/savings/:id', savingsController.deleteSavingsGoal);

// ==================== Analytics Routes ====================
router.get('/analytics/annual/:year', analyticsController.getAnnualSummary);
router.get('/analytics/compare', analyticsController.compareMonths);
router.get('/analytics/trends', analyticsController.getSpendingTrends);

export default router;
