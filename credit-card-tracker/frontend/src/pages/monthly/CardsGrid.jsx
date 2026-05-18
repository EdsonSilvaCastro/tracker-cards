import React from 'react';
import { CreditCard, Check, X, Edit2 } from 'lucide-react';

export default function CardsGrid({ cards, spendingAnalysis, onTogglePaid, onEditCard, formatCurrency }) {
  const cardBreakdown = spendingAnalysis?.cards_breakdown || [];

  const getCardAnalysis = (cardId) => cardBreakdown.find((c) => c.card_id === cardId);

  return (
    <div>
      <h2 className="text-base font-bold mb-3 font-[var(--font-head)] uppercase tracking-wide">Tarjetas del mes</h2>
      {cards.length === 0 ? (
        <div className="bg-white border-2 border-black shadow-[4px_4px_0_0_#000] p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-3 text-black opacity-20" />
          <p className="text-black/50">No hay tarjetas registradas este mes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map((card) => {
            const analysis = getCardAnalysis(card.card_id);
            const inPlanPct = analysis ? Math.min(analysis.in_plan_percentage, 100) : 0;
            const outOfPlanPct = Math.max(0, 100 - inPlanPct);

            return (
              <div key={card.card_id} className="bg-white border-2 border-black shadow-[4px_4px_0_0_#000] p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-(--color-primary) border-2 border-black">
                      <CreditCard className="h-5 w-5 text-black" />
                    </div>
                    <div>
                      <p className="font-bold text-black">{card.card_name}</p>
                      <p className="text-xs text-black/60">{card.bank}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-bold border-2 border-black ${
                      card.is_paid
                        ? 'bg-green-400 text-black'
                        : 'bg-(--color-primary) text-black'
                    }`}
                  >
                    {card.is_paid ? 'Pagada' : 'Por pagar'}
                  </span>
                </div>

                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-black/50 uppercase font-bold tracking-wide">A pagar</p>
                    <p className="text-lg font-bold text-black">
                      {formatCurrency(card.amount_to_pay)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-black/50 uppercase font-bold tracking-wide">Balance total</p>
                    <p className="text-sm font-medium text-black/70">{formatCurrency(card.current_balance)}</p>
                  </div>
                </div>

                {/* Divided bar: yellow=in_plan, red=out_of_plan */}
                {card.amount_to_pay > 0 && (
                  <div className="mb-3">
                    <div className="h-3 bg-black/10 border border-black overflow-hidden flex">
                      <div
                        className="h-full bg-(--color-primary) transition-all"
                        style={{ width: `${inPlanPct}%` }}
                        title={`En plan: ${inPlanPct.toFixed(0)}%`}
                      />
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${outOfPlanPct}%` }}
                        title={`Fuera de plan: ${outOfPlanPct.toFixed(0)}%`}
                      />
                    </div>
                    {analysis && (
                      <div className="flex justify-between mt-1">
                        <span className="text-xs font-bold text-black/60">
                          En plan {formatCurrency(analysis.in_plan)}
                        </span>
                        <span className="text-xs font-bold text-red-600">
                          Fuera {formatCurrency(analysis.out_of_plan)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => onTogglePaid(card.card_id)}
                    className={`flex-1 py-1.5 text-xs font-bold border-2 border-black transition-all flex items-center justify-center gap-1 shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 ${
                      card.is_paid
                        ? 'bg-green-400 text-black'
                        : 'bg-(--color-primary) text-black'
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
                    className="p-1.5 border-2 border-black bg-white shadow-[2px_2px_0_0_#000] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                    title="Editar balance"
                  >
                    <Edit2 className="h-4 w-4 text-black" />
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
