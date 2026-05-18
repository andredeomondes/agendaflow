'use client';

import { useRouter } from 'next/navigation';
import LandingPage from '../Frontend/pages/LandingPage';

export default function Home() {
  const router = useRouter();
  return <LandingPage onEntrar={() => router.push('/login')} />;
}
