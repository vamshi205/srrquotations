import React, { useState } from 'react';
import { auth, hasFirebaseConfig } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { Lock, Mail, AlertCircle, Loader2, Key, FileUp } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If Firebase is not configured yet, show the setup instructions instead of the login form
  if (!hasFirebaseConfig) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
        {/* Floating Glowing Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 py-10 px-8 shadow-2xl rounded-3xl text-white">
            <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center mb-6">
              <Key size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-[24px] font-bold tracking-tight text-white mb-4">
              Firebase Configuration Required
            </h2>
            <p className="text-[15px] text-slate-300 mb-6 leading-relaxed">
              To secure your quotation builder, you need to connect it to your Firebase project. Follow these steps:
            </p>
            <ol className="list-decimal pl-5 space-y-3 text-[14px] text-slate-300 mb-8">
              <li>Go to <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-emerald-400 font-bold hover:underline">console.firebase.google.com</a> and click "Create a project".</li>
              <li>Once created, click the <strong>Web icon (&lt;/&gt;)</strong> to register an app.</li>
              <li>Copy the `firebaseConfig` block it gives you.</li>
              <li>Create a `.env.local` file in the root of this project and paste your keys:</li>
            </ol>
            <div className="bg-black/40 border border-white/10 p-4 rounded-xl font-mono text-[13px] text-emerald-300 mb-6 overflow-x-auto">
              VITE_FIREBASE_API_KEY=your_api_key<br/>
              VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com<br/>
              VITE_FIREBASE_PROJECT_ID=your_project_id<br/>
              VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com<br/>
              VITE_FIREBASE_MESSAGING_SENDER_ID=123456789<br/>
              VITE_FIREBASE_APP_ID=1:12345:web:abcde
            </div>
            <p className="text-[14px] text-slate-400 italic">
              Restart your development server (`npm run dev`) after adding the `.env.local` file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      setError('Google sign-in failed. Please ensure it is enabled in your Firebase console.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Mesh Blur Backdrops */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="w-18 h-18 bg-gradient-to-tr from-emerald-500 to-teal-700 shadow-lg shadow-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <FileUp size={30} className="text-white" />
        </div>
        <h2 className="text-center text-[26px] font-extrabold tracking-tight text-slate-800 mb-1">
          SRR Quotation Maker
        </h2>
        <p className="text-center text-[13.5px] text-slate-500 font-semibold mb-6">
          Sri Raja Rajeshwari Ortho Plus Administration Console
        </p>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-[420px] relative z-10 px-4">
        <div className="bg-white/60 backdrop-blur-2xl border border-white/65 py-10 px-8 shadow-[0_20px_50px_rgba(15,23,42,0.06)] rounded-3xl">
          <form className="space-y-5" onSubmit={handleLogin}>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/25 text-red-700 p-4.5 rounded-2xl flex items-start gap-3 text-[13.5px] leading-snug">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
                <p className="font-semibold">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border border-slate-200/80 hover:border-slate-300 rounded-2xl text-[14px] font-bold text-slate-700 bg-white/70 hover:bg-white transition-all shadow-sm active:scale-[0.98]"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200/60"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-[12px] font-bold uppercase tracking-wider">Or continue with email</span>
              <div className="flex-grow border-t border-slate-200/60"></div>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4.5 w-4.5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-3.5 pl-12 pr-4 bg-white/70 border border-slate-200/80 rounded-2xl text-[14px] font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all shadow-sm"
                  placeholder="admin@srrorthoplus.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4.5 w-4.5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3.5 pl-12 pr-4 bg-white/70 border border-slate-200/80 rounded-2xl text-[14px] font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all shadow-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl font-extrabold text-[15px] shadow-lg shadow-emerald-500/10 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin text-white" />
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
