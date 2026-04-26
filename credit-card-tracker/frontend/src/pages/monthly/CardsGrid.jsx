import React from 'react';
import { CreditCard, Check, X, Edit2 } from 'lucide-react';

export default function CardsGrid({ cards, spendingAnalysis, onTogglePaid, onEditCard, formatCurrency }) {
  const cardBreakdown = spendingAnalysis?.cards_breakdown || [];

  const getCardAnalysis = (cardId) => cardBreakdown.find((c) => c.card_id === cardId);

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Tarjetas del mes</h2>
      {cards.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">No hay tarjetas registradas este mes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((card) => {
            const analysis = getCardAnalysis(card.card_id);
            const inPlanPct = analysis ? Math.min(analysis.in_plan_percentage, 100) : 0;
            const outOfPlanPct = Math.max(0, 100 - inPlanPct);

            return (
              <div key={card.card_id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{card.card_name}</p>
                      <p className="text-xs text-gray-500">{card.bank}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                      card.is_paid
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {card.is_paid ? 'Pagada' : 'Por pagar'}
                  </span>
                </div>

                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-gray-400">A pagar</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCurrency(card.amount_to_pay)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Balance total</p>
                    <p className="text-sm text-gray-600">{formatCurrency(card.current_balance)}</p>
                  </div>
                </div>

                {/* Divided bar: blue=in_plan, red=out_of_plan */}
                {card.amount_to_pay > 0 && (
                  <div className="mb-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${inPlanPct}%` }}
                        title={`En plan: ${inPlanPct.toFixed(0)}%`}
                      />
                      <div
                        className="h-full bg-red-400 transition-all"
                        style={{ width: `${outOfPlanPct}%` }}
                        title={`Fuera de plan: ${outOfPlanPct.toFixed(0)}%`}
                      />
                    </div>
                    {analysis && (
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-blue-500">
                          En plan {formatCurrency(analysis.in_plan)}
                        </span>
                        <span className="text-xs text-red-400">
                          Fuera {formatCurrency(analysis.out_of_plan)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => onTogglePaid(card.card_id)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
                      card.is_paid
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {card.is_paid ? (
                      <><Check className="h-3.5 w-3.5" /> Pagada</>
                    ) : (
                      <><X className="h-3.5 w-3.5" /> Marcar pagada</>
                    )}
                  </button>
                  <button
                    onClick={() => onEditCard(card)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar balance"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
