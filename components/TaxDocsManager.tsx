
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TaxDocument, TaxOccurrence } from '../types';
import { generateId, formatDate, formatCurrency } from '../utils';
import { supabase } from '../services/supabaseClient';
import { 
  Plus, Search, Printer, Trash2, Edit3, 
  X, Save, Upload, History, MessageSquare, 
  RefreshCw, Calculator, FileCheck, Loader2, Database
} from 'lucide-react';

const TaxDocsManager: React.FC = () => {
  const [documents, setDocuments] = useState<TaxDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<TaxDocument | null>(null);
  const [activeDocForOccurrence, setActiveDocForOccurrence] = useState<TaxDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<TaxDocument>>({
    name: '',
    description: '',
    reference: '',
    amountPaid: 0,
    observations: '',
    dateDoc: new Date().toISOString().split('T')[0],
    dateContab: new Date().toISOString().split('T')[0],
  });

  const [occurrenceText, setOccurrenceText] = useState('');

  // --- SUPABASE SYNC ---
  useEffect(() => {
    fetchTaxDocs();
  }, []);

  async function fetchTaxDocs() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('documentos_impostos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        const mapped: TaxDocument[] = data.map(d => ({
          id: d.id,
          dateDoc: d.data_doc,
          dateContab: d.data_contab,
          name: d.nome,
          description: d.descricao || '',
          reference: d.referencia,
          amountPaid: Number(d.valor_pago || 0),
          observations: d.observacoes || '',
          fileUrl: d.file_url,
          fileName: d.file_name,
          occurrences: d.ocorrencias || []
        }));
        setDocuments(mapped);
      }
    } catch (err: any) {
      console.error("Erro ao carregar documentos de impostos:", err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreate = () => {
    setEditingDoc(null);
    setFormData({
      name: '',
      description: '',
      reference: '',
      amountPaid: 0,
      observations: '',
      dateDoc: new Date().toISOString().split('T')[0],
      dateContab: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const handleSaveDocument = async () => {
    if (!formData.name || !formData.reference) return alert("Preencha o nome do documento e a referência.");

    setIsLoading(true);
    const docId = editingDoc?.id || generateId();
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docId);

    const payload = {
      data_doc: formData.dateDoc,
      data_contab: formData.dateContab,
      nome: formData.name,
      descricao: formData.description,
      referencia: formData.reference,
      valor_pago: formData.amountPaid,
      observacoes: formData.observations,
      file_url: formData.fileUrl,
      file_name: formData.fileName,
      empresa_id: '00000000-0000-0000-0000-000000000001'
    };

    try {
      const { error } = await supabase
        .from('documentos_impostos')
        .upsert(isValidUUID ? { ...payload, id: docId } : payload);

      if (error) throw error;

      await fetchTaxDocs();
      setShowModal(false);
      setEditingDoc(null);
      alert("Documento de imposto salvo com sucesso na Cloud!");
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Deseja apagar este registo de imposto da Cloud?")) {
      setIsLoading(true);
      try {
        const { error } = await supabase.from('documentos_impostos').delete().eq('id', id);
        if (error) throw error;
        await fetchTaxDocs();
        alert("Registo eliminado com sucesso.");
      } catch (err: any) {
        alert("Erro ao eliminar: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddOccurrence = async () => {
    if (!occurrenceText || !activeDocForOccurrence) return;

    setIsLoading(true);
    const newOcc: TaxOccurrence = {
      id: generateId(),
      date: new Date().toISOString(),
      description: occurrenceText,
      user: 'Admin'
    };

    const updatedOccurrences = [newOcc, ...(activeDocForOccurrence.occurrences || [])];

    try {
      const { error } = await supabase
        .from('documentos_impostos')
        .update({ ocorrencias: updatedOccurrences })
        .eq('id', activeDocForOccurrence.id);

      if (error) throw error;

      await fetchTaxDocs();
      setOccurrenceText('');
      setShowOccurrenceModal(false);
    } catch (err: any) {
      alert("Erro ao adicionar ocorrência: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        // Nota: Em um sistema real, aqui faríamos upload para o Supabase Storage.
        // Como mantemos as funções originais, simulamos a URL do arquivo.
        const url = URL.createObjectURL(file);
        setFormData(prev => ({ ...prev, fileUrl: url, fileName: file.name }));
        alert("Documento selecionado para upload!");
    }
  };

  const deleteUpload = async (id: string) => {
      if(confirm("Deseja apagar o arquivo anexo da Cloud?")) {
          setIsLoading(true);
          try {
              const { error } = await supabase
                .from('documentos_impostos')
                .update({ file_url: null, file_name: null })
                .eq('id', id);
              
              if (error) throw error;
              await fetchTaxDocs();
              if (editingDoc?.id === id) setFormData(prev => ({ ...prev, fileUrl: undefined, fileName: undefined }));
          } catch (err: any) {
              alert("Erro ao apagar anexo: " + err.message);
          } finally {
              setIsLoading(false);
          }
      }
  };

  const printFile = (url?: string) => {
      if (!url) return alert("Nenhum arquivo para imprimir.");
      const win = window.open(url, '_blank');
      win?.focus();
      win?.print();
  };

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => 
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.reference.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [documents, searchTerm]);

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase tracking-tighter">
            <Calculator className="text-indigo-600" size={32}/> Documentos de Impostos
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
            <Database size={12}/> Sincronizado com Supabase Cloud
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchTaxDocs}
            className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition"
            title="Recarregar"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""}/>
          </button>
          <button 
            onClick={handleCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 active:scale-95"
          >
            <Plus size={18}/> Registar doc impostos
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
          <input 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
            placeholder="Pesquisar por nome do documento ou referência..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={() => window.print()} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-900 transition shadow-md">
            <Printer size={16}/> Imprimir Lista
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden relative">
        {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={40}/>
            </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" id="tax-docs-table">
            <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest border-b border-slate-800">
              <tr>
                <th className="p-5">Data Doc.</th>
                <th className="p-5">Nome do Documento</th>
                <th className="p-5">Referência</th>
                <th className="p-5 text-right">Valor Pago</th>
                <th className="p-5 text-center">Anexo</th>
                <th className="p-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-indigo-50/50 transition-colors group">
                  <td className="p-5 font-mono text-slate-500">{formatDate(doc.dateDoc)}</td>
                  <td className="p-5">
                      <div className="font-black text-slate-800 uppercase tracking-tight">{doc.name}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{doc.description}</div>
                  </td>
                  <td className="p-5 font-mono text-indigo-600 font-bold">{doc.reference}</td>
                  <td className="p-5 text-right font-black text-slate-800">{formatCurrency(doc.amountPaid)}</td>
                  <td className="p-5 text-center">
                    {doc.fileUrl ? (
                        <div className="flex items-center justify-center gap-1">
                            <span className="text-[9px] font-bold text-emerald-600 uppercase">Sim</span>
                            <button onClick={() => deleteUpload(doc.id)} className="text-red-400 hover:text-red-600"><X size={12}/></button>
                        </div>
                    ) : <span className="text-[9px] font-bold text-slate-300 uppercase">Não</span>}
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => { setEditingDoc(doc); setFormData(doc); setShowModal(true); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition border border-transparent hover:border-indigo-100 shadow-sm"><Edit3 size={16}/></button>
                      <button onClick={() => { setActiveDocForOccurrence(doc); setShowOccurrenceModal(true); }} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-white rounded-lg transition border border-transparent hover:border-orange-100 shadow-sm"><MessageSquare size={16}/></button>
                      <button onClick={() => printFile(doc.fileUrl)} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-white rounded-lg transition border border-transparent hover:border-slate-200 shadow-sm"><Printer size={16}/></button>
                      <button onClick={() => handleDelete(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition border border-transparent hover:border-red-100 shadow-sm"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="p-20 text-center text-slate-300 font-black uppercase tracking-[5px] bg-slate-50 italic">
                    Nenhum documento de imposto registado na Cloud
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
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 text-white p-6 flex justify-between items-center border-b-4 border-indigo-600">
              <h3 className="font-black text-xl flex items-center gap-3 uppercase tracking-tighter">
                <FileCheck className="text-indigo-400"/> {editingDoc ? 'Editar Documento' : 'Registar Documento de Imposto'}
              </h3>
              <button onClick={() => setShowModal(false)} className="hover:bg-red-600 p-2 rounded-full transition"><X size={20}/></button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Data do Documento</label>
                <input type="date" className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-indigo-600 outline-none" value={formData.dateDoc} onChange={e => setFormData({...formData, dateDoc: e.target.value})}/>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Data Contab.</label>
                <input type="date" className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-indigo-600 outline-none" value={formData.dateContab} onChange={e => setFormData({...formData, dateContab: e.target.value})}/>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nome do documento *</label>
                <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-bold focus:border-indigo-600 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Guia de Pagamento IVA - Maio/2024"/>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Descrição do documento</label>
                <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-medium focus:border-indigo-600 outline-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Breve descrição da natureza do imposto"/>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Referência Documento *</label>
                <input className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-mono focus:border-indigo-600 outline-none" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} placeholder="Ex: REF-123456789"/>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Valor Pago</label>
                <input type="number" className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl font-black focus:border-indigo-600 outline-none text-indigo-700" value={formData.amountPaid} onChange={e => setFormData({...formData, amountPaid: Number(e.target.value)})}/>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Upload Documento</label>
                <div className="flex gap-2">
                    <div className="flex-1 p-3 border-2 border-dashed border-slate-200 bg-slate-50 rounded-xl flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium truncate">{formData.fileName || 'Nenhum arquivo selecionado'}</span>
                        {formData.fileUrl && <button onClick={() => deleteUpload(editingDoc?.id || '')} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>}
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-100 text-indigo-700 px-4 rounded-xl font-bold text-xs uppercase flex items-center gap-2 hover:bg-indigo-200 transition">
                        <Upload size={16}/> {formData.fileUrl ? 'Alterar' : 'Upload'}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange}/>
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Observações</label>
                <textarea className="w-full p-3 border-2 border-slate-100 bg-slate-50 rounded-xl h-24 resize-none outline-none focus:border-indigo-600 font-medium" value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} placeholder="Notas adicionais..."></textarea>
              </div>
            </div>

            <div className="p-6 bg-slate-900 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-8 py-3 border-2 border-slate-700 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition">Cancelar</button>
              <button onClick={handleSaveDocument} disabled={isLoading} className="px-12 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-500 transition transform active:scale-95 flex items-center gap-2 disabled:opacity-50">
                {isLoading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} {editingDoc ? 'Atualizar Registo Cloud' : 'Registar Agora Cloud'}
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
                <p className="text-[10px] font-black text-orange-800 uppercase mb-1">Doc Relacionado:</p>
                <p className="font-bold text-slate-700 truncate">{activeDocForOccurrence?.name}</p>
              </div>
              <textarea 
                className="w-full p-4 border-2 border-slate-100 bg-slate-50 rounded-2xl focus:border-orange-500 outline-none transition h-32 resize-none text-sm font-medium" 
                placeholder="Descreva o evento ou nota importante sobre este imposto..."
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

export default TaxDocsManager;
