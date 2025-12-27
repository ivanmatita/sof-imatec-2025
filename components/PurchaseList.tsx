
import React, { useState } from 'react';
import { Purchase, PurchaseType, Supplier } from '../types';
import { formatCurrency, formatDate, exportToExcel, generateId } from '../utils';
import { Search, PlusCircle, Download, Trash2, Printer, X, Upload, FileCheck, MoreHorizontal, Save, Filter, UserPlus, Calendar, Database } from 'lucide-react';

interface PurchaseListProps {
  purchases: Purchase[];
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  onUpload: (id: string, file: File) => void; 
  onSaveSupplier: (supplier: Supplier) => void;
}

const PurchaseList: React.FC<PurchaseListProps> = ({ purchases, onDelete, onCreateNew, onUpload, onSaveSupplier }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Actions
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedActionPurchase, setSelectedActionPurchase] = useState<Purchase | null>(null);
  
  // Printing
  const [printingPurchase, setPrintingPurchase] = useState<Purchase | null>(null);

  // Upload
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadPurchaseId, setUploadPurchaseId] = useState<string | null>(null);

  // Supplier Modal
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSup, setNewSup] = useState<Partial<Supplier>>({ city: 'Luanda', province: 'Luanda' });

  // Filtering
  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = 
      p.supplier.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nif.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    
    let matchesDate = true;
    if (dateStart) matchesDate = matchesDate && new Date(p.date) >= new Date(dateStart);
    if (dateEnd) matchesDate = matchesDate && new Date(p.date) <= new Date(dateEnd);

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculation for Footer
  const totalNet = filteredPurchases.reduce((acc, p) => acc + (p.subtotal - (p.subtotal * (p.globalDiscount || 0) / 100)), 0);
  const totalTax = filteredPurchases.reduce((acc, p) => acc + p.taxAmount, 0);
  const totalGross = filteredPurchases.reduce((acc, p) => acc + p.total, 0);

  const handleExcelExport = () => {
    const data = filteredPurchases.map(p => ({
        Data: formatDate(p.date),
        Tipo: p.type,
        Fornecedor: p.supplier,
        NIF: p.nif,
        'Num. Doc': p.documentNumber,
        Total: p.total,
        Imposto: p.taxAmount,
        Estado: p.status
    }));
    exportToExcel(data, 'Listagem_Compras');
  }

  const openActions = (purchase: Purchase) => {
      setSelectedActionPurchase(purchase);
      setActionModalOpen(true);
  }

  const closeActions = () => {
      setActionModalOpen(false);
      setSelectedActionPurchase(null);
  }

  const handleDelete = () => {
      if (selectedActionPurchase) {
          if (window.confirm("Tem a certeza que deseja eliminar este registo de compra?")) {
              onDelete(selectedActionPurchase.id);
              closeActions();
          }
      }
  }

  const handlePrint = (purchase: Purchase) => {
      setPrintingPurchase(purchase);
      closeActions();
      setTimeout(() => window.print(), 500);
  }

  const triggerUpload = (purchaseId: string) => {
      setUploadPurchaseId(purchaseId);
      if (fileInputRef.current) {
          fileInputRef.current.click();
      }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && uploadPurchaseId) {
          onUpload(uploadPurchaseId, e.target.files[0]);
          setUploadPurchaseId(null);
      }
  }

  const handleSaveNewSupplier = () => {
      if (!newSup.name || !newSup.vatNumber) return alert("Preencha Nome e NIF");
      
      const supplier: Supplier = {
          id: generateId(),
          name: newSup.name!,
          vatNumber: newSup.vatNumber!,
          email: newSup.email || '',
          phone: newSup.phone || '',
          address: newSup.address || '',
          city: newSup.city || 'Luanda',
          province: newSup.province || 'Luanda',
          accountBalance: 0,
          transactions: []
      };
      onSaveSupplier(supplier);
      setShowSupplierModal(false);
      setNewSup({ city: 'Luanda', province: 'Luanda' });
  }

  // Reuse Print Preview logic
  const renderPrintPreview = () => {
      if (!printingPurchase) return null;
      return (
          <div className="fixed inset-0 bg-white z-[100] overflow-y-auto print-container">
              <div className="mx-auto bg-white p-8 max-w-[210mm] min-h-screen relative flex flex-col text-slate-900 font-sans">
                  <div className="flex justify-between mb-8 print:hidden">
                      <h2 className="font-bold">Pré-visualização</h2>
                      <div className="flex gap-2">
                          <button onClick={() => window.print()} className="bg-slate-800 text-white px-4 py-2 rounded">Imprimir</button>
                          <button onClick={() => setPrintingPurchase(null)} className="p-2 bg-slate-100 rounded">Fechar</button>
                      </div>
                  </div>
                  <h1 className="text-xl font-bold border-b pb-2 mb-4">Detalhe de Compra: {printingPurchase.documentNumber}</h1>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>Fornecedor: <b>{printingPurchase.supplier}</b> ({printingPurchase.nif})</div>
                      <div className="text-right">Data: {formatDate(printingPurchase.date)}</div>
                  </div>
                  <table className="w-full text-sm border-collapse border">
                      <thead className="bg-slate-100">
                          <tr><th className="border p-2">Item</th><th className="border p-2 text-right">Qtd</th><th className="border p-2 text-right">Preço</th><th className="border p-2 text-right">Total</th></tr>
                      </thead>
                      <tbody>
                          {printingPurchase.items.map((i, idx) => (
                              <tr key={idx}>
                                  <td className="border p-2">{i.description}</td>
                                  <td className="border p-2 text-right">{i.quantity}</td>
                                  <td className="border p-2 text-right">{formatCurrency(i.unitPrice)}</td>
                                  <td className="border p-2 text-right">{formatCurrency(i.total)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  <div className="mt-4 text-right font-bold text-lg">Total: {formatCurrency(printingPurchase.total)}</div>
              </div>
              <style>{`@media print { body * { visibility: hidden; } .print-container, .print-container * { visibility: visible; } .print-container { position: absolute; left: 0; top: 0; width: 100%; height: 100%; } }`}</style>
          </div>
      );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {printingPurchase && renderPrintPreview()}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Listagem de Compras
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Database size={10}/> Cloud Sync
            </span>
          </h1>
          <p className="text-xs text-slate-500">Gestão de documentos de fornecedores (Sincronizado)</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => setShowSupplierModal(true)} className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition font-medium">
                 <UserPlus size={16} /> Novo Fornecedor
             </button>
             <button onClick={onCreateNew} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition font-medium">
                 <PlusCircle size={16} /> Nova Compra
             </button>
             <button onClick={handleExcelExport} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition font-medium">
                 <Download size={16} /> Excel
             </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 flex flex-wrap items-end gap-3 text-sm">
         <div className="flex-1 min-w-[200px]">
             <label className="block text-xs font-bold text-slate-500 mb-1">Pesquisa Geral</label>
             <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Fornecedor, NIF, Doc..." 
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
         </div>
         <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">Data Início</label>
             <input type="date" className="py-1.5 px-2 border border-slate-300 rounded w-32 outline-none" value={dateStart} onChange={e => setDateStart(e.target.value)} />
         </div>
         <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">Data Fim</label>
             <input type="date" className="py-1.5 px-2 border border-slate-300 rounded w-32 outline-none" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
         </div>
         <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
             <select className="py-1.5 px-2 border border-slate-300 rounded w-32 outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                 <option value="ALL">Todos</option>
                 <option value="PAID">Pago</option>
                 <option value="PENDING">Pendente</option>
             </select>
         </div>
         <button className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 flex items-center gap-1 font-bold" onClick={() => {setSearchTerm(''); setDateStart(''); setDateEnd(''); setStatusFilter('ALL');}}>
             <Filter size={14}/> Limpar
         </button>
      </div>

      {/* Data Grid */}
      <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" id="purchaseTable">
            <thead className="bg-slate-700 text-white font-semibold">
              <tr>
                <th className="px-4 py-2 w-24">Data</th>
                <th className="px-4 py-2 w-20">Tipo</th>
                <th className="px-4 py-2 w-32">Num. Doc</th>
                <th className="px-4 py-2">Fornecedor</th>
                <th className="px-4 py-2 w-24">NIF</th>
                <th className="px-4 py-2 w-28 text-right">Iliquido</th>
                <th className="px-4 py-2 w-24 text-right">Imposto</th>
                <th className="px-4 py-2 w-28 text-right">Total</th>
                <th className="px-4 py-2 w-24 text-center">Estado</th>
                <th className="px-4 py-2 w-20 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-2">{formatDate(purchase.date)}</td>
                    <td className="px-4 py-2 font-bold text-slate-600">{purchase.type}</td>
                    <td className="px-4 py-2 font-mono text-blue-600">{purchase.documentNumber}</td>
                    <td className="px-4 py-2 font-medium">{purchase.supplier}</td>
                    <td className="px-4 py-2 text-slate-500">{purchase.nif}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatCurrency(purchase.subtotal - (purchase.subtotal * (purchase.globalDiscount || 0) / 100))}</td>
                    <td className="px-4 py-2 text-right font-mono text-red-600">{formatCurrency(purchase.taxAmount)}</td>
                    <td className="px-4 py-2 text-right font-bold text-slate-900">{formatCurrency(purchase.total)}</td>
                    <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${purchase.status === 'PAID' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                            {purchase.status === 'PAID' ? 'Pago' : 'Pendente'}
                        </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex justify-center gap-1">
                          <button onClick={() => triggerUpload(purchase.id)} className={`p-1 rounded ${purchase.attachment ? 'text-green-600' : 'text-slate-400 hover:text-blue-600'}`}>
                              {purchase.attachment ? <FileCheck size={14} /> : <Upload size={14} />}
                          </button>
                          <button onClick={() => openActions(purchase)} className="p-1 text-slate-400 hover:text-blue-600">
                            <MoreHorizontal size={14} />
                          </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    Nenhum registo encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800">
                <tr>
                    <td colSpan={5} className="px-4 py-2 text-right uppercase">Totais Gerais</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(totalNet)}</td>
                    <td className="px-4 py-2 text-right">{formatCurrency(totalTax)}</td>
                    <td className="px-4 py-2 text-right bg-slate-200">{formatCurrency(totalGross)}</td>
                    <td colSpan={2}></td>
                </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
       {/* Actions Modal */}
       {actionModalOpen && selectedActionPurchase && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg w-full max-w-sm shadow-xl p-4 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-4 border-b pb-2">
                      <h3 className="font-bold">Ações: {selectedActionPurchase.documentNumber}</h3>
                      <button onClick={closeActions}><X size={18}/></button>
                  </div>
                  <div className="space-y-2">
                      <button onClick={() => handlePrint(selectedActionPurchase)} className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 rounded text-left"><Printer size={16}/> Imprimir</button>
                      <button onClick={() => { closeActions(); triggerUpload(selectedActionPurchase.id); }} className="w-full flex items-center gap-2 p-2 hover:bg-slate-50 rounded text-left"><Upload size={16}/> Carregar Anexo</button>
                      <button onClick={handleDelete} className="w-full flex items-center gap-2 p-2 hover:bg-red-50 text-red-600 rounded text-left"><Trash2 size={16}/> Eliminar</button>
                  </div>
              </div>
          </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
                  <div className="bg-slate-900 text-white p-5 flex justify-between items-center sticky top-0 z-10">
                      <h3 className="font-bold text-lg flex items-center gap-2"><UserPlus size={20}/> Novo Fornecedor Rápido</h3>
                      <button onClick={() => setShowSupplierModal(false)} className="hover:bg-slate-800 p-1 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="p-8 grid grid-cols-1 gap-6">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-1">Nome / Empresa <span className="text-red-500">*</span></label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="Nome" value={newSup.name || ''} onChange={e => setNewSup({...newSup, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-1">NIF <span className="text-red-500">*</span></label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="NIF" value={newSup.vatNumber || ''} onChange={e => setNewSup({...newSup, vatNumber: e.target.value})} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Cidade</label>
                          <input className="w-full border-b-2 border-slate-200 bg-slate-50 p-2 focus:outline-none focus:border-blue-600 transition-colors" placeholder="Cidade" value={newSup.city || ''} onChange={e => setNewSup({...newSup, city: e.target.value})} />
                      </div>
                  </div>
                  <div className="p-5 border-t bg-slate-50 flex justify-end gap-3 sticky bottom-0 z-10">
                      <button onClick={() => setShowSupplierModal(false)} className="px-6 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-white transition-colors">Cancelar</button>
                      <button onClick={handleSaveNewSupplier} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">Salvar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default PurchaseList;
