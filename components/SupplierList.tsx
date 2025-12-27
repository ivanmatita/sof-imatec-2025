
import React, { useState, useEffect, useMemo } from 'react';
import { Supplier } from '../types';
import { generateId, formatCurrency, formatDate } from '../utils';
import { supabase } from '../services/supabaseClient';
import { Plus, Search, MapPin, Phone, Mail, ArrowLeft, Save, X, Printer, Download, Filter, UserPlus, History, Calendar, Database, RefreshCw, Loader2, Globe, Building2, Landmark, ShieldCheck, Edit2, AlertTriangle } from 'lucide-react';

interface SupplierListProps {
  suppliers: Supplier[];
  onSaveSupplier: (supplier: Supplier) => void;
}

const SupplierList: React.FC<SupplierListProps> = ({ suppliers, onSaveSupplier }) => {
  const [view, setView] = useState<'LIST' | 'FORM' | 'DETAILS'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [dbSuppliers, setDbSuppliers] = useState<Supplier[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Details Filter
  const [detailsDateStart, setDetailsDateStart] = useState('');
  const [detailsDateEnd, setDetailsDateEnd] = useState('');

  useEffect(() => {
    carregarFornecedoresSupabase();
  }, []);

  async function carregarFornecedoresSupabase() {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome', { ascending: true });

      if (error) {
        const msg = error.message || JSON.stringify(error);
        setErrorMsg(`Erro ao buscar cloud: ${msg}`);
      } else if (data) {
        const mapped: Supplier[] = data.map(s => ({
          id: s.id,
          name: s.nome,
          vatNumber: s.contribuinte,
          email: s.email || '',
          phone: s.telefone || '',
          address: s.morada || '',
          city: s.localidade || '',
          province: s.provincia || '',
          postalCode: s.codigo_postal || '',
          municipality: s.municipio || '',
          country: s.pais || 'Angola',
          webPage: s.web_page || '',
          inssNumber: s.num_inss || '',
          bankInitials: s.siglas_banco || '',
          iban: s.iban || '',
          swift: s.swift || '',
          supplierType: s.tipo_cliente || '',
          accountBalance: 0,
          transactions: []
        }));
        setDbSuppliers(mapped);
        
        mapped.forEach(s => {
          if (!suppliers.find(local => local.id === s.id)) {
            onSaveSupplier(s);
          }
        });
      }
    } catch (err: any) {
      setErrorMsg(`Erro inesperado: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsLoading(false);
    }
  }

  const allDisplaySuppliers = useMemo(() => {
    const combined = [...dbSuppliers, ...suppliers];
    const unique = Array.from(new Map(combined.map(s => [s.id, s])).values());
    return unique.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      s.vatNumber.includes(searchTerm)
    );
  }, [dbSuppliers, suppliers, searchTerm]);

  const handleCreate = () => {
    setFormData({
      country: 'Angola',
      supplierType: 'Fornecedor Não Grupo Nacionais'
    });
    setView('FORM');
  };

  const handleViewDetails = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailsDateStart('');
    setDetailsDateEnd('');
    setView('DETAILS');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.vatNumber) return alert('Nome e Contribuinte são obrigatórios');

    setIsLoading(true);
    const supplierId = formData.id || generateId();
    
    const payload = {
      contribuinte: formData.vatNumber,
      nome: formData.name,
      morada: formData.address,
      localidade: formData.city,
      codigo_postal: formData.postalCode,
      provincia: formData.province,
      municipio: formData.municipality,
      pais: 'Angola',
      telefone: formData.phone,
      email: formData.email,
      web_page: formData.webPage,
      num_inss: formData.inssNumber,
      siglas_banco: formData.bankInitials,
      iban: formData.iban,
      swift: formData.swift,
      tipo_cliente: formData.supplierType,
      empresa_id: '00000000-0000-0000-0000-000000000001'
    };

    try {
      const { data, error } = await supabase
        .from('fornecedores')
        .upsert(formData.id ? { ...payload, id: formData.id } : payload)
        .select();

      if (error) {
        const msg = error.message || JSON.stringify(error);
        alert(`Erro ao salvar no cloud: ${msg}`);
      } else {
        const saved = data?.[0];
        const syncSupplier: Supplier = {
          id: saved?.id || supplierId,
          name: saved?.nome || formData.name!,
          vatNumber: saved?.contribuinte || formData.vatNumber!,
          email: saved?.email || '',
          phone: saved?.telefone || '',
          address: saved?.morada || '',
          city: saved?.localidade || '',
          province: saved?.provincia || '',
          postalCode: saved?.codigo_postal || '',
          municipality: saved?.municipio || '',
          country: 'Angola',
          webPage: saved?.web_page || '',
          inssNumber: saved?.num_inss || '',
          bankInitials: saved?.siglas_banco || '',
          iban: saved?.iban || '',
          swift: saved?.swift || '',
          supplierType: saved?.tipo_cliente || '',
          accountBalance: 0,
          transactions: []
        };

        onSaveSupplier(syncSupplier);
        setDbSuppliers(prev => [syncSupplier, ...prev.filter(s => s.id !== syncSupplier.id)]);
        setView('LIST');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderForm = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
             <div className="bg-slate-900 text-white p-5 flex justify-between items-center sticky top-0 z-10">
                <h3 className="font-bold text-lg flex items-center gap-2"><UserPlus size={20}/> Cadastro Completo de Fornecedor</h3>
                <button onClick={() => setView('LIST')} className="hover:bg-slate-800 p-1 rounded-full"><X size={20}/></button>
             </div>
             <form onSubmit={handleSubmit}>
                 <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="col-span-3 border-b pb-2 mb-2">
                           <h4 className="font-bold text-blue-700 flex items-center gap-2"><Building2 size={16}/> Identificação e Contacto</h4>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Contribuinte (NIF) *</label>
                          <input required className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600 font-mono" value={formData.vatNumber || ''} onChange={e => setFormData({...formData, vatNumber: e.target.value})} />
                      </div>
                      <div className="md:col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Nome do Fornecedor *</label>
                          <input required className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600 font-bold" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Telefone</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                          <input type="email" className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">WebPage</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" placeholder="www.site.com" value={formData.webPage || ''} onChange={e => setFormData({...formData, webPage: e.target.value})} />
                      </div>

                      <div className="col-span-3 border-b pb-2 mt-4">
                           <h4 className="font-bold text-blue-700 flex items-center gap-2"><MapPin size={16}/> Localização</h4>
                      </div>
                      <div className="md:col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Morada</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Localidade</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.city || ''} onChange={e => setFormData({...formData, city: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Município</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.municipality || ''} onChange={e => setFormData({...formData, municipality: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Província</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.province || ''} onChange={e => setFormData({...formData, province: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Código Postal</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.postalCode || ''} onChange={e => setFormData({...formData, postalCode: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">País</label>
                          <input readOnly className="w-full border-b-2 border-slate-200 bg-slate-100 p-2 outline-none text-slate-500" value="Angola" />
                      </div>

                      <div className="col-span-3 border-b pb-2 mt-4">
                           <h4 className="font-bold text-blue-700 flex items-center gap-2"><Landmark size={16}/> Dados Financeiros e Fiscais</h4>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Nº de INSS</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600 font-mono" value={formData.inssNumber || ''} onChange={e => setFormData({...formData, inssNumber: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Siglas do Banco</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" placeholder="Ex: BAI, BFA" value={formData.bankInitials || ''} onChange={e => setFormData({...formData, bankInitials: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">IBAN</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600 font-mono" placeholder="AO06..." value={formData.iban || ''} onChange={e => setFormData({...formData, iban: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Cod SWIFT</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600 font-mono" value={formData.swift || ''} onChange={e => setFormData({...formData, swift: e.target.value})} />
                      </div>
                      <div className="md:col-span-2">
                          <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Cliente/Fornecedor</label>
                          <select className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 outline-none focus:border-blue-600" value={formData.supplierType} onChange={e => setFormData({...formData, supplierType: e.target.value})}>
                              <option value="Fornecedor Não Grupo Nacionais">Fornecedor Não Grupo Nacionais</option>
                              <option value="nao grupo estrangeiros">nao grupo estrangeiros</option>
                              <option value="Associados">Associados</option>
                          </select>
                      </div>
                 </div>
                 <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-10">
                      <button type="button" onClick={() => setView('LIST')} className="px-6 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-white">Cancelar</button>
                      <button type="submit" disabled={isLoading} className="px-10 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg flex items-center gap-2 disabled:opacity-50">
                          {isLoading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                          Salvar na Cloud
                      </button>
                 </div>
             </form>
        </div>
    </div>
  );

  const renderDetails = () => {
    if (!selectedSupplier) return null;
    const transactions = selectedSupplier.transactions || [];
    const filteredTransactions = transactions.filter(t => {
        if (detailsDateStart && new Date(t.date) < new Date(detailsDateStart)) return false;
        if (detailsDateEnd && new Date(t.date) > new Date(detailsDateEnd)) return false;
        return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalCredit = filteredTransactions.filter(t => t.type === 'CREDIT').reduce((acc, t) => acc + t.amount, 0); 
    const totalDebit = filteredTransactions.filter(t => t.type === 'DEBIT').reduce((acc, t) => acc + t.amount, 0); 

    return (
        <div className="space-y-6 animate-in slide-in-from-right h-full flex flex-col pb-20">
             <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => setView('LIST')} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition text-slate-600"><ArrowLeft size={20}/></button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">{selectedSupplier.name}</h1>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                            <span className="font-mono bg-slate-100 px-1 rounded">{selectedSupplier.vatNumber}</span>
                            <span>•</span>
                            <MapPin size={12}/> {selectedSupplier.city}, {selectedSupplier.province}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setFormData(selectedSupplier); setView('FORM'); }} className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-bold text-sm"><Edit2 size={16}/> Editar</button>
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-black transition font-bold text-sm"><Printer size={16}/> Extrato</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><div className="text-slate-500 font-bold mb-1">COMPRAS</div><div className="text-lg font-bold text-blue-600">{formatCurrency(totalCredit)}</div></div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><div className="text-slate-500 font-bold mb-1">PAGAMENTOS</div><div className="text-lg font-bold text-emerald-600">{formatCurrency(totalDebit)}</div></div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-2"><div className="text-slate-500 font-bold mb-1">IBAN REGISTADO</div><div className="font-mono text-slate-700">{selectedSupplier.iban || 'N/A'}</div></div>
            </div>
             <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden flex-1">
                <div className="p-4 bg-slate-100 border-b flex justify-between items-center"><h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={18}/> Conta Corrente</h3></div>
                <div className="overflow-x-auto"><table className="w-full text-left text-[10px]"><thead className="bg-slate-700 text-white"><tr><th className="p-3">Data</th><th className="p-3">Documento</th><th className="p-3 text-right">Crédito</th><th className="p-3 text-right">Débito</th></tr></thead>
                <tbody className="divide-y divide-slate-200">{filteredTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50"><td className="p-3">{formatDate(t.date)}</td><td className="p-3 font-bold">{t.documentNumber}</td><td className="p-3 text-right text-blue-600">{t.type === 'CREDIT' ? formatCurrency(t.amount) : '-'}</td><td className="p-3 text-right text-emerald-600">{t.type === 'DEBIT' ? formatCurrency(t.amount) : '-'}</td></tr>
                ))}</tbody></table></div>
             </div>
        </div>
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 h-full">
        {view === 'LIST' && (
            <>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">Gestão de Fornecedores {isLoading && <RefreshCw size={16} className="animate-spin text-blue-500"/>}</h1>
                        <p className="text-xs text-slate-500 flex items-center gap-1"><Database size={12}/> Base de Dados Cloud</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={carregarFornecedoresSupabase} className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 border text-sm font-bold flex items-center gap-2"><RefreshCw size={16}/> Sincronizar</button>
                        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 font-bold shadow-lg"><UserPlus size={16}/> Novo Fornecedor Cloud</button>
                    </div>
                </div>
                {errorMsg && <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 flex items-center gap-2 text-sm"><AlertTriangle size={16}/> {errorMsg}</div>}
                <div className="bg-white p-3 border border-slate-200 rounded-lg flex items-center gap-3 shadow-sm"><Search className="text-slate-400" size={18}/><input className="flex-1 outline-none text-sm" placeholder="Pesquisar por nome ou NIF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden flex-1">
                    <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-700 text-white uppercase font-bold"><tr><th className="p-3 w-10">#</th><th className="p-3">Nome</th><th className="p-3">NIF</th><th className="p-3">Tipo</th><th className="p-3">Localidade</th><th className="p-3 text-right">Saldo</th><th className="p-3 text-center">Ação</th></tr></thead>
                    <tbody className="divide-y divide-slate-200">{allDisplaySuppliers.map((sup, idx) => (
                        <tr key={sup.id} className="hover:bg-blue-50 cursor-pointer group" onClick={() => handleViewDetails(sup)}><td className="p-3 text-slate-400">#{idx + 1}</td><td className="p-3 font-bold">{sup.name}</td><td className="p-3 font-mono">{sup.vatNumber}</td><td className="p-3 text-[10px] uppercase font-bold text-slate-500">{sup.supplierType}</td><td className="p-3">{sup.city}</td><td className={`p-3 text-right font-black ${sup.accountBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(sup.accountBalance)}</td><td className="p-3 text-center"><button className="text-purple-600 font-bold hover:underline">Ver</button></td></tr>
                    ))}</tbody></table></div>
                </div>
            </>
        )}
        {view === 'FORM' && renderForm()}
        {view === 'DETAILS' && renderDetails()}
    </div>
  );
};

export default SupplierList;
