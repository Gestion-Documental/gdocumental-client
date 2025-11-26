
import React, { useState } from 'react';
import { User, Project, AdminAuditLog } from '../types';
import { MOCK_USERS, MOCK_PROJECTS, MOCK_AUDIT_LOGS } from '../services/mockData';

interface AdminDashboardProps {
  onLogout: () => void;
}

type AdminTab = 'USERS' | 'PROJECTS' | 'AUDIT';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('USERS');
  const [users, setUsers] = useState(MOCK_USERS);
  const [projects, setProjects] = useState(MOCK_PROJECTS);

  // Mock User Management
  const toggleUserStatus = (id: string) => {
      setUsers(users.map(u => u.id === id ? {...u, isActive: !u.isActive} : u));
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
       
       {/* Header */}
       <header className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold">N</div>
             <div>
                <h1 className="text-lg font-bold">Nexus Admin Console</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">System Administration</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <span className="text-sm text-slate-300">Logged as Super Admin</span>
             <button onClick={onLogout} className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded border border-slate-700 transition-colors">Logout</button>
          </div>
       </header>

       <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
             <nav className="p-4 space-y-1">
                <button 
                  onClick={() => setActiveTab('USERS')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'USERS' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                   Usuarios y Roles
                </button>
                <button 
                  onClick={() => setActiveTab('PROJECTS')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'PROJECTS' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                   Proyectos
                </button>
                <button 
                  onClick={() => setActiveTab('AUDIT')}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'AUDIT' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                   Auditoría Global
                </button>
             </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-8">
             
             {activeTab === 'USERS' && (
               <div>
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h2>
                     <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
                        + Nuevo Usuario
                     </button>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                           <tr>
                              <th className="px-6 py-3">Usuario</th>
                              <th className="px-6 py-3">Rol</th>
                              <th className="px-6 py-3">Proyectos Asignados</th>
                              <th className="px-6 py-3">Estado</th>
                              <th className="px-6 py-3 text-right">Acciones</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {users.map(user => (
                              <tr key={user.id} className="hover:bg-slate-50">
                                 <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                       <img src={user.avatarUrl} className="w-8 h-8 rounded-full" alt="" />
                                       <div>
                                          <div className="font-medium text-slate-900">{user.fullName}</div>
                                          <div className="text-slate-500 text-xs">{user.email}</div>
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : user.role === 'DIRECTOR' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                                       {user.role}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className="flex gap-1">
                                       {user.assignedProjectIds.map(pid => {
                                          const proj = projects.find(p => p.id === pid);
                                          return (
                                             <span key={pid} className="text-[10px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600" title={proj?.name}>
                                                {proj?.prefix}
                                             </span>
                                          );
                                       })}
                                    </div>
                                 </td>
                                 <td className="px-6 py-4">
                                    <button 
                                       onClick={() => toggleUserStatus(user.id)}
                                       className={`text-xs font-bold px-2 py-1 rounded-full border transition-colors ${user.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                                    >
                                       {user.isActive ? 'Activo' : 'Inactivo'}
                                    </button>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <button className="text-blue-600 hover:underline text-xs font-medium">Editar</button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
             )}

             {activeTab === 'PROJECTS' && (
                <div>
                   <div className="flex justify-between items-center mb-6">
                     <h2 className="text-2xl font-bold text-slate-800">Proyectos y Entornos</h2>
                     <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2">
                        + Nuevo Proyecto
                     </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {projects.map(proj => (
                        <div key={proj.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                           <div className="flex justify-between items-start mb-4">
                              <div>
                                 <h3 className="font-bold text-lg text-slate-900">{proj.name}</h3>
                                 <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded mt-1 inline-block">{proj.id}</span>
                              </div>
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${proj.type === 'CLIENT' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                 {proj.prefix}
                              </div>
                           </div>
                           <div className="text-sm text-slate-600 space-y-1">
                              <p><strong>Tipo:</strong> {proj.type}</p>
                              <p><strong>Series Activas:</strong> ADM, TEC</p>
                              <p><strong>Estado:</strong> <span className="text-green-600 font-medium">Operativo</span></p>
                           </div>
                           <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                              <button className="text-sm text-slate-600 hover:text-blue-600 font-medium">Configurar Series</button>
                              <button className="text-sm text-slate-600 hover:text-blue-600 font-medium">Usuarios</button>
                           </div>
                        </div>
                     ))}
                  </div>
                </div>
             )}

             {activeTab === 'AUDIT' && (
                <div>
                   <h2 className="text-2xl font-bold text-slate-800 mb-6">Registro de Auditoría Global</h2>
                   <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                      <table className="w-full text-left text-sm">
                         <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                            <tr>
                               <th className="px-6 py-3">Fecha/Hora</th>
                               <th className="px-6 py-3">Usuario</th>
                               <th className="px-6 py-3">Acción</th>
                               <th className="px-6 py-3">Detalles</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                            {MOCK_AUDIT_LOGS.map(log => (
                               <tr key={log.id}>
                                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                     {new Date(log.timestamp).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4">
                                     <span className="font-medium text-slate-900">{log.userEmail}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                     <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                        {log.action}
                                     </span>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600">
                                     {log.details}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             )}

          </main>
       </div>
    </div>
  );
};

export default AdminDashboard;
