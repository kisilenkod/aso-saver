import { useState } from 'react';
import { Lock } from 'lucide-react';

interface Props {
  onLogin: (password: string) => boolean;
  isFirstTime: boolean;
}

export default function LoginScreen({ onLogin, isFirstTime }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    const success = onLogin(password);
    if (!success) {
      setError('Wrong password');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ASO Saver</h1>
          <p className="text-gray-400 mt-1">
            {isFirstTime ? 'Set a password to get started' : 'Enter your password to continue'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder={isFirstTime ? 'Create password' : 'Password'}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            {isFirstTime ? 'Create & Enter' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
