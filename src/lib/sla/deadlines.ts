export type DeadlineKind = "internal_first_response" | "legal";

export type Holiday = { day: string };

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function zonedParts(date: Date, timeZone: string): { year: number; month: number; day: number; weekday: number; hour: number; minute: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function isoDate(parts: { year: number; month: number; day: number }): string {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/** Suma días hábiles en la zona indicada. No inventa plazos legales. */
export function addBusinessDays(start: Date, days: number, timeZone: string, holidays: Holiday[]): Date {
  const holidaySet = new Set(holidays.map((item) => item.day));
  let cursor = new Date(start.getTime());
  let remaining = days;
  while (remaining > 0) {
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    const parts = zonedParts(cursor, timeZone);
    const key = isoDate(parts);
    const weekend = parts.weekday === 0 || parts.weekday === 6;
    if (!weekend && !holidaySet.has(key)) remaining -= 1;
  }
  return cursor;
}

export function addCalendarHours(start: Date, hours: number): Date {
  return new Date(start.getTime() + hours * 60 * 60 * 1000);
}

export type DueAssessment = {
  legalDueAt: string | null;
  legalStatus: "pending_validation" | "confirmed" | "none";
  internalDueAt: string | null;
};

/**
 * Un plazo legal solo existe si un humano lo confirmó o si la comunicación trae
 * una fecha ya verificada. El motor no calcula un vencimiento jurídico universal.
 */
export function assessDeadlines(input: {
  receivedAt: Date;
  timeZone: string;
  holidays: Holiday[];
  internalResponseHours: number | null;
  confirmedLegalDueAt: Date | null;
  businessDayMode: boolean;
}): DueAssessment {
  let internalDueAt: string | null = null;
  if (input.internalResponseHours && input.internalResponseHours > 0) {
    const due = input.businessDayMode
      ? addBusinessDays(input.receivedAt, Math.ceil(input.internalResponseHours / 24), input.timeZone, input.holidays)
      : addCalendarHours(input.receivedAt, input.internalResponseHours);
    internalDueAt = due.toISOString();
  }

  if (!input.confirmedLegalDueAt) {
    return { legalDueAt: null, legalStatus: "pending_validation", internalDueAt };
  }

  return {
    legalDueAt: input.confirmedLegalDueAt.toISOString(),
    legalStatus: "confirmed",
    internalDueAt,
  };
}
