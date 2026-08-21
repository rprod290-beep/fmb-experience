'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Lock, Mail, AlertTriangle, ArrowLeft } from 'lucide-react';

function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/admin';

  // Rediriger si déjà connecté
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace(nextUrl);
      }
    }
    checkUser();
  }, [router, nextUrl]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Personnalisation des messages d'erreur courants en français
        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg('Identifiants incorrects (email ou mot de passe invalide).');
        } else {
          setErrorMsg(error.message);
        }
      } else {
        router.replace(nextUrl);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Une erreur imprévue s'est produite.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Top back link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour au site public
        </Link>
      </div>

      {/* Main card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md my-auto">
        <div className="text-center mb-8">
          <span className="font-extrabold text-2xl tracking-wider bg-gradient-to-r from-purple-400 via-pink-500 to-emerald-400 bg-clip-text text-transparent">
            FMB EXPÉRIENCE
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-white tracking-tight">
            Espace Administration
          </h2>
          <p className="mt-2 text-sm text-white/40">
            Connectez-vous pour gérer les événements et valider les paiements.
          </p>
        </div>

        <div className="glass-card sm:p-8 space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                Adresse e-mail admin
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="admin@fmb-experience.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors text-white"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-pink-500/10 border border-pink-500/20 text-pink-500 rounded-xl text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="glow-btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>

          <div className="pt-4 border-t border-white/5 text-[10px] text-white/30 leading-relaxed">
            <p className="font-bold mb-1 text-white/50">💡 Configuration du compte :</p>
            Créez ou gérez vos comptes administrateurs directement depuis la console Supabase (onglet Authentication &gt; Users).
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-white/20">
        FMB Expérience Admin Portal • © {new Date().getFullYear()}
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#050508] text-white">
        <div className="w-12 h-12 rounded-full border-2 border-pink-500/20 border-t-pink-500 animate-spin"></div>
        <p className="text-white/40 text-xs font-semibold tracking-wider uppercase">Connexion Admin...</p>
      </div>
    }>
      <AdminLoginForm />
    </Suspense>
  );
}
