
import React, { useState } from 'react';
import { Invoice, InvoiceStatus, InvoiceType, Company, WorkLocation, DocumentSeries, PaymentMethod, CashRegister, InvoiceItem, Warehouse, Purchase } from '../types';
import { formatCurrency, formatDate, generateId, generateInvoiceHash, exportToExcel, generateQrCodeUrl, numberToExtenso, getDocumentPrefix } from '../utils';
import { printDocument, downloadPDF, downloadExcel } from "../utils/exportUtils";
import { Search, Filter, MoreHorizontal, Download, Eye, Trash2, Printer, Share2, ShieldCheck, Mail, MessageCircle, X, FileText, FileJson, CheckCircle, AlertTriangle, Copy, Lock, FilePlus, Receipt, FileOutput, PlusCircle, Truck, Send, FileCheck, Upload, ExternalLink, RefreshCw, ArrowRight, PieChart, ChevronDown, ChevronRight, Edit3, Save, Link2, Box, ArrowRightLeft, MapPin, CreditCard, Link, Copy as CopyIcon, FileType, DollarSign, FileSpreadsheet, User, BarChart, Hash, Database, Ruler, Phone, Calendar } from 'lucide-react';
import BusinessOverviewModal from './BusinessOverviewModal';

interface InvoiceListProps {
  invoices: Invoice[];
  onDelete: (id: string) => void;
  onUpdate: (invoice: Invoice) => void;
  onLiquidate: (invoice: Invoice, amount: number, method: PaymentMethod, registerId: string, dateValue: string, docDate: string) => void; 
  onCancelInvoice: (id: string, reason: string) => void;
  onCertify: (invoice: Invoice) => void;
  onCreateNew: () => void;
  onCreateDerived: (sourceInvoice: Invoice, type: InvoiceType) => void;
  onUpload: (id: string, file: File) => void;
  onViewReports: () => void;
  onQuickUpdate: (id: string, updates: Partial<Invoice>) => void;
  onViewClientAccount: (clientId: string) => void;
  currentCompany: Company;
  workLocations: WorkLocation[];
  cashRegisters: CashRegister[];
  series: DocumentSeries[];
  warehouses?: Warehouse[];
  purchases?: Purchase[];
}

