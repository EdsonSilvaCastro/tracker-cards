/**
 * Calcula a qué ciclo de facturación (billing month/year) pertenece una transacción
 * según la fecha de corte (cutoff_day) de la tarjeta.
 *
 * Si el día de la transacción es <= cutoffDay → pertenece al mes actual.
 * Si es > cutoffDay → pertenece al mes siguiente (la compra cae en el siguiente estado de cuenta).
 */
export function calculateBillingCycle(transactionDate, cutoffDay) {
  const date = new Date(transactionDate);
  const day = date.getDate();
  let month = date.getMonth() + 1; // 1-12
  let year = date.getFullYear();

  if (day > cutoffDay) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return { billingMonth: month, billingYear: year };
}

/**
 * Indica si una fecha cae en la "zona ambigua" post-corte (±windowDays días después del cutoffDay).
 * En esa ventana los bancos pueden cortar 1-2 días tarde, por lo que conviene pedir confirmación.
 */
export function isInAmbiguousZone(transactionDate, cutoffDay, windowDays = 3) {
  const day = new Date(transactionDate).getDate();
  return day >= cutoffDay && day <= cutoffDay + windowDays;
}
