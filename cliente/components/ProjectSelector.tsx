import React from 'react';
import { Project, ProjectType } from '../types';

interface ProjectSelectorProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ projects, activeProjectId, onSelectProject }) => {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        Active Contexts (Projects)
      </h2>
      <div className="grid grid-cols-1 gap-3">
        {projects.map((p) => {
          const isActive = p.id === activeProjectId;
          return (
            <button
              key={p.id}
              onClick={() => onSelectProject(p.id)}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 text-left group
                ${isActive 
                  ? 'bg-blue-50 border-blue-200 shadow-sm' 
                  : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }`}
            >
              <div>
                <div className={`font-semibold text-sm ${isActive ? 'text-blue-900' : 'text-slate-700'}`}>
                  {p.name}
                </div>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">
                    {p.prefix}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    p.type === ProjectType.CLIENT ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {p.type}
                  </span>
                </div>
              </div>
              {isActive && (
                <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectSelector;