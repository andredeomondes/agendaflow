'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardPage from '../../Frontend/pages/DashboardPage';

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/');
    }
  }, [router]);

  if (!mounted) return null;

  const token = localStorage.getItem('token');
  if (!token) return null;

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('clientToken');
    localStorage.removeItem('cliente');
    router.push('/');
  };

  return <DashboardPage user={user} token={token} onLogout={handleLogout} />;
}
