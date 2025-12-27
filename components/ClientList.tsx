
import React, { useState, useEffect, useMemo } from 'react';
import { Client, Invoice, Company, WorkLocation } from '../types';
import { generateId, formatCurrency, formatDate } from '../utils';
import { supabase } from '../services/supabaseClient';
// Fix: Added missing Edit2 and Save icons to lucide-react imports to resolve name errors in ActionMenu and Form submit button
import { Search, MapPin, ArrowLeft, X, RefreshCw, UserPlus, Printer, Database, Loader2, AlertTriangle, FileSpreadsheet, Calendar, DollarSign, User, Mail, Globe, Building2, Landmark, CheckCircle, FileSearch, History, CreditCard, MoreVertical, Edit2, Save } from 'lucide-react';

interface ClientListProps {
  clients: Client[];
  onSaveClient: (client: Client) => void;
  initialSelectedClientId?: string | null;
  onClearSelection?: () => void;
  companyId?: string;
  currentCompany?: Company;
  invoices?: Invoice[];
  workLocations?: WorkLocation[];
}

const ClientList: React.FC<ClientListProps> = ({ 
  clients, onSaveClient, initialSelectedClientId, onClearSelection, companyId,
  currentCompany, invoices = [], workLocations = []
}) => {
  const [view, setView] = useState<'LIST' | 'FORM' | 'DETAILS'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [dbClients, setDbClients] = useState<Client[]>([]);
  const [activeEmpresaId, setActiveEmpresaId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  useEffect(() => {
    inicializarSupabase();
  }, []);

  useEffect(() => {
    if (initialSelectedClientId) {
        const found = clients.find(c => c.id === initialSelectedClientId);
        if (found) {
            setSelectedClient(found);
            setView('DETAILS');
        }
    }
  }, [initialSelectedClientId, clients]);

  async function inicializarSupabase() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      let { data: empresas, error: empError } = await supabase
        .from('empresas')
        .select('id')
        .limit(1);

      let currentEmpId = '';

      if (empError) {
        const msg = empError.message || JSON.stringify(empError);
        console.error("Erro ao buscar empresa:", msg);
        setErrorMessage(`Falha ao conectar com o banco: ${msg}`);
      } else if (empresas && empresas.length > 0) {
        currentEmpId = empresas[0].id;
      } else {
        const { data: newEmp, error: createEmpError } = await supabase
          .from('empresas')
          .insert({
            nome: 'C & V - COMERCIO GERAL',
            nif: '5000780316'
          })
          .select()
          .single();
        
        if (createEmpError) {
            console.error("Erro ao criar empresa padrão:", createEmpError.message);
        } else if (newEmp) {
            currentEmpId = newEmp.id;
        }
      }

      if (currentEmpId) {
          setActiveEmpresaId(currentEmpId);
      }

      await carregarClientesSupabase();
    } catch (err: any) {
      console.error("Falha na inicialização:", err.message || JSON.stringify(err));
      setErrorMessage("Erro de rede ou permissão ao acessar o banco.");
    } finally {
      setIsLoading(false);
    }
  }

  async function carregarClientesSupabase() {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        const msg = error.message || JSON.stringify(error);
        console.error("Erro ao buscar clientes:", msg);
        setErrorMessage(`Erro ao carregar lista cloud: ${msg}`);
        return;
      }

      if (data) {
        const mapped: Client[] = data.map(c => ({
          id: c.id,
          name: c.nome || 'Sem Nome',
          email: c.email || '',
          phone: c.telefone || '',
          vatNumber: c.nif || '999999999',
          address: c.endereco || '',
          city: c.localidade || 'Luanda', 
          country: c.pais || 'Angola',
          province: c.provincia || 'Luanda',
          municipality: c.municipio || '',
          postalCode: c.codigo_postal || '',
          webPage: c.web_page || '',
          clientType: c.tipo_cliente || 'Nao grupo nacional',
          iban: c.iban || '',
          isAccountShared: c.conta_partilhada || false,
          initialBalance: Number(c.saldo_inicial || 0),
          accountBalance: 0,
          transactions: []
        }));
        
        setDbClients(mapped);
        
        mapped.forEach(c => {
            const exists = clients.find(existing => existing.id === c.id);
            if (!exists) {
                onSaveClient(c);
            }
        });
      }
    } catch (err: any) {
      console.error("Erro inesperado ao carregar:", err.message || JSON.stringify(err));
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return alert('Nome é obrigatório');
    
    let empId = activeEmpresaId;
    if (!empId) {
        const { data: empresas } = await supabase.from('empresas').select('id').limit(1);
        if (empresas && empresas.length > 0) {
            empId = empresas[0].id;
            setActiveEmpresaId(empId);
        }
    }

    if (!empId) return alert('Erro: Nenhuma empresa configurada no banco de dados. Contacte o suporte.');

    setIsLoading(true);
    setErrorMessage(null);
    
    const payload: any = {
      nome: formData.name,
      email: formData.email || '',
      telefone: formData.phone || '',
      nif: formData.vatNumber || '999999999',
      endereco: formData.address || '',
      localidade: formData.city || 'Luanda',
      codigo_postal: formData.postalCode || '',
      provincia: formData.province || 'Luanda',
      municipio: formData.municipality || '',
      pais: 'Angola',
      web_page: formData.webPage || '',
      tipo_cliente: formData.clientType || 'Nao grupo nacional',
      empresa_id: empId 
    };

    if (formData.id) {
      payload.id = formData.id;
    }

    try {
      const { data, error } = await supabase
        .from('clientes')
        .upsert(payload)
        .select();

      if (error) {
        const msg = error.message || JSON.stringify(error);
        console.error("Erro ao salvar no Supabase:", msg);
        setErrorMessage(`Erro ao persistir na nuvem: ${msg}`);
        alert(`Erro de Sincronização Cloud: ${msg}`);
      } else {
          const savedData = data?.[0];
          const syncClient: Client = {
            id: savedData?.id || formData.id || generateId(),
            name: savedData?.nome || formData.name!,
            vatNumber: savedData?.nif || formData.vatNumber || '999999999',
            email: savedData?.email || formData.email || '',
            phone: savedData?.telefone || formData.phone || '',
            address: savedData?.endereco || formData.address || '',
            city: savedData?.localidade || formData.city || 'Luanda',
            country: 'Angola',
            province: savedData?.provincia || formData.province || 'Luanda',
            municipality: savedData?.municipio || formData.municipality || '',
            postalCode: savedData?.codigo_postal || formData.postalCode || '',
            webPage: savedData?.web_page || formData.webPage || '',
            clientType: savedData?.tipo_cliente || formData.clientType || 'Nao grupo nacional',
            accountBalance: 0,
            transactions: []
          };

          onSaveClient(syncClient);
          setDbClients(prev => {
              const filtered = prev.filter(c => c.id !== syncClient.id);
              return [syncClient, ...filtered];
          });
          setView('LIST');
          setFormData({});
      }
    } catch (err: any) {
      console.error("Erro inesperado:", err.message || JSON.stringify(err));
    } finally {
      setIsLoading(false);
    }
  };

  const allDisplayClients = useMemo(() => {
    const combined = [...dbClients, ...clients];
    const unique = Array.from(new Map(combined.map(c => [c.id, c])).values());
    return unique.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vatNumber.includes(searchTerm)
    );
  }, [dbClients, clients, searchTerm]);

  const renderDetails = () => {
    if (!selectedClient) return null;
    
    const clientInvoices = invoices.filter(inv => inv.clientId === selectedClient.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalCredit = clientInvoices.reduce((acc, inv) => acc + (inv.paidAmount || 0), 0);
    const totalDebit = clientInvoices.reduce((acc, inv) => acc + inv.total, 0);
    const accumulatedBalance = totalDebit - totalCredit;

    const f = (n: number) => formatCurrency(n).replace('Kz', '').trim();

    return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-in slide-in-from-right flex-1 flex flex-col font-sans">
          <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0 print:hidden">
            <div className="flex items-center gap-4">
              <button onClick={() => { setView('LIST'); onClearSelection?.(); }} className="p-2 hover:bg-slate-200 rounded-full transition text-slate-600"><ArrowLeft/></button>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Conta Corrente / Extrato</h2>
            </div>
            <div className="flex gap-4">
               <button className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 shadow-md transition-transform hover:scale-110" title="Exportar XLSX"><FileSpreadsheet size={20}/></button>
               <button className="w-10 h-10 rounded-full bg-yellow-400 text-white flex items-center justify-center hover:bg-yellow-500 shadow-md transition-transform hover:scale-110" title="Relatório Mensal"><Calendar size={20}/></button>
               <button className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 shadow-md transition-transform hover:scale-110" title="Resumo Financeiro"><DollarSign size={20}/></button>
               <button className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 shadow-md transition-transform hover:scale-110" title="Imprimir" onClick={() => window.print()}><Printer size={20}/></button>
            </div>
          </div>

          <div className="p-8 flex-1 overflow-auto bg-white" id="extrato-cliente">
            <div className="flex justify-between items-start mb-8 border-b-2 border-slate-100 pb-6">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data de Emissão</p>
                        <p className="text-xs font-bold text-slate-700">{new Date().toLocaleString('pt-AO')}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">ADMINISTRADOR DO SISTEMA</p>
                    </div>
                    <div className="pt-2">
                        <h1 className="text-xl font-black text-slate-900 uppercase">Extrato Cliente</h1>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">COD. {selectedClient.id.substring(0,4)} {selectedClient.name.substring(0,10).toUpperCase()}</p>
                    </div>
                </div>

                <div className="text-right space-y-4">
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nº Contribuinte</p>
                        <p className="text-lg font-black text-slate-900">{selectedClient.vatNumber}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase italic">Descrição do extrato Conta Corrente</p>
                        <p className="text-[10px] text-slate-500 font-bold">Período: Inicio a {new Date().toLocaleDateString('pt-AO')}</p>
                     </div>
                     <div className="bg-slate-100 p-4 rounded border border-slate-200 text-left min-w-[300px]">
                         <h3 className="font-black text-slate-800 uppercase text-xs border-b border-slate-300 pb-1 mb-2">{currentCompany?.name}</h3>
                         <div className="text-[10px] text-slate-600 space-y-0.5">
                             <p>{currentCompany?.address}</p>
                             <p>Angola</p>
                         </div>
                     </div>
                </div>
            </div>

            <div className="flex justify-between items-end border-b-2 border-slate-300 pb-2 mb-2">
                 <div className="flex items-center gap-4">
                     <h2 className="text-sm font-black text-slate-900">Conta Corrente de Cliente</h2>
                     <span className="text-sm font-black text-blue-700">AOA</span>
                 </div>
                 <div className="flex items-center gap-8">
                     <span className="text-[10px] font-bold text-slate-400">[ AOA ]</span>
                     <div className="flex items-center gap-4">
                         <span className="text-sm font-bold text-slate-700">Saldo Acumulado Geral</span>
                         <span className="text-sm font-black text-slate-900">{f(accumulatedBalance)}</span>
                     </div>
                 </div>
            </div>

            <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                    <tr className="border-b border-slate-200 font-bold text-slate-400">
                        <th className="py-2">Data Valor<br/>Data Documento</th>
                        <th className="py-2">File Interno<br/>File Cliente</th>
                        <th className="py-2">URN<br/>EndService</th>
                        <th className="py-2">Doc Nº<br/>OriginatingOn</th>
                        <th className="py-2">Descricao<br/>Doc. Suporte</th>
                        <th className="py-2 text-right">Credito</th>
                        <th className="py-2 text-right">Debito</th>
                        <th className="py-2 text-right">Saldo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    <tr className="bg-white font-bold">
                        <td colSpan={5} className="py-2 text-right pr-4 italic text-slate-500 uppercase">Acumulados do Período</td>
                        <td className="py-2 text-right border-t-2 border-slate-900">{f(totalCredit)}</td>
                        <td className="py-2 text-right border-t-2 border-slate-900">{f(totalDebit)}</td>
                        <td className="py-2 text-right border-t-2 border-slate-900">{f(accumulatedBalance)}</td>
                    </tr>

                    {clientInvoices.map((inv, idx) => {
                        const local = workLocations.find(l => l.id === inv.workLocationId)?.name || 'Obra Generica';
                        return (
                            <tr key={inv.id} className={`${idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'} hover:bg-blue-50 transition-colors`}>
                                <td className="py-3 px-1 font-bold">
                                    {formatDate(inv.date)}<br/>
                                    <span className="font-normal text-slate-400">{formatDate(inv.date)}</span>
                                </td>
                                <td className="py-3 px-1 font-bold">
                                    {local}<br/>
                                    <span className="font-normal text-slate-400">---</span>
                                </td>
                                <td className="py-3 px-1">
                                    ---<br/>
                                    <span className="font-normal text-slate-400">---</span>
                                </td>
                                <td className="py-3 px-1 font-bold">
                                    {inv.number}<br/>
                                    <span className="font-normal text-slate-400">---</span>
                                </td>
                                <td className="py-3 px-1 font-bold uppercase">
                                    {inv.type} Emitida<br/>
                                    <span className="font-normal text-slate-400">---</span>
                                </td>
                                <td className="py-3 px-1 text-right font-bold">{f(inv.paidAmount || 0)}</td>
                                <td className="py-3 px-1 text-right font-bold">{f(inv.total)}</td>
                                <td className="py-3 px-1 text-right font-bold">0,00</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
            
            <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-center text-[8px] text-slate-400 font-mono">
                <div>Documento processado por computador • IMATEC SOFTWARE</div>
                <div className="flex gap-4">
                    <span>Email: {currentCompany?.email}</span>
                    <span>Contacto: {currentCompany?.phone}</span>
                </div>
            </div>
          </div>
        </div>
    );
  };

  const ActionMenu = ({ client }: { client: Client }) => {
    return (
      <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
          <div className="p-2 border-b bg-slate-900 text-white font-black text-[10px] uppercase text-center tracking-widest">Opções de Gestão</div>
          <div className="max-h-80 overflow-y-auto">
              <button onClick={() => { setFormData(client); setView('FORM'); setOpenActionId(null); }} className="w-full text-left p-3 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b">
                  <Edit2 size={14} className="text-blue-600"/> <span className="text-xs font-bold text-slate-700">Editar Cliente</span>
              </button>
              <button onClick={() => { setSelectedClient(client); setView('DETAILS'); setOpenActionId(null); }} className="w-full text-left p-3 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b">
                  <History size={14} className="text-indigo-600"/> <span className="text-xs font-bold text-slate-700">Conta Corrente</span>
              </button>
              <button className="w-full text-left p-3 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b text-slate-500">
                  <Mail size={14}/> <span className="text-xs font-bold">Envio Conta Corrente Email</span>
              </button>
              <div className="p-3 border-b flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-3">
                      <Globe size={14} className="text-emerald-600"/>
                      <span className="text-xs font-bold text-slate-700">Autoriza CC Partilhada</span>
                  </div>
                  <div className="flex gap-1 border rounded-lg overflow-hidden bg-white">
                      <button className={`px-2 py-1 text-[9px] font-black ${client.isAccountShared ? 'bg-emerald-600 text-white' : 'hover:bg-slate-100'}`}>SIM</button>
                      <button className={`px-2 py-1 text-[9px] font-black ${!client.isAccountShared ? 'bg-slate-400 text-white' : 'hover:bg-slate-100'}`}>NÃO</button>
                  </div>
              </div>
              <button className="w-full text-left p-3 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b text-slate-500">
                  <CheckCircle size={14}/> <span className="text-xs font-bold">CadastroV5</span>
              </button>
              <button className="w-full text-left p-3 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b text-slate-500">
                  <DollarSign size={14}/> <span className="text-xs font-bold">Saldo Inicial CC</span>
              </button>
              <button className="w-full text-left p-3 hover:bg-blue-50 flex items-center gap-3 transition-colors border-b text-slate-500">
                  <FileSearch size={14}/> <span className="text-xs font-bold">Documentos Liquidados</span>
              </button>
              <button className="w-full text-left p-3 hover:bg-blue-50 flex items-center gap-3 transition-colors text-slate-500">
                  <CreditCard size={14}/> <span className="text-xs font-bold">Registo de Iban</span>
              </button>
          </div>
          <button onClick={() => setOpenActionId(null)} className="w-full p-2 bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors text-[9px] font-black uppercase">Fechar Menu</button>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in h-full flex flex-col">
      {view === 'LIST' && (
        <>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                Gestão de Clientes
                {isLoading && <RefreshCw size={16} className="animate-spin text-blue-500"/>}
              </h1>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Database size={12}/> Sincronizado com Supabase Cloud
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={carregarClientesSupabase} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-bold flex items-center gap-2">
                <RefreshCw size={16}/> Sincronizar
              </button>
              <button onClick={() => { setFormData({}); setView('FORM'); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-bold flex items-center gap-2 shadow-lg">
                <UserPlus size={16}/> Criar Cliente
              </button>
            </div>
          </div>

          {errorMessage && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 flex items-center gap-2 text-sm">
                  <AlertTriangle size={16}/> {errorMessage}
              </div>
          )}

          <div className="bg-white p-3 border border-slate-200 rounded-lg flex items-center gap-3 shadow-sm">
            <Search className="text-slate-400" size={18}/>
            <input 
              className="flex-1 outline-none text-sm" 
              placeholder="Pesquisar por nome ou NIF..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-visible shadow-sm flex-1">
            <table className="w-full text-left text-xs" id="tabela-clientes">
              <thead className="bg-slate-700 text-white font-bold uppercase">
                <tr>
                  <th className="p-3 w-16">ID</th>
                  <th className="p-3">Nome / Entidade</th>
                  <th className="p-3">NIF</th>
                  <th className="p-3">Tipo de Cliente</th>
                  <th className="p-3">Localidade</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allDisplayClients.map(c => (
                  <tr key={c.id} className="hover:bg-blue-50 transition-colors">
                    <td className="p-3 font-mono text-slate-400">#{c.id.toString().substring(0,4)}</td>
                    <td className="p-3 font-bold text-slate-800">{c.name}</td>
                    <td className="p-3 font-mono text-slate-600">{c.vatNumber}</td>
                    <td className="p-3 uppercase text-[10px] font-black text-slate-500">{c.clientType}</td>
                    <td className="p-3">{c.city || '---'}</td>
                    <td className="p-3 text-right relative">
                        <button 
                            onClick={() => setOpenActionId(openActionId === c.id ? null : c.id)}
                            className="p-1 hover:bg-slate-200 rounded-full transition text-slate-600"
                        >
                            <MoreVertical size={16}/>
                        </button>
                        {openActionId === c.id && <ActionMenu client={c}/>}
                    </td>
                  </tr>
                ))}
                {allDisplayClients.length === 0 && !isLoading && (
                    <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400 italic bg-slate-50">
                            Nenhum cliente encontrado.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'FORM' && (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 my-auto">
          <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b-4 border-blue-600">
            <h3 className="font-black text-lg flex items-center gap-3 uppercase tracking-tighter">
              <UserPlus size={24} className="text-blue-400"/> {formData.id ? 'Editar Cadastro de Cliente' : 'Novo Cadastro de Cliente'}
            </h3>
            <button onClick={() => setView('LIST')} className="hover:bg-red-600 p-1 rounded-full transition"><X size={24}/></button>
          </div>
          <form onSubmit={handleSave} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-3 border-b pb-2">
                    <h4 className="font-black text-blue-700 uppercase text-xs flex items-center gap-2 tracking-widest"><Building2 size={16}/> Dados de Identificação</h4>
                </div>
                
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Contribuinte (NIF) *</label>
                    <input required className="w-full border-b-2 border-slate-200 p-2 outline-none focus:border-blue-600 transition-colors bg-slate-50 font-mono font-bold" value={formData.vatNumber || ''} onChange={e => setFormData({...formData, vatNumber: e.target.value})} placeholder="000000000" />
                </div>
                
                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Nome do Cliente *</label>
                    <input required className="w-full border-b-2 border-slate-200 p-2 outline-none focus:border-blue-600 transition-colors bg-slate-50 font-bold" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nome Completo / Empresa Lda" />
                </div>

                <div className="col-span-3 border-b pb-2 mt-4">
                    <h4 className="font-black text-blue-700 uppercase text-xs flex items-center gap-2 tracking-widest"><MapPin size={16}/> Localização e Morada</h4>
                </div>

                <div className="md:col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Morada</label>
                    <input className="w-full border-b-2 border-slate-200 p-2 outline-none focus:border-blue-600 transition-colors bg-slate-50" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Rua, Bairro, Casa nº" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Localidade</label>
                    <input className="w-full border-b-2 border-slate-200 p-2 outline-none focus:border-blue-600 transition-colors bg-slate-50" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Localidade" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Código Postal</label>
                    <input className="w-full border-b-2 border-slate-200 p-2 outline-none focus:border-blue-600 transition-colors bg-slate-50 font-mono" value={formData.postalCode || ''} onChange={e => setFormData({...formData, postalCode: e.target.value})} placeholder="0000" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Província</label>
                    <input className="w-full border-b-2 border-slate-200 p-2 outline-none focus:border-blue-600 transition-colors bg-slate-50" value={formData.province || ''} onChange={e => setFormData({...formData, province: e.target.value})} placeholder="Província" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Município</label>
                    <input className="w-full border-b-2 border-slate-200 p-2 outline-none focus:border-blue-600 transition-colors bg-slate-50" value={formData.municipality || ''} onChange={e => setFormData({...formData, municipality: e.target.value})} placeholder="Município" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">País</label>
                    <input readOnly className="w-full border-b-2 border-slate-200 p-2 outline-none bg-slate-100 text-slate-500 font-bold" value="Angola" />
                </div>

                <div className="col-span-3 border-b pb-2 mt-4">
                    <h4 className="font-black text-blue-700 uppercase text-xs flex items-center gap-2 tracking-widest"><Mail size={16}/> Contactos e Canais Digitais</h4>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Telefone</label>
                    <input className="w-full border-b-2 border-slate-200 p-2 outline-none focus:border-blue-600 transition-colors bg-slate-50 font-mono" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="(+000) 000 000 000" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Email</label>
                    <input type="email" className="w-full border-b-2 border-slate-200 p-2 outline-none focus:border-blue-600 transition-colors bg-slate-50" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="exemplo@servidor.com" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">WebPage</label>
                    <input className="w-full border-b-2 border-slate-200 p-2 outline-none focus:border-blue-600 transition-colors bg-slate-50" value={formData.webPage || ''} onChange={e => setFormData({...formData, webPage: e.target.value})} placeholder="www.site.com" />
                </div>

                <div className="col-span-3 border-b pb-2 mt-4">
                    <h4 className="font-black text-blue-700 uppercase text-xs flex items-center gap-2 tracking-widest"><Landmark size={16}/> Categorização Fiscal</h4>
                </div>

                <div className="md:col-span-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Tipo de Cliente</label>
                    <select className="w-full border-b-2 border-slate-200 p-2 outline-none focus:border-blue-600 transition-colors bg-slate-50 font-bold" value={formData.clientType} onChange={e => setFormData({...formData, clientType: e.target.value})}>
                        <option value="Nao grupo nacional">Nao grupo nacional</option>
                        <option value="associados">associados</option>
                        <option value="nao grupo estrangeiros">nao grupo estrangeiros</option>
                        <option value="associados sonangol">associados sonangol</option>
                        <option value="outros">outros</option>
                    </select>
                </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-8 border-t bg-slate-50 -mx-8 -mb-8 p-6">
              <button type="button" onClick={() => setView('LIST')} className="px-10 py-3 border-2 border-slate-200 rounded-xl hover:bg-white font-black text-[10px] uppercase tracking-widest text-slate-400 transition-all">Cancelar</button>
              <button type="submit" disabled={isLoading} className="px-16 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-3 transition-all transform active:scale-95">
                {isLoading ? <RefreshCw size={16} className="animate-spin"/> : <Save size={16}/>}
                {formData.id ? 'Atualizar Cloud' : 'Gravar na Cloud'}
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'DETAILS' && renderDetails()}
    </div>
  );
};

export default ClientList;
