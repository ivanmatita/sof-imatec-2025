
import React, { useState } from 'react';
import { Invoice, InvoiceStatus, InvoiceType } from '../types';
import { formatCurrency, formatDate, generateQrCodeUrl, numberToExtenso } from '../utils';
import { Search, Filter, Eye, AlertTriangle, CheckCircle, XCircle, X, Printer, ShieldCheck } from 'lucide-react';

interface RegularizationMapProps {
  invoices: Invoice[];
  onViewInvoice: (inv: Invoice) => void;
}

const RegularizationMap: React.FC<RegularizationMapProps> = ({ invoices, onViewInvoice }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter(i => {
      const matchSearch = i.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || i.number.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || 
                          (statusFilter === 'CANCELLED' && i.status === InvoiceStatus.CANCELLED) ||
                          (statusFilter === 'VALID' && i.status !== InvoiceStatus.CANCELLED);
      return matchSearch && matchStatus;
  });

  const handleEyeClick = (inv: Invoice) => {
      setViewInvoice(inv);
  };

  const renderPrintModal = () => {
      if (!viewInvoice) return null;

      // Ensure mock company logic works if viewInvoice comes from outside context (Simplified for this view)
      const mockCompany = {
          name: 'C & V - COMERCIO GERAL E PRESTAÇAO DE SERVIÇOS, LDA',
          nif: '5000780316',
          address: 'Luanda, Angola',
          email: 'geral@empresa.ao',
          phone: '+244 923 000 000',
          regime: 'Geral',
      };

      return (
          <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4">
              <div className="bg-slate-900 rounded-xl w-full h-full max-w-5xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
                  <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800 text-white">
                      <div className="flex items-center gap-3">
                          <Eye className="text-blue-400" />
                          <h3 className="font-bold text-lg">Visualização de Documento (Somente Leitura)</h3>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 font-bold text-sm">
                              <Printer size={16}/> Imprimir A4
                          </button>
                          <button onClick={() => setViewInvoice(null)} className="p-2 hover:bg-slate-700 rounded-full">
                              <X />
                          </button>
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto bg-slate-500 p-8 flex justify-center">
                      <div className="bg-white w-[210mm] min-h-[297mm] shadow-2xl p-12 text-slate-900 relative">
                          {/* Full Print Layout mirroring InvoiceForm preview */}
                          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
                              <div className="w-1/2">
                                  <h1 className="text-2xl font-extrabold uppercase">{mockCompany.name}</h1>
                                  <p className="text-xs text-slate-600">NIF: {mockCompany.nif}</p>
                                  <p className="text-xs text-slate-600">{mockCompany.address}</p>
                                  <p className="text-xs text-slate-600">{mockCompany.email} | {mockCompany.phone}</p>
                              </div>
                              <div className="text-right w-1/2">
                                  <div className="h-16 w-32 bg-slate-100 mb-2 ml-auto flex items-center justify-center text-xs text-slate-400 border">LOGO</div>
                              </div>
                          </div>

                          <div className="flex justify-between items-start mb-8">
                              <div className="w-1/2 border-l-4 border-slate-900 pl-4">
                                  <p className="text-xs font-bold text-slate-400 uppercase">Cliente</p>
                                  <h3 className="font-bold text-lg">{viewInvoice.clientName}</h3>
                                  <p className="text-sm">NIF: {viewInvoice.clientNif || 'Consumidor Final'}</p>
                              </div>
                              <div className="text-right">
                                  <h2 className="text-xl font-black uppercase">{viewInvoice.type}</h2>
                                  <p className="font-mono text-lg text-slate-500 font-bold">{viewInvoice.number}</p>
                                  <p className="text-xs text-slate-400 mt-1">
                                      {viewInvoice.isCertified ? 'Original Certificado' : 'Rascunho / Cópia'}
                                  </p>
                              </div>
                          </div>

                          <div className="grid grid-cols-4 border-y border-slate-200 py-2 mb-6 text-xs">
                                <div><span className="block font-bold text-slate-400">Data</span>{formatDate(viewInvoice.date)}</div>
                                <div><span className="block font-bold text-slate-400">Vencimento</span>{formatDate(viewInvoice.dueDate)}</div>
                                <div><span className="block font-bold text-slate-400">Moeda</span>{viewInvoice.currency || 'AOA'}</div>
                                <div className="text-right"><span className="block font-bold text-slate-400">Operador</span>{viewInvoice.operatorName || 'Admin'}</div>
                          </div>

                          <table className="w-full text-xs mb-8">
                              <thead className="border-b-2 border-slate-900 font-bold uppercase">
                                  <tr>
                                      <th className="py-2 text-left">Descrição</th>
                                      <th className="py-2 text-center w-16">Qtd</th>
                                      <th className="py-2 text-right w-24">Preço Un.</th>
                                      <th className="py-2 text-center w-16">Desc%</th>
                                      <th className="py-2 text-center w-16">Taxa</th>
                                      <th className="py-2 text-right w-24">Total</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {viewInvoice.items.map((item, idx) => (
                                      <tr key={idx} className="border-b border-slate-100">
                                          <td className="py-2">{item.description}</td>
                                          <td className="py-2 text-center">{item.quantity}</td>
                                          <td className="py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                                          <td className="py-2 text-center">{item.discount}%</td>
                                          <td className="py-2 text-center">{item.taxRate}%</td>
                                          <td className="py-2 text-right font-bold">{formatCurrency(item.total)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>

                          <div className="flex justify-end border-t-2 border-slate-900 pt-4">
                              <div className="w-1/3 space-y-2">
                                  <div className="flex justify-between text-xs font-bold text-slate-500">
                                      <span>Subtotal</span>
                                      <span>{formatCurrency(viewInvoice.subtotal)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs font-bold text-slate-500">
                                      <span>Imposto</span>
                                      <span>{formatCurrency(viewInvoice.taxAmount)}</span>
                                  </div>
                                  <div className="flex justify-between text-xl font-black text-slate-900 border-t border-slate-300 pt-2">
                                      <span>TOTAL</span>
                                      <span>{formatCurrency(viewInvoice.total)}</span>
                                  </div>
                                  <div className="text-right text-[10px] italic text-slate-400">
                                      {numberToExtenso(viewInvoice.total)}
                                  </div>
                              </div>
                          </div>

                          <div className="absolute bottom-12 left-12 right-12 border-t border-slate-200 pt-4 flex items-center justify-between">
                                <div className="flex gap-2 items-center">
                                    <img src={generateQrCodeUrl(viewInvoice.hash || 'VIEW')} alt="QR" className="w-12 h-12"/>
                                    <div className="text-[8px] text-slate-400">
                                        <p className="font-mono font-bold">{viewInvoice.hash || 'PREVIEW-MODE'}</p>
                                        <p>Processado por programa certificado nº 25/AGT/2019</p>
                                    </div>
                                </div>
                                <div className="text-[9px] text-slate-400 uppercase">
                                    Documento processado por computador
                                </div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen animate-in fade-in pb-20">
         {renderPrintModal()}

         <div className="flex justify-between items-center mb-6">
             <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CheckCircle/> Regularização de Clientes</h1>
         </div>

         <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6 flex gap-4">
             <div className="flex-1 relative">
                 <Search className="absolute left-2 top-2.5 text-slate-400" size={16}/>
                 <input 
                    className="w-full pl-8 p-2 border rounded" 
                    placeholder="Cliente, Documento..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                 />
             </div>
             <select className="p-2 border rounded" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                 <option value="ALL">Todos os Estados</option>
                 <option value="VALID">Válidos (Emitidos)</option>
                 <option value="CANCELLED">Anulados</option>
             </select>
         </div>

         <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden">
             <table className="w-full text-left text-sm">
                 <thead className="bg-slate-700 text-white font-bold">
                     <tr>
                         <th className="p-3">Data</th>
                         <th className="p-3">Número</th>
                         <th className="p-3">Tipo</th>
                         <th className="p-3">Cliente</th>
                         <th className="p-3 text-right">Valor Faturado</th>
                         <th className="p-3 text-right">IVA</th>
                         <th className="p-3 text-center">Estado</th>
                         <th className="p-3">Motivo Anulação</th>
                         <th className="p-3 text-center">Ações</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                     {filteredInvoices.map(inv => (
                         <tr key={inv.id} className="hover:bg-slate-50">
                             <td className="p-3">{formatDate(inv.date)}</td>
                             <td className="p-3 font-mono font-bold text-blue-600">{inv.number}</td>
                             <td className="p-3"><span className="border px-2 py-0.5 rounded text-xs">{inv.type}</span></td>
                             <td className="p-3">{inv.clientName}</td>
                             <td className="p-3 text-right">{formatCurrency(inv.total)}</td>
                             <td className="p-3 text-right">{formatCurrency(inv.taxAmount)}</td>
                             <td className="p-3 text-center">
                                 {inv.status === InvoiceStatus.CANCELLED ? (
                                     <span className="flex items-center justify-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded"><XCircle size={12}/> ANULADO</span>
                                 ) : (
                                     <span className="flex items-center justify-center gap-1 text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded"><CheckCircle size={12}/> {inv.status}</span>
                                 )}
                             </td>
                             <td className="p-3 text-red-500 text-xs italic">{inv.cancellationReason || '-'}</td>
                             <td className="p-3 text-center">
                                 {/* Only Eye Icon allowed here as per instructions */}
                                 <button onClick={() => handleEyeClick(inv)} className="text-slate-500 hover:text-blue-600 p-2 rounded-full hover:bg-slate-100" title="Visualizar / Imprimir">
                                     <Eye size={18}/>
                                 </button>
                             </td>
                         </tr>
                     ))}
                 </tbody>
             </table>
         </div>
    </div>
  );
};

export default RegularizationMap;
