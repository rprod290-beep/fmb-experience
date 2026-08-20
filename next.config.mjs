/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignorer les erreurs ESLint pendant le build (évite les avertissements d'apostrophes en français dans le JSX)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorer les erreurs strictes de typage pendant le build si nécessaire
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
