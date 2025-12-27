
import React, { useState, useMemo } from 'react';
import { PGCAccount } from '../types';
import { Search, Plus, Edit2, FolderTree, FileText, CheckCircle, X, Save, AlertCircle } from 'lucide-react';
import { generateId } from '../utils';

interface PGCManagerProps {
  accounts: PGCAccount[];
  onSaveAccount: (account: PGCAccount) => void;
  onUpdateAccount: (account: PGCAccount) => void;
}

const PGCManager: React.FC<PGCManagerProps> = ({ accounts, onSaveAccount, onUpdateAccount }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<PGCAccount>>({
      type: 'CONTA',
      nature: 'AMBOS'
  });

  const sortedAccounts = useMemo(() => {
      return [...accounts].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [accounts]);

  const filteredAccounts = sortedAccounts.filter(acc => 
      acc.code.includes(searchTerm) || 
      acc.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (account?: PGCAccount) => {
      if (account) {
          setEditingAccount({ ...account });
      } else {
          setEditingAccount({
              type: 'CONTA',
              nature: 'AMBOS',
              parentCode: ''
          });
      }
      setIsModalOpen(true);
  };

  const handleSave = () => {
      if (!editingAccount.code || !editingAccount.description) {
          alert("Código e Descrição são obrigatórios.");
          return;
      }

      // Automatically determine parent if not set
      let derivedParent = editingAccount.parentCode;
      if (!derivedParent && editingAccount.code && editingAccount.code.length > 1) {
          const parts = editingAccount.code.split('.');
          if (parts.length > 1) {
              derivedParent = parts.slice(0, parts.length - 1).join('.');
          } else if (editingAccount.code.length > 2) {
               // Fallback for non-dot notation if used (e.g. 311 -> 31)
               derivedParent = editingAccount.code.substring(0, editingAccount.code.length - 1);
          }
      }

      const accountToSave: PGCAccount = {
          id: editingAccount.id || generateId(),
          code: editingAccount.code,
          description: editingAccount.description,
          type: editingAccount.type || 'CONTA',
          nature: editingAccount.nature || 'AMBOS',
          parentCode: derivedParent,
          systemAuto: editingAccount.systemAuto || false
      };

      // Check duplicates
      const exists = accounts.find(a => a.code === accountToSave.code && a.id !== accountToSave.id);
      if (exists) {
          alert("Já existe uma conta com este código.");
          return;
      }

      if (editingAccount.id) {
          onUpdateAccount(accountToSave);
      } else {
          onSaveAccount(accountToSave);
      }
      setIsModalOpen(false);
  };

  const getTypeColor = (type: string) => {
      switch (type) {
          case 'CLASSE': return 'bg-slate-800 text-white';
          case 'GRUPO': return 'bg-blue-800 text-white';
          case 'SUBGRUPO': return 'bg-blue-600 text-white';
          case 'CONTA': return 'bg-blue-100 text-blue-800';
          default: return 'bg-white text-slate-600 border';
      }
  };

  const getIndent = (code: string) => {
      const dots = (code.match(/\./g) || []).length;
      if (code.length === 1) return 0; // Class
      if (code.length === 2 && dots === 0) return 1; // Group (e.g. 31)
      return dots + 1;
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FolderTree/> Plano Geral de Contabilidade (PGC)</h1>
              <p className="text-slate-500 text-sm">Gestão de contas e estrutura contabilística angolana</p>
          </div>
          <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all transform hover:-translate-y-0.5">
              <Plus size={20}/> Criar Nova Conta
          </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-[calc(100vh-200px)]">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                  <input 
                      className="w-full pl-10 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="Pesquisar conta, código ou descrição..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
              <div className="text-xs text-slate-500 ml-auto flex gap-4">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-800 rounded-full"></span> Classe</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-800 rounded-full"></span> Grupo</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-600 rounded-full"></span> Subgrupo</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-100 border border-blue-200 rounded-full"></span> Conta</span>
              </div>
          </div>

          <div className="overflow-y-auto flex-1 p-0">
              <table className="w-full text-sm text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 z-10 shadow-sm uppercase text-xs">
                      <tr>
                          <th className="p-3 w-48 border-r border-slate-200">Código PGC</th>
                          <th className="p-3 border-r border-slate-200">Descrição da Conta</th>
                          <th className="p-3 w-32 text-center border-r border-slate-200">Tipo</th>
                          <th className="p-3 w-32 text-center border-r border-slate-200">Natureza</th>
                          <th className="p-3 w-20 text-center">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredAccounts.map(acc => {
                          const indent = getIndent(acc.code);
                          const isClass = acc.type === 'CLASSE';
                          const isGroup = acc.type === 'GRUPO';
                          
                          return (
                              <tr key={acc.id} className={`hover:bg-blue-50 transition-colors ${isClass ? 'bg-slate-50' : ''}`}>
                                  <td className="p-2 border-r border-slate-200 font-mono font-bold text-slate-700">
                                      <span style={{ marginLeft: `${indent * 20}px` }}>{acc.code}</span>
                                  </td>
                                  <td className={`p-2 border-r border-slate-200 ${isClass ? 'font-black uppercase text-slate-900' : isGroup ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                                      {acc.description}
                                      {acc.systemAuto && <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200">AUTO</span>}
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200">
                                      <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${getTypeColor(acc.type)}`}>
                                          {acc.type}
                                      </span>
                                  </td>
                                  <td className="p-2 text-center border-r border-slate-200 text-xs text-slate-500 font-medium">
                                      {acc.nature}
                                  </td>
                                  <td className="p-2 text-center">
                                      <button onClick={() => handleOpenModal(acc)} className="p-1.5 hover:bg-slate-200 rounded text-blue-600 transition">
                                          <Edit2 size={16}/>
                                      </button>
                                  </td>
                              </tr>
                          );
                      })}
                      {filteredAccounts.length === 0 && (
                          <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma conta encontrada.</td></tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                  <div className="bg-slate-900 text-white p-5 rounded-t-xl flex justify-between items-center">
                      <h3 className="font-bold text-lg flex items-center gap-2"><FileText size={20}/> {editingAccount.id ? 'Editar Conta' : 'Nova Conta PGC'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="hover:bg-slate-800 p-1 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Código PGC <span className="text-red-500">*</span></label>
                              <input 
                                className="w-full border-2 border-slate-200 rounded-lg p-2.5 font-mono text-sm focus:border-blue-500 outline-none" 
                                placeholder="Ex: 31.1.2"
                                value={editingAccount.code || ''}
                                onChange={e => setEditingAccount({...editingAccount, code: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Código Pai</label>
                              <input 
                                className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 text-slate-500 text-sm" 
                                placeholder="Automático"
                                value={editingAccount.parentCode || ''}
                                disabled
                              />
                          </div>
                      </div>
                      
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Descrição da Conta <span className="text-red-500">*</span></label>
                          <input 
                            className="w-full border-2 border-slate-200 rounded-lg p-2.5 text-sm focus:border-blue-500 outline-none font-bold text-slate-700" 
                            placeholder="Ex: Clientes Gerais"
                            value={editingAccount.description || ''}
                            onChange={e => setEditingAccount({...editingAccount, description: e.target.value})}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Tipo de Conta</label>
                              <select 
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white"
                                value={editingAccount.type}
                                onChange={e => setEditingAccount({...editingAccount, type: e.target.value as any})}
                              >
                                  <option value="CLASSE">Classe (1 dígito)</option>
                                  <option value="GRUPO">Grupo (2 dígitos)</option>
                                  <option value="SUBGRUPO">Subgrupo</option>
                                  <option value="CONTA">Conta</option>
                                  <option value="SUBCONTA">Subconta</option>
                              </select>
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Natureza</label>
                              <select 
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white"
                                value={editingAccount.nature}
                                onChange={e => setEditingAccount({...editingAccount, nature: e.target.value as any})}
                              >
                                  <option value="DEBITO">Débito</option>
                                  <option value="CREDITO">Crédito</option>
                                  <option value="AMBOS">Ambos</option>
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Observações</label>
                          <textarea 
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm h-24 resize-none"
                            placeholder="Detalhes adicionais..."
                          />
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2">
                          <AlertCircle size={16} className="text-blue-600 mt-0.5 shrink-0"/>
                          <p className="text-xs text-blue-800 leading-relaxed">
                              A hierarquia será ajustada automaticamente com base no código inserido. Certifique-se de seguir a estrutura do PGC Angolano.
                          </p>
                      </div>
                  </div>
                  <div className="p-5 border-t bg-slate-50 rounded-b-xl flex justify-end gap-3">
                      <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-white transition font-medium">Cancelar</button>
                      <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2">
                          <Save size={18}/> Salvar Conta
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PGCManager;
