
import React, { useState, useRef, useEffect } from 'react';
import { Project, ProjectType, ViewState, User } from '../types';

interface NavbarProps {
  currentUser: User;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onToggleSchema: () => void;
  onNavigate?: (view: ViewState) => void; 
  currentView?: ViewState;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentUser, projects, activeProjectId, onSelectProject, onToggleSchema, onNavigate, currentView, onLogout }) => {
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const activeProject = projects.find(p => p.id === activeProjectId);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo & Brand */}
          <div 
             className="flex items-center gap-3 cursor-pointer" 
             onClick={() => onNavigate && onNavigate('DASHBOARD')}
          >
            <img src="/src/logos/radika_favicon.png" alt="Radika" className="w-9 h-9 rounded-lg shadow-lg shadow-blue-500/30" />
            <div className="hidden md:block">
              <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none">Radika</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Gestión Documental</p>
            </div>
          </div>

          {/* Center Navigation */}
          <div className="hidden lg:flex items-center gap-1 mx-6">
             <button 
                onClick={() => onNavigate && onNavigate('DASHBOARD')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${currentView === 'DASHBOARD' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
             >
                Dashboard
             </button>
             <button 
                onClick={() => onNavigate && onNavigate('ARCHIVE_MANAGER')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${currentView === 'ARCHIVE_MANAGER' ? 'bg-amber-50 text-amber-800' : 'text-slate-500 hover:text-slate-800'}`}
             >
                <span>🗄️</span> Archivo Físico
             </button>
          </div>

          {activeProject && (
            <div className="flex items-center">
               <div className="relative">
                  <button 
                    onClick={() => setIsProjectOpen(!isProjectOpen)}
                    className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full px-4 py-2 transition-all"
                  >
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider leading-none">Current Context</span>
                      <span className="text-sm font-semibold text-slate-800 leading-none">{activeProject.name}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${activeProject.type === ProjectType.CLIENT ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {activeProject.prefix}
                    </div>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isProjectOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>

                  {isProjectOpen && (
                    <div className="absolute top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in right-0 z-50">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-500 uppercase">Switch Context</span>
                      </div>
                      {projects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            onSelectProject(p.id);
                            setIsProjectOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors ${p.id === activeProjectId ? 'bg-blue-50/50' : ''}`}
                        >
                           <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold border ${p.type === ProjectType.CLIENT ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                              {p.prefix}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-800">{p.name}</div>
                              <div className="text-[10px] text-slate-500">{p.type} Project</div>
                            </div>
                            {p.id === activeProjectId && (
                              <div className="ml-auto w-2 h-2 rounded-full bg-blue-500" />
                            )}
                        </button>
                      ))}
                    </div>
                  )}
               </div>
            </div>
          )}

          {/* Right Actions: User Profile */}
          <div className="flex items-center gap-4 ml-4" ref={profileRef}>
             <div className="relative">
                <button 
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                    <div className="text-right hidden md:block">
                        <p className="text-xs font-bold text-slate-800">{currentUser.fullName}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{currentUser.role}</p>
                    </div>
                    <img src={currentUser.avatarUrl} alt="Avatar" className="w-9 h-9 rounded-full border border-slate-200" />
                </button>

                {isProfileOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in z-50">
                        <div className="py-1">
                            <button 
                                onClick={() => {
                                    onNavigate && onNavigate('USER_PROFILE');
                                    setIsProfileOpen(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                Mi Perfil
                            </button>
                            <button 
                                onClick={() => {
                                    alert("Cambiar Contraseña (Simulado)");
                                    setIsProfileOpen(false);
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                Seguridad
                            </button>
                            <div className="border-t border-slate-100 my-1"></div>
                            <button 
                                onClick={onLogout}
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                )}
             </div>
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
