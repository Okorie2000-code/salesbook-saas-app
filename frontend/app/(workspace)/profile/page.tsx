'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, User } from 'lucide-react';
import { changePassword, updateProfile } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { toast } from '@/components/ui/Toaster';
import { Avatar } from '@/components/ui/Avatar';
import { ApiError } from '@/services/api';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passError, setPassError] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone || undefined });
      await refreshUser();
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPassError('');
    if (passwords.next.length < 8) {
      setPassError('New password must be at least 8 characters');
      return;
    }
    if (passwords.next !== passwords.confirm) {
      setPassError('New passwords do not match');
      return;
    }
    setSavingPass(true);
    try {
      const result = await changePassword(passwords.current, passwords.next);
      toast.success(result.message);
      setPasswords({ current: '', next: '', confirm: '' });
      // The backend revoked our refresh token — send the user to login
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setPassError(err instanceof ApiError ? err.message : 'Unable to change password');
    } finally {
      setSavingPass(false);
    }
  };

  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <div className="space-y-5">
      <PageHeader title="Profile" description="Your personal details and account security." />

      {/* Identity summary */}
      <Card>
        <CardBody className="flex flex-wrap items-center gap-4">
          <Avatar name={fullName} className="h-14 w-14 text-base" />
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">{fullName}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
          {user && <Badge tone="brand" className="ml-auto">{user.role}</Badge>}
        </CardBody>
      </Card>

      {/* Personal details */}
      <Card>
        <CardHeader
          title="Personal details"
          subtitle="Your name and contact information"
          action={<User className="h-4 w-4 text-slate-400" aria-hidden="true" />}
        />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <Input value={profile.firstName} onChange={(e) => setProfile((f) => ({ ...f, firstName: e.target.value }))} />
            </Field>
            <Field label="Last name" required>
              <Input value={profile.lastName} onChange={(e) => setProfile((f) => ({ ...f, lastName: e.target.value }))} />
            </Field>
            <Field label="Phone">
              <Input value={profile.phone} onChange={(e) => setProfile((f) => ({ ...f, phone: e.target.value }))} />
            </Field>
            <Field label="Email">
              <Input value={user?.email ?? ''} disabled />
            </Field>
          </div>
          <div className="mt-5">
            <Button onClick={handleSaveProfile} loading={savingProfile}>
              Save profile
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader
          title="Change password"
          subtitle="You'll be logged out after changing it"
          action={<KeyRound className="h-4 w-4 text-slate-400" aria-hidden="true" />}
        />
        <CardBody>
          {passError && <Alert tone="danger" className="mb-4">{passError}</Alert>}
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Current password" required>
              <Input
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords((f) => ({ ...f, current: e.target.value }))}
                autoComplete="current-password"
              />
            </Field>
            <Field label="New password" required hint="At least 8 characters">
              <Input
                type="password"
                value={passwords.next}
                onChange={(e) => setPasswords((f) => ({ ...f, next: e.target.value }))}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password" required>
              <Input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((f) => ({ ...f, confirm: e.target.value }))}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <div className="mt-5">
            <Button onClick={handleChangePassword} loading={savingPass} variant="secondary">
              Change password
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
