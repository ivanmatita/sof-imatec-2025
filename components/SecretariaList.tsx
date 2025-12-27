import React, { useState, useEffect } from 'react';
import { SecretariaDocument } from '../types';
import { formatDate, generateId } from '../utils';
import { printDocument, downloadPDF, downloadExcel } from "../utils/exportUtils";
import { supabase } from '../services/supabaseClient';
import { Search, Plus, Printer, FileText, Download, Lock, Unlock, Mail, Edit2, Copy, Trash2, X, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

interface SecretariaListProps {
  documents: SecretariaDocument[];
  onCreateNew: () => void;
  onEdit: (doc: SecretariaDocument) => void;
  onDelete?: (doc: SecretariaDocument) => void; 
}

const SecretariaList: React.FC<SecretariaListProps> = ({ documents: localDocs, onCreateNew, onEdit, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [previewDoc, setPreviewDoc] = useState<SecretariaDocument | null>(null);
  const [dbDocs, setDbDocs] = useState<SecretariaDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('secretaria_documentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setFetchError(error.message);
      } else if (data) {
        const mapped: SecretariaDocument[] = data.map(d => ({
          id: d.id,
          type: d.tipo || 'Carta',
          seriesId: d.serie_id || '',
          seriesCode: d.serie_codigo || '',
          number: d.numero || 'S/N',
          date: d.data_doc || '',
          destinatarioNome: d.destinatario_nome || '',
          destinatarioIntro: d.destinatario_intro || '',
          assunto: d.assunto || '',
          corpo: d.corpo || '',
          confidencial: d.confidencial || false,
          imprimirPagina: d.imprimir_pagina || true,
          createdBy: d.criado_por || 'Admin',
          createdAt: d.created_at || '',
          isLocked: d.bloqueado || false,
          departamento: d.departamento || ''
        }));
        setDbDocs(mapped);
      }
    } catch (err: any) {
      // REGRA: Captura erros de fetch (falha de rede, timeout, etc)
      let message = "Erro desconhecido ao carregar documentos.";
      if (err instanceof TypeError || (err.message && err.message.toLowerCase().includes('fetch'))) {
          message = "Erro de ligação: Não foi possível alcançar o servidor. Verifique a sua internet ou a ligação à Cloud.";
      } else if (err.message) {
          message = err.message;
      }
      setFetchError(message);
      console.warn("Falha ao carregar documentos da secretaria:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const allDocuments = [...dbDocs, ...localDocs].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  const filteredDocs = allDocuments.filter(doc => 
    doc.assunto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.destinatarioNome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrintDoc = (doc: SecretariaDocument) => {
      setPreviewDoc(doc);
  };

  const renderPreviewModal = () => {
      if (!previewDoc) return null;

      return (
          <div className="fixed inset-0 bg-slate-800 z-[100] overflow-y-auto flex flex-col items-center animate-in fade-in duration-200">
              <div className="w-full bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg print:hidden">
                  <h2 className="text-lg font-bold flex items-center gap-2"><Printer/> Visualização de Impressão (A4)</h2>
                  <div className="flex gap-3">
                      <button onClick={() => printDocument("docPrintArea")} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 font-bold"><Printer size={18}/> Imprimir Agora</button>
                      <button onClick={() => setPreviewDoc(null)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded hover:bg-slate-600"><ArrowLeft size={18}/> Fechar</button>
                  </div>
              </div>
              
              <div id="docPrintArea" className="bg-white shadow-2xl my-8 p-[25mm] w-[210mm] min-h-[297mm] text-black font-serif text-[11pt] leading-relaxed relative print-container">
                  <div className="flex justify-between items-start mb-12">
                      <div className="w-32 h-16 bg-gray-100 flex items-center justify-center text-xs text-gray-400 border">LOGO</div>
                      <div className="text-right text-xs">
                          <p className="font-bold uppercase">C & V - COMERCIO GERAL</p>
                          <p>Luanda, Angola</p>
                      </div>
                  </div>
                  <div className="ml-[80mm] mb-12">
                      <p className="font-bold">{previewDoc.destinatarioIntro}</p>
                      <p className="font-bold uppercase text-lg">{previewDoc.destinatarioNome}</p>
                  </div>
                  <div className="text-right mb-8">
                      <p>{previewDoc.dateExtended || `Luanda, ${formatDate(previewDoc.date)}`}</p>
                      <p className="mt-2 font-bold">Nossa Ref: {previewDoc.number}</p>
                  </div>
                  <div className="mb-8 font-bold uppercase">ASSUNTO: {previewDoc.assunto}</div>
                  <div className="text-justify min-h-[100mm]" dangerouslySetInnerHTML={{ __html: previewDoc.corpo }}></div>
                  <div className="mt-12 text-center w-[80mm] mx-auto">
                      <p className="mb-8">Atenciosamente,</p>
                      <div className="border-t border-black pt-2"><p className="font-bold">A Gerência</p></div>
                  </div>
              </div>
              <style>{`@media print { body * { visibility: hidden; } .print-container, .print-container * { visibility: visible; } .print-container { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 25mm; } }`}</style>
          </div>
      );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 p-6 bg-slate-50 min-h-screen">
      {renderPreviewModal()}

      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600"/> Secretaria Digital
            {isLoading && <RefreshCw size={16} className="animate-spin text-blue-500 ml-2"/>}
          </h1>
          <p className="text-xs text-slate-500">Gestão de cartas, declarações e memorandos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadDocuments} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border text-sm font-bold flex items-center gap-2">
            <RefreshCw size={16}/> Sincronizar
          </button>
          <button onClick={onCreateNew} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-bold flex items-center gap-2 shadow-lg">
            <Plus size={16}/> Criar Documento
          </button>
        </div>
      </div>

      {fetchError && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-start gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="shrink-0 mt-0.5" size={18}/>
              <div>
                  <p className="font-bold text-sm">Atenção</p>
                  <p className="text-xs opacity-80">{fetchError}</p>
                  <button onClick={loadDocuments} className="mt-2 text-xs underline font-bold hover:text-red-900 transition-colors">Tentar novamente</button>
              </div>
          </div>
      )}

      <div className="bg-white p-3 border border-slate-200 rounded-lg flex items-center gap-3 shadow-sm">
        <Search className="text-slate-400" size={18}/>
        <input 
          className="flex-1 outline-none text-sm" 
          placeholder="Pesquisar por assunto, número ou destinatário..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-700 text-white font-bold uppercase tracking-wider">
              <tr>
                <th className="p-4">Data</th>
                <th className="p-4">Número</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Assunto</th>
                <th className="p-4">Destinatário</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-blue-50 transition-colors">
                  <td className="p-4 font-medium">{formatDate(doc.date)}</td>
                  <td className="p-4 font-mono font-bold text-blue-600">{doc.number}</td>
                  <td className="p-4">
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold">{doc.type}</span>
                  </td>
                  <td className="p-4 font-medium max-w-[300px] truncate">{doc.assunto}</td>
                  <td className="p-4 font-bold">{doc.destinatarioNome}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handlePrintDoc(doc)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Visualizar/Imprimir"><Printer size={16}/></button>
                      <button onClick={() => onEdit(doc)} className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded" title="Editar"><Edit2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && !isLoading && (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-400 italic bg-slate-50">Nenhum documento encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SecretariaList;