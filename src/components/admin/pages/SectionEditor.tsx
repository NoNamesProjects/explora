/**
 * The per-section edit drawer. Every control is generated from the section
 * type's declared fields, so a new field on a type needs no work here.
 *
 * Edits are held locally and saved explicitly — the admin can abandon a change
 * by closing without saving, and (because saving only writes DRAFT columns) even
 * a saved change stays invisible to visitors until the page is published.
 */
import { useEffect, useState } from 'react';
import { Drawer } from '@/components/admin/ui/Drawer';
import { Spinner } from '@/components/admin/ui/Spinner';
import { useToast } from '@/components/admin/ui/Toast';
import { sectionTypeDef } from '@/content/sectionTypes';
import type { AdminSection } from '@/lib/admin/sectionsApi';
import { FieldControl } from './FieldControl';

const NATURE_NOTE: Record<string, string> = {
  structural:
    'This section’s content comes live from the catalogue, so only the heading and link text are editable here. You can still reorder, hide or remove the whole section.',
  'entity-bound':
    'This section’s content comes from the ship/destination record itself. Edit it on that record; here you control the heading, order and visibility.',
};

export function SectionEditor({
  section, open, onClose, onSave,
}: {
  section: AdminSection | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: number, config: Record<string, unknown>) => Promise<void>;
}) {
  const toast = useToast();
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Re-seed the local buffer whenever a different section is opened.
  useEffect(() => {
    if (section) { setConfig(section.config ?? {}); setDirty(false); }
  }, [section]);

  const def = section ? sectionTypeDef(section.sectionType) : undefined;

  const set = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const save = async () => {
    if (!section) return;
    setSaving(true);
    try {
      await onSave(section.id, config);
      setDirty(false);
      toast.push({ tone: 'success', message: 'Saved as a draft. Publish the page to make it live.' });
    } catch {
      toast.push({ tone: 'error', message: 'Could not save this section.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      title={def?.label ?? section?.sectionType ?? 'Section'}
      subtitle={section ? <span className="font-mono text-[0.7rem]">#{section.slug}</span> : undefined}
      description="Edit this section's content"
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-ink-500">
            {dirty ? 'Unsaved changes' : 'All changes saved as draft'}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="rounded border border-cream-300 px-4 py-2 text-xs font-medium text-ink transition-colors hover:bg-cream-200">
              Close
            </button>
            <button type="button" onClick={save} disabled={saving || !dirty}
              className="btn-primary px-4 py-2 text-[0.7rem] disabled:opacity-40">
              {saving ? <Spinner className="text-cream" /> : 'Save draft'}
            </button>
          </div>
        </div>
      }
    >
      {!section || !def ? (
        <p className="py-10 text-sm text-ink-500">This section type is no longer available in the code.</p>
      ) : (
        <div className="space-y-6">
          {def.description && <p className="text-sm text-ink-500">{def.description}</p>}
          {NATURE_NOTE[def.nature] && (
            <p className="rounded-card border border-accent-gold/30 bg-accent-gold/5 px-3 py-2.5 text-xs text-ink-600">
              {NATURE_NOTE[def.nature]}
            </p>
          )}
          {def.fields.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              value={config[field.key]}
              onChange={(v) => set(field.key, v)}
            />
          ))}
        </div>
      )}
    </Drawer>
  );
}
