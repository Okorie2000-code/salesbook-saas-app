import { AuthShell } from '@/components/layout/AuthShell';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your business workspace">
      <LoginForm />
    </AuthShell>
  );
}
