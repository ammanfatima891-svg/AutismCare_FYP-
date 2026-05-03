import { useEffect, useMemo, useState } from 'react';
import { labTestsAPI } from '../../api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

type LabTestRow = {
  _id: string;
  test_name: string;
  category: string;
  description?: string;
  price?: number;
  duration?: string;
};

const CATEGORIES = [
  'audiology',
  'pathology',
  'genetics',
  'imaging',
  'neurology',
  'behavioral',
  'other',
];

const EMPTY_FORM = {
  test_name: '',
  category: 'audiology',
  description: '',
  price: '',
  duration: '',
};

export function LabMyTests() {
  const [rows, setRows] = useState<LabTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const title = useMemo(() => (editId ? 'Edit Test' : 'Add Test'), [editId]);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await labTestsAPI.getMyTests();
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (e: any) {
      const msg =
        e.response?.data?.message ||
        e.message ||
        'Failed to load your tests. Please check server connection and approval status.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setFormError('');
  };

  const onSave = async () => {
    if (!form.test_name.trim() || !form.category.trim()) return;
    try {
      setSaving(true);
      setFormError('');
      setError('');
      const payload = {
        test_name: form.test_name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        price: form.price ? Number(form.price) : 0,
        duration: form.duration.trim(),
      };
      if (editId) await labTestsAPI.update(editId, payload);
      else await labTestsAPI.create(payload);
      await load();
      setOpen(false);
      resetForm();
    } catch (e: any) {
      const msg = e.response?.data?.message || e.message || 'Failed to save test';
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  };

  const onEdit = (row: LabTestRow) => {
    setEditId(row._id);
    setForm({
      test_name: row.test_name || '',
      category: row.category || 'audiology',
      description: row.description || '',
      price: row.price != null ? String(row.price) : '',
      duration: row.duration || '',
    });
    setOpen(true);
  };

  const onDelete = async (id: string) => {
    const confirmDelete = window.confirm('Delete this test?');
    if (!confirmDelete) return;
    try {
      setDeletingId(id);
      setError('');
      await labTestsAPI.remove(id);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to delete test');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Tests</h2>
          <p className="text-sm text-muted-foreground">Manage your lab test catalog</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Test
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading tests...
        </div>
      ) : rows.length === 0 ? (
        <Card className="border shadow-sm bg-card">
          <CardContent className="py-10 text-center text-muted-foreground">No tests found. Add your first test.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rows.map((row) => (
            <Card key={row._id} className="border shadow-sm bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{row.test_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {row.duration || 'No duration'} {row.price != null ? `· Rs ${row.price}` : ''}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {row.category}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {row.description ? <p className="text-sm text-foreground mb-3">{row.description}</p> : null}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(row)}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(row._id)}
                    disabled={deletingId === row._id}
                  >
                    {deletingId === row._id ? (
                      <>
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            setOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b px-6 py-4 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Define test details for your catalog.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(90vh-10.5rem)] min-h-0 overflow-y-auto overscroll-contain px-6 py-4">
            <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Test Name</label>
                    <input
                      className="mt-1 w-full rounded-md border bg-card px-3 py-2 text-sm"
                      autoFocus
                      value={form.test_name}
                      onChange={(e) => setForm((p) => ({ ...p, test_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      className="mt-1 w-full rounded-md border bg-card px-3 py-2 text-sm"
                      value={form.category}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    >
                      {CATEGORIES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      rows={4}
                      className="mt-1 w-full rounded-md border bg-card px-3 py-2 text-sm"
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium">Price</label>
                      <input
                        type="number"
                        min="0"
                        className="mt-1 w-full rounded-md border bg-card px-3 py-2 text-sm"
                        value={form.price}
                        onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Duration</label>
                      <input
                        className="mt-1 w-full rounded-md border bg-card px-3 py-2 text-sm"
                        value={form.duration}
                        onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                        placeholder="e.g. 30 mins"
                      />
                    </div>
                  </div>
                </div>
                {formError ? <p className="mt-3 text-sm text-destructive">{formError}</p> : null}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void onSave()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