const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, onDelete, onUpdate, onLiquidate, onCancelInvoice, onCertify, onCreateNew, onCreateDerived, onUpload, onViewReports, onQuickUpdate, onViewClientAccount, currentCompany, workLocations, cashRegisters, series, warehouses = [], purchases = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [seriesFilter, setSeriesFilter] = useState<string>('ALL');
  
  // Printing State
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [printFormat, setPrintFormat] = useState<'A4' | '80mm' | '24pin'>('A4');
  const [isForeignDraft, setIsForeignDraft] = useState(false);
  const [printCopyLabel, setPrintCopyLabel] = useState<string>('Original');

  // Modal States
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [certifyModalOpen, setCertifyModalOpen] = useState(false);
  const [invoiceToCertify, setInvoiceToCertify] = useState<Invoice | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Actions Central Modal State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedActionInvoice, setSelectedActionInvoice] = useState<Invoice | null>(null);
  
  // Liquidate (Receipt) Modal
  const today = new Date().toISOString().split('T')[0];
  const [liquidateModalOpen, setLiquidateModalOpen] = useState(false);
  const [liquidateData, setLiquidateData] = useState<{amount: number, method: PaymentMethod | '', registerId: string, dateValue: string, docDate: string}>({ 
    amount: 0, 
    method: '', 
    registerId: '',
    dateValue: today,
    docDate: today
  });

  // Convert/Faturar Modal
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [targetConvertType, setTargetConvertType] = useState<InvoiceType>(InvoiceType.FT);

  // Clone Modal
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [targetCloneType, setTargetCloneType] = useState<InvoiceType>(InvoiceType.FT);

  // Business Overview Modal State
  const [showBusinessOverview, setShowBusinessOverview] = useState(false);

  // Upload Logic
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadInvoiceId, setUploadInvoiceId] = useState<string | null>(null);
  const [viewingUpload, setViewingUpload] = useState<string | null>(null);

  const getRelatedDocuments = (invoiceId: string, currentInvoice: Invoice) => {
      const children = invoices.filter(i => i.sourceInvoiceId === invoiceId);
      let parent: Invoice | undefined;
      if (currentInvoice.sourceInvoiceId) {
          parent = invoices.find(i => i.id === currentInvoice.sourceInvoiceId);
      }
      return { children, parent };
  };

  // Helper Functions
  const getStatusColor = (invoice: Invoice) => {
    if (invoice.status === InvoiceStatus.CANCELLED) return 'bg-red-50 text-red-600 border-red-200';
    if (invoice.type === InvoiceType.NC) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (invoice.type === InvoiceType.RG || invoice.type === InvoiceType.FR) {
        if (invoice.isCertified) {
            return invoice.status === InvoiceStatus.PARTIAL ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
        } else {
            return 'bg-yellow-100 text-yellow-700 border-yellow-200'; 
        }
    }
    switch (invoice.status) {
      case InvoiceStatus.PAID: return 'bg-blue-100 text-blue-700 border-blue-200';
      case InvoiceStatus.PARTIAL: return 'bg-orange-100 text-orange-700 border-orange-200';
      case InvoiceStatus.PENDING: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case InvoiceStatus.OVERDUE: return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusText = (invoice: Invoice) => {
      if (invoice.status === InvoiceStatus.CANCELLED) return 'ANULADO';
      if (invoice.type === InvoiceType.NC) return 'REGULARIZADO'; 
      if (invoice.type === InvoiceType.RG || invoice.type === InvoiceType.FR) {
          if (invoice.status === InvoiceStatus.PARTIAL) return 'PARCIAL';
          if (invoice.isCertified) return 'PAGO';
          return 'PENDENTE';
      }
      if (invoice.status === InvoiceStatus.PARTIAL) return 'PARCIAL';
      if (invoice.status === InvoiceStatus.PENDING) return 'DÍVIDA';
      return invoice.status;
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || invoice.type === typeFilter;
    const matchesSeries = seriesFilter === 'ALL' || invoice.seriesId === seriesFilter;

    return matchesSearch && matchesStatus && matchesType && matchesSeries;
  });

  const handleUploadClick = (invoice: Invoice, forceNewUpload = false) => {
      if (invoice.attachment && !forceNewUpload) {
          setViewingUpload(invoice.attachment);
      } else {
          setUploadInvoiceId(invoice.id);
          if (fileInputRef.current) {
              fileInputRef.current.click();
          }
      }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && uploadInvoiceId) {
          onUpload(uploadInvoiceId, e.target.files[0]);
          setUploadInvoiceId(null);
      }
  }

  const openActions = (invoice: Invoice) => {
      setSelectedActionInvoice(invoice);
      setActionModalOpen(true);
  }

  const closeActions = () => {
      setActionModalOpen(false);
      setSelectedActionInvoice(null);
  }

  const handleEdit = (invoice: Invoice) => {
      onUpdate(invoice); 
      closeActions();
  }

  const initiateLiquidate = (invoice: Invoice) => {
      if (invoice.type !== InvoiceType.FT) {
          alert("Recibos apenas podem ser emitidos a partir de Faturas (FT).");
          return;
      }
      if (invoice.status === InvoiceStatus.CANCELLED) {
          alert("Não é possível emitir recibo para um documento anulado.");
          return;
      }
      const alreadyPaid = invoice.paidAmount || 0;
      const remaining = invoice.total - alreadyPaid;
      
      setLiquidateData({
          amount: remaining > 0 ? remaining : 0, 
          method: '',
          registerId: '',
          dateValue: today,
          docDate: today
      });
      setLiquidateModalOpen(true);
      closeActions(); 
  }

  const handleConfirmLiquidate = () => {
      if (selectedActionInvoice && liquidateData.method && liquidateData.registerId && liquidateData.amount > 0) {
          onLiquidate(
            selectedActionInvoice, 
            liquidateData.amount, 
            liquidateData.method as PaymentMethod, 
            liquidateData.registerId,
            liquidateData.dateValue,
            liquidateData.docDate
          );
          setLiquidateModalOpen(false);
          setSelectedActionInvoice(null);
          setLiquidateData({ amount: 0, method: '', registerId: '', dateValue: today, docDate: today });
      } else {
          alert("Preencha todos os campos e certifique-se que o valor é superior a 0.");
      }
  }

  const initiateCertify = (invoice: Invoice) => {
    if (invoice.isCertified) return;
    setInvoiceToCertify(invoice);
    setCertifyModalOpen(true);
    closeActions();
  };

  const confirmCertify = () => {
    if (invoiceToCertify) {
        onCertify(invoiceToCertify);
        setCertifyModalOpen(false);
        setInvoiceToCertify(null);
    }
  };

  const initiateCancel = (invoice: Invoice) => {
      if (invoice.status === InvoiceStatus.CANCELLED) return;
      setInvoiceToCancel(invoice);
      setCancelReason('');
      setCancelModalOpen(true);
      closeActions();
  }

  const confirmCancel = () => {
      if (invoiceToCancel && cancelReason) {
          onCancelInvoice(invoiceToCancel.id, cancelReason);
          setCancelModalOpen(false);
          setInvoiceToCancel(null);
      } else {
          alert("Indique o motivo da anulação.");
      }
  }

  const initiateDelete = (invoice: Invoice) => {
      if (invoice.isCertified) {
          alert("Documentos certificados não podem ser apagados do sistema. Devem ser anulados.");
          return;
      }
      setInvoiceToDelete(invoice);
      setDeleteModalOpen(true);
      closeActions();
  };

  const confirmDelete = () => {
      if (invoiceToDelete) {
          onDelete(invoiceToDelete.id);
          setDeleteModalOpen(false);
          setInvoiceToDelete(null);
      }
  };

  const initiateConvert = (invoice: Invoice) => {
      setSelectedActionInvoice(invoice);
      setConvertModalOpen(true);
      closeActions();
  }

  const confirmConvert = () => {
      if(selectedActionInvoice) {
          onCreateDerived(selectedActionInvoice, targetConvertType);
          setConvertModalOpen(false);
          setSelectedActionInvoice(null);
      }
  }

  const initiateClone = (invoice: Invoice) => {
      setSelectedActionInvoice(invoice);
      setTargetCloneType(invoice.type);
      setCloneModalOpen(true);
      closeActions();
  }

  const confirmClone = () => {
      if(selectedActionInvoice) {
          onCreateDerived(selectedActionInvoice, targetCloneType);
          setCloneModalOpen(false);
          setSelectedActionInvoice(null);
      }
  }

  const handleIssueDeliveryGuide = (invoice: Invoice) => {
      onCreateDerived(invoice, InvoiceType.GE);
      closeActions();
  };

  const handlePrint = (invoice: Invoice, format: 'A4' | '80mm' | '24pin', asDraft = false, copyLabel = 'Original') => {
    setPrintingInvoice(invoice);
    setPrintFormat(format);
    setIsForeignDraft(asDraft);
    setPrintCopyLabel(copyLabel);
    closeActions();
  };

  const handleExcelExport = (invoice?: Invoice) => {
      if (invoice) {
        const data = invoice.items.map(i => ({
            Documento: invoice.number,
            Data: formatDate(invoice.date),
            Cliente: invoice.clientName,
            Item: i.description,
            Ref: i.reference,
            Unidade: i.unit,
            Qtd: i.quantity,
            Preco: i.unitPrice,
            Total: i.total
        }));
        exportToExcel(data, `Documento_${invoice.number}`);
      } else {
        downloadExcel("invoiceTable", "Lista_de_Faturas.xlsx");
      }
  }

  const handleEmail = (invoice: Invoice) => {
      const subject = `Documento ${invoice.number} - ${currentCompany.name}`;
      const body = `Estimado cliente, segue em anexo o documento ${invoice.number}. Valor: ${formatCurrency(invoice.total)}.`;
      const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(url, '_self');
      closeActions();
  }

  const handleViewAccount = (invoice: Invoice) => {
      onViewClientAccount(invoice.clientId);
      closeActions();
  }

  const renderPrintPreview = () => {
    if (!printingInvoice) return null;
    const isA4 = printFormat === 'A4';
    const is80mm = printFormat === '80mm';
    const seriesData = series.find(s => s.id === printingInvoice.seriesId);
    
    // REGRA: Documento principal mostra AOA. Draft mostra Moeda Estrangeira.
    const displayCurrency = isForeignDraft ? (printingInvoice.currency || 'AOA') : 'AOA';
    
    const formatVal = (val: number) => {
        const finalVal = isForeignDraft ? val : (printingInvoice.currency === 'AOA' ? val : val * (printingInvoice.exchangeRate || 1));
        return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: displayCurrency, minimumFractionDigits: 2 }).format(finalVal);
    };

    const taxSummary: Record<string, {rate: number, base: number, amount: number}> = {};
    printingInvoice.items.forEach(item => {
        const rateLine = item.taxRate;
        const key = rateLine.toString();
        if(!taxSummary[key]) taxSummary[key] = { rate: rateLine, base: 0, amount: 0 };
        let lineBase = item.quantity * (item.length || 1) * (item.width || 1) * (item.height || 1) * item.unitPrice * (1 - (item.discount / 100));
        taxSummary[key].base += lineBase;
        taxSummary[key].amount += lineBase * (rateLine / 100);
    });
    
    const totalIliquido = printingInvoice.subtotal;
    const totalDescontos = printingInvoice.subtotal * (printingInvoice.globalDiscount / 100);
    const totalImposto = printingInvoice.taxAmount;
    const retencaoFonte = printingInvoice.withholdingAmount || 0;
    const cativacaoIva = printingInvoice.retentionAmount || 0;
    const totalFinal = printingInvoice.total;

    // REGRA: Nos orçamentos, fatura pro-forma a descricoes fatura proforma so deve aparecer quando o documento estiver certificado.
    let displayTitle = printingInvoice.type as string;
    if (printingInvoice.type === InvoiceType.PP && !printingInvoice.isCertified) {
        displayTitle = 'PROPOSTA';
    } else if (printingInvoice.type === InvoiceType.OR && !printingInvoice.isCertified) {
        displayTitle = 'COTAÇÃO';
    }

    const isNonFiscal = printingInvoice.type === InvoiceType.PP || printingInvoice.type === InvoiceType.OR;

    return (
        <div className="fixed inset-0 bg-slate-800 z-[100] overflow-y-auto print-container flex flex-col items-center">
            <div className="w-full bg-slate-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg print:hidden">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-bold">Visualização: {isForeignDraft ? `DRAFT SUPORTE (${displayCurrency})` : `DOCUMENTO OFICIAL (AOA)`}</h2>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => printDocument('print-area')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 font-bold"><Printer size={18}/> Imprimir</button>
                    <button onClick={() => setPrintingInvoice(null)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded hover:bg-slate-600"><X size={18}/> Fechar</button>
                </div>
            </div>
            
            <div id="print-area" className={`bg-white shadow-2xl my-8 p-12 relative flex flex-col justify-between ${isA4 ? 'w-[210mm] min-h-[297mm]' : 'w-full'}`}>
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div className="w-2/3">
                            <h1 className="text-2xl font-extrabold uppercase text-slate-900 leading-tight mb-2">{currentCompany.name}</h1>
                            <div className="text-[10px] text-slate-600 space-y-1">
                                <p><span className="font-bold text-slate-800">Endereço:</span> {currentCompany.address}</p>
                                <p><span className="font-bold text-slate-800">NIF:</span> {currentCompany.nif}</p>
                                <p><span className="font-bold text-slate-800">Contacto:</span> {currentCompany.phone} | {currentCompany.email}</p>
                                <p><span className="font-bold text-slate-800">Regime:</span> {currentCompany.regime}</p>
                            </div>
                        </div>
                        <div className="w-32 h-32 bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-300 uppercase">
                             {seriesData?.logo || currentCompany.logo ? <img src={seriesData?.logo || currentCompany.logo} alt="Logo" className="max-h-full max-w-full object-contain" /> : 'LOGO'}
                        </div>
                    </div>

                    <div className="h-px bg-slate-200 w-full mb-8"></div>

                    <div className="flex justify-between mb-8">
                         <div className="border-l-4 border-slate-900 pl-4 py-1">
                            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">EXMO.(S) SR.(S)</h2>
                            <h3 className="text-lg font-black text-slate-900 uppercase">{printingInvoice.clientName}</h3>
                            <div className="text-[10px] text-slate-600 mt-2 space-y-1">
                                 <p><span className="font-bold">NIF:</span> {printingInvoice.clientNif || '999999999'}</p>
                                 <p><span className="font-bold">Endereço:</span> Luanda</p>
                            </div>
                         </div>
                         <div className="text-right">
                             <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
                                {isForeignDraft ? 'DRAFT' : displayTitle}
                             </h1>
                             <p className="text-xl font-mono text-slate-500 font-bold mt-1 uppercase">
                                {isForeignDraft ? `REF ${printingInvoice.number}` : printingInvoice.number}
                             </p>
                             {isForeignDraft && <p className="text-[10px] font-bold text-indigo-600 uppercase mt-1">Documento de Suporte em Moeda Estrangeira</p>}
                             {isNonFiscal && <p className="text-[10px] font-black text-red-600 uppercase mt-1 border-t border-red-100 pt-1">Este documento não serve de fatura</p>}
                             {printingInvoice.type === InvoiceType.GE && <p className="text-[10px] font-bold text-blue-600 mt-1 uppercase leading-tight italic">Este documento serve para confirmar que o documento original foi entregue ao cliente no local indicado.</p>}
                         </div>
                    </div>

                    <div className="grid grid-cols-5 border-y border-slate-200 py-3 mb-8 bg-slate-50/50">
                        <div className="px-4 border-r border-slate-100 text-center">
                            <span className="block text-slate-400 font-bold uppercase text-[9px]">Data Emissão</span>
                            <span className="font-bold text-slate-800 text-xs">{formatDate(printingInvoice.date)}</span>
                        </div>
                        <div className="px-4 border-r border-slate-100 text-center">
                            <span className="block text-slate-400 font-bold uppercase text-[9px]">Vencimento</span>
                            <span className="font-bold text-slate-800 text-xs">{formatDate(printingInvoice.dueDate)}</span>
                        </div>
                        <div className="px-4 border-r border-slate-100 text-center">
                            <span className="block text-slate-400 font-bold uppercase text-[9px]">Moeda</span>
                            <span className="font-bold text-slate-800 text-xs">{displayCurrency}</span>
                        </div>
                        <div className="px-4 border-r border-slate-100 text-center">
                            <span className="block text-slate-400 font-bold uppercase text-[9px]">Câmbio</span>
                            <span className="font-bold text-slate-800 text-xs">{printingInvoice.exchangeRate}</span>
                        </div>
                        <div className="px-4 text-center">
                            <span className="block text-slate-400 font-bold uppercase text-[9px]">Operador</span>
                            <span className="font-bold text-slate-800 text-xs">{printingInvoice.operatorName || 'Admin'}</span>
                        </div>
                    </div>

                    <div className="mb-8">
                        <table className="w-full text-xs border-collapse">
                            <thead className="border-b-2 border-slate-900 text-slate-900 uppercase font-black text-[9px] tracking-wider">
                                <tr>
                                    <th className="text-left py-3 pr-2">REF</th>
                                    <th className="text-left py-3">DESCRIÇÃO</th>
                                    <th className="text-center py-3 w-12">QTD</th>
                                    <th className="text-center py-3 w-10">UN</th>
                                    <th className="text-right py-3 w-32">PREÇO UNIT.</th>
                                    <th className="text-center py-3 w-16">DESC%</th>
                                    <th className="text-center py-3 w-16">TAXA</th>
                                    <th className="text-right py-3 w-32">TOTAL</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                {printingInvoice.items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="py-3 font-mono text-slate-400">-</td>
                                        <td className="py-3 font-bold text-slate-900 uppercase">
                                            {item.description}
                                            {item.showMetrics && <div className="text-[9px] text-slate-400">Dim: {item.length}m x {item.width}m x {item.height}m</div>}
                                        </td>
                                        <td className="text-center py-3 font-black text-slate-900">{item.quantity}</td>
                                        <td className="text-center py-3 text-slate-500 uppercase">{item.unit || 'un'}</td>
                                        <td className="text-right py-3 font-mono">{formatVal(item.unitPrice).replace(displayCurrency,'')} {displayCurrency}</td>
                                        <td className="text-center py-3 text-slate-400">{item.discount > 0 ? `${item.discount}%` : '-'}</td>
                                        <td className="text-center py-3 text-slate-400">{item.taxRate > 0 ? `${item.taxRate}%` : 'ISE'}</td>
                                        <td className="text-right py-3 font-black text-slate-900">{formatVal(item.total).replace(displayCurrency,'')} {displayCurrency}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-auto relative z-10">
                    <div className="grid grid-cols-12 gap-8 items-start">
                        <div className="col-span-7 space-y-6">
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <div className="bg-slate-900 text-white p-2 font-black uppercase text-[8px] tracking-widest">QUADRO RESUMO DE IMPOSTOS</div>
                                <table className="w-full text-[9px] border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr className="text-slate-500 font-bold">
                                            <th className="p-2 text-left">Taxa/Incidência</th>
                                            <th className="p-2 text-right">Base</th>
                                            <th className="p-2 text-right">Total IVA</th>
                                            <th className="p-2 text-left">Motivo Isenção / Obs</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(taxSummary).map(([rate, vals]) => (
                                            <tr key={rate} className="border-b border-slate-100 last:border-0">
                                                <td className="p-2 font-bold uppercase">IVA ({rate}%)</td>
                                                <td className="p-2 text-right font-mono">{formatVal(vals.base).replace(displayCurrency,'')} {displayCurrency}</td>
                                                <td className="p-2 text-right font-mono">{formatVal(vals.amount).replace(displayCurrency,'')} {displayCurrency}</td>
                                                <td className="p-2 text-slate-400 italic text-[8px]">{Number(rate) === 0 ? 'Artigo 12.º do CIVA' : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                                <p className="text-[9px] font-black text-slate-800 uppercase mb-2 border-b pb-1">Observações / Notas Fiscais</p>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-slate-600 italic">Isento de retenção — Lei 4/19, Art. 71, n.º 3, alínea c)</p>
                                    {isNonFiscal && <p className="text-[10px] text-red-600 font-bold uppercase">Este documento não serve de fatura. Tem cariz meramente informativo.</p>}
                                    {retencaoFonte > 0 && <p className="text-[10px] text-indigo-700 font-bold uppercase">Retenção na Fonte (6.5%): Aplicada ao Subtotal.</p>}
                                    {cativacaoIva > 0 && <p className="text-[10px] text-indigo-700 font-bold uppercase">Cativação de IVA: Aplicada conforme legislação.</p>}
                                </div>
                            </div>
                        </div>

                        <div className="col-span-5 space-y-2">
                            <div className="flex justify-between text-[11px] text-slate-600"><span className="font-medium">Total Ilíquido</span><span className="font-black font-mono">{formatVal(totalIliquido).replace(displayCurrency,'')} {displayCurrency}</span></div>
                            <div className="flex justify-between text-[11px] text-red-600"><span className="font-medium">Total Descontos</span><span className="font-black font-mono">- {formatVal(totalDescontos).replace(displayCurrency,'')} {displayCurrency}</span></div>
                            <div className="flex justify-between text-[11px] text-slate-600"><span className="font-medium">Total Imposto (IVA)</span><span className="font-black font-mono">{formatVal(totalImposto).replace(displayCurrency,'')} {displayCurrency}</span></div>
                            
                            {retencaoFonte > 0 && (
                                <div className="flex justify-between text-[11px] text-red-600"><span className="font-medium">Retenção na Fonte (6,5%)</span><span className="font-black font-mono">- {formatVal(retencaoFonte).replace(displayCurrency,'')} {displayCurrency}</span></div>
                            )}
                            {cativacaoIva > 0 && (
                                <div className="flex justify-between text-[11px] text-red-600 border-b-2 border-slate-900 pb-2"><span className="font-medium">Cativação IVA</span><span className="font-black font-mono">- {formatVal(cativacaoIva).replace(displayCurrency,'')} {displayCurrency}</span></div>
                            )}
                            
                            <div className="bg-slate-100 p-4 rounded-xl flex flex-col items-end gap-1 mt-4 shadow-inner border border-slate-200 border-t-4 border-t-slate-800">
                                <div className="flex justify-between w-full items-center">
                                    <span className="font-black text-sm text-slate-900 uppercase">TOTAL A PAGAR</span>
                                    <span className="font-black text-2xl text-slate-900 tracking-tighter">{formatVal(totalFinal)}</span>
                                </div>
                            </div>
                            <div className="text-right text-[10px] text-slate-400 italic mt-2 leading-tight lowercase">
                                {numberToExtenso(isForeignDraft ? totalFinal : (printingInvoice.currency === 'AOA' ? totalFinal : totalFinal * (printingInvoice.exchangeRate || 1)), displayCurrency === 'AOA' ? 'Kwanzas' : displayCurrency === 'USD' ? 'Dólares' : 'Euros')}
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 pt-6 border-t border-slate-200 flex items-end justify-between">
                        <div className="flex gap-4 items-center">
                            <div className="border-2 border-slate-900 p-1 bg-white shadow-sm">
                                <img src={generateQrCodeUrl(printingInvoice.hash || 'DRAFT')} alt="QR" className="w-20 h-20"/>
                            </div>
                            <div className="text-[9px] text-slate-400 space-y-1">
                                <p className="font-mono font-black text-slate-800 text-[11px] tracking-widest">{printingInvoice.hash || '####-####'}</p>
                                <p className="uppercase font-bold">Processado por programa certificado nº 25/AGT/2019</p>
                                <p className="uppercase">imatec soft V.2.0 | Software Certificado</p>
                            </div>
                        </div>
                        <div className="text-right text-[9px] font-bold text-slate-400 uppercase tracking-widest flex flex-col items-end gap-1">
                             <div className="flex gap-4">
                                <span className="flex items-center gap-1"><Mail size={10}/> {currentCompany.email}</span>
                                <span className="flex items-center gap-1"><Phone size={10}/> {currentCompany.phone}</span>
                             </div>
                             <span className="flex items-center gap-1"><MapPin size={10}/> {currentCompany.address}</span>
                             <div className="mt-2">Documento processado por computador</div>
                        </div>
                    </div>
                </div>
            </div>
             <style>{`@media print { body * { visibility: hidden; } .print-container, .print-container * { visibility: visible; } .print-container { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: white; display: block; } @page { size: A4; margin: 0; } }`}</style>
        </div>
    );
  };

  const renderActionButtons = () => {
      if (!selectedActionInvoice) return null;
      const isCertified = selectedActionInvoice.isCertified;
      const isCancelled = selectedActionInvoice.status === InvoiceStatus.CANCELLED;
      const isRG = selectedActionInvoice.type === InvoiceType.RG;
      const canPerformOfficialAction = isCertified; 
      const isFullyPaid = (selectedActionInvoice.paidAmount || 0) >= selectedActionInvoice.total;
      const canLiquidate = isCertified && selectedActionInvoice.type === InvoiceType.FT && !isCancelled && !isFullyPaid;
      const isForeign = selectedActionInvoice.currency && selectedActionInvoice.currency !== 'AOA';
      const isProformaOrBudget = selectedActionInvoice.type === InvoiceType.PP || selectedActionInvoice.type === InvoiceType.OR;

      return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-2 border-b pb-1">Gestão Documental</div>
                  <button onClick={() => handleEdit(selectedActionInvoice)} disabled={isCancelled} className="w-full p-2.5 bg-slate-50 text-slate-700 rounded-lg flex items-center gap-3 font-medium hover:bg-slate-100 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <Edit3 size={16}/> {isCertified ? 'Editar (Restrito)' : 'Editar Rascunho'}
                  </button>
                  <button onClick={() => handleViewAccount(selectedActionInvoice)} disabled={!canPerformOfficialAction} className="w-full p-2.5 bg-slate-50 text-slate-700 rounded-lg flex items-center gap-3 font-medium hover:bg-slate-100 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <User size={16}/> Ver Conta Corrente
                  </button>
                  <button onClick={() => initiateClone(selectedActionInvoice)} className="w-full p-2.5 bg-slate-50 text-slate-700 rounded-lg flex items-center gap-3 font-medium hover:bg-slate-100 transition text-sm">
                        <Copy size={16}/> Clonar Documento
                  </button>
                  {isCertified && !isCancelled && (
                      <button onClick={() => handleIssueDeliveryGuide(selectedActionInvoice)} className="w-full p-2.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg flex items-center gap-3 font-bold hover:bg-blue-100 transition text-sm">
                          <Truck size={16}/> Guia de Entrega
                      </button>
                  )}
                  <button onClick={() => initiateCancel(selectedActionInvoice)} disabled={!canPerformOfficialAction || isCancelled} className="w-full p-2.5 bg-red-50 text-red-600 rounded-lg flex items-center gap-3 font-medium hover:bg-red-100 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <AlertTriangle size={16}/> Anular Documento
                  </button>
                  <button onClick={() => initiateDelete(selectedActionInvoice)} disabled={isCertified} className="w-full p-2.5 border border-red-100 text-red-500 rounded-lg flex items-center gap-3 font-medium hover:bg-red-100 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <Trash2 size={16}/> Apagar Rascunho
                  </button>
              </div>
              <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-2 border-b pb-1">Impressão / Saída</div>
                  <div className="relative group">
                      <button onClick={() => handlePrint(selectedActionInvoice, 'A4', false, 'Original')} className="w-full p-2.5 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-between font-medium hover:bg-blue-100 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed" disabled={!canPerformOfficialAction}>
                          <span className="flex items-center gap-3"><Printer size={16}/> Imprimir (AOA)</span>
                          <ChevronDown size={16}/>
                      </button>
                      <div className="hidden group-hover:block absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-lg z-50 overflow-hidden mt-1">
                          <button onClick={() => handlePrint(selectedActionInvoice, 'A4', false, 'Original')} className="block w-full text-left p-2 hover:bg-slate-50 text-xs font-medium">Imprimir Original</button>
                          <button onClick={() => handlePrint(selectedActionInvoice, 'A4', false, 'Duplicado')} className="block w-full text-left p-2 hover:bg-slate-50 text-xs font-medium">Imprimir Duplicado</button>
                          <button onClick={() => handlePrint(selectedActionInvoice, 'A4', false, 'Triplicado')} className="block w-full text-left p-2 hover:bg-slate-50 text-xs font-medium">Imprimir Triplicado</button>
                          <button onClick={() => handlePrint(selectedActionInvoice, 'A4', false, '2ª Via')} className="block w-full text-left p-2 hover:bg-slate-50 text-xs font-medium text-blue-600 font-bold">Imprimir 2ª Via</button>
                      </div>
                  </div>
                  {isForeign && isCertified && (
                      <button onClick={() => handlePrint(selectedActionInvoice, 'A4', true, 'Draft')} className="w-full p-2.5 bg-indigo-600 text-white rounded-lg flex items-center gap-3 font-bold hover:bg-indigo-700 transition text-sm shadow-md">
                          <FileType size={16}/> Draft Suporte ({selectedActionInvoice.currency})
                      </button>
                  )}
                  <button onClick={() => { downloadPDF("invoiceTable", `${selectedActionInvoice.number}.pdf`) }} disabled={!canPerformOfficialAction} className="w-full p-2.5 bg-slate-50 text-slate-700 rounded-lg flex items-center gap-3 font-medium hover:bg-slate-100 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <Download size={16}/> Baixar PDF
                  </button>
                  <button onClick={() => handleExcelExport(selectedActionInvoice)} disabled={!canPerformOfficialAction} className="w-full p-2.5 bg-slate-50 text-slate-700 rounded-lg flex items-center gap-3 font-medium hover:bg-slate-100 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <FileSpreadsheet size={16}/> Exportar para Excel
                  </button>
                  <button onClick={() => handleUploadClick(selectedActionInvoice, true)} className="w-full p-2.5 bg-slate-50 text-slate-700 rounded-lg flex items-center gap-3 font-medium hover:bg-slate-100 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <Upload size={16}/> Atualizar Anexo
                  </button>
              </div>
              <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-2 border-b pb-1">Financeiro / Emissão</div>
                  {!isCertified && !isCancelled && (
                       <button onClick={() => initiateCertify(selectedActionInvoice)} className="w-full p-2.5 bg-orange-500 text-white rounded-lg flex items-center gap-3 font-bold hover:bg-orange-600 transition text-sm animate-pulse shadow-lg shadow-orange-500/30">
                            <ShieldCheck size={16}/> Certificar Documento
                      </button>
                  )}
                  {isProformaOrBudget && (
                      <button 
                        onClick={() => initiateConvert(selectedActionInvoice)} 
                        disabled={isCancelled}
                        className="w-full p-2.5 bg-blue-600 text-white rounded-lg flex items-center gap-3 font-bold hover:bg-blue-700 transition text-sm shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          <RefreshCw size={16}/> Faturar Proforma
                      </button>
                  )}
                  <button onClick={() => initiateLiquidate(selectedActionInvoice)} disabled={!canLiquidate} className="w-full p-2.5 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-3 font-medium hover:bg-emerald-100 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed" title={isFullyPaid ? "Documento Pago na totalidade" : canLiquidate ? "Emitir Recibo de Pagamento" : isCancelled ? "Documento Anulado" : "Recibos apenas para Faturas (FT)"}>
                        <DollarSign size={16}/> Emitir Recibo
                  </button>
                  <button onClick={() => onCreateDerived(selectedActionInvoice, InvoiceType.NC)} disabled={isCancelled || !canPerformOfficialAction || isRG} className="w-full p-2.5 bg-purple-50 text-purple-700 rounded-lg flex items-center gap-3 font-medium hover:bg-purple-100 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <ArrowRightLeft size={16}/> Emitir Nota de Credito
                  </button>
                  <button onClick={() => onCreateDerived(selectedActionInvoice, InvoiceType.ND)} disabled={!isCertified || isCancelled || isRG} className="w-full p-2.5 bg-indigo-50 text-indigo-700 rounded-lg flex items-center gap-3 font-medium hover:bg-indigo-100 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        <FilePlus size={16}/> Emitir Nota de Débito
                  </button>
                  <div className="pt-2 mt-2 border-t border-slate-100">
                      <button onClick={() => handleEmail(selectedActionInvoice)} disabled={!canPerformOfficialAction} className="w-full p-2.5 hover:bg-slate-50 text-slate-600 rounded-lg flex items-center gap-3 font-medium transition text-sm mb-1 disabled:opacity-50 disabled:cursor-not-allowed">
                            <Mail size={16}/> Enviar Documento por Email
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  const renderUploadViewer = () => {
      if(!viewingUpload) return null;
      return (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
                  <div className="p-4 border-b flex justify-between items-center bg-slate-100 rounded-t-lg">
                      <h3 className="font-bold">Visualizar Anexo</h3>
                      <button onClick={() => setViewingUpload(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-auto p-4 bg-slate-50 flex justify-center items-center">
                      <img src={viewingUpload} alt="Anexo" className="max-w-full max-h-full object-contain shadow-lg"/>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {printingInvoice && renderPrintPreview()}
      {viewingUpload && renderUploadViewer()}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

      {convertModalOpen && selectedActionInvoice && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><RefreshCw size={20}/> Faturar Proforma: Fatura, Fatura Recibo</h3>
                  <p className="text-sm text-slate-500 mb-4">Escolha o tipo de documento a emitir a partir deste {selectedActionInvoice.type}:</p>
                  <div className="space-y-2 mb-4">
                      <button onClick={() => setTargetConvertType(InvoiceType.FT)} className={`w-full p-3 rounded-lg border text-left font-bold ${targetConvertType === InvoiceType.FT ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-slate-50'}`}>Fatura (FT)</button>
                      <button onClick={() => setTargetConvertType(InvoiceType.FR)} className={`w-full p-3 rounded-lg border text-left font-bold ${targetConvertType === InvoiceType.FR ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-slate-50'}`}>Fatura / Recibo (FR)</button>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setConvertModalOpen(false)} className="flex-1 py-2 border rounded-lg">Cancelar</button>
                      <button onClick={confirmConvert} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold">Confirmar</button>
                  </div>
              </div>
          </div>
      )}

      {cloneModalOpen && selectedActionInvoice && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Copy size={20}/> Clonar Documento</h3>
                  <p className="text-sm text-slate-500 mb-4">Selecione o tipo de documento de destino:</p>
                  <div className="space-y-2 mb-4">
                      <button onClick={() => setTargetCloneType(InvoiceType.FT)} className={`w-full p-3 rounded-lg border text-left font-bold ${targetCloneType === InvoiceType.FT ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-slate-50'}`}>Fatura (FT)</button>
                      <button onClick={() => setTargetCloneType(InvoiceType.FR)} className={`w-full p-3 rounded-lg border text-left font-bold ${targetCloneType === InvoiceType.FR ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-slate-50'}`}>Fatura / Recibo (FR)</button>
                      <button onClick={() => setTargetCloneType(InvoiceType.PP)} className={`w-full p-3 rounded-lg border text-left font-bold ${targetCloneType === InvoiceType.PP ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-slate-50'}`}>Fatura Pró-Forma (PP)</button>
                      <button onClick={() => setTargetCloneType(InvoiceType.OR)} className={`w-full p-3 rounded-lg border text-left font-bold ${targetCloneType === InvoiceType.OR ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-slate-50'}`}>Orçamento (OR)</button>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setCloneModalOpen(false)} className="flex-1 py-2 border rounded-lg">Cancelar</button>
                      <button onClick={confirmClone} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold">Clonar</button>
                  </div>
              </div>
          </div>
      )}

      {liquidateModalOpen && selectedActionInvoice && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
               <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
                    <div className="bg-emerald-600 text-white p-4">
                        <h3 className="font-bold flex items-center gap-2"><Receipt size={20}/> Emitir Recibo / Pagamento</h3>
                    </div>
                    <div className="p-6 space-y-4">
                         <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 space-y-2">
                             <div className="flex justify-between text-[11px] uppercase font-bold text-emerald-800">
                                <span>Doc No</span>
                                <span>{selectedActionInvoice.number}</span>
                             </div>
                             <div className="flex justify-between text-[11px] uppercase font-bold text-emerald-800">
                                <span>Valor de Factura</span>
                                <span>{formatCurrency(selectedActionInvoice.total)}</span>
                             </div>
                             <div className="flex justify-between text-[11px] uppercase font-bold text-emerald-800">
                                <span>Valor Liquidado</span>
                                <span>{formatCurrency(selectedActionInvoice.paidAmount || 0)}</span>
                             </div>
                             <div className="flex justify-between text-sm uppercase font-black text-emerald-700 border-t border-emerald-200 pt-1 mt-1">
                                <span>Valor por Liquidar</span>
                                <span>{formatCurrency(selectedActionInvoice.total - (selectedActionInvoice.paidAmount || 0))}</span>
                             </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={10}/> Data Valor</label>
                                <input type="date" className="w-full p-2 border border-slate-300 rounded-lg text-sm" value={liquidateData.dateValue} onChange={e => setLiquidateData({...liquidateData, dateValue: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar size={10}/> Data do Documento</label>
                                <input type="date" className="w-full p-2 border border-slate-300 rounded-lg text-sm" value={liquidateData.docDate} onChange={e => setLiquidateData({...liquidateData, docDate: e.target.value})} />
                            </div>
                         </div>

                         <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Valor a Pagar Agora</label>
                             <input type="number" className="w-full p-3 border border-slate-300 rounded-lg font-bold text-lg" value={liquidateData.amount} onChange={e => setLiquidateData({...liquidateData, amount: Number(e.target.value)})} />
                         </div>
                         <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Forma de Pagamento</label>
                             <select className="w-full p-3 border border-slate-300 rounded-lg" value={liquidateData.method} onChange={e => setLiquidateData({...liquidateData, method: e.target.value as PaymentMethod})}>
                                 <option value="">Selecione...</option>
                                 <option value="CASH">Dinheiro (AOA)</option>
                                 <option value="MULTICAIXA">Multicaixa</option>
                                 <option value="DEBIT_CARD">Cartão Débito</option>
                                 <option value="CREDIT_CARD">Cartão Crédito</option>
                                 <option value="MCX_EXPRESS">Multicaixa Express</option>
                                 <option value="TRANSFER">Transferência</option>
                                 <option value="OTHERS">Outros</option>
                             </select>
                         </div>
                         <div>
                             <label className="text-xs font-bold text-slate-500 uppercase">Caixa de Destino</label>
                             <select className="w-full p-3 border border-slate-300 rounded-lg" value={liquidateData.registerId} onChange={e => setLiquidateData({...liquidateData, registerId: e.target.value})}>
                                 <option value="">Selecione Caixa...</option>
                                 {cashRegisters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                             </select>
                         </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                        <button onClick={() => setLiquidateModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-white border rounded-lg">Cancelar</button>
                        <button onClick={handleConfirmLiquidate} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Confirmar Pagamento</button>
                    </div>
               </div>
          </div>
      )}

      {certifyModalOpen && invoiceToCertify && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
               <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
                    <h3 className="text-xl font-bold text-indigo-600 mb-2 flex items-center gap-2"><ShieldCheck/> Certificar Documento</h3>
                    <p className="text-sm text-slate-600 mb-4">
                        Atenção: Ao certificar, o documento será trancado, assinado digitalmente e não poderá ser apagado (apenas anulado).
                    </p>
                    <div className="flex gap-2">
                         <button onClick={() => setCertifyModalOpen(false)} className="flex-1 py-2 border rounded-lg">Cancelar</button>
                         <button onClick={confirmCertify} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700">Confirmar</button>
                    </div>
               </div>
          </div>
      )}

      {cancelModalOpen && invoiceToCancel && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2"><AlertTriangle/> Anular Documento</h3>
                  <p className="text-sm text-slate-600 mb-4">Tem a certeza? Será gerada uma Nota de Crédito/Débito para anular o efeito financeiro.</p>
                  <textarea 
                      className="w-full p-3 border rounded-lg mb-4 h-24 text-sm"
                      placeholder="Motivo da anulação (Obrigatório)..."
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                      <button onClick={() => setCancelModalOpen(false)} className="flex-1 py-2 border rounded-lg">Cancelar</button>
                      <button onClick={confirmCancel} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold">Confirmar Anulação</button>
                  </div>
              </div>
          </div>
      )}

       {deleteModalOpen && invoiceToDelete && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 text-center">
                  <h3 className="text-xl font-bold text-red-600 mb-2">Apagar Rascunho?</h3>
                  <p className="text-sm text-slate-600 mb-4">Esta ação é irreversível.</p>
                  <div className="flex gap-2 justify-center">
                      <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                      <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold">Apagar</button>
                  </div>
              </div>
          </div>
      )}

      {actionModalOpen && selectedActionInvoice && (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                    <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold flex items-center gap-2"><FileText size={24}/> {selectedActionInvoice.type} {selectedActionInvoice.number}</h2>
                            <p className="text-slate-400 text-xs mt-1">
                                {selectedActionInvoice.clientName} • {formatCurrency(selectedActionInvoice.total)} • 
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold text-slate-900 ${getStatusColor(selectedActionInvoice).split(' ')[0]}`}>
                                    {getStatusText(selectedActionInvoice)}
                                </span>
                            </p>
                        </div>
                        <button onClick={closeActions} className="hover:bg-slate-800 p-2 rounded-full transition"><X/></button>
                    </div>
                    <div className="p-6">
                         {renderActionButtons()}
                    </div>
               </div>
          </div>
      )}

      {showBusinessOverview && (
          <BusinessOverviewModal 
              isOpen={showBusinessOverview}
              onClose={() => setShowBusinessOverview(false)}
              onBack={() => setShowBusinessOverview(false)}
              invoices={invoices}
              purchases={purchases}
          />
      )}

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            Documentos de Venda
            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Database size={10}/> Cloud Sync
            </span>
          </h1>
          <p className="text-xs text-slate-500">Gestão de documentos certificados e faturas (Sincronizado com Supabase)</p>
        </div>
        <div className="flex gap-2">
             <button onClick={onCreateNew} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition font-medium">
                 <PlusCircle size={16} /> Nova Fatura
             </button>
             <button onClick={onViewReports} className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded text-sm hover:bg-slate-200 transition font-medium">
                 <PieChart size={16} /> Relatórios
             </button>
             <button onClick={() => setShowBusinessOverview(true)} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition font-medium shadow-md">
                 <BarChart size={16} /> Visão Geral do Negócio
             </button>
             <button onClick={() => handleExcelExport()} className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition font-medium">
                 <Download size={16} /> Excel
             </button>
        </div>
      </div>

      <div className="bg-slate-100 p-3 rounded-lg border border-slate-200 flex flex-wrap items-end gap-3 text-sm">
         <div className="flex-1 min-w-[200px]">
             <label className="block text-xs font-bold text-slate-500 mb-1">Pesquisa Geral</label>
             <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                    type="text" 
                    placeholder="Cliente, Nº Doc..." 
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
         </div>
         <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">Série</label>
             <select className="py-1.5 px-2 border border-slate-300 rounded w-32 outline-none" value={seriesFilter} onChange={e => setSeriesFilter(e.target.value)}>
                 <option value="ALL">Todas</option>
                 {series.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
             </select>
         </div>
         <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">Estado</label>
             <select className="py-1.5 px-2 border border-slate-300 rounded w-32 outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                 <option value="ALL">Todos</option>
                 <option value={InvoiceStatus.PAID}>Pago</option>
                 <option value={InvoiceStatus.PENDING}>Pendente</option>
                 <option value={InvoiceStatus.DRAFT}>Rascunho</option>
             </select>
         </div>
         <div>
             <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
             <select className="py-1.5 px-2 border border-slate-300 rounded w-32 outline-none" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                 <option value="ALL">Todos</option>
                 {Object.values(InvoiceType).map(t => <option key={t} value={t}>{t}</option>)}
             </select>
         </div>
         <button className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 flex items-center gap-1 font-bold" onClick={() => {setSearchTerm(''); setStatusFilter('ALL'); setTypeFilter('ALL'); setSeriesFilter('ALL');}}>
             <Filter size={14}/> Limpar
         </button>
      </div>

      <div className="bg-white border border-slate-300 rounded shadow-sm overflow-hidden" id="invoiceTable">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-700 text-white font-semibold">
              <tr>
                <th className="px-4 py-2 w-24">Data</th>
                <th className="px-4 py-2 w-20">Tipo</th>
                <th className="px-4 py-2 w-32">Número</th>
                <th className="px-4 py-2">Cliente / Ref</th>
                <th className="px-4 py-2 w-24">Loja/Local</th>
                <th className="px-4 py-2 w-24">Caixa</th>
                <th className="px-4 py-2 w-28 text-right">Total</th>
                <th className="px-4 py-2 w-24 text-center">Estado</th>
                <th className="px-4 py-2 w-28 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-700">
              {filteredInvoices.map((invoice) => {
                  const { children, parent } = getRelatedDocuments(invoice.id, invoice);
                  const isCancelled = invoice.status === InvoiceStatus.CANCELLED;
                  
                  return (
                  <tr key={invoice.id} className="hover:bg-blue-50 transition-colors">
                    <td className={`px-4 py-2 ${isCancelled ? 'text-red-600' : ''}`}>{formatDate(invoice.date)}</td>
                    <td className="px-4 py-2 font-bold text-slate-600">{invoice.type}</td>
                    <td className={`px-4 py-2 font-medium ${isCancelled ? 'text-red-600 line-through' : 'text-blue-600'}`}>
                        <div className="flex items-center gap-1">
                            {invoice.isCertified && <Lock size={10} className="text-slate-400"/>}
                            {invoice.number}
                        </div>
                    </td>
                    <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                            {invoice.clientName}
                            {isCancelled && <span className="text-[10px] font-bold text-red-600 uppercase border border-red-200 bg-red-50 px-1 rounded">ANULADO</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 flex flex-wrap gap-2">
                            <span>{invoice.clientNif || '-'}</span>
                            {parent && (
                                <span className="bg-slate-100 px-1 rounded text-slate-500 flex items-center gap-1">
                                    <Link size={10}/> {parent.type === InvoiceType.RG ? 'Referência:' : parent.type === InvoiceType.NC ? 'Retifica:' : 'Origem:'} {parent.number}
                                </span>
                            )}
                            {children.length > 0 && children.map(child => (
                                <span key={child.id} className={`px-1 rounded flex items-center gap-1 ${child.type === InvoiceType.NC ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                                    <Link size={10}/> {child.type === InvoiceType.RG ? 'Recibo:' : child.type === InvoiceType.NC ? 'Nota Créd:' : child.type === InvoiceType.ND ? 'Nota Déb:' : 'Ref:'} {child.number}
                                </span>
                            ))}
                        </div>
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                        {workLocations.find(w => w.id === invoice.workLocationId)?.name || '-'}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                        {cashRegisters.find(c => c.id === invoice.cashRegisterId)?.name || '-'}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-slate-900">
                        {invoice.currency && invoice.currency !== 'AOA' ? (
                            <span>{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: invoice.currency }).format(invoice.total)}</span>
                        ) : (
                            formatCurrency(invoice.total)
                        )}
                    </td>
                    <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusColor(invoice)}`}>
                            {getStatusText(invoice)}
                        </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex justify-center gap-1">
                          {invoice.isCertified && (
                            <button onClick={() => handlePrint(invoice, 'A4', false, '2ª Via')} className="p-1 text-blue-500 hover:text-blue-700 bg-blue-50 rounded" title="Imprimir 2ª Via">
                                <Printer size={14} />
                            </button>
                          )}
                          <button onClick={() => handleUploadClick(invoice)} className={`p-1 rounded ${invoice.attachment ? 'text-green-600' : 'text-slate-400 hover:text-blue-600'}`} title="Anexo / Upload">
                              {invoice.attachment ? <FileCheck size={14} /> : <Upload size={14} />}
                          </button>
                          <button onClick={() => openActions(invoice)} className="p-1 text-slate-400 hover:text-blue-600" title="Mais Ações">
                            <MoreHorizontal size={14} />
                          </button>
                      </div>
                    </td>
                  </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvoiceList;
