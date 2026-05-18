import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CreditCard, Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f0e8] py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-(--color-primary) border-2 border-black shadow-[4px_4px_0_0_#000] mb-4">
            <CreditCard className="h-8 w-8" />
          </div>
          <h1 className="font-head text-4xl font-bold">Welcome back</h1>
          <p className="mt-2 text-(--color-muted-foreground)">Sign in to your Credit Card Tracker</p>
        </div>

        {/* Form Card */}
        <div className="bg-white border-2 border-black shadow-[6px_6px_0_0_#000] p-8">
          {error && (
            <div className="mb-5 p-4 bg-(--color-destructive) border-2 border-black flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
              <p className="text-sm text-white font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-bold mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-(--color-muted)" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] placeholder-gray-400 focus:outline-none focus:shadow-[1px_1px_0_0_#000] focus:translate-y-0.5 transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-(--color-muted)" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2.5 border-2 border-black bg-white shadow-[3px_3px_0_0_#000] placeholder-gray-400 focus:outline-none focus:shadow-[1px_1px_0_0_#000] focus:translate-y-0.5 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border-2 border-black font-bold bg-(--color-primary) shadow-[4px_4px_0_0_#000] hover:shadow-[2px_2px_0_0_#000] hover:translate-y-0.5 active:shadow-none active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 text-center border-t-2 border-black pt-5">
            <p className="text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="font-bold underline hover:text-(--color-muted-foreground)">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
