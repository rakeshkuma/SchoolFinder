import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ApiError } from '../../services/http';

export function AdminLoginPage() {
  useDocumentTitle('Administrator login');
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ username: string; password: string }>();

  if (session) return <Navigate to="/admin" replace />;

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setError(null);
    try {
      await login(username, password);
      navigate((location.state as { from?: string } | null)?.from ?? '/admin', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError && e.status === 429 ? 'Too many attempts. Please wait a minute.' : 'Invalid username or password.');
    }
  });

  return (
    <div className="container-page flex justify-center py-16">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-6" noValidate>
        <h1 className="text-xl font-semibold">Administrator login</h1>
        <div>
          <label htmlFor="username" className="label">Username</label>
          <input id="username" autoComplete="username" className="input" {...register('username', { required: 'Enter your username' })} />
          {errors.username && <p className="field-error">{errors.username.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" autoComplete="current-password" className="input" {...register('password', { required: 'Enter your password' })} />
          {errors.password && <p className="field-error">{errors.password.message}</p>}
        </div>
        {error && <p role="alert" className="field-error">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</button>
        <p className="text-xs text-slate-500">Sessions expire after 15 minutes and end when you close this tab.</p>
      </form>
    </div>
  );
}
