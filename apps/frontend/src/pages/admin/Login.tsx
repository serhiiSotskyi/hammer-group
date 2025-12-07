import { useState } from 'react';
import { authLogin } from '@/services/api';
import { useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authLogin(email, password);
      navigate('/admin');
    } catch (e: any) {
      setError('Невірний email або пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm border rounded-lg p-6 space-y-4">
        <h1 className="text-xl font-semibold">Вхід до адмін-панелі</h1>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div>
          <label className="text-sm block mb-1">Ел. пошта</label>
          <input className="border rounded w-full px-3 py-2" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm block mb-1">Пароль</label>
          <input className="border rounded w-full px-3 py-2" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        </div>
        <button className="w-full bg-black text-white rounded py-2" disabled={loading}>
          {loading ? 'Вхід…' : 'Увійти'}
        </button>
      </form>
    </div>
  );
}
