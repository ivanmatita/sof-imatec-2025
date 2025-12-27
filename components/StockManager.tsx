
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Product, Warehouse, StockMovement, PriceTable, InvoiceType, PurchaseType, Supplier, PurchaseItem, Purchase, PaymentMethod, CashRegister, WorkProject, Client, WorkLocation, DocumentSeries } from '../types';
import { formatCurrency, formatDate, generateId, exportToExcel } from '../utils';
import { supabase } from '../services/supabaseClient';
import { 
  Package, Plus, Trash2, Box, Search, FileText, Printer, Download, 
  X, MapPin, BarChart3, Database, RefreshCw, Save, QrCode, CreditCard, 
  Eraser, UserPlus, List, User, Phone, Info, ShoppingCart, Calculator,
  CheckCircle, Calendar, Layout, ShieldCheck, Tag, AlignLeft, UserCheck, Eye, ChevronDown, Percent, AlignJustify
} from 'lucide-react';

interface StockManagerProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  warehouses: Warehouse[];
  setWarehouses: React.Dispatch<React.SetStateAction<Warehouse[]>>;
  priceTables: PriceTable[];
  setPriceTables: React.Dispatch<React.SetStateAction<PriceTable[]>>;
  movements: StockMovement[];
  onStockMovement: (movement: StockMovement) => void;
  onCreateDocument: (type: InvoiceType, items: any[], notes: string) => void;
  onOpenReportOverlay: () => void;
  cashRegisters?: CashRegister[];
  clients?: Client[];
  workLocations?: WorkLocation[];
  series?: DocumentSeries[];
}

