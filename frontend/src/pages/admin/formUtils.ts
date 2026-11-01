import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '../../services/http';
import type { ImagePermission } from '../../types/api';

/** Empty inputs become null ("unknown"), never 0 or "". */
export function blankToNull<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).map(([k, v]) => [k, v === '' || (typeof v === 'number' && Number.isNaN(v)) ? null : v]),
  ) as T;
}

/** Number inputs registered with valueAsNumber yield NaN when empty; normalise to null. */
export const optionalNumber = { setValueAs: (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v)) };

/** Copies server-side field errors onto the matching form fields; returns the top-level message. */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>): string {
  if (error instanceof ApiError) {
    error.fieldErrors.forEach((f) => setError(f.field as Path<T>, { type: 'server', message: f.message }));
    return error.message;
  }
  return 'Something went wrong.';
}

export function currentAcademicYear(today = new Date()): string {
  const start = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export const permissionLabel: Record<ImagePermission, string> = {
  PUBLIC_DOMAIN: 'Public domain / CC0',
  OPEN_LICENCE: 'Open licence (CC BY, CC BY-SA …)',
  WRITTEN_PERMISSION: 'Written permission from the school',
  PURCHASED_LICENCE: 'Purchased stock licence',
  OWN_WORK: 'Our own work / generated illustration',
  PENDING: 'Pending — store but do not publish',
  REVOKED: 'Revoked — do not publish',
};
