import { AuthShell } from '@/components/layout/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a link to set a new password">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
