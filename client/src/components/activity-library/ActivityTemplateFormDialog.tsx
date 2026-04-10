import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2 } from 'lucide-react';
import { activityAPI } from '../../api';
import type { ActivityTemplate } from './activityTypes';
import { DIFFICULTY_OPTIONS, FORM_DOMAIN_OPTIONS } from './activityTypes';

type Props = {
  /** When mounted, dialog is shown; parent unmounts when closed. */
  editing: ActivityTemplate | null;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  name: string;
  domain: (typeof FORM_DOMAIN_OPTIONS)[number];
  instructions: string;
  objective: string;
  procedure: string;
  notes: string;
  materials: string;
  frequency: string;
  difficulty: (typeof DIFFICULTY_OPTIONS)[number];
  parentInvolvement: boolean;
};

function buildInitialForm(editing: ActivityTemplate | null): FormState {
  const domain = FORM_DOMAIN_OPTIONS.includes(editing?.domain as never)
    ? (editing!.domain as (typeof FORM_DOMAIN_OPTIONS)[number])
    : 'Speech';
  const difficulty = DIFFICULTY_OPTIONS.includes(editing?.difficulty as never)
    ? (editing!.difficulty as (typeof DIFFICULTY_OPTIONS)[number])
    : 'Medium';
  return {
    name: editing?.name ?? '',
    domain,
    instructions: editing?.instructions ?? '',
    objective: editing?.objective ?? '',
    procedure: editing?.procedure ?? '',
    notes: editing?.notes ?? '',
    materials: editing?.materials ?? '',
    frequency: editing?.frequency ?? '',
    difficulty,
    parentInvolvement: Boolean(editing?.parentInvolvement),
  };
}

type BootState = { form: FormState; optionalOpen: boolean };

export function ActivityTemplateFormDialog({ editing, onClose, onSaved }: Props) {
  const [{ form, optionalOpen }, setBoot] = useState<BootState>(() => {
    const f = buildInitialForm(editing);
    return {
      form: f,
      optionalOpen: Boolean(f.objective?.trim() || f.procedure?.trim() || f.notes?.trim()),
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (partial: Partial<FormState>) =>
    setBoot((b) => ({ ...b, form: { ...b.form, ...partial } }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Activity name is required');
      return;
    }
    if (!form.instructions.trim() && !form.objective.trim() && !form.procedure.trim()) {
      setError('Provide at least one of: instructions, objective, or procedure');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const payload = {
        name: form.name.trim(),
        domain: form.domain,
        instructions: form.instructions.trim(),
        objective: form.objective.trim(),
        procedure: form.procedure.trim(),
        notes: form.notes.trim(),
        materials: form.materials.trim(),
        frequency: form.frequency.trim(),
        difficulty: form.difficulty,
        parentInvolvement: form.parentInvolvement,
      };
      if (editing?._id) {
        await activityAPI.updateTemplate(editing._id, payload);
      } else {
        await activityAPI.createTemplate(payload);
      }
      onSaved();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Failed to save activity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      modal
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white sm:max-w-lg"
        /** Keep dropdowns usable; dialog still closes via overlay/Escape/Cancel */
        onPointerDownOutside={(e) => {
          const el = e.target as HTMLElement | null;
          if (el?.closest?.('[data-slot="select-content"]')) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          const el = e.target as HTMLElement | null;
          if (el?.closest?.('[data-slot="select-content"]')) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-sky-900">{editing ? 'Edit activity' : 'New activity'}</DialogTitle>
        </DialogHeader>
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        ) : null}
        <div className="grid gap-4 py-2">
          <div className="space-y-1">
            <Label>Activity name</Label>
            <Input
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="border-slate-200 bg-white"
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label>Domain</Label>
            <Select value={form.domain} onValueChange={(v) => patch({ domain: v as FormState['domain'] })}>
              <SelectTrigger className="border-slate-200 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className="z-[1100]"
                position="popper"
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                {FORM_DOMAIN_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Instructions</Label>
            <Textarea
              rows={5}
              value={form.instructions}
              onChange={(e) => patch({ instructions: e.target.value })}
              className="border-slate-200 bg-white"
              placeholder="How to run the activity — what to do, cues, and success criteria"
            />
          </div>
          <div className="space-y-1">
            <Label>Materials</Label>
            <Textarea
              rows={2}
              value={form.materials}
              onChange={(e) => patch({ materials: e.target.value })}
              className="border-slate-200 bg-white"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Frequency</Label>
              <Input
                value={form.frequency}
                onChange={(e) => patch({ frequency: e.target.value })}
                placeholder="e.g. daily, 3x/week"
                className="border-slate-200 bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v) => patch({ difficulty: v as FormState['difficulty'] })}>
                <SelectTrigger className="border-slate-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className="z-[1100]"
                  position="popper"
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
            <Label className="cursor-pointer">Parent involvement</Label>
            <Switch checked={form.parentInvolvement} onCheckedChange={(v) => patch({ parentInvolvement: v })} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50/40">
            <Button
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-100/80"
              onClick={() => setBoot((b) => ({ ...b, optionalOpen: !b.optionalOpen }))}
            >
              {optionalOpen ? '▼' : '▶'} Optional structured fields
              <span className="ml-2 text-xs font-normal text-slate-500">(objective, procedure, notes)</span>
            </Button>
            {optionalOpen ? (
              <div className="grid gap-4 border-t border-slate-200 p-3 pt-3">
                <div className="space-y-1">
                  <Label>Objective</Label>
                  <Textarea
                    rows={2}
                    value={form.objective}
                    onChange={(e) => patch({ objective: e.target.value })}
                    className="border-slate-200 bg-white"
                    placeholder="What the child should achieve"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Procedure</Label>
                  <Textarea
                    rows={3}
                    value={form.procedure}
                    onChange={(e) => patch({ procedure: e.target.value })}
                    className="border-slate-200 bg-white"
                    placeholder="Step-by-step details"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => patch({ notes: e.target.value })}
                    className="border-slate-200 bg-white"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" className="bg-sky-600 hover:bg-sky-700" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
