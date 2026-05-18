import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '../Frontend/contexts/ToastContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'AgendaFlow — Sistema de Agendamentos',
  description:
    'Organize espaços, gerencie horários, evite conflitos e mantenha seus clientes informados. Tudo em uma plataforma moderna e intuitiva.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
