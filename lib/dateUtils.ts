/**
 * All date/time utilities use Indochina Time (ICT, Asia/Bangkok, UTC+7)
 * Use these everywhere instead of raw Date methods for consistent timezone display.
 */

const ICT = 'Asia/Bangkok'

/** Get today's date (YYYY-MM-DD) in Bangkok time */
export function getTodayICT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ICT })
}

/** Get tomorrow's date (YYYY-MM-DD) in Bangkok time */
export function getTomorrowICT(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
  return tomorrow.toLocaleDateString('en-CA', { timeZone: ICT })
}

/** Get date N days ago in Bangkok (for filtering) */
export function daysAgoICT(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

/** Format date as DD/MM/YYYY (en-GB style) in ICT */
export function formatDateICT(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-GB', { timeZone: ICT })
}

/** Format date as Thai style (dd mmm yyyy) in ICT */
export function formatDateThaiICT(date: Date | string): string {
  return new Date(date).toLocaleDateString('th-TH', { timeZone: ICT, day: '2-digit', month: 'short', year: 'numeric' })
}

/** Format date+time short (dd mmm, HH:mm) in ICT */
export function formatDateTimeICT(date: Date | string): string {
  return new Date(date).toLocaleString('th-TH', {
    timeZone: ICT,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Format date only short (dd mmm) in ICT */
export function formatDateShortICT(date: Date | string): string {
  return new Date(date).toLocaleDateString('th-TH', {
    timeZone: ICT,
    day: '2-digit',
    month: 'short',
  })
}

/** Format weekday short (Mon, Tue...) in ICT - for chart labels */
export function formatWeekdayICT(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    timeZone: ICT,
    weekday: 'short',
  })
}

/** Get YYYY-MM-DD for a date in ICT (for date comparisons) */
export function toDateStringICT(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-CA', { timeZone: ICT })
}

/** Format full datetime for LINE/logs in ICT */
export function formatDateTimeFullICT(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    timeZone: ICT,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' ICT'
}
