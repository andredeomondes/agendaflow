'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClientDashboard from '../../../Frontend/pages/ClientDashboard';

export default function ClientDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('clientToken');
    if (!token) {
      router.replace('/');
    }
  }, [router]);

  if (!mounted) return null;

  const token = localStorage.getItem('clientToken');
  if (!token) return null;

  const cliente = JSON.parse(localStorage.getItem('cliente') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('cliente');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  return <ClientDashboard cliente={cliente} token={token} onLogout={handleLogout} />;
}
