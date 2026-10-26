import type { ExamDate } from '../types/api';
import { isFirm, lastDay } from './exams';

/**
 * iCalendar (.ics) files for exam dates, so visitors can add them to their own calendar app with a reminder the day
 * before. Only confirmed, day-precise dates are ever written: a tentative or month-only date must not become a
 * calendar entry or a reminder.
 */
export interface IcsEvent {
  examSlug: string;
  examName: string;
  date: ExamDate;
}

const pad = (n: number) => String(n).padStart(2, '0');
const compact = (iso: string) => iso.replace(/-/g, '');

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** RFC 5545 text escaping. */
function text(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 characters continue on the next line after a space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) parts.push(` ${line.slice(i, i + 74)}`);
  return parts.join('\r\n');
}

export function buildIcs(events: IcsEvent[], now = new Date()): string {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//India School Finder//Exam dates//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const { examSlug, examName, date } of events.filter((e) => isFirm(e.date))) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${examSlug}-${date.cycle.replace(/\s+/g, '_')}-${date.kind}-${compact(date.startsOn)}@indiaschoolfinder`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(date.startsOn)}`,
      `DTEND;VALUE=DATE:${nextDay(lastDay(date))}`,
      `SUMMARY:${text(`${examName}: ${date.label}`)}`,
      `DESCRIPTION:${text(`${date.cycle}. Date from the official notice: ${date.sourceUrl} — dates can change; always check the latest official notice. Added from India School Finder.`)}`,
      `URL:${date.sourceUrl}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${text(`Tomorrow: ${examName} — ${date.label}`)}`,
      'TRIGGER:-P1D',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Starts a download of the calendar file in the browser. */
export function downloadIcs(filename: string, events: IcsEvent[]) {
  const blob = new Blob([buildIcs(events)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
