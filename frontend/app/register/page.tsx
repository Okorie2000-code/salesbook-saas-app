import { AuthShell } from '@/components/layout/AuthShell';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" subtitle="Start your 14-day free trial — no card required">
      <RegisterForm />
    </AuthShell>
  );
}
