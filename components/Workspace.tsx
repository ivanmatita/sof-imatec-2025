
import React, { useState, useEffect } from 'react';
import { Invoice, Purchase, InvoiceStatus, PurchaseType, InvoiceType, Client, WorkProject, PurchaseItem } from '../types';
import { formatCurrency, formatDate, exportToExcel, generateId } from '../utils';
import { supabase } from '../services/supabaseClient';
import { 
  Search, Download, Printer, Filter, BriefcaseBusiness, ArrowUpRight, 
  ArrowDownLeft, FileText, Eye, Building2, Layout, PlusCircle, Calendar, 
  User, Hash, MapPin, Phone, Info, X, CheckCircle, Save, RefreshCw, Calculator 
} from 'lucide-react';

interface WorkspaceProps {
  invoices: Invoice[];
  purchases: Purchase[];
  clients: Client[];
  onViewInvoice: (invoice: Invoice) => void;
  onRefreshPurchases?: () => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ invoices, purchases, clients, onViewInvoice, onRefreshPurchases }) => {
  const [mode, setMode] = useState<'MOVEMENTS' | 'PROJECTS'>('MOVEMENTS');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState(new Date().toISOString().split('T')[0]);
  const [dateEnd, setDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Work Projects State
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [newProject, setNewProject] = useState<Partial<WorkProject>>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    personnelPerDay: 0,
    totalPersonnel: 0,
    contact: '',
    observations: '',
    description: ''
  });

  useEffect(() => {
      loadProjects();
  }, []);

  async function loadProjects() {
      setIsLoadingProjects(true);
      try {
          const { data, error } = await supabase
            .from('locais_trabalho')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (data) {
              const mapped: WorkProject[] = data.map(d => ({
                  id: d.id,
                  clientId: d.cliente_id,
                  clientName: clients.find(c => c.id === d.cliente_id)?.name || 'Cliente Cloud',
                  startDate: d.data_abertura,
                  endDate: d.data_encerramento,
                  title: d.titulo,
                  code: d.codigo,
                  personnelPerDay: d.efectivos_dia,
                  totalPersonnel: d.total_efectivos,
                  location: d.localizacao,
                  description: d.descricao,
                  contact: d.contacto,
                  observations: d.observacoes
              }));
              setProjects(mapped);
          }
      } catch (err) { console.error("Erro ao carregar obras:", err); } finally { setIsLoadingProjects(false); }
  }

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.clientId || !newProject.title || !newProject.location) return alert("Preencha os campos obrigatórios (*)");

    setIsSaving(true);
    try {
        const { error: projectError } = await supabase.from('locais_trabalho').insert({
            cliente_id: newProject.clientId,
            data_abertura: newProject.startDate,
            data_encerramento: newProject.endDate,
            titulo: newProject.title,
            codigo: newProject.code || `OBR-${Math.floor(Math.random() * 1000)}`,
            efectivos_dia: newProject.personnelPerDay,
            total_efectivos: newProject.totalPersonnel,
            localizacao: newProject.location,
            descricao: newProject.description,
            contacto: newProject.contact,
            observacoes: newProject.observations
        });

        if (projectError) throw projectError;
        setShowProjectForm(false);
        setNewProject({ startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], personnelPerDay: 0, totalPersonnel: 0 });
        loadProjects();
        alert("Local de Trabalho registado com sucesso na Cloud!");
    } catch (err: any) { alert(`Erro ao gravar na Cloud: ${err.message}`); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div>
                 <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><BriefcaseBusiness/> Local de Trabalho</h1>
                 <p className="text-xs text-slate-500">Monitorização de obras e serviços (Sincronizado Cloud)</p>
            </div>
            <div className="flex gap-2">
                 <button onClick={() => setMode(mode === 'MOVEMENTS' ? 'PROJECTS' : 'MOVEMENTS')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition shadow-sm ${mode === 'PROJECTS' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                    <Layout size={18}/> {mode === 'PROJECTS' ? 'Ver Movimentos' : 'Ver local de trabalho'}
                 </button>
                 <button onClick={() => exportToExcel(projects, "Workspace")} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded text-sm font-bold hover:bg-green-700"><Download size={16}/> Exportar</button>
            </div>
        </div>

        {mode === 'MOVEMENTS' ? (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-5 rounded-2xl border-l-8 border-green-500 shadow-lg flex justify-between items-center">
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase">Entradas Acumuladas</p><h3 className="text-2xl font-black text-green-600">{formatCurrency(invoices.reduce((a,b)=>a+b.total,0))}</h3></div>
                        <ArrowUpRight className="text-green-200" size={48}/>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border-l-8 border-red-500 shadow-lg flex justify-between items-center">
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase">Saídas Acumuladas</p><h3 className="text-2xl font-black text-red-600">{formatCurrency(purchases.reduce((a,b)=>a+b.total,0))}</h3></div>
                        <ArrowDownLeft className="text-red-200" size={48}/>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border-l-8 border-blue-500 shadow-lg flex justify-between items-center">
                        <div><p className="text-[10px] font-bold text-slate-500 uppercase">Locais Activos (Cloud)</p><h3 className="text-2xl font-black text-blue-600">{projects.length}</h3></div>
                        <Building2 className="text-blue-200" size={48}/>
                    </div>
                </div>
                <div className="bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xl">
                    <table className="w-full text-left text-xs"><thead className="bg-slate-700 text-white uppercase font-black tracking-widest"><tr><th className="p-4">Data</th><th className="p-4">Doc</th><th className="p-4">Entidade</th><th className="p-4 text-right">Valor</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">{invoices.map(t => (<tr key={t.id} className="hover:bg-blue-50 transition-colors"><td className="p-4">{formatDate(t.date)}</td><td className="p-4 font-black text-blue-700">{t.number}</td><td className="p-4 font-medium">{t.clientName}</td><td className="p-4 text-right font-black text-green-700">{formatCurrency(t.total)}</td></tr>))}</tbody></table>
                </div>
            </div>
        ) : (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-lg">
                    <h2 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-widest text-sm"><MapPin className="text-indigo-600"/> Lista de Obras e Serviços na Cloud</h2>
                    <button onClick={() => setShowProjectForm(true)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-700 shadow-xl transition transform active:scale-95"><PlusCircle size={20}/> CRIAR LOCAL TRABALHO</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects.map(p => (
                        <div key={p.id} className="bg-white rounded-3xl shadow-xl border-2 border-slate-50 overflow-hidden hover:shadow-2xl transition-all group hover:-translate-y-2">
                            <div className="bg-indigo-900 text-white p-5 flex justify-between items-center">
                                <span className="font-mono text-[10px] font-black text-indigo-300 tracking-widest">{p.code}</span>
                                <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase">Activa</span>
                            </div>
                            <div className="p-8 space-y-5">
                                <div><h3 className="font-black text-slate-800 text-xl group-hover:text-indigo-700 transition-colors">{p.title}</h3><p className="text-xs text-slate-500 font-bold italic mt-1">{p.clientName}</p></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Abertura</p><span className="text-xs font-black text-slate-700">{formatDate(p.startDate)}</span></div>
                                    <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-100"><p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Efectivos</p><span className="text-xs font-black text-slate-700">{p.totalPersonnel}</span></div>
                                </div>
                                <p className="text-xs text-slate-600 flex items-start gap-2 font-medium"><MapPin size={16} className="text-indigo-500 shrink-0"/> {p.location}</p>
                                <button className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-3"><Info size={16}/> FICHA TÉCNICA</button>
                            </div>
                        </div>
                    ))}
                    {projects.length === 0 && !isLoadingProjects && (<div className="col-span-full py-24 text-center text-slate-400 border-4 border-dashed rounded-3xl bg-slate-50 font-black text-lg">Sem locais de trabalho sincronizados.</div>)}
                </div>
            </div>
        )}

        {showProjectForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
                    <div className="bg-slate-900 text-white p-6 flex justify-between items-center sticky top-0 z-10 shadow-lg">
                        <h3 className="font-black text-xl flex items-center gap-3 tracking-tight"><PlusCircle size={28} className="text-indigo-400"/> REGISTAR LOCAL DE TRABALHO</h3>
                        <button onClick={() => setShowProjectForm(false)} className="hover:bg-slate-800 p-2 rounded-full transition"><X size={24}/></button>
                    </div>
                    <form onSubmit={handleSaveProject} className="p-10 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-sans">
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">(*) Seleccionar Cliente</label>
                            <select required className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl outline-none focus:border-indigo-600 font-black text-slate-700" value={newProject.clientId || ''} onChange={e => setNewProject({...newProject, clientId: e.target.value})}>
                                <option value="">Seleccione um Cliente...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data de Abertura de Obra/Serviço</label>
                            <input type="date" required className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl font-black" value={newProject.startDate} onChange={e => setNewProject({...newProject, startDate: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Data de Encerramento de Obra/Serviço</label>
                            <input type="date" className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl font-black" value={newProject.endDate} onChange={e => setNewProject({...newProject, endDate: e.target.value})}/>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">(*) Titulo da Obra/Serviço</label>
                            <input required className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl outline-none focus:border-indigo-600 font-black text-slate-800 text-base" placeholder="Ex: Reforma Escritório Talatona" value={newProject.title || ''} onChange={e => setNewProject({...newProject, title: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">COD de Obra/Serv</label>
                            <input className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl outline-none font-mono" placeholder="OBR-2025-001" value={newProject.code || ''} onChange={e => setNewProject({...newProject, code: e.target.value})}/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Efectivos por Dia</label>
                                <input type="number" className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl text-center font-black" value={newProject.personnelPerDay || ''} onChange={e => setNewProject({...newProject, personnelPerDay: Number(e.target.value)})}/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total de Efectivos</label>
                                <input type="number" className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl text-center font-black" value={newProject.totalPersonnel || ''} onChange={e => setNewProject({...newProject, totalPersonnel: Number(e.target.value)})}/>
                            </div>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">(*) Localização da Obra/Serviço</label>
                            <input required className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl outline-none focus:border-indigo-600 font-black" placeholder="Endereço oficial" value={newProject.location || ''} onChange={e => setNewProject({...newProject, location: e.target.value})}/>
                        </div>
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição da Obra/Serviço</label>
                            <textarea className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl h-28 resize-none outline-none focus:border-indigo-600 font-medium" placeholder="Notas sobre o serviço..." value={newProject.description || ''} onChange={e => setNewProject({...newProject, description: e.target.value})}></textarea>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contacto da Obra/Serviço</label>
                            <input className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl font-mono" placeholder="(+000) 000 000 000" value={newProject.contact || ''} onChange={e => setNewProject({...newProject, contact: e.target.value})}/>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Observações</label>
                            <input className="w-full border-2 border-slate-200 bg-slate-50 p-4 rounded-2xl" placeholder="Notas de campo" value={newProject.observations || ''} onChange={e => setNewProject({...newProject, observations: e.target.value})}/>
                        </div>
                        <div className="col-span-2 flex justify-end gap-4 mt-8 pt-8 border-t-4 border-slate-100">
                            <button type="button" onClick={() => setShowProjectForm(false)} className="px-10 py-4 border-4 border-slate-200 rounded-3xl font-black text-slate-400">CANCELAR</button>
                            <button type="submit" disabled={isSaving} className="px-16 py-4 bg-indigo-600 text-white rounded-3xl font-black shadow-2xl flex items-center gap-3 transition transform active:scale-95 disabled:opacity-50">
                                {isSaving ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>} GRAVAR LOCAL NA CLOUD
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

export default Workspace;
