
import React, { useState } from 'react';
import { User } from '../types';
import { login as apiLogin } from '../services/api';

interface LoginPageProps {
  onLogin: (user: User, token: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    apiLogin(email, password)
      .then(({ token, user }) => {
        onLogin(user as User, token);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Error al iniciar sesión');
        setIsLoading(false);
      });
  };

  const demoUsers = [
    { label: 'Super Admin', email: 'admin@radika.local', role: 'SUPER_ADMIN' },
    { label: 'Director', email: 'director@radika.local', role: 'DIRECTOR' },
    { label: 'Ingeniero', email: 'user@radika.local', role: 'ENGINEER' },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* LEFT: Branding Gradient */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-[#4B8DFF] via-[#4B8DFF] to-[#5EE0C8]" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center mix-blend-overlay opacity-70" />
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative z-10 flex flex-col justify-center px-12 text-white space-y-4">
           <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
             <img src="/src/logos/radika_favicon.png" alt="Radika" className="w-12 h-12 rounded-lg" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight drop-shadow-lg" style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>Radika</h1>
          <p className="text-xl text-white/90 max-w-lg leading-relaxed drop-shadow">
            Gestión documental y radicación inteligente, trazabilidad en tiempo real y cumplimiento ISO 9001 garantizado.
          </p>
        </div>
      </div>

      {/* RIGHT: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center bg-white p-8">
         <div className="w-full max-w-md">
            <div className="text-center mb-10 lg:text-left">
                <h2 className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Montserrat, Inter, sans-serif' }}>Iniciar Sesión</h2>
                <p className="text-slate-500 mt-2">Acceda a su cuenta corporativa segura.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Correo Corporativo</label>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full pl-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4B8DFF] focus:border-[#4B8DFF] outline-none transition-all"
                        placeholder="nombre@empresa.com"
                      />
                   </div>
                </div>

                <div>
                   <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-bold text-slate-700">Contraseña</label>
                      <a href="#" className="text-xs text-blue-600 hover:underline">¿Olvidó su contraseña?</a>
                   </div>
                   <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </div>
                      <input 
                        type="password" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#4B8DFF] focus:border-[#4B8DFF] outline-none transition-all"
                        placeholder="••••••••"
                      />
                   </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#4B8DFF] hover:bg-[#3B7AE6] text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Verificando...
                    </>
                  ) : (
                    'Iniciar Sesión Seguro'
                  )}
                </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase text-center mb-4 tracking-wider">Accesos Rápidos (Dev)</p>
                <div className="grid grid-cols-3 gap-3">
                    {demoUsers.map(user => (
                        <button
                            key={user.email}
                            type="button"
                            onClick={() => {
                              setEmail(user.email);
                              setPassword('123456');
                              apiLogin(user.email, '123456')
                                .then(({ token, user: u }) => onLogin(u as User, token))
                                .catch((err) => setError(err.message || 'No se pudo iniciar sesión'));
                            }}
                            className="flex flex-col items-center p-3 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-blue-300 hover:shadow-md transition-all group bg-white"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-100 mb-2 overflow-hidden border-2 border-white shadow-sm group-hover:scale-105 transition-transform flex items-center justify-center text-xs font-bold text-slate-600">
                                {user.label[0]}
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 uppercase group-hover:text-blue-600">{user.label}</span>
                            <span className="text-[9px] text-slate-400 truncate max-w-full">{user.email}</span>
                        </button>
                    ))}
                </div>
                <p className="mt-3 text-center text-[11px] text-slate-400">Uso solo para pruebas locales (pass: 123456)</p>
            </div>

            <div className="mt-6 text-center text-sm text-slate-400">
                <p>Protegido por reCAPTCHA Enterprise</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default LoginPage;
