import { savedSchools, useLocalList, type SchoolRef } from '../../hooks/usePersonal';
import { Icon } from '../common/Icon';

/** Saves a school in this browser (no account needed; accounts will sync these later). */
export function SaveButton({ school, withLabel = false }: { school: SchoolRef; withLabel?: boolean }) {
  const saved = useLocalList(savedSchools).some((s) => s.id === school.id);
  const label = saved ? `Remove ${school.name} from saved schools` : `Save ${school.name}`;
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={withLabel ? undefined : label}
      title={label}
      onClick={() => (saved ? savedSchools.remove(school) : savedSchools.add(school))}
      className={withLabel
        ? `btn-secondary rounded-full ${saved ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : ''}`
        : `flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-inset transition ${saved ? 'bg-rose-50 text-rose-600 ring-rose-200' : 'bg-white text-slate-500 ring-slate-200 hover:text-rose-600'}`}
    >
      <Icon name="heart" className="h-4 w-4" fill={saved ? 'currentColor' : 'none'} />
      {withLabel && (saved ? 'Saved' : 'Save')}
    </button>
  );
}
