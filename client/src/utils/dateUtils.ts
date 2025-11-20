/**
 * Utilitaires pour la manipulation des dates (Frontend)
 */

/**
 * Calcule les dates de début et fin d'une période de N mois à partir d'une date
 */
export function calculatePeriodDates(startFrom: Date, months: number = 2): { start: Date; end: Date } {
  const start = new Date(startFrom);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  end.setDate(1);
  end.setDate(0); // Dernier jour du mois
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Formate une date en ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtient la date d'aujourd'hui au format YYYY-MM-DD
 */
export function getTodayISO(): string {
  return formatDateISO(new Date());
}



