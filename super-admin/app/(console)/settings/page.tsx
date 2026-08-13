'use client';

import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { getSettings, updateSettings } from '@/services/admin';
import type { PlatformSettings } from '@/types';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Input,
  PageHeader,
  PageLoading,
} from '@/components/ui';
import { toast } from '@/components/Toaster';
import { ApiError } from '@/services/api';

/**
 * Platform settings — simple key/value configuration stored in the database.
 * The Super Admin can add new keys here and they persist immediately.
 */
export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSettings(await getSettings());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setValue = (key: string, value: string) =>
    setSettings((list) => list.map((s) => (s.key === key ? { ...s, value } : s)));

  const addKey = () => {
    const key = window.prompt('New setting key (e.g. MAINTENANCE_MODE):');
    if (!key) return;
    const upper = key.trim().toUpperCase();
    if (!upper) return;
    if (settings.some((s) => s.key === upper)) {
      toast.error('That key already exists');
      return;
    }
    setSettings((list) => [...list, { key: upper, value: '' }]);
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    setSettings((list) => list.filter((s) => s.key !== removeTarget));
    setRemoveTarget(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateSettings(settings.map((s) => ({ key: s.key, value: s.value })));
      toast.success('Settings saved.');
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoading label="Loading settings…" />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Platform settings"
        description="Key/value configuration stored in the database — useful for flags like maintenance mode or support contact details."
        actions={
          <>
            <Button variant="secondary" onClick={addKey}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add key
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Save settings
            </Button>
          </>
        }
      />

      {error && <Alert tone="danger" title="Something went wrong" onDismiss={() => setError('')}>{error}</Alert>}

      <Card>
        <CardHeader title="Settings" subtitle={`${settings.length} setting${settings.length === 1 ? '' : 's'}`} />
        {settings.length === 0 ? (
          <CardBody>
            <div className="flex flex-col items-center py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <KeyRound className="h-6 w-6" aria-hidden="true" />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-700">No settings yet</p>
              <p className="mt-1 text-sm text-slate-500">Use “Add key” to create the first one.</p>
            </div>
          </CardBody>
        ) : (
          <CardBody className="p-0">
            <div className="divide-y divide-slate-100">
              {settings.map((s) => (
                <div key={s.key} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-3">
                  <span className="w-48 shrink-0 font-mono text-xs font-medium text-slate-700">{s.key}</span>
                  <Input
                    className="flex-1"
                    value={String(s.value ?? '')}
                    onChange={(e) => setValue(s.key, e.target.value)}
                    aria-label={`Value for ${s.key}`}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setRemoveTarget(s.key)} aria-label={`Remove ${s.key}`}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardBody>
        )}
      </Card>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove setting"
        description={removeTarget ? `Remove setting "${removeTarget}"? This cannot be undone.` : undefined}
        confirmText="Remove"
        danger
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  );
}
