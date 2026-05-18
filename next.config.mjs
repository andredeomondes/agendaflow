/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const rules = [];
    if (process.env.NODE_ENV === 'development') {
      rules.push({
        source: '/api/:path*',
        destination: 'http://localhost:3333/api/:path*',
      });
    }
    rules.push({
      source: '/favicon.ico',
      destination: '/favicon.svg',
    });
    return rules;
  },
};

export default nextConfig;
