'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import LoginPage from '../../Frontend/pages/LoginPage';

function LoginHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const googleToken = searchParams.get('google_token');
    if (googleToken) {
      const nome = searchParams.get('cliente_nome') || 'Cliente';
      const email = searchParams.get('cliente_email') || '';
      const id = parseInt(searchParams.get('cliente_id') || '0');
      const telefone = searchParams.get('telefone') || '';
      const primeiroAcesso = searchParams.get('primeiro_acesso') === 'true';

      const cliente = { id, nome, email, telefone };
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.setItem('clientToken', googleToken);
      localStorage.setItem('cliente', JSON.stringify(cliente));
      router.replace(`/client/dashboard${!telefone && primeiroAcesso ? '?whatsapp=1' : ''}`);
    }
  }, [searchParams, router]);

  return null;
}

export default function LoginPageWrapper() {
  const router = useRouter();

  const handleLoginSuccess = (token, user) => {
    localStorage.removeItem('clientToken');
    localStorage.removeItem('cliente');
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    router.push('/dashboard');
  };

  const handleClientLoginSuccess = (token, cliente) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.setItem('clientToken', token);
    localStorage.setItem('cliente', JSON.stringify(cliente));
    router.push('/client/dashboard');
  };

  return (
    <>
      <Suspense fallback={null}>
        <LoginHandler />
      </Suspense>
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onClientLoginSuccess={handleClientLoginSuccess}
      />
    </>
  );
}
