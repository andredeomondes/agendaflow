import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e1e1e6] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-rocket-purple-light mb-4">404</h1>
        <p className="text-lg text-[#a0a0b8] mb-6">Página não encontrada</p>
        <Link
          href="/"
          className="bg-rocket-green hover:bg-rocket-green/90 text-white px-6 py-3 rounded-lg font-medium transition-all"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
