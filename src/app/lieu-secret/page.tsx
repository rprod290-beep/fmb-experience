'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  MapPin, 
  Ticket, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { getSecretAddressByCode } from '@/app/actions';

function LieuSecretContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    address: string;
    eventName?: string;
    eventSlug?: string;
    buyerName?: string;
  } | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const handleLookup = async (codeToSearch?: string) => {
    const target = (codeToSearch || code).trim().toUpperCase();
    if (!target) {
      setError('Veuillez entrer votre code de réservation.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await getSecretAddressByCode(target);
      if (res.success && res.address) {
        setResult({
          address: res.address,
          eventName: res.eventName,
          eventSlug: res.eventSlug,
          buyerName: res.buyerName,
        });
      } else {
        setError(res.error || 'Code invalide ou réservation non validée.');
      }
    } catch (err: any) {
      setError('Erreur lors de la vérification. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlCode = searchParams?.get('code');
    if (urlCode) {
      const clean = urlCode.trim().toUpperCase();
      setCode(clean);
      handleLookup(clean);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-pink-500 selection:text-white pb-20">
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20">
        {/* Navigation retour */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil
          </Link>
        </div>

        {/* Card Header */}
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 text-pink-400 mb-2 shadow-lg shadow-pink-500/10">
            <MapPin className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-white neon-text-purple">
            Lieu Secret
          </h1>
          <p className="text-sm text-white/60 max-w-md mx-auto">
            Débloquez instantanément l'adresse secrète de votre événement à l'aide de votre code de réservation unique.
          </p>
        </div>

        {/* Search Card */}
        <div className="glass p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs uppercase font-bold tracking-wider text-white/70 mb-2">
                Votre Code Unique
              </label>
              <div className="relative">
                <Ticket className="w-5 h-5 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ex: FMB-XXXXXX ou 8 caractères"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-black/50 border border-white/10 text-white placeholder-white/30 text-base font-mono uppercase tracking-wider focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:via-purple-500 hover:to-indigo-500 text-white font-extrabold uppercase tracking-wider text-sm transition-all shadow-lg shadow-pink-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Vérification du code...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Dévoiler l'Adresse</span>
                </>
              )}
            </button>
          </form>

          {/* Erreur */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Accès non accordé</p>
                <p className="mt-0.5 opacity-90">{error}</p>
              </div>
            </div>
          )}

          {/* Résultat Dévoilé */}
          {result && (
            <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Lieu Dévoilé
                </span>
                {result.eventName && (
                  <span className="text-xs text-white/60 font-semibold truncate max-w-[200px]">
                    {result.eventName}
                  </span>
                )}
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold">
                  Adresse exacte de l'événement
                </p>
                <p className="text-lg sm:text-xl font-bold text-white mt-1 select-all">
                  {result.address}
                </p>
                {result.buyerName && (
                  <p className="text-xs text-white/50 mt-1">
                    Billet réservé au nom de : <span className="text-white font-medium">{result.buyerName}</span>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.address);
                    setCopiedAddress(true);
                    setTimeout(() => setCopiedAddress(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors"
                >
                  {copiedAddress ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Adresse copiée !</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-white/70" />
                      <span>Copier l'adresse</span>
                    </>
                  )}
                </button>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Maps</span>
                </a>

                <a
                  href={`https://maps.apple.com/?q=${encodeURIComponent(result.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 text-xs font-semibold border border-pink-500/30 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Apple Plans</span>
                </a>
              </div>

              {result.eventSlug && (
                <div className="pt-2">
                  <Link
                    href={`/evenements/${result.eventSlug}?code=${code}`}
                    className="inline-flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 underline font-medium"
                  >
                    Voir la page complète de l'événement et mon billet &rarr;
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Info note */}
          <div className="pt-2 border-t border-white/5 text-center text-xs text-white/40">
            Besoin d'aide ? Contactez l'équipe organisatrice avec votre nom et prénom.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LieuSecretPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white/60">
        Chargement...
      </div>
    }>
      <LieuSecretContent />
    </Suspense>
  );
}