const StockManager: React.FC<StockManagerProps> = ({ 
  products, setProducts, warehouses, setWarehouses, 
  priceTables, setPriceTables, movements, onStockMovement, onCreateDocument, onOpenReportOverlay,
  cashRegisters = [], clients = [], workLocations = [], series = []
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PRODUCTS' | 'WAREHOUSES' | 'MOVEMENTS'>('DASHBOARD');
  const [isSaving, setIsSaving] = useState(false);
  const [dbSuppliers, setDbSuppliers] = useState<Supplier[]>([]);
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  
  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);

  // --- FORMULÁRIO ENTRADA DE STOCK ---
  const [docType, setDocType] = useState<InvoiceType>(InvoiceType.FT);
  const [selectedSeriesId, setSelectedSeriesId] = useState(series[0]?.id || '');
  const [dateEmissao, setDateEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [dateVencimento, setDateVencimento] = useState('');
  const [localTrabalhoId, setLocalTrabalhoId] = useState('');
  const [clientId, setClientId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [retentionType, setRetentionType] = useState<'NONE' | 'CAT_50' | 'CAT_100'>('NONE');
  const [currency, setCurrency] = useState<'AOA' | 'USD' | 'EUR' | 'BRL'>('AOA');
  const [items, setItems] = useState<any[]>([]);

  const [newWarehouse, setNewWarehouse] = useState<Partial<Warehouse>>({
      name: '', location: '', description: '', managerName: '', contact: '', observations: ''
  });

  useEffect(() => {
    fetchSuppliers();
    fetchProjects();
    fetchCloudData();
  }, []);

  async function fetchCloudData() {
      try {
          const { data: arms } = await supabase.from('armazens').select('*');
          if (arms) setWarehouses(arms.map(a => ({ 
            id: a.id, name: a.nome, location: a.localizacao, description: a.descricao, 
            managerName: a.responsavel, contact: a.contacto, observations: a.observacoes 
          })));
          
          const { data: prods } = await supabase.from('produtos').select('*').order('created_at', { ascending: false });
          if (prods) {
              const mappedProds: Product[] = prods.map(p => ({ 
                id: p.id, 
                name: p.nome, 
                costPrice: p.preco || 0,
                price: (p.preco || 0) * 1.3, 
                stock: 0,
                warehouseId: '', 
                unit: 'un', 
                category: 'Geral', 
                minStock: 0, 
                priceTableId: 'pt1'
              }));
              setProducts(mappedProds);
          }
      } catch (err) { console.error(err); }
  }

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('fornecedores').select('*');
    if (data) setDbSuppliers(data.map(s => ({ 
      id: s.id, 
      name: s.nome, 
      vatNumber: s.contribuinte,
      email: s.email,
      phone: s.telefone,
      city: s.localidade
    } as Supplier)));
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('locais_trabalho').select('*');
    if (data) setDbProjects(data);
  };

  // --- CÁLCULOS FINANCEIROS ---
  const subtotal = useMemo(() => items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0), [items]);
  const discountAmount = useMemo(() => subtotal * (globalDiscount / 100), [subtotal, globalDiscount]);
  const taxAmount = useMemo(() => items.reduce((acc, item) => acc + (item.quantity * item.unitPrice * (1 - (item.discount || 0)/100) * (item.taxRate / 100)), 0), [items]);
  
  let retentionAmount = 0;
  if (retentionType === 'CAT_50') retentionAmount = taxAmount * 0.5;
  if (retentionType === 'CAT_100') retentionAmount = taxAmount;

  const totalAPagar = subtotal - discountAmount + taxAmount - retentionAmount;

  const handleAddItem = () => {
    setItems([...items, { id: generateId(), type: 'PRODUCT', reference: '', description: '', unit: 'un', quantity: 1, unitPrice: 0, discount: 0, taxRate: 14, total: 0 }]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    const base = newItems[index].quantity * newItems[index].unitPrice;
    const disc = base * (newItems[index].discount / 100);
    newItems[index].total = base - disc;
    setItems(newItems);
  };

  const handleEmitirDocumento = async () => {
    if (!clientId || !warehouseId || items.length === 0) {
        return alert("Preencha o Fornecedor, Armazém de Entrada e adicione pelo menos um item.");
    }
    
    setIsSaving(true);
    try {
      for (const item of items) {
        const { data: existing } = await supabase.from('produtos').select('id').eq('nome', item.description).maybeSingle();
        
        if (existing) {
          await supabase.from('produtos').update({ preco: item.unitPrice }).eq('id', existing.id);
        } else {
          await supabase.from('produtos').insert({
            nome: item.description,
            preco: item.unitPrice,
            descricao: 'Artigo registado via Entrada de Stock',
            empresa_id: '00000000-0000-0000-0000-000000000001'
          });
        }
        
        onStockMovement({
            id: generateId(),
            date: new Date().toISOString(),
            type: 'ENTRY',
            productId: existing?.id || 'new',
            productName: item.description,
            quantity: item.quantity,
            warehouseId: warehouseId,
            notes: `Entrada de Stock via ${docType}`
        });
      }
      
      alert("Documento emitido e Stock atualizado na Cloud!");
      setShowProductModal(false);
      setItems([]);
      await fetchCloudData();
    } catch (err: any) { 
      alert("Falha na sincronização: " + err.message); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const handleSaveWarehouse = async () => {
      if (!newWarehouse.name) return alert("Nome do armazém é obrigatório");
      setIsSaving(true);
      try {
          const { error } = await supabase.from('armazens').insert({
              nome: newWarehouse.name,
              localizacao: newWarehouse.location,
              descricao: newWarehouse.description,
              responsavel: newWarehouse.managerName,
              contacto: newWarehouse.contact,
              observacoes: newWarehouse.observations
          });
          if (error) throw error;
          setShowWarehouseModal(false);
          setNewWarehouse({ name: '', location: '', description: '', managerName: '', contact: '', observations: '' });
          fetchCloudData();
          alert("Armazém registado na Cloud!");
      } catch (err: any) { alert("Erro: " + err.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div>
                 <h1 className="text-xl font-bold text-slate-800">Gestão de Artigos & Stock</h1>
                 <p className="text-xs text-slate-500 flex items-center gap-1"><Database size={12}/> Sincronizado com Supabase Cloud</p>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
                <button onClick={() => setActiveTab('DASHBOARD')} className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${activeTab === 'DASHBOARD' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>Painel</button>
                <button onClick={() => setActiveTab('PRODUCTS')} className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${activeTab === 'PRODUCTS' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>Artigos Cloud</button>
                <button onClick={() => setActiveTab('WAREHOUSES')} className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${activeTab === 'WAREHOUSES' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>Armazéns</button>
                <button onClick={onOpenReportOverlay} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md transition-all active:scale-95"><BarChart3 size={16}/> Relatórios de Gestão</button>
            </div>
        </div>

        {activeTab === 'DASHBOARD' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-blue-500">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Total de Artigos (Cloud)</p>
                    <h3 className="text-2xl font-black text-slate-800">{products.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-green-500">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Armazéns Activos</p>
                    <h3 className="text-2xl font-black text-slate-800">{warehouses.length}</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 border-l-4 border-orange-500">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Valor Médio Artigos</p>
                    <h3 className="text-2xl font-black text-slate-800">{formatCurrency(products.reduce((a,b) => a + b.costPrice, 0) / (products.length || 1))}</h3>
                </div>
            </div>
        )}

        {activeTab === 'PRODUCTS' && (
            <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden animate-in zoom-in-95">
                <div className="p-4 flex justify-between items-center bg-slate-100 border-b border-slate-200">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Gestão de Artigos Sincronizada</h2>
                    <button onClick={() => setShowProductModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-blue-700 shadow-md">
                        <Plus size={16}/> Adicionar Novo Artigo (Entrada de Stock)
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left min-w-[800px]">
                        <thead className="bg-slate-700 text-white">
                            <tr><th className="p-3">Artigo</th><th className="p-3 text-right">Preço Unitário</th><th className="p-3 text-center">Estado</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {products.map(p => (
                                <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                                    <td className="p-3 font-bold text-slate-800">{p.name}</td>
                                    <td className="p-3 text-right font-mono font-bold text-blue-600">{formatCurrency(p.costPrice).replace('Kz','')}</td>
                                    <td className="p-3 text-center"><span className="text-green-500 text-[10px] font-bold uppercase border border-green-200 px-1.5 rounded">Sincronizado</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'WAREHOUSES' && (
            <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden animate-in zoom-in-95">
                <div className="p-4 flex justify-between items-center bg-slate-100 border-b border-slate-200">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Listagem de Armazéns Cloud</h2>
                    <button onClick={() => setShowWarehouseModal(true)} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-bold hover:bg-green-700 shadow-md">
                        <Plus size={16}/> Novo Armazém Cloud
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                        <thead className="bg-slate-700 text-white font-bold uppercase">
                            <tr>
                                <th className="p-3">Nome do Armazém</th>
                                <th className="p-3">Localização</th>
                                <th className="p-3">Responsável</th>
                                <th className="p-3">Contacto</th>
                                <th className="p-3">Descrição</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {warehouses.map(w => (
                                <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-bold text-slate-800">{w.name}</td>
                                    <td className="p-3 text-slate-600">{w.location}</td>
                                    <td className="p-3 text-slate-600">{w.managerName || '---'}</td>
                                    <td className="p-3 text-slate-600 font-mono">{w.contact || '---'}</td>
                                    <td className="p-3 text-slate-500 italic">{w.description || '---'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* MODAL: ADICIONAR NOVO ARTIGO */}
        {showProductModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] max-h-[95vh] overflow-y-auto animate-in zoom-in-95">
                    <div className="bg-slate-900 text-white p-5 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-bold text-lg flex items-center gap-2 uppercase tracking-tight"><Package size={20}/> Adicionar Novo Artigo (Entrada de Stock)</h3>
                        <button onClick={() => setShowProductModal(false)} className="p-1 hover:bg-slate-800 rounded-full transition-colors"><X size={24}/></button>
                    </div>
                    
                    <div className="p-8 grid grid-cols-1 xl:grid-cols-12 gap-8 text-xs">
                        {/* COLUNA ESQUERDA: DADOS E ITENS */}
                        <div className="xl:col-span-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                                        <FileText size={14} className="text-blue-600"/>
                                        <h3 className="font-bold text-slate-700 text-sm uppercase">Dados do Documento</h3>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tipo</label>
                                                <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold" value={docType} onChange={e => setDocType(e.target.value as InvoiceType)}>
                                                    <option value={InvoiceType.FT}>Fatura</option>
                                                    <option value={InvoiceType.FR}>Fatura/Recibo</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Série</label>
                                                <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold" value={selectedSeriesId} onChange={e => setSelectedSeriesId(e.target.value)}>
                                                    {series.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                                                    {series.length === 0 && <option value="s1">Série Geral (A)</option>}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Data Emissão</label>
                                                <input type="date" className="w-full p-2 border border-slate-200 rounded-lg" value={dateEmissao} onChange={e => setDateEmissao(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Vencimento</label>
                                                <input type="date" className="w-full p-2 border border-slate-200 rounded-lg" value={dateVencimento} onChange={e => setDateVencimento(e.target.value)} />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Local de Trabalho</label>
                                                <select className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold" value={localTrabalhoId} onChange={e => setLocalTrabalhoId(e.target.value)}>
                                                    <option value="">Selecione Local de Trabalho na Cloud...</option>
                                                    {dbProjects.map(p => <option key={p.id} value={p.id}>{p.titulo} ({p.codigo})</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
                                        <User size={14} className="text-green-600"/>
                                        <h3 className="font-bold text-slate-700 text-sm uppercase">Fornecedor</h3>
                                    </div>
                                    <div className="p-5 flex flex-col h-full">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Selecionar Fornecedor</label>
                                        <select className="w-full p-3 border border-slate-200 rounded-xl font-medium bg-white focus:ring-2 focus:ring-green-500 outline-none appearance-none shadow-sm mb-4" value={clientId} onChange={e => setClientId(e.target.value)}>
                                            <option value="">Selecione o Fornecedor na Cloud...</option>
                                            {dbSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        
                                        {!clientId ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-lg bg-slate-50/50 p-4">
                                                <User size={32} className="mb-2 opacity-20"/>
                                                <span className="text-[10px] font-bold uppercase">Selecione um fornecedor para ver detalhes</span>
                                            </div>
                                        ) : (
                                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                                <p className="font-bold text-green-800">{dbSuppliers.find(s => s.id === clientId)?.name}</p>
                                                <p className="text-xs text-green-600 mt-1">NIF: {dbSuppliers.find(s => s.id === clientId)?.vatNumber}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-700 text-sm uppercase flex items-center gap-2"><List size={16}/> Itens do Documento</h3>
                                    <button onClick={handleAddItem} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition shadow-sm flex items-center gap-2">
                                        <Plus size={14} /> Adicionar Linha
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                                            <tr>
                                                <th className="p-3 w-16">Tipo</th>
                                                <th className="p-3">Ref</th>
                                                <th className="p-3">Descrição / Produto</th>
                                                <th className="p-3 w-16 text-center">Unid</th>
                                                <th className="p-3 w-16 text-center">Qtd</th>
                                                <th className="p-3 w-24 text-right">Preço Un.</th>
                                                <th className="p-3 w-16 text-center">Desc%</th>
                                                <th className="p-3 w-16 text-center">Taxa</th>
                                                <th className="p-3 w-28 text-right">Total</th>
                                                <th className="p-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {items.map((item, idx) => (
                                                <tr key={item.id} className="hover:bg-blue-50/30">
                                                    <td className="p-2 pl-3">
                                                        <select className="bg-transparent text-[10px] font-bold" value={item.type} onChange={e => handleUpdateItem(idx, 'type', e.target.value)}>
                                                            <option value="PRODUCT">PROD</option>
                                                            <option value="SERVICE">SERV</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-2">
                                                        <input className="w-full bg-transparent border-b border-dashed outline-none" value={item.reference} onChange={e => handleUpdateItem(idx, 'reference', e.target.value)} placeholder="Ref"/>
                                                    </td>
                                                    <td className="p-2">
                                                        <input className="w-full bg-transparent border-b border-dashed outline-none font-bold" value={item.description} onChange={e => handleUpdateItem(idx, 'description', e.target.value)} placeholder="Descrição do produto"/>
                                                    </td>
                                                    <td className="p-2">
                                                        <select className="w-full bg-transparent text-center" value={item.unit} onChange={e => handleUpdateItem(idx, 'unit', e.target.value)}>
                                                            <option value="un">un</option>
                                                            <option value="kg">kg</option>
                                                            <option value="Lt">Lt</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-2">
                                                        <input type="number" className="w-full bg-white border rounded text-center" value={item.quantity} onChange={e => handleUpdateItem(idx, 'quantity', Number(e.target.value))} />
                                                    </td>
                                                    <td className="p-2">
                                                        <input type="number" className="w-full bg-white border rounded text-right" value={item.unitPrice} onChange={e => handleUpdateItem(idx, 'unitPrice', Number(e.target.value))} />
                                                    </td>
                                                    <td className="p-2">
                                                        <input type="number" className="w-full bg-white border rounded text-center" value={item.discount} onChange={e => handleUpdateItem(idx, 'discount', Number(e.target.value))} />
                                                    </td>
                                                    <td className="p-2 text-center font-bold text-slate-400">{item.taxRate}%</td>
                                                    <td className="p-2 text-right font-bold text-slate-800">{formatCurrency(item.total).replace('Kz','')}</td>
                                                    <td className="p-2 text-center">
                                                        <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-300 hover:text-red-500"><Trash2 size={14}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* COLUNA DIREITA: RESUMO FINANCEIRO */}
                        <div className="xl:col-span-4 space-y-6">
                            <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden sticky top-24">
                                <div className="bg-slate-800 text-white px-6 py-4 flex items-center gap-2">
                                    <CreditCard size={18}/>
                                    <h3 className="font-bold">Resumo Financeiro</h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="bg-slate-100 p-1 rounded-lg flex border border-slate-200">
                                        {['AOA', 'USD', 'EUR', 'BRL'].map(c => (
                                            <button 
                                                key={c} 
                                                onClick={() => setCurrency(c as any)}
                                                className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all ${currency === c ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="space-y-4 pt-2">
                                        <div className="flex justify-between text-slate-600 text-xs font-bold uppercase">
                                            <span>Subtotal</span>
                                            <span className="text-slate-800">{formatCurrency(subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-600 text-xs font-bold uppercase">
                                            <span className="flex items-center gap-1"><Percent size={12}/> Desconto Global</span>
                                            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1">
                                                <input type="number" className="w-12 p-1 text-right outline-none font-bold" value={globalDiscount} onChange={e => setGlobalDiscount(Number(e.target.value))} />
                                                <span className="text-[10px] text-slate-400">%</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-slate-600 text-xs font-bold uppercase">
                                            <span>Imposto (IVA)</span>
                                            <span className="text-slate-800">{formatCurrency(taxAmount)}</span>
                                        </div>
                                        <div className="pt-2 border-t-2 border-slate-800 flex justify-between items-end">
                                            <span className="font-bold text-xs text-slate-500 uppercase">A PAGAR</span>
                                            <span className="font-black text-2xl text-blue-600 tracking-tight">{formatCurrency(totalAPagar)}</span>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100">
                                        <label className="text-[10px] font-black text-blue-700 uppercase block mb-1">selecionar armazem de entrada de produto</label>
                                        <select className="w-full p-3 border-2 border-blue-100 rounded-xl bg-blue-50 font-bold outline-none" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                                            <option value="">Selecione...</option>
                                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <button onClick={handleEmitirDocumento} disabled={isSaving} className="py-5 bg-blue-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 shadow-2xl transition transform active:scale-95 disabled:opacity-50">
                                    {isSaving ? <RefreshCw className="animate-spin" size={20}/> : <Save size={20}/>} Emitir Documento
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL: NOVO ARMAZÉM CLOUD */}
        {showWarehouseModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl animate-in zoom-in-95 overflow-hidden">
                    <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                        <h3 className="font-bold text-xl flex items-center gap-3 tracking-tighter uppercase">
                            <Box className="text-green-400"/> Novo Armazém Cloud
                        </h3>
                        <button onClick={() => setShowWarehouseModal(false)} className="hover:bg-slate-800 p-2 rounded-full transition"><X size={24}/></button>
                    </div>
                    
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px] font-black uppercase">
                        <div className="col-span-2">
                            <label className="text-slate-500 mb-1 block">Nome do Armazém <span className="text-red-500">*</span></label>
                            <input className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:border-green-500 outline-none transition font-black text-slate-800" value={newWarehouse.name} onChange={e => setNewWarehouse({...newWarehouse, name: e.target.value})} placeholder="Nome Oficial do Armazém" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-slate-500 mb-1 block">Descrição do Armazém</label>
                            <input className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white focus:border-green-500 outline-none transition text-slate-700 font-bold" value={newWarehouse.description} onChange={e => setNewWarehouse({...newWarehouse, description: e.target.value})} placeholder="Finalidade do Armazém (Ex: Stock Principal)" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-slate-500 mb-1 block">Localização</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 text-slate-400" size={16}/>
                                <input className="w-full pl-10 p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white outline-none transition text-slate-700 font-bold" value={newWarehouse.location} onChange={e => setNewWarehouse({...newWarehouse, location: e.target.value})} placeholder="Endereço Físico Completo" />
                            </div>
                        </div>
                        <div>
                            <label className="text-slate-500 mb-1 block">Nome do Responsável</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 text-slate-400" size={16}/>
                                <input className="w-full pl-10 p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white outline-none transition text-slate-700 font-bold" value={newWarehouse.managerName} onChange={e => setNewWarehouse({...newWarehouse, managerName: e.target.value})} placeholder="Gestor do Armazém" />
                            </div>
                        </div>
                        <div>
                            <label className="text-slate-500 mb-1 block">Contacto do Armazém</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-3 text-slate-400" size={16}/>
                                <input className="w-full pl-10 p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white outline-none transition text-slate-700 font-mono font-bold" value={newWarehouse.contact} onChange={e => setNewWarehouse({...newWarehouse, contact: e.target.value})} placeholder="(+000) (000 000 000)" />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="text-slate-500 mb-1 block">Observações</label>
                            <div className="relative">
                                <AlignJustify className="absolute left-3 top-3 text-slate-400" size={16}/>
                                <textarea className="w-full pl-10 p-3 border-2 border-slate-100 rounded-xl bg-slate-50 focus:bg-white outline-none transition text-slate-700 font-medium h-24 resize-none" value={newWarehouse.observations} onChange={e => setNewWarehouse({...newWarehouse, observations: e.target.value})} placeholder="Notas adicionais sobre o armazém..."></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t-2 border-slate-100">
                        <button onClick={() => setShowWarehouseModal(false)} className="px-8 py-3 border-4 border-slate-200 rounded-2xl text-slate-400 hover:bg-white transition uppercase font-black text-[10px]">Cancelar</button>
                        <button onClick={handleSaveWarehouse} disabled={isSaving} className="px-12 py-3 bg-green-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2">
                            {isSaving ? <RefreshCw className="animate-spin" size={16}/> : <Save size={16}/>} Gravar Armazém na Cloud
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default StockManager;
