
import React, { useState } from 'react';
import { Profession } from '../types';
import { Search, Plus, Trash2, Edit2, Briefcase, Save, X, BookOpen, Check } from 'lucide-react';
import { generateId } from '../utils';

interface ProfessionManagerProps {
  professions: Profession[];
  onSave: (p: Profession) => void;
  onDelete: (id: string) => void;
  onSelect?: (p: Profession) => void; // Optional selection mode
  onClose?: () => void;
}

const ProfessionManager: React.FC<ProfessionManagerProps> = ({ professions, onSave, onDelete, onSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [formData, setFormData] = useState<Partial<Profession>>({});

  const filtered = professions.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.includes(searchTerm)
  );

  const handleCreate = () => {
    setFormData({ code: '', name: '', category: 'Geral' });
    setView('FORM');
  };

  const handleEdit = (p: Profession) => {
    setFormData(p);
    setView('FORM');
  };

  const handleSaveForm = () => {
    if(!formData.name || !formData.code) return alert("Código e Nome são obrigatórios");
    
    const newProf: Profession = {
        id: formData.id || generateId(),
        code: formData.code!,
        name: formData.name!,
        category: formData.category || 'Geral',
        description: formData.description,
        group: formData.group
    };
    onSave(newProf);
    setView('LIST');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <Briefcase className="text-green-400"/> Gestão de Profissões / Categorias
            </h2>
            {onClose && (
                <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition">
                    <X size={20}/>
                </button>
            )}
        </div>

        {view === 'LIST' && (
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                {/* Search & Actions */}
                <div className="flex gap-4 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                        <input 
                            className="w-full pl-10 p-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500 outline-none"
                            placeholder="Pesquisar por nome ou código..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={handleCreate}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Plus size={18}/> Nova Profissão
                    </button>
                </div>

                {/* List - Green Style */}
                <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-sm">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 bg-green-50 p-3 border-b border-green-200 text-xs font-bold text-green-800 uppercase tracking-wider sticky top-0">
                        <div className="col-span-2">Código</div>
                        <div className="col-span-6">Descrição da Profissão</div>
                        <div className="col-span-3">Categoria</div>
                        <div className="col-span-1 text-center">Ações</div>
                    </div>
                    
                    {/* Rows */}
                    <div className="divide-y divide-slate-100">
                        {filtered.map((p, idx) => (
                            <div 
                                key={p.id} 
                                className={`grid grid-cols-12 p-3 text-xs items-center hover:bg-green-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                            >
                                <div className="col-span-2 font-mono font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">{p.code}</div>
                                <div className="col-span-6 font-bold text-slate-800">{p.name}</div>
                                <div className="col-span-3 text-slate-500">{p.category}</div>
                                <div className="col-span-1 flex justify-center gap-2">
                                    {onSelect ? (
                                        <button onClick={() => onSelect(p)} className="text-green-600 hover:bg-green-100 p-1.5 rounded" title="Selecionar">
                                            <Check size={16}/>
                                        </button>
                                    ) : (
                                        <>
                                            <button onClick={() => handleEdit(p)} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded">
                                                <Edit2 size={16}/>
                                            </button>
                                            <button onClick={() => onDelete(p.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded">
                                                <Trash2 size={16}/>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {filtered.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            Nenhuma profissão encontrada.
                        </div>
                    )}
                </div>
            </div>
        )}

        {view === 'FORM' && (
            <div className="p-8 max-w-2xl mx-auto w-full">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    <div className="bg-green-50 p-4 border-b border-green-100 flex items-center gap-3">
                        <BookOpen className="text-green-600"/>
                        <h3 className="font-bold text-green-900 text-lg">{formData.id ? 'Editar Profissão' : 'Nova Profissão'}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Código (INSS/Interno)</label>
                            <input 
                                className="w-full border-2 border-slate-200 rounded-lg p-2.5 font-mono focus:border-green-500 outline-none transition-colors"
                                placeholder="Ex: 157"
                                value={formData.code}
                                onChange={e => setFormData({...formData, code: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição / Nome</label>
                            <input 
                                className="w-full border-2 border-slate-200 rounded-lg p-2.5 font-bold text-slate-700 focus:border-green-500 outline-none transition-colors"
                                placeholder="Ex: Operador de Máquina"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Grupo / Categoria</label>
                            <select 
                                className="w-full border-2 border-slate-200 rounded-lg p-2.5 bg-white focus:border-green-500 outline-none transition-colors"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                                <option value="Geral">Geral</option>
                                <option value="Administrativo">Administrativo</option>
                                <option value="Técnico">Técnico</option>
                                <option value="Operacional">Operacional</option>
                                <option value="Gestão">Gestão</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observações</label>
                            <textarea 
                                className="w-full border-2 border-slate-200 rounded-lg p-2.5 h-24 resize-none focus:border-green-500 outline-none transition-colors"
                                placeholder="Detalhes opcionais..."
                                value={formData.description || ''}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                        <button onClick={() => setView('LIST')} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-white font-medium">Cancelar</button>
                        <button onClick={handleSaveForm} className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center gap-2">
                            <Save size={18}/> Salvar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default ProfessionManager;
