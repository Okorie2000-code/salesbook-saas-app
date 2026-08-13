'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, UserPlus, Users } from 'lucide-react';
import { getBusiness, getTeam, inviteUser, updateBusiness, updateUser, type TeamMember } from '@/services/business';
import type { Business, Role } from '@/types';
import { formatDate } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { toast } from '@/components/ui/Toaster';
import { Avatar } from '@/components/ui/Avatar';
import { ApiError } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('business');
  const [business, setBusiness] = useState<Business | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);

  // Business form state
  const [bizForm, setBizForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [savingBiz, setSavingBiz] = useState(false);

  // Invite form state
  const [invite, setInvite] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'STAFF' as Role });
  const [inviteResult, setInviteResult] = useState<{ user: TeamMember; temporaryPassword: string } | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, t] = await Promise.all([getBusiness(), getTeam()]);
      setBusiness(b);
      setTeam(t);
      setBizForm({ name: b.name, email: b.email ?? '', phone: b.phone ?? '', address: b.address ?? '' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveBusiness = async () => {
    setSavingBiz(true);
    setError('');
    try {
      const updated = await updateBusiness({
        name: bizForm.name,
        email: bizForm.email || undefined,
        phone: bizForm.phone || undefined,
        address: bizForm.address || undefined,
      });
      setBusiness(updated);
      toast.success('Business details updated.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to save business details');
    } finally {
      setSavingBiz(false);
    }
  };

  const handleInvite = async () => {
    setInviting(true);
    setError('');
    try {
      const result = await inviteUser({
        firstName: invite.firstName,
        lastName: invite.lastName,
        email: invite.email,
        phone: invite.phone || undefined,
        role: invite.role as Exclude<Role, 'SUPER_ADMIN'>,
      });
      setInviteResult(result);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to invite user');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: Role) => {
    try {
      await updateUser(memberId, { role });
      toast.success('Team member role updated.');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update role');
    }
  };

  const handleToggleActive = async (member: TeamMember) => {
    try {
      await updateUser(member.id, { isActive: !member.isActive });
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update user');
    }
  };

  if (loading) return <PageLoading label="Loading settings…" />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Manage your business profile and team."
      />

      {error && <Alert tone="danger" title="Something went wrong" onDismiss={() => setError('')}>{error}</Alert>}

      <Tabs
        tabs={[
          { id: 'business', label: 'Business details', icon: <Building2 className="h-4 w-4" aria-hidden="true" /> },
          { id: 'team', label: 'Team', icon: <Users className="h-4 w-4" aria-hidden="true" /> },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'business' && (
        <Card>
          <CardHeader title="Business details" subtitle="Information shown to your team and used on records" />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" required>
                <Input value={bizForm.name} onChange={(e) => setBizForm((f) => ({ ...f, name: e.target.value }))} />
              </Field>
              <Field label="Email">
                <Input type="email" value={bizForm.email} onChange={(e) => setBizForm((f) => ({ ...f, email: e.target.value }))} />
              </Field>
              <Field label="Phone">
                <Input value={bizForm.phone} onChange={(e) => setBizForm((f) => ({ ...f, phone: e.target.value }))} />
              </Field>
              <Field label="Address">
                <Input value={bizForm.address} onChange={(e) => setBizForm((f) => ({ ...f, address: e.target.value }))} />
              </Field>
            </div>
            <div className="mt-5">
              <Button onClick={handleSaveBusiness} loading={savingBiz}>
                Save business details
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {activeTab === 'team' && (
        <Card>
          <CardHeader
            title="Team"
            subtitle={`${team.length} member${team.length === 1 ? '' : 's'}`}
            action={
              (user?.role === 'BUSINESS_OWNER' || user?.role === 'MANAGER') && (
                <Button
                  size="sm"
                  onClick={() => {
                    setInviteResult(null);
                    setInviteOpen(true);
                  }}
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" /> Invite member
                </Button>
              )
            }
          />
          <CardBody className="p-0">
            <div className="divide-y divide-slate-100">
              {team.map((member) => (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={`${member.firstName} ${member.lastName}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {member.firstName} {member.lastName}
                        {member.id === user?.id && <span className="ml-2 text-xs text-slate-400">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-400">{member.email} · joined {formatDate(member.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!member.isActive && <Badge tone="danger">Disabled</Badge>}
                    {member.role === 'BUSINESS_OWNER' ? (
                      <Badge tone="brand">Owner</Badge>
                    ) : (
                      user?.role === 'BUSINESS_OWNER' && (
                        <Select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as Role)}
                          className="w-32 py-1"
                          aria-label={`Role for ${member.firstName} ${member.lastName}`}
                        >
                          <option value="MANAGER">Manager</option>
                          <option value="STAFF">Staff</option>
                        </Select>
                      )
                    )}
                    {user?.role === 'BUSINESS_OWNER' && member.role !== 'BUSINESS_OWNER' && (
                      <Button variant="ghost" size="sm" onClick={() => handleToggleActive(member)}>
                        {member.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a team member"
        footer={
          inviteResult ? (
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} loading={inviting}>
                Send invite
              </Button>
            </>
          )
        }
      >
        {inviteResult ? (
          <div className="rounded-lg bg-warning-50 px-4 py-4 text-sm ring-1 ring-inset ring-warning-200">
            <p className="font-medium text-warning-800">Member added</p>
            <p className="mt-2 text-warning-700">
              Share these login details with <strong>{inviteResult.user.firstName}</strong>. They should change their password after first login.
            </p>
            <div className="mt-3 rounded-lg bg-white p-3 font-mono text-xs text-slate-700">
              <p>Email: {inviteResult.user.email}</p>
              <p>Password: {inviteResult.temporaryPassword}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" required>
                <Input value={invite.firstName} onChange={(e) => setInvite((f) => ({ ...f, firstName: e.target.value }))} />
              </Field>
              <Field label="Last name" required>
                <Input value={invite.lastName} onChange={(e) => setInvite((f) => ({ ...f, lastName: e.target.value }))} />
              </Field>
            </div>
            <Field label="Email" required>
              <Input type="email" value={invite.email} onChange={(e) => setInvite((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Phone">
              <Input value={invite.phone} onChange={(e) => setInvite((f) => ({ ...f, phone: e.target.value }))} />
            </Field>
            <Field label="Role">
              <Select value={invite.role} onChange={(e) => setInvite((f) => ({ ...f, role: e.target.value as Role }))}>
                <option value="MANAGER">Manager — manages sales, products, customers and staff</option>
                <option value="STAFF">Staff — can record sales only</option>
              </Select>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
