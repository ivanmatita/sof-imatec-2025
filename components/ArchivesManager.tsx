import React, { useState, useMemo, useEffect } from 'react';
import { ArchiveDocument, ArchiveOccurrence } from '../types';
// Fix: Added exportToExcel to imports from utils
import { generateId, formatDate, exportToExcel } from '../utils';
import { supabase } from '../services/supabaseClient';
import { 
  FileText, Plus, Search, Filter, Printer, Download, Trash2, Edit3, 
  X, Save, Upload, ShieldCheck, Link, History, User, Phone, 
  MessageSquare, ChevronRight, FolderArchive, FileSearch, CheckCircle,
  FileBadge, RefreshCw, Loader2, Database
} from 'lucide-react';

const ArchivesManager: React.FC = () => {
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<ArchiveDocument | null>(null);
  const [activeDocForOccurrence, setActiveDocForOccurrence] = useState<ArchiveDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<ArchiveDocument>>({
    name: '',
    type: 'Administrativo',
    observations: '',
    contact: '',
    responsible: '',
    isSigned: false
  });

  const [occurrenceText, setOccurrenceText] = useState('');

  // --- SUPABASE SYNC ---
  useEffect(() => {
    fetchArchives();
  }, []);

  async function fetchArchives() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('arquivos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const mapped: ArchiveDocument[] = data.map(d => ({
          id: d.id,
          name: d.nome,
          type: d.tipo as any,
          observations: d.observacoes || '',
          contact: d.contacto || '',
          responsible: d.responsavel || '',
          date: d.data_registo,
          fileUrl: d.file_url,
          isSigned: d.is_signed,
          associatedDocNo: d.associated_doc_no,
          occurrences: d.ocorrencias || []
        }));
        setDocuments(mapped);
      }
    } catch (err: any) {
      console.error("Erro ao carregar arquivos:", err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSaveDocument = async () => {
    if (!formData.name || !formData.responsible) return alert("Preencha o nome do documento e o responsável.");

    setIsLoading(true);
    const docId = editingDoc?.id || generateId();
    
    // UUID verification for Supabase (fallback to generated ID if not valid UUID)
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docId);
    
    const payload = {
      nome: formData.name,
      tipo: formData.type,
      observacoes: formData.observations,
      contacto: formData.contact,
      responsavel: formData.responsible,
      is_signed: formData.isSigned,
      associated_doc_no: formData.associatedDocNo,
      empresa_id: '00000000-0000-0000-0000-000000000001'
    };

    try {
      const { error } = await supabase
        .from('arquivos')
        .upsert(isValidUUID ? { ...payload, id: docId } : payload);

      if (error) throw error;

      await fetchArchives();
      setShowModal(false);
      setEditingDoc(null);
      setFormData({ type: 'Administrativo', isSigned: false });
      alert("Documento registado com sucesso na Cloud!");
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOccurrence = async () => {
    if (!occurrenceText || !activeDocForOccurrence) return;

    setIsLoading(true);
    const newOcc: ArchiveOccurrence = {
      id: generateId(),
      date: new Date().toISOString(),
      description: occurrenceText,
      user: 'Admin'
    };

    const updatedOccurrences = [newOcc, ...(activeDocForOccurrence.occurrences || [])];

    try {
      const { error } = await supabase
        .from('arquivos')
        .update({ ocorrencias: updatedOccurrences })
        .eq('id', activeDocForOccurrence.id);

      if (error) throw error;

      await fetchArchives();
      setOccurrenceText('');
      setShowOccurrenceModal(false);
      setActiveDocForOccurrence(null);
    } catch (err: any) {
      alert("Erro ao adicionar ocorrência: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSignature = async (doc: ArchiveDocument) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('arquivos')
        .update({ is_signed: !doc.isSigned })
        .eq('id', doc.id);

      if (error) throw error;
      await fetchArchives();
    } catch (err: any) {
      alert("Erro na assinatura: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem a certeza que deseja eliminar este documento da Cloud?")) {
      setIsLoading(true);
      try {
        const { error } = await supabase.from('arquivos').delete().eq('id', id);
        if (error) throw error;
        await fetchArchives();
        alert("Documento eliminado com sucesso.");
      } catch (err: any) {
        alert("Erro ao eliminar: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.responsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.associatedDocNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  function handleCreate() {
    setEditingDoc(null);
    setFormData({
      name: '',
      type: 'Administrativo',
      observations: '',
      contact: '',
      responsible: '',
      isSigned: false
    });
    setShowModal(true);
  }

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
            <FolderArchive className="text-blue-600" size={32}/> Gestão de Arquivos Digitais
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
            <Database size={12}/> Sincronizado com Supabase Cloud
          </p>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={fetchArchives}
            className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition"
            title="Recarregar"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""}/>
          </button>
          <button 
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            <Plus size={18}/> Registar documento
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
          <input 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            placeholder="Pesquisar documento por nome, responsável ou referência..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-200 transition">
            <Filter size={16}/> Filtros
          </button>
          <button onClick={() => exportToExcel(documents, "Arquivo_Digital")} className="flex-1 md:flex-none px-4 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-900 transition shadow-md">
            <Download size={16}/> Exportar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative">
        {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600" size={40}/>
            </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest border-b border-slate-800">
              <tr>
                <th className="p-5">Data Registo</th>
                <th className="p-5">Nome do Documento</th>
                <th className="p-5">Tipo / Categoria</th>
                <th className="p-5">Responsável</th>
                <th className="p-5">Ref. Associada</th>
                <th className="p-5 text-center">Assinatura</th>
                <th className="p-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="p-5 font-mono text-slate-500">{formatDate(doc.date)}</td>
                  <td className="p-5 font-black text-slate-800 uppercase tracking-tight">{doc.name}</td>
                  <td className="p-5">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-blue-100">
                      {doc.type}
                    </span>
                  </td>
                  <td className="p-5 font-bold text-slate-600 flex items-center gap-2">
                    <User size={14} className="text-slate-400"/> {doc.responsible}
                  </td>
                  <td className="p-5 font-mono text-blue-600 font-bold">
                    {doc.associatedDocNo ? (
                      <div className="flex items-center gap-1"><Link size={12}/> {doc.associatedDocNo}</div>
                    ) : '---'}
                  </td>
                  <td className="p-5 text-center">
                    {doc.isSigned ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-black text-[9px] uppercase border border-emerald-200 shadow-sm">
                        <ShieldCheck size={12}/> Digitalmente Assinado
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Pendente</span>
                    )}
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => { setEditingDoc(doc); setFormData(doc); setShowModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition shadow-sm border border-transparent hover:border-blue-100" title="Editar Info"><Edit3 size={16}/></button>
                      <button onClick={() => { setActiveDocForOccurrence(doc); setShowOccurrenceModal(true); }} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-white rounded-lg transition shadow-sm border border-transparent hover:border-orange-100" title="Inserir Ocorrência"><MessageSquare size={16}/></button>
                      <button onClick={() => handleToggleSignature(doc)} className={`p-2 rounded-lg transition shadow-sm border border-transparent ${doc.isSigned ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-white'}`} title="Assinatura Digital"><ShieldCheck size={16}/></button>
                      <button className="p-2 text-slate-400 hover:text-slate-800 hover:bg-white rounded-lg transition shadow-sm border border-transparent hover:border-slate-200" title="Imprimir" onClick={() => window.print()}><Printer size={16}/></button>
                      <button onClick={() => handleDelete(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition shadow-sm border border-transparent hover:border-red-100" title="Apagar"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="p-20 text-center text-slate-400 font-black uppercase tracking-[5px] bg-slate-50 italic">
                    Nenhum documento arquivado na Cloud
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center border-b-4 border-blue-600">
              <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter">
                <FileBadge className="text-blue-400"/> {editingDoc ? 'Editar Documento' : 'Registar novo documento no arquivo'}
              </h3>
              <button onClick={() => setShowModal(false)} className="hover:bg-red-600 p-2 rounded-full transition"><X size={20}/></button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nome do documento *</label>
                <input 
                  className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-600 outline-none transition" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ex: Contrato de Arrendamento Loja 02"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tipo de documento</label>
                <select 
                  className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-600 outline-none transition" 
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value as any})}
                >
                  <option value="Administrativo">Administrativo</option>
                  <option value="Empresa">Empresa</option>
                  <option value="Corporativo">Corporativo</option>
                  <option value="Clientes">Clientes</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Responsável *</label>
                <input 
                  className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-blue-600 outline-none transition" 
                  value={formData.responsible} 
                  onChange={e => setFormData({...formData, responsible: e.target.value})} 
                  placeholder="Nome do Gestor"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Contacto</label>
                <input 
                  className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-mono focus:border-blue-600 outline-none transition" 
                  value={formData.contact} 
                  onChange={e => setFormData({...formData, contact: e.target.value})} 
                  placeholder="(+244) 9XX XXX XXX"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Associar Documento (Ref)</label>
                <input 
                  className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-mono focus:border-blue-600 outline-none transition" 
                  value={formData.associatedDocNo} 
                  onChange={e => setFormData({...formData, associatedDocNo: e.target.value})} 
                  placeholder="Ex: FT A/120"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Observações</label>
                <textarea 
                  className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl focus:border-blue-600 outline-none transition h-24 resize-none font-medium" 
                  value={formData.observations} 
                  onChange={e => setFormData({...formData, observations: e.target.value})} 
                  placeholder="Detalhes adicionais sobre o arquivamento..."
                />
              </div>
            </div>

            <div className="p-6 bg-slate-900 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-8 py-3 border-2 border-slate-700 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition">Cancelar</button>
              <button onClick={handleSaveDocument} disabled={isLoading} className="px-12 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-blue-500 transition transform active:scale-95 flex items-center gap-2 disabled:opacity-50">
                {isLoading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Gravar Ficha Cloud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCCURRENCE MODAL */}
      {showOccurrenceModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-orange-600 text-white p-6 flex justify-between items-center">
              <h3 className="font-black text-lg uppercase tracking-tight flex items-center gap-2"><History size={20}/> Registar Ocorrência</h3>
              <button onClick={() => setShowOccurrenceModal(false)} className="hover:bg-orange-700 p-1 rounded-full transition"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mb-2">
                <p className="text-[10px] font-black text-orange-800 uppercase mb-1">Documento Alvo:</p>
                <p className="font-bold text-slate-700">{activeDocForOccurrence?.name}</p>
              </div>
              <textarea 
                className="w-full p-4 border-2 border-slate-100 bg-slate-50 rounded-2xl focus:border-orange-500 outline-none transition h-32 resize-none text-sm font-medium" 
                placeholder="Descreva o evento ou nota importante..."
                value={occurrenceText}
                onChange={e => setOccurrenceText(e.target.value)}
                autoFocus
              />
              <button 
                onClick={handleAddOccurrence}
                disabled={isLoading}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18}/> : "Confirmar Registo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchivesManager;