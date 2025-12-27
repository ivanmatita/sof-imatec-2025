
import React, { useState, useMemo, useEffect } from 'react';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import InvoiceList from './InvoiceList';
import InvoiceForm from './InvoiceForm';
import PurchaseList from './PurchaseList';
import PurchaseForm from './PurchaseForm';
import ClientList from './ClientList';
import SupplierList from './SupplierList';
import Settings from './Settings';
import StockManager from './StockManager'; 
import TaxManager from './TaxManager';
import CostRevenueMap from './CostRevenueMap';
import RegularizationMap from './RegularizationMap';
import Model7 from './Model7';
import CashManager from './CashManager'; 
import HumanResources from './HumanResources'; 
import Employees from './Employees'; 
import Workspace from './Workspace';
import SaftExport from './SaftExport';
import ManagementReports from './ManagementReports';
import PGCManager from './PGCManager'; 
import RubricasManager from './RubricasManager';
import ClassifyMovement from './ClassifyMovement';
import VatSettlementMap from './VatSettlementMap'; 
import OpeningBalanceMap from './OpeningBalanceMap'; 
import AccountExtract from './AccountExtract'; 
import SecretariaList from './SecretariaList'; 
import SecretariaForm from './SecretariaForm';
import PurchaseAnalysis from './PurchaseAnalysis'; 
import AIAssistant from './AIAssistant';
import LoginPage from './LoginPage';
import POS from './POS';
import CashClosure from './CashClosure';
import CashClosureHistory from './CashClosureHistory';
import POSSettings from './POSSettings';
import PerformanceAnalysis from './PerformanceAnalysis';
import TaxCalculationMap from './TaxCalculationMap';
import AccountingMaps from './AccountingMaps';
import ContractGenerator from './ContractGenerator';
import SchoolManagement from './SchoolManagement';
import RestaurantManagement from './RestaurantManagement';
import HotelManagement from './HotelManagement';
import ArchivesManager from './ArchivesManager';
import TaxDocsManager from './TaxDocsManager';

import { supabase } from '../services/supabaseClient';

import { 
  Invoice, InvoiceStatus, ViewState, Client, Product, InvoiceType, 
  Warehouse, PriceTable, StockMovement, Purchase, Company, User,
  Employee, SalarySlip, HrTransaction, WorkLocation, CashRegister, DocumentSeries,
  Supplier, PaymentMethod, CashMovement, HrVacation, PGCAccount, SecretariaDocument, 
  VatSettlement, OpeningBalance, UserActivityLog, POSConfig, Contract, AttendanceRecord, Profession, PurchaseType, CashClosure as CashClosureType
} from '../types';
import { Menu, Calendar as CalendarIcon, RefreshCw, AlertCircle, Clock as ClockIcon, ShieldCheck } from 'lucide-react';
import { generateId, generateInvoiceHash, getDocumentPrefix } from '../utils';

const DEFAULT_FALLBACK_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
const MOCK_COMPANY: Company = {
  id: DEFAULT_FALLBACK_COMPANY_ID, name: 'C & V - COMERCIO GERAL E PRESTAÇAO DE SERVIÇOS, LDA', nif: '5000780316', 
  address: 'Luanda, Angola', email: 'geral@empresa.ao', phone: '+244 923 000 000', regime: 'Geral',
  licensePlan: 'ENTERPRISE', status: 'ACTIVE', validUntil: '2025-12-31', registrationDate: '2024-01-01'
};

const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Admin', email: 'admin@sistema.ao', password: '123', role: 'ADMIN', companyId: DEFAULT_FALLBACK_COMPANY_ID, permissions: [], createdAt: '2024-01-01' }
];

const App = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(MOCK_USERS[0]);
  const [globalYear, setGlobalYear] = useState<number>(new Date().getFullYear());
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Data State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [priceTables, setPriceTables] = useState<PriceTable[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [series, setSeries] = useState<DocumentSeries[]>([
      { id: 's1', name: 'Série Geral', code: 'A', type: 'NORMAL', year: 2024, currentSequence: 1, sequences: {}, isActive: true, allowedUserIds: [], bankDetails: '', footerText: '' }
  ]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([
      { id: 'wl1', name: 'Sede Principal', address: 'Luanda' }
  ]);
  const [pgcAccounts, setPgcAccounts] = useState<PGCAccount[]>([]);
  const [hrEmployees, setHrEmployees] = useState<Employee[]>([]);
  const [hrTransactions, setHrTransactions] = useState<HrTransaction[]>([]);
  const [hrVacations, setHrVacations] = useState<HrVacation[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<SalarySlip[]>([]);
  const [secDocuments, setSecDocuments] = useState<SecretariaDocument[]>([]);
  const [vatSettlements, setVatSettlements] = useState<VatSettlement[]>([]);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([]);
  const [posConfig, setPosConfig] = useState<POSConfig>({
      defaultSeriesId: 's1', printerType: '80mm', autoPrint: true, allowDiscounts: true,
      defaultClientId: '', defaultPaymentMethod: 'CASH', showImages: true, quickMode: false
  });
  const [cashClosures, setCashClosures] = useState<CashClosureType[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivityLog[]>([]);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [realEmpresaId, setRealEmpresaId] = useState<string | null>(null);

  const [invoiceInitialType, setInvoiceInitialType] = useState<InvoiceType>(InvoiceType.FT);
  const [invoiceInitialData, setInvoiceInitialData] = useState<Partial<Invoice> | undefined>(undefined);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedExtractAccount, setSelectedExtractAccount] = useState<string | null>(null);
  const [selectedHrEmployee, setSelectedHrEmployee] = useState<Employee | null>(null);

  const certifiedInvoices = useMemo(() => invoices.filter(i => i.isCertified), [invoices]);
  const validPurchases = useMemo(() => purchases.filter(p => p.status !== 'PENDING'), [purchases]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const ensureUUID = (id: string): string => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) return id;
    const hex = id.split('').map(c => c.charCodeAt(0).toString(16)).join('').padEnd(32, '0').substring(0, 32);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-a${hex.slice(15, 18)}-${hex.slice(18, 30)}`;
  };

  useEffect(() => {
    if (currentUser) {
      initAppCloud();
    }
  }, [currentUser]);

  const initAppCloud = async () => {
    setIsLoading(true);
    try {
      const { data: companies } = await supabase.from('empresas').select('id').limit(1);
      if (companies && companies.length > 0) {
          setRealEmpresaId(companies[0].id);
      }
      await Promise.all([
          fetchInvoicesCloud(),
          fetchPurchasesCloud(),
          fetchCashRegistersCloud(),
          fetchCashClosuresCloud(),
          fetchContractsCloud()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContractsCloud = async () => {
      try {
          const { data, error } = await supabase.from('contratos').select('*').order('created_at', { ascending: false });
          if (data) {
              setContracts(data.map(c => ({
                  id: c.id,
                  employeeId: c.funcionario_id,
                  type: c.tipo as 'Determinado' | 'Indeterminado' | 'Estagio',
                  startDate: c.data_inicio,
                  endDate: c.data_fim,
                  status: c.status as 'Active' | 'Expired' | 'Terminated',
                  clauses: c.clausulas || []
              })));
          }
      } catch (err) { console.error("Erro ao carregar contratos:", err); }
  };

  const fetchCashClosuresCloud = async () => {
      try {
          const { data, error } = await supabase
            .from('fechos_caixa')
            .select('*')
            .order('data_fecho', { ascending: false });
          
          if (data) {
              setCashClosures(data.map(c => ({
                  id: c.id,
                  date: c.data_fecho,
                  openedAt: c.aberto_em,
                  closedAt: c.fechado_em,
                  operatorId: c.operador_id,
                  operatorName: c.operador_nome,
                  cashRegisterId: c.caixa_id,
                  expectedCash: Number(c.esperado_dinheiro || 0),
                  expectedMulticaixa: Number(c.esperado_multicaixa || 0),
                  expectedTransfer: Number(c.esperado_transferencia || 0),
                  expectedCredit: Number(c.esperado_credito || 0),
                  totalSales: Number(c.total_vendas || 0),
                  actualCash: Number(c.dinheiro_real || 0),
                  difference: Number(c.diferenca || 0),
                  initialBalance: Number(c.saldo_inicial || 0),
                  finalBalance: Number(c.saldo_final || 0),
                  status: c.status as 'CLOSED',
                  notes: c.notes
              })));
          }
      } catch (err) { console.error("Erro ao carregar fechos:", err); }
  };

  const fetchCashRegistersCloud = async () => {
      try {
          const { data } = await supabase.from('caixas').select('*');
          if (data) {
              setCashRegisters(data.map(c => ({
                  id: c.id,
                  name: c.titulo,
                  status: c.status,
                  balance: c.balance,
                  initialBalance: c.saldo_abertura
              })));
          }
      } catch (err) { console.error(err); }
  };

  const fetchInvoicesCloud = async () => {
    setCloudError(null);
    try {
      const { data, error } = await supabase
        .from('faturas')
        .select('*')
        .order('data_fatura', { ascending: false });

      if (error) {
        setCloudError(`Falha cloud: ${error.message}`);
      } else if (data) {
        const mapped: Invoice[] = data.map(f => {
          let type = InvoiceType.FT;
          if (f.tipo_fatura === 'VD') type = InvoiceType.VD;
          if (f.tipo_fatura === 'FR') type = InvoiceType.FR;
          if (f.tipo_fatura === 'RG') type = InvoiceType.RG;
          if (f.tipo_fatura === 'NC') type = InvoiceType.NC;
          if (f.tipo_fatura === 'ND') type = InvoiceType.ND;
          if (f.tipo_fatura === 'PP') type = InvoiceType.PP;
          if (f.tipo_fatura === 'OR') type = InvoiceType.OR;
          if (f.tipo_fatura === 'GE') type = InvoiceType.GE;

          return {
            id: f.id,
            type: type,
            seriesId: f.serie_id || 's1',
            number: f.numero_fatura || '---',
            date: f.data_fatura || '',
            dueDate: f.data_fatura || '',
            accountingDate: f.data_fatura || '',
            clientId: f.cliente_id || '',
            clientName: 'Cliente Cloud',
            clientNif: '',
            items: [],
            subtotal: (f.total || 0) - (f.iva || 0),
            globalDiscount: 0,
            taxRate: 14,
            taxAmount: f.iva || 0,
            withholdingAmount: 0,
            total: f.total || 0,
            currency: 'AOA',
            exchangeRate: 1,
            status: f.status as InvoiceStatus,
            isCertified: true,
            hash: '',
            companyId: f.empresa_id || DEFAULT_FALLBACK_COMPANY_ID,
            source: (f.source || 'MANUAL') as any,
            cashRegisterId: f.caixa_id,
            paymentMethod: f.metodo_pagamento as any,
            sourceInvoiceId: f.source_invoice_id 
          };
        });
        setInvoices(mapped);
      }
    } catch (err: any) { setCloudError(`Erro: ${err.message}`); }
  };

  const fetchPurchasesCloud = async () => {
    try {
      const { data } = await supabase.from('compras').select('*').order('data_emissao', { ascending: false });
      if (data) {
        setPurchases(data.map(p => ({
          id: p.id,
          type: p.tipo_documento as PurchaseType,
          supplierId: p.fornecedor_id,
          supplier: p.fornecedor_nome,
          nif: p.nif_fornecedor || '',
          date: p.data_emissao,
          dueDate: p.data_vencimento || p.data_emissao,
          documentNumber: p.numero_documento,
          items: p.items || [],
          subtotal: p.valor_subtotal || 0,
          taxAmount: p.valor_iva || 0,
          total: p.valor_total || 0,
          status: p.status as any,
          observacoes: p.observacoes,
          hash: p.hash
        })));
      }
    } catch (err) { console.error(err); }
  };

  const handleLogin = (email: string, pass: string) => {
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) setCurrentUser(user);
    else alert("Credenciais inválidas.");
  };

  const handleSaveInvoice = async (inv: Invoice, sId: string, action?: string) => {
      setIsLoading(true);
      const docSeries = series.find(s => s.id === sId);
      let finalInv = { ...inv };
      
      if (!inv.isCertified) {
          const typeKey = inv.type as string;
          const currentSeqForType = docSeries?.sequences?.[typeKey] || 0;
          const nextSeq = currentSeqForType + 1;
          
          const prefix = getDocumentPrefix(inv.type);
          const number = `${prefix} ${docSeries?.code || 'S'} ${docSeries?.year}/${nextSeq}`;
          
          finalInv = { ...inv, number, seriesCode: docSeries?.code };
          
          if (docSeries) {
              const updatedSequences = { ...docSeries.sequences, [typeKey]: nextSeq };
              setSeries(series.map(s => s.id === sId ? { ...s, sequences: updatedSequences } : s));
          }
      }

      if (action === 'CERTIFY') {
          finalInv.isCertified = true;
          finalInv.hash = generateInvoiceHash(finalInv);
      }
      setInvoices([finalInv, ...invoices.filter(i => i.id !== finalInv.id)]);

      try {
        const companyIdToUse = realEmpresaId || DEFAULT_FALLBACK_COMPANY_ID;
        await supabase.from('faturas').upsert({
          id: ensureUUID(finalInv.id),
          empresa_id: companyIdToUse,
          serie_id: sId,
          cliente_id: finalInv.clientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalInv.clientId) ? finalInv.clientId : null,
          numero_fatura: finalInv.number,
          data_fatura: finalInv.date,
          total: finalInv.total,
          iva: finalInv.taxAmount,
          status: finalInv.status === InvoiceStatus.PAID ? 'Pago' : finalInv.status === InvoiceStatus.CANCELLED ? 'Anulado' : 'Pendente',
          source: finalInv.source,
          caixa_id: finalInv.cashRegisterId,
          metodo_pagamento: finalInv.paymentMethod,
          tipo_fatura: getDocumentPrefix(finalInv.type),
          source_invoice_id: finalInv.sourceInvoiceId
        });
      } catch (err) { console.error(err); } finally { setIsLoading(false); }
      if(finalInv.source !== 'POS') setCurrentView('INVOICES');
  };

  const handleLiquidate = async (invoice: Invoice, amount: number, method: PaymentMethod, registerId: string, dateValue: string, docDate: string) => {
      setIsLoading(true);
      const docSeries = series.find(s => s.id === invoice.seriesId) || series[0];
      const nextSeq = (docSeries.sequences[InvoiceType.RG] || 0) + 1;
      const number = `RG ${docSeries.year}/${nextSeq}`;
      
      const receipt: Invoice = {
          id: generateId(),
          type: InvoiceType.RG,
          seriesId: docSeries.id,
          number,
          date: docDate,
          dueDate: docDate,
          accountingDate: dateValue,
          clientId: invoice.clientId,
          clientName: invoice.clientName,
          clientNif: invoice.clientNif,
          items: [{ id: generateId(), type: 'SERVICE', description: `Pagamento Ref: ${invoice.number}`, quantity: 1, unitPrice: amount, discount: 0, taxRate: 0, total: amount }],
          subtotal: amount, globalDiscount: 0, taxRate: 0, taxAmount: 0, withholdingAmount: 0, retentionAmount: 0, total: amount,
          currency: invoice.currency, exchangeRate: invoice.exchangeRate,
          status: InvoiceStatus.PAID,
          isCertified: true,
          hash: generateInvoiceHash(invoice),
          companyId: invoice.companyId,
          workLocationId: invoice.workLocationId,
          sourceInvoiceId: invoice.id,
          paymentMethod: method,
          cashRegisterId: registerId
      };

      const updatedSequences = { ...docSeries.sequences, [InvoiceType.RG]: nextSeq };
      setSeries(series.map(s => s.id === docSeries.id ? { ...s, sequences: updatedSequences } : s));

      const updatedInvoice = { 
          ...invoice, 
          paidAmount: (invoice.paidAmount || 0) + amount,
          status: ((invoice.paidAmount || 0) + amount) >= invoice.total ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL
      };

      setInvoices([receipt, ...invoices.map(i => i.id === invoice.id ? updatedInvoice : i)]);

      try {
        const companyIdToUse = realEmpresaId || DEFAULT_FALLBACK_COMPANY_ID;
        await supabase.from('faturas').upsert({
          id: ensureUUID(receipt.id),
          empresa_id: companyIdToUse,
          serie_id: docSeries.id,
          cliente_id: receipt.clientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(receipt.clientId) ? receipt.clientId : null,
          numero_fatura: receipt.number,
          data_fatura: receipt.date,
          total: receipt.total,
          iva: 0,
          status: 'Pago',
          source: 'MANUAL',
          caixa_id: registerId,
          metodo_pagamento: method,
          tipo_fatura: 'RG',
          source_invoice_id: invoice.id
        });

        await supabase.from('faturas').update({
            status: updatedInvoice.status === InvoiceStatus.PAID ? 'Pago' : 'Pendente'
        }).eq('id', invoice.id);

      } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleCancelInvoice = async (id: string, reason: string) => {
      setIsLoading(true);
      const invoice = invoices.find(i => i.id === id);
      if (!invoice) return;

      const docSeries = series.find(s => s.id === invoice.seriesId) || series[0];
      
      let cancelType = InvoiceType.NC; 
      if (invoice.type === InvoiceType.NC) cancelType = InvoiceType.ND; 
      if (invoice.type === InvoiceType.ND) cancelType = InvoiceType.NC; 

      const nextSeq = (docSeries.sequences[cancelType] || 0) + 1;
      const prefix = getDocumentPrefix(cancelType);
      const cancelNumber = `${prefix} ${docSeries.year}/${nextSeq}`;

      const rectification: Invoice = {
          ...invoice,
          id: generateId(),
          type: cancelType,
          number: cancelNumber,
          date: new Date().toISOString().split('T')[0],
          accountingDate: new Date().toISOString().split('T')[0],
          dueDate: new Date().toISOString().split('T')[0],
          status: InvoiceStatus.PAID,
          isCertified: true,
          hash: generateInvoiceHash(invoice),
          notes: `Anulação do documento ${invoice.number}. Motivo: ${reason}`,
          sourceInvoiceId: invoice.id,
          source: 'MANUAL'
      };

      setInvoices([rectification, ...invoices.map(i => i.id === id ? { ...i, status: InvoiceStatus.CANCELLED, cancellationReason: reason } : i)]);
      const updatedSequences = { ...docSeries.sequences, [cancelType]: nextSeq };
      setSeries(series.map(s => s.id === docSeries.id ? { ...s, sequences: updatedSequences } : s));

      try {
          const companyIdToUse = realEmpresaId || DEFAULT_FALLBACK_COMPANY_ID;
          await supabase.from('faturas').upsert({
              id: ensureUUID(rectification.id),
              empresa_id: companyIdToUse,
              serie_id: docSeries.id,
              cliente_id: rectification.clientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rectification.clientId) ? rectification.clientId : null,
              numero_fatura: rectification.number,
              data_fatura: rectification.date,
              total: rectification.total,
              iva: rectification.taxAmount,
              status: 'Pago',
              tipo_fatura: prefix,
              source_invoice_id: invoice.id
          });

          await supabase.from('faturas').update({
              status: 'Anulado'
          }).eq('id', id);

      } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleSavePurchase = async (purchase: Purchase) => {
      const exists = purchases.some(p => p.id === purchase.id || (p.documentNumber === purchase.documentNumber && p.supplierId === purchase.supplierId));
      if (exists) {
          const isSameId = purchases.some(p => p.id === purchase.id);
          if (!isSameId) {
             alert("Aviso: Já existe uma compra registada com este número de documento para este fornecedor.");
             return;
          }
      }

      setIsLoading(true);
      setPurchases([purchase, ...purchases.filter(p => p.id !== purchase.id)]);
      try {
          const companyIdToUse = realEmpresaId || DEFAULT_FALLBACK_COMPANY_ID;
          await supabase.from('compras').upsert({
              id: ensureUUID(purchase.id),
              tipo_documento: purchase.type,
              numero_documento: purchase.documentNumber,
              fornecedor_id: purchase.supplierId ? ensureUUID(purchase.supplierId) : null,
              fornecedor_nome: purchase.supplier,
              nif_fornecedor: purchase.nif,
              data_emissao: purchase.date,
              valor_subtotal: purchase.subtotal,
              valor_iva: purchase.taxAmount,
              valor_total: purchase.total,
              status: purchase.status,
              empresa_id: companyIdToUse,
              items: purchase.items,
              hash: purchase.hash
          });
      } catch (err) { console.error(err); } finally { setIsLoading(false); }
      setCurrentView('PURCHASES');
  };

  const handleSaveClient = (client: Client) => {
    setClients(prev => {
        const index = prev.findIndex(c => c.id === client.id || c.vatNumber === client.vatNumber);
        if (index >= 0) {
            const updated = [...prev];
            updated[index] = client;
            return updated;
        }
        return [client, ...prev];
    });
  };

  const handleIssueContract = (emp: Employee) => {
      setSelectedHrEmployee(emp);
      setCurrentView('HR_CONTRACT_ISSUE');
  };

  const handleCreateDerived = (source: Invoice, type: InvoiceType) => {
      setInvoiceInitialType(type);
      setInvoiceInitialData({
          clientId: source.clientId,
          items: source.items.map(i => ({...i, id: generateId()})),
          sourceInvoiceId: source.id,
          currency: source.currency,
          exchangeRate: source.exchangeRate,
          withholdingAmount: source.withholdingAmount,
          retentionType: source.retentionType,
          retentionAmount: source.retentionAmount,
          notes: `Derivado de ${source.type} ${source.number}`
      });
      setCurrentView('CREATE_INVOICE');
  };

  const renderView = () => {
    if (!currentUser) return <LoginPage onLogin={handleLogin} />;

    switch (currentView) {
      case 'DASHBOARD': return <Dashboard invoices={certifiedInvoices} />;
      case 'WORKSPACE': return <Workspace invoices={certifiedInvoices} purchases={validPurchases} clients={clients} onViewInvoice={(inv) => { setInvoiceInitialData(inv); setCurrentView('CREATE_INVOICE'); }} onRefreshPurchases={fetchPurchasesCloud} />;
      case 'ARCHIVES': return <ArchivesManager />;
      case 'FINANCE_TAX_DOCS': return <TaxDocsManager />;
      case 'INVOICES': return <InvoiceList invoices={invoices} onDelete={id => setInvoices(invoices.filter(i => i.id !== id))} onUpdate={i => { setInvoiceInitialData(i); setCurrentView('CREATE_INVOICE'); }} onLiquidate={handleLiquidate} onCancelInvoice={handleCancelInvoice} onCertify={i => handleSaveInvoice(i, i.seriesId, 'CERTIFY')} onCreateNew={()=>{ setInvoiceInitialData(undefined); setCurrentView('CREATE_INVOICE'); }} onCreateDerived={handleCreateDerived} onUpload={()=>{}} onViewReports={()=>{}} onQuickUpdate={()=>{}} onViewClientAccount={(cid) => { setSelectedClientId(cid); setCurrentView('CLIENTS'); }} currentCompany={MOCK_COMPANY} workLocations={workLocations} cashRegisters={cashRegisters} series={series} />;
      case 'CREATE_INVOICE': return <InvoiceForm onSave={handleSaveInvoice} onCancel={()=>setCurrentView('INVOICES')} onViewList={()=>setCurrentView('INVOICES')} onAddWorkLocation={()=>{}} onSaveClient={handleSaveClient} onSaveWorkLocation={wl => setWorkLocations([...workLocations, wl])} clients={clients} products={products} workLocations={workLocations} cashRegisters={cashRegisters} series={series} anonymizedCompany={MOCK_COMPANY} initialType={invoiceInitialType} initialData={invoiceInitialData} currentUser={currentUser.name} currentCompany={MOCK_COMPANY} />;
      case 'CLIENTS': return <ClientList clients={clients} onSaveClient={handleSaveClient} initialSelectedClientId={selectedClientId} onClearSelection={() => setSelectedClientId(null)} currentCompany={MOCK_COMPANY} invoices={invoices} workLocations={workLocations} />;
      case 'PURCHASES': return <PurchaseList purchases={purchases} onDelete={id => setPurchases(purchases.filter(p => p.id !== id))} onCreateNew={() => setCurrentView('CREATE_PURCHASE')} onUpload={()=>{}} onSaveSupplier={s => setSuppliers([...suppliers, s])} />;
      case 'CREATE_PURCHASE': return <PurchaseForm onSave={handleSavePurchase} onCancel={() => setCurrentView('PURCHASES')} products={products} workLocations={workLocations} cashRegisters={cashRegisters} suppliers={suppliers} warehouses={warehouses} onSaveSupplier={s => setSuppliers([...suppliers, s])} />;
      case 'SUPPLIERS': return <SupplierList suppliers={suppliers} onSaveSupplier={s => setSuppliers([...suppliers, s])} />;
      case 'PURCHASE_ANALYSIS': return <PurchaseAnalysis purchases={validPurchases} />;
      case 'STOCK': return <StockManager products={products} setProducts={setProducts} warehouses={warehouses} setWarehouses={setWarehouses} priceTables={priceTables} setPriceTables={setPriceTables} movements={stockMovements} onStockMovement={m => setStockMovements([...stockMovements, m])} onCreateDocument={(t, i, n) => { setInvoiceInitialType(t); setInvoiceInitialData({items: i, notes: n}); setCurrentView('CREATE_INVOICE'); }} onOpenReportOverlay={() => setCurrentView('FINANCE_REPORTS')} cashRegisters={cashRegisters} clients={clients} workLocations={workLocations} series={series} />;
      case 'POS': return <POS products={products} clients={clients} invoices={invoices} series={series} cashRegisters={cashRegisters} config={posConfig} onSaveInvoice={handleSaveInvoice} onGoBack={() => setCurrentView('DASHBOARD')} currentUser={currentUser} company={MOCK_COMPANY} />;
      case 'CASH_CLOSURE': return <CashClosure registers={cashRegisters} invoices={invoices} movements={[]} onSaveClosure={c => setCashClosures([c, ...cashClosures])} onGoBack={() => setCurrentView('DASHBOARD')} currentUser={currentUser.name} currentUserId={currentUser.id} />;
      case 'CASH_CLOSURE_HISTORY': return <CashClosureHistory closures={cashClosures} />;
      case 'POS_SETTINGS': return <POSSettings config={posConfig} onSaveConfig={setPosConfig} series={series} clients={clients} />;
      case 'FINANCE_CASH': return <CashManager cashRegisters={cashRegisters} onUpdateCashRegister={cr => setCashRegisters(cashRegisters.map(c => c.id === cr.id ? cr : c))} movements={[]} onAddMovement={()=>{}} invoices={certifiedInvoices} purchases={validPurchases} />;
      case 'FINANCE_MAPS': return <CostRevenueMap invoices={certifiedInvoices} purchases={validPurchases} />;
      case 'FINANCE_REPORTS':
          return <ManagementReports invoices={certifiedInvoices} products={products} />;
      case 'ACCOUNTING_VAT': return <VatSettlementMap invoices={certifiedInvoices} purchases={validPurchases} history={vatSettlements} onSaveSettlement={s => setVatSettlements([s, ...vatSettlements])} />;
      case 'ACCOUNTING_PGC': return <PGCManager accounts={pgcAccounts} onSaveAccount={a => setPgcAccounts([...pgcAccounts, a])} onUpdateAccount={a => setPgcAccounts(pgcAccounts.map(x => x.id === a.id ? a : x))} />;
      case 'ACCOUNTING_CLASSIFY_SALES': return <ClassifyMovement mode="SALES" invoices={certifiedInvoices} clients={clients} pgcAccounts={pgcAccounts} onOpenRubricas={() => setCurrentView('ACCOUNTING_RUBRICAS_SALES')} />;
      case 'ACCOUNTING_CLASSIFY_PURCHASES': return <ClassifyMovement mode="PURCHASES" invoices={certifiedInvoices} purchases={validPurchases} clients={clients} pgcAccounts={pgcAccounts} onOpenRubricas={() => setCurrentView('ACCOUNTING_RUBRICAS_PURCHASES')} />;
      case 'ACCOUNTING_CLASSIFY_SALARY_PROC': return <ClassifyMovement mode="SALARY_PROC" invoices={certifiedInvoices} payroll={payrollHistory} clients={clients} pgcAccounts={pgcAccounts} onOpenRubricas={() => {}} />;
      case 'ACCOUNTING_CLASSIFY_SALARY_PAY': return <ClassifyMovement mode="SALARY_PAY" invoices={certifiedInvoices} payroll={payrollHistory} clients={clients} pgcAccounts={pgcAccounts} onOpenRubricas={() => {}} />;
      case 'ACCOUNTING_RUBRICAS_SALES': return <RubricasManager mode="SALES" invoices={certifiedInvoices} pgcAccounts={pgcAccounts} onUpdateInvoice={i => setInvoices(invoices.map(x => x.id === i.id ? i : x))} />;
      case 'ACCOUNTING_RUBRICAS_PURCHASES': return <RubricasManager mode="PURCHASES" purchases={validPurchases} pgcAccounts={pgcAccounts} onUpdateInvoice={()=>{}} onUpdatePurchase={p => setPurchases(purchases.map(x => x.id === p.id ? p : x))} />;
      case 'ACCOUNTING_MAPS': return <AccountingMaps invoices={certifiedInvoices} purchases={validPurchases} company={MOCK_COMPANY} onOpenOpeningBalance={() => setCurrentView('ACCOUNTING_OPENING_BALANCE')} />;
      case 'ACCOUNTING_DECLARATIONS': return <Model7 invoices={certifiedInvoices} purchases={validPurchases} company={MOCK_COMPANY} />;
      case 'ACCOUNTING_TAXES': return <TaxManager invoices={certifiedInvoices} company={MOCK_COMPANY} purchases={validPurchases} payroll={payrollHistory} />;
      case 'ACCOUNTING_CALC': return <TaxCalculationMap invoices={certifiedInvoices} purchases={validPurchases} />;
      case 'ACCOUNTING_SAFT': return <SaftExport invoices={certifiedInvoices} purchases={validPurchases} />;
      case 'ACCOUNTING_OPENING_BALANCE': return <OpeningBalanceMap accounts={pgcAccounts} savedBalances={openingBalances} onSaveBalances={setOpeningBalances} onBack={() => setCurrentView('ACCOUNTING_MAPS')} onViewAccount={(code) => { setSelectedExtractAccount(code); setCurrentView('ACCOUNTING_ACCOUNT_EXTRACT'); }} />;
      case 'ACCOUNTING_ACCOUNT_EXTRACT': return <AccountExtract company={MOCK_COMPANY} accountCode={selectedExtractAccount || '31'} year={globalYear} pgcAccounts={pgcAccounts} openingBalances={openingBalances} invoices={certifiedInvoices} onBack={() => setCurrentView('ACCOUNTING_MAPS')} onUpdateAccountCode={(o, n) => setSelectedExtractAccount(n)} onUpdateBalance={b => setOpeningBalances(openingBalances.map(x => x.id === b.id ? b : x))} />;
      case 'ACCOUNTING_REGULARIZATION': return <RegularizationMap invoices={invoices} onViewInvoice={(inv) => { setInvoiceInitialData(inv); setCurrentView('CREATE_INVOICE'); }} />;
      case 'HR_EMPLOYEES': return <Employees employees={hrEmployees} onSaveEmployee={e => setHrEmployees(prev => [...prev.filter(x => x.id !== e.id), e])} workLocations={workLocations} professions={professions} onIssueContract={handleIssueContract} />;
      case 'HR': return <HumanResources employees={hrEmployees} onSaveEmployee={e => setHrEmployees(prev => [...prev.filter(x => x.id !== e.id), e])} transactions={hrTransactions} onSaveTransaction={t => setHrTransactions([...hrTransactions, t])} vacations={hrVacations} onSaveVacation={v => setHrVacations([...hrVacations, v])} payroll={payrollHistory} onProcessPayroll={p => setPayrollHistory([...payrollHistory, ...p])} professions={professions} onSaveProfession={p => setProfessions([...professions, p])} onDeleteProfession={id => setProfessions(professions.filter(x => x.id !== id))} contracts={contracts} onSaveContract={c => setContracts([...contracts, c])} attendance={attendance} onSaveAttendance={a => setAttendance([...attendance, a])} company={MOCK_COMPANY} />;
      case 'HR_PERFORMANCE': return <PerformanceAnalysis logs={userActivity} employees={hrEmployees} users={users} />;
      case 'HR_CONTRACT_ISSUE': 
        if (!selectedHrEmployee) return <div className="p-8 text-center text-slate-400">Seleccione um funcionário primeiro.</div>;
        return <ContractGenerator employee={selectedHrEmployee} company={MOCK_COMPANY} onBack={() => setCurrentView('HR_EMPLOYEES')} onSave={(c) => { setContracts([...contracts, c]); fetchContractsCloud(); setCurrentView('HR'); }} />;
      case 'SECRETARIA_LIST': return <SecretariaList documents={secDocuments} onCreateNew={() => setCurrentView('SECRETARIA_FORM')} onEdit={doc => { setInvoiceInitialData({ ...doc } as any); setCurrentView('SECRETARIA_FORM'); }} />;
      case 'SECRETARIA_FORM': return <SecretariaForm onSave={doc => { setSecDocuments([doc, ...secDocuments.filter(d => d.id !== doc.id)]); setCurrentView('SECRETARIA_LIST'); }} onCancel={() => setCurrentView('SECRETARIA_LIST')} series={series} document={invoiceInitialData as any} />;
      case 'SCHOOL_GROUP':
      case 'SCHOOL_STUDENTS':
      case 'SCHOOL_ACADEMIC':
      case 'SCHOOL_DOCUMENTS':
      case 'SCHOOL_REPORTS':
          return <SchoolManagement currentSubView={currentView} />;
      case 'RESTAURANT_GROUP':
      case 'RESTAURANT_MENU':
      case 'RESTAURANT_TABLES':
      case 'RESTAURANT_KDS':
      case 'RESTAURANT_PRODUCTION':
          return <RestaurantManagement currentSubView={currentView} />;
      case 'HOTEL_GROUP':
      case 'HOTEL_ROOMS':
      case 'HOTEL_RESERVATIONS':
      case 'HOTEL_CHECKIN':
      case 'HOTEL_GOVERNANCE':
          return <HotelManagement currentSubView={currentView} />;
      case 'SETTINGS': return <Settings series={series} onSaveSeries={s => setSeries([...series, s])} onEditSeries={s => setSeries(series.map(x => x.id === s.id ? s : x))} users={users} onSaveUser={u => setUsers([...users, u])} onDeleteUser={id => setUsers(users.filter(x => x.id !== id))} workLocations={workLocations} onSaveWorkLocation={wl => setWorkLocations([...workLocations, wl])} onDeleteWorkLocation={id => setWorkLocations(workLocations.filter(x => x.id !== id))} cashRegisters={cashRegisters} onSaveCashRegister={cr => setCashRegisters([...cashRegisters.filter(x => x.id !== cr.id), cr])} onDeleteCashRegister={id => setCashRegisters(cashRegisters.filter(x => x.id !== id))} />;
      default: return <div className="p-8 text-center text-slate-400">Selecione um módulo para continuar.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} currentUser={currentUser} onLogout={()=>setCurrentUser(null)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 h-24 flex items-center justify-between px-6 shadow-md shrink-0 z-10">
          <div className="flex items-center gap-6">
             <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded transition-colors"><Menu /></button>
             <div className="flex items-center gap-4 border-r pr-6 border-slate-200 h-16">
                 <div className="w-16 h-16 bg-blue-900 rounded-xl flex items-center justify-center text-white font-black text-3xl shadow-xl transform hover:scale-105 transition-all">
                    IM
                 </div>
                 <div className="hidden lg:block">
                    <h2 className="font-black text-xl text-slate-900 leading-none tracking-tighter">IMATEC SOFTWARE</h2>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[3px] mt-1">Sistemas de Gestão</p>
                 </div>
             </div>
             <div className="hidden xl:flex flex-col">
                 <h2 className="font-black text-slate-400 text-[10px] uppercase tracking-widest leading-none mb-1">Empresa Licenciada</h2>
                 <h2 className="font-bold text-slate-700 tracking-tight text-sm truncate max-w-[300px]">{MOCK_COMPANY.name}</h2>
             </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="hidden md:flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg border border-slate-800">
                 <ClockIcon size={16} className="text-blue-400 animate-pulse"/>
                 <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase text-slate-400 leading-none mb-0.5">Hora Local</span>
                     <span className="font-mono font-bold text-sm tracking-widest">
                        {currentTime.toLocaleTimeString('pt-AO', { hour12: false })}
                     </span>
                 </div>
             </div>
             {isLoading && <div className="flex items-center gap-2 text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full animate-pulse border border-blue-100"><RefreshCw size={12} className="animate-spin"/> Sincronizando...</div>}
             <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 px-2 border hover:border-slate-300 transition-all shadow-inner">
                 <CalendarIcon size={14} className="text-slate-500"/>
                 <select className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer" value={globalYear} onChange={(e) => setGlobalYear(Number(e.target.value))}>
                     <option value={2024}>2024</option><option value={2025}>2025</option>
                 </select>
             </div>
             <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                 <div className="text-right hidden sm:block">
                    <p className="text-sm font-black text-slate-900 leading-none">Admin</p>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">ADMIN</p>
                 </div>
                 <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-white font-black text-lg border-2 border-slate-100 shadow-lg transition-transform hover:scale-110 cursor-pointer">
                     {currentUser?.name.charAt(0)}
                 </div>
             </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 relative custom-scrollbar bg-slate-50/50">
          {renderView()}
        </main>
      </div>
      <AIAssistant invoices={invoices} purchases={purchases} clients={clients} />
    </div>
  );
};

export default App;
