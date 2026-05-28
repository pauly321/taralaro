import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Dribbble,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PreferredSport } from '@/lib/auth';

type AuthMode = 'login' | 'register';
type RegisterRole = 'player' | 'organizer';

const quickAccounts = [
  {
    label: 'Player Access',
    email: 'player@taralaro.local',
    password: 'PlayerPass123!',
    accent: '#00B4A6',
  },
  {
    label: 'Organizer Access',
    email: 'organizer@taralaro.local',
    password: 'OrganizerPass123!',
    accent: '#F4722B',
  },
  {
    label: 'Admin Access',
    email: 'admin@taralaro.local',
    password: 'AdminPass123!',
    accent: '#F5EFE0',
  },
];

const valueProps = [
  {
    icon: ShieldCheck,
    title: 'MySQL-Backed Login',
    description: 'Credentials now validate against real records in the `users` table.',
  },
  {
    icon: Trophy,
    title: 'bcrypt Hashing',
    description: 'New accounts hash passwords before insert, so plain text never lands in MySQL.',
  },
  {
    icon: Users,
    title: 'JWT Session Flow',
    description: 'Successful login and registration return a signed access token for protected routes.',
  },
];

const inputStyle: React.CSSProperties = {
  backgroundColor: 'rgba(245, 239, 224, 0.06)',
  borderColor: 'rgba(245, 239, 224, 0.14)',
  color: '#F5EFE0',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const labelStyle: React.CSSProperties = {
  color: 'rgba(245, 239, 224, 0.5)',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};

const initialRegisterForm = {
  email: '',
  password: '',
  confirmPassword: '',
  username: '',
  displayName: '',
  city: '',
  barangay: '',
  preferredSport: 'basketball' as PreferredSport,
  role: 'player' as RegisterRole,
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('organizer@taralaro.local');
  const [password, setPassword] = useState('OrganizerPass123!');
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  const formTitle = useMemo(
    () => (mode === 'login' ? 'Welcome back.' : 'Create your account.'),
    [mode]
  );

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const updateRegisterForm = <K extends keyof typeof initialRegisterForm>(key: K, value: (typeof initialRegisterForm)[K]) => {
    setRegisterForm((current) => ({ ...current, [key]: value }));
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setSuccess('');
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        email: registerForm.email,
        password: registerForm.password,
        username: registerForm.username,
        displayName: registerForm.displayName,
        city: registerForm.city,
        barangay: registerForm.barangay,
        preferredSport: registerForm.preferredSport,
        role: registerForm.role,
      });
      setSuccess('Account created and signed in successfully.');
      navigate(from, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSignIn = async (account: (typeof quickAccounts)[number]) => {
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await login({
        email: account.email,
        password: account.password,
      });
      navigate(from, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(0,180,166,0.22) 0%, rgba(0,180,166,0) 30%), radial-gradient(circle at bottom right, rgba(244,114,43,0.24) 0%, rgba(244,114,43,0) 32%), linear-gradient(145deg, #08121D 0%, #0D1B2A 48%, #10263D 100%)',
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div
          className="absolute -left-16 top-16 h-52 w-52 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(244, 114, 43, 0.22)' }}
        />
        <div
          className="absolute right-0 top-1/4 h-72 w-72 rounded-full blur-3xl"
          style={{ backgroundColor: 'rgba(0, 180, 166, 0.18)' }}
        />
        <div
          className="absolute inset-x-0 top-0 h-full"
          style={{
            backgroundImage:
              'linear-gradient(rgba(245,239,224,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(245,239,224,0.04) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0.2))',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-5 py-10 lg:flex-row lg:items-center lg:px-8">
        <section className="w-full max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border px-4 py-2" style={{ borderColor: 'rgba(245, 239, 224, 0.12)', backgroundColor: 'rgba(245, 239, 224, 0.05)' }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ backgroundColor: '#F4722B' }}>
              <Dribbble size={18} color="#fff" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em]" style={{ color: 'rgba(245, 239, 224, 0.55)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Tara Laro Access
              </p>
              <p className="text-sm font-semibold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Real database authentication enabled
              </p>
            </div>
          </div>

          <div className="max-w-xl space-y-5">
            <h1
              className="text-4xl font-black leading-none sm:text-5xl lg:text-6xl"
              style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: '-0.04em' }}
            >
              Secure entry before the first whistle.
            </h1>
            <p
              className="max-w-lg text-base leading-7 sm:text-lg"
              style={{ color: 'rgba(245, 239, 224, 0.68)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Login and registration now go through the backend, store bcrypt password hashes in MySQL, and return JWT access tokens for protected app flow.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {valueProps.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-[28px] border p-5"
                style={{
                  backgroundColor: 'rgba(8, 18, 29, 0.72)',
                  borderColor: 'rgba(245, 239, 224, 0.1)',
                  boxShadow: '0 20px 60px rgba(3, 9, 15, 0.28)',
                }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(245, 239, 224, 0.08)' }}>
                  <Icon size={20} color="#F4722B" />
                </div>
                <h2 className="mb-2 text-lg font-black" style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {title}
                </h2>
                <p className="text-sm leading-6" style={{ color: 'rgba(245, 239, 224, 0.58)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-[28px] border p-4" style={{ background: 'linear-gradient(135deg, rgba(244,114,43,0.12), rgba(0,180,166,0.08))', borderColor: 'rgba(244, 114, 43, 0.18)' }}>
            <Sparkles size={18} color="#F4722B" />
            <p className="text-sm leading-6" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              The database schema remains documented in `MYSQL_SCRIPTS.md`, while the app now routes authentication to the actual API.
            </p>
          </div>
        </section>

        <section className="w-full max-w-md">
          <div
            className="rounded-[32px] border p-6 shadow-2xl sm:p-7"
            style={{ backgroundColor: 'rgba(8, 18, 29, 0.86)', borderColor: 'rgba(245, 239, 224, 0.12)', boxShadow: '0 30px 90px rgba(3, 9, 15, 0.42)' }}
          >
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.26em]" style={{ color: 'rgba(245, 239, 224, 0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {mode === 'login' ? 'Member Login' : 'Member Registration'}
                </p>
                <h2 className="mt-2 text-3xl font-black" style={{ color: '#F5EFE0', fontFamily: "'Bricolage Grotesque', sans-serif" }}>
                  {formTitle}
                </h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(245, 239, 224, 0.08)' }}>
                <KeyRound size={22} color="#00B4A6" />
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border p-1" style={{ borderColor: 'rgba(245, 239, 224, 0.1)', backgroundColor: 'rgba(245, 239, 224, 0.04)' }}>
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm font-bold transition"
                style={{ backgroundColor: mode === 'login' ? '#F4722B' : 'transparent', color: mode === 'login' ? '#fff' : 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onClick={() => switchMode('login')}
              >
                Sign In
              </button>
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm font-bold transition"
                style={{ backgroundColor: mode === 'register' ? '#00B4A6' : 'transparent', color: mode === 'register' ? '#fff' : 'rgba(245, 239, 224, 0.6)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                onClick={() => switchMode('register')}
              >
                Register
              </button>
            </div>

            {mode === 'login' ? (
              <form className="space-y-4" onSubmit={handleLoginSubmit}>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em]" style={labelStyle}>
                    Email Address
                  </label>
                  <input
                    className="w-full rounded-2xl border px-4 py-3.5 text-sm outline-none transition"
                    style={inputStyle}
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold uppercase tracking-[0.22em]" style={labelStyle}>
                      Password
                    </label>
                    <span className="text-[11px] font-semibold" style={{ color: '#00B4A6', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      bcrypt verified
                    </span>
                  </div>
                  <input
                    className="w-full rounded-2xl border px-4 py-3.5 text-sm outline-none transition"
                    style={inputStyle}
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.24)', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {error}
                  </div>
                ) : null}

                <button
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold transition-transform active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #F4722B 0%, #FF8C42 100%)', color: '#fff', boxShadow: '0 16px 34px rgba(244, 114, 43, 0.3)', fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: isSubmitting ? 0.7 : 1 }}
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Signing In...' : 'Enter Tara Laro'}
                  <ArrowRight size={16} />
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleRegisterSubmit}>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em]" style={labelStyle}>
                    Account Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['player', 'organizer'] as RegisterRole[]).map((role) => {
                      const isActive = registerForm.role === role;

                      return (
                        <button
                          key={role}
                          type="button"
                          className="rounded-2xl border px-4 py-3 text-sm font-bold transition"
                          style={{
                            backgroundColor: isActive ? (role === 'organizer' ? '#F4722B' : '#00B4A6') : 'rgba(245, 239, 224, 0.04)',
                            borderColor: isActive ? 'transparent' : 'rgba(245, 239, 224, 0.12)',
                            color: '#fff',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}
                          onClick={() => updateRegisterForm('role', role)}
                        >
                          {role === 'organizer' ? 'Organizer' : 'Player'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em]" style={labelStyle}>
                      Username
                    </label>
                    <input className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" style={inputStyle} value={registerForm.username} onChange={(event) => updateRegisterForm('username', event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em]" style={labelStyle}>
                      Sport
                    </label>
                    <select className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" style={inputStyle} value={registerForm.preferredSport} onChange={(event) => updateRegisterForm('preferredSport', event.target.value as PreferredSport)}>
                      <option value="basketball">Basketball</option>
                      <option value="volleyball">Volleyball</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em]" style={labelStyle}>
                    Display Name
                  </label>
                  <input className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" style={inputStyle} value={registerForm.displayName} onChange={(event) => updateRegisterForm('displayName', event.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em]" style={labelStyle}>
                      City
                    </label>
                    <input className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" style={inputStyle} value={registerForm.city} onChange={(event) => updateRegisterForm('city', event.target.value)} />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em]" style={labelStyle}>
                      Barangay
                    </label>
                    <input className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" style={inputStyle} value={registerForm.barangay} onChange={(event) => updateRegisterForm('barangay', event.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em]" style={labelStyle}>
                    Email Address
                  </label>
                  <input className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" style={inputStyle} type="email" value={registerForm.email} onChange={(event) => updateRegisterForm('email', event.target.value)} autoComplete="email" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em]" style={labelStyle}>
                      Password
                    </label>
                    <input className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" style={inputStyle} type="password" value={registerForm.password} onChange={(event) => updateRegisterForm('password', event.target.value)} autoComplete="new-password" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.22em]" style={labelStyle}>
                      Confirm Password
                    </label>
                    <input className="w-full rounded-2xl border px-4 py-3 text-sm outline-none" style={inputStyle} type="password" value={registerForm.confirmPassword} onChange={(event) => updateRegisterForm('confirmPassword', event.target.value)} autoComplete="new-password" />
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.24)', color: '#FCA5A5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-2xl border px-4 py-3 text-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', borderColor: 'rgba(34, 197, 94, 0.24)', color: '#86EFAC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {success}
                  </div>
                ) : null}

                <button
                  className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold transition-transform active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #00B4A6 0%, #22C55E 100%)', color: '#fff', boxShadow: '0 16px 34px rgba(0, 180, 166, 0.28)', fontFamily: "'Plus Jakarta Sans', sans-serif", opacity: isSubmitting ? 0.7 : 1 }}
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                  <ArrowRight size={16} />
                </button>
              </form>
            )}

            {mode === 'login' ? (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(245, 239, 224, 0.42)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Quick Demo Access
                  </p>
                  <p className="text-[11px]" style={{ color: 'rgba(245, 239, 224, 0.45)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Uses seeded database users
                  </p>
                </div>

                <div className="space-y-3">
                  {quickAccounts.map((account) => (
                    <div key={account.label} className="rounded-2xl border p-3" style={{ backgroundColor: 'rgba(245, 239, 224, 0.04)', borderColor: 'rgba(245, 239, 224, 0.1)' }}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold" style={{ color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {account.label}
                          </p>
                          <p className="mt-1 text-xs" style={{ color: 'rgba(245, 239, 224, 0.52)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {account.email}
                          </p>
                        </div>
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: account.accent }} />
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          className="flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition-transform active:scale-[0.98]"
                          style={{ borderColor: 'rgba(245, 239, 224, 0.12)', color: '#F5EFE0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                          type="button"
                          onClick={() => {
                            setEmail(account.email);
                            setPassword(account.password);
                            setError('');
                            setSuccess('');
                          }}
                        >
                          Fill Form
                        </button>
                        <button
                          className="flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-transform active:scale-[0.98]"
                          style={{ backgroundColor: account.accent, color: account.accent === '#F5EFE0' ? '#08121D' : '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                          type="button"
                          onClick={() => handleQuickSignIn(account)}
                        >
                          Sign In Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
