
export enum InvoiceStatus {
  DRAFT = 'Rascunho',
  PENDING = 'Pendente',
  PAID = 'Pago',
  PARTIAL = 'Parcelar',
  OVERDUE = 'Vencido',
  CANCELLED = 'Anulado'
}

export enum InvoiceType {
  FT = 'Fatura',
  FR = 'Fatura/Recibo',
  PP = 'Fatura Pró-forma',
  OR = 'Orçamento',
  GR = 'Guia de Remessa',
  GT = 'Guia de Transporte',
  GE = 'Guia de Entrega',
  NE = 'Nota de Encomenda',
  NC = 'Nota de Crédito',
  ND = 'Nota de Débito',
  RG = 'Recibo',
  VD = 'Venda a Dinheiro',
  FS = 'Fatura Simplificada'
}

export enum PurchaseType {
  FT = 'Fatura Fornecedor',
  FR = 'Fatura/Recibo Fornecedor',
  ND = 'Nota de Débito',
  NC = 'Nota de Crédito',
  VD = 'Venda a Dinheiro',
  REC = 'Recibo'
}

export type PaymentMethod = 'CASH' | 'MULTICAIXA' | 'TRANSFER' | 'CHECK' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'MCX_EXPRESS' | 'OTHERS' | 'CREDIT_ACCOUNT';

export type LicensePlan = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type CompanyStatus = 'TEST' | 'ACTIVE' | 'SUSPENDED';

export type AppLanguage = 'PT' | 'EN' | 'FR';

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string; 
  time?: string;
  completed: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export type ViewState = 
  | 'DASHBOARD' 
  | 'WORKSPACE' 
  | 'SECRETARIA_LIST' 
  | 'SECRETARIA_FORM'
  | 'ARCHIVES'
  | 'INVOICES_GROUP' 
  | 'CREATE_INVOICE' 
  | 'INVOICES' 
  | 'ACCOUNTING_REGULARIZATION' 
  | 'CLIENTS' 
  | 'PURCHASES_GROUP' 
  | 'CREATE_PURCHASE' 
  | 'PURCHASES' 
  | 'SUPPLIERS' 
  | 'PURCHASE_ANALYSIS' 
  | 'STOCK_GROUP' 
  | 'STOCK' 
  | 'FINANCE_GROUP' 
  | 'FINANCE_CASH' 
  | 'FINANCE_MAPS' 
  | 'FINANCE_REPORTS' 
  | 'FINANCE_TAX_DOCS'
  | 'ACCOUNTING_GROUP' 
  | 'ACCOUNTING_VAT' 
  | 'ACCOUNTING_PGC' 
  | 'ACCOUNTING_CLASSIFY_GROUP'
  | 'ACCOUNTING_CLASSIFY_SALES'
  | 'ACCOUNTING_CLASSIFY_PURCHASES'
  | 'ACCOUNTING_CLASSIFY_SALARY_PROC'
  | 'ACCOUNTING_CLASSIFY_SALARY_PAY' 
  | 'ACCOUNTING_RUBRICAS_GROUP'
  | 'ACCOUNTING_RUBRICAS_SALES'
  | 'ACCOUNTING_RUBRICAS_PURCHASES'
  | 'ACCOUNTING_MAPS' 
  | 'ACCOUNTING_DECLARATIONS' 
  | 'ACCOUNTING_TAXES' 
  | 'ACCOUNTING_CALC' 
  | 'ACCOUNTING_SAFT' 
  | 'ACCOUNTING_OPENING_BALANCE'
  | 'ACCOUNTING_ACCOUNT_EXTRACT'
  | 'HR_GROUP'
  | 'HR_EMPLOYEES'
  | 'HR' 
  | 'HR_PERFORMANCE'
  | 'HR_CONTRACT_ISSUE'
  | 'POS_GROUP'
  | 'POS' 
  | 'POS_SETTINGS'
  | 'CASH_CLOSURE'
  | 'CASH_CLOSURE_HISTORY'
  | 'SCHOOL_GROUP'
  | 'SCHOOL_STUDENTS'
  | 'SCHOOL_TEACHERS'
  | 'SCHOOL_ACADEMIC'
  | 'SCHOOL_DOCUMENTS'
  | 'SCHOOL_REPORTS'
  | 'RESTAURANT_GROUP'
  | 'RESTAURANT_MENU'
  | 'RESTAURANT_TABLES'
  | 'RESTAURANT_KDS'
  | 'RESTAURANT_PRODUCTION'
  | 'HOTEL_GROUP'
  | 'HOTEL_ROOMS'
  | 'HOTEL_RESERVATIONS'
  | 'HOTEL_CHECKIN'
  | 'HOTEL_GOVERNANCE'
  | 'SETTINGS';

export interface Company {
  id: string;
  name: string;
  nif: string;
  address: string;
  email: string;
  phone: string;
  logo?: string;
  regime: 'Geral' | 'Simplificado' | 'Exclusão';
  licensePlan: LicensePlan;
  status: CompanyStatus;
  validUntil: string;
  registrationDate: string;
}

export interface POSConfig {
  defaultSeriesId: string;
  printerType: '80mm' | 'A4';
  autoPrint: boolean;
  allowDiscounts: boolean;
  defaultClientId: string;
  defaultPaymentMethod: PaymentMethod;
  showImages: boolean;
  quickMode: boolean;
}

export interface CashClosure {
  id: string;
  date: string;
  openedAt: string;
  closedAt: string;
  operatorId: string;
  operatorName: string;
  cashRegisterId: string;
  expectedCash: number;
  expectedMulticaixa: number;
  expectedTransfer: number;
  expectedCredit: number;
  totalSales: number;
  actualCash: number;
  difference: number;
  initialBalance: number;
  finalBalance: number;
  status: 'CLOSED';
  notes?: string;
}

export interface DocumentSeries {
  id: string;
  name: string;
  code: string;
  type: 'NORMAL' | 'MANUAL';
  currentSequence: number; 
  sequences: Record<string, number>;
  year: number;
  bankDetails?: string;
  logo?: string;
  watermark?: string;
  footerText?: string;
  footerEmail?: string;
  footerPhone?: string;
  footerAddress?: string;
  footerLogo?: string;
  allowedUserIds: string[];
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'ADMIN' | 'OPERATOR' | 'MANAGER' | 'TEACHER' | 'COORDINATOR' | 'FINANCIAL' | 'GARCON' | 'COZINHEIRO' | 'RECPCIONISTA';
  companyId: string;
  permissions: ViewState[];
  obs?: string;
  createdAt: string;
  avatar?: string;
  workLocationId?: string;
}

// --- CORE TRANSACTIONAL TYPES ---
export interface InvoiceItem {
  id: string;
  productId?: string;
  description: string;
  reference?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
  type: 'PRODUCT' | 'SERVICE';
  rubrica?: string;
  expiryDate?: string;
  // Campos de Métrica
  length?: number;
  width?: number;
  height?: number;
  showMetrics?: boolean;
}

export interface Invoice {
  id: string;
  number: string;
  type: InvoiceType;
  date: string;
  time?: string;
  dueDate: string;
  accountingDate: string;
  clientId: string;
  clientName: string;
  clientNif?: string;
  items: InvoiceItem[];
  subtotal: number;
  globalDiscount: number;
  taxRate: number;
  taxAmount: number;
  withholdingAmount?: number;
  retentionType?: 'NONE' | 'CAT_50' | 'CAT_100';
  retentionAmount?: number;
  total: number;
  currency: string;
  exchangeRate: number;
  contraValue?: number;
  status: InvoiceStatus;
  notes?: string;
  isCertified: boolean;
  hash?: string;
  companyId: string;
  workLocationId?: string;
  paymentMethod?: PaymentMethod;
  cashRegisterId?: string;
  operatorName?: string;
  typology?: string;
  sourceInvoiceId?: string;
  driverName?: string;
  vehiclePlate?: string;
  deliveryAddress?: string;
  sourceWarehouseId?: string;
  targetWarehouseId?: string;
  attachment?: string;
  cancellationReason?: string;
  source?: 'POS' | 'MANUAL';
  paidAmount?: number;
  seriesId: string;
  seriesCode?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  vatNumber: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  accountBalance: number;
  clientType?: string;
  province?: string;
  municipality?: string;
  postalCode?: string;
  webPage?: string;
  iban?: string;
  initialBalance?: number;
  isAccountShared?: boolean;
  transactions: any[];
}

export interface WorkLocation {
  id: string;
  name: string;
  address: string;
  managerName?: string;
}

export interface CashRegister {
  id: string;
  name: string;
  status: 'OPEN' | 'CLOSED' | 'SUSPENDED';
  balance: number;
  initialBalance: number;
  operatorId?: string;
  notes?: string;
}

export interface Product {
  id: string;
  name: string;
  costPrice: number;
  price: number;
  unit: string;
  category: string;
  stock: number;
  warehouseId: string;
  priceTableId: string;
  minStock: number;
  barcode?: string;
  imageUrl?: string;
}

export interface PurchaseItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
  rubrica?: string;
}

export interface Purchase {
  id: string;
  type: PurchaseType;
  supplierId?: string;
  supplier: string;
  nif: string;
  date: string;
  dueDate: string;
  documentNumber: string;
  items: PurchaseItem[];
  subtotal: number;
  globalDiscount?: number;
  taxAmount: number;
  total: number;
  status: 'PAID' | 'PENDING';
  notes?: string;
  currency: string;
  exchangeRate: number;
  workLocationId?: string;
  paymentMethod?: PaymentMethod;
  cashRegisterId?: string;
  retentionType?: 'NONE' | 'CAT_50' | 'CAT_100';
  retentionAmount?: number;
  warehouseId?: string;
  hash?: string;
  attachment?: string;
  observacoes?: string;
}

export interface Employee {
  id: string;
  employeeNumber?: string;
  name: string;
  nif: string;
  biNumber?: string;
  ssn: string;
  role: string;
  professionId?: string;
  professionName?: string;
  category?: string;
  department: string;
  baseSalary: number;
  status: 'Active' | 'Terminated' | 'OnLeave';
  admissionDate: string;
  terminationDate?: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  bankName?: string;
  iban?: string;
  photoUrl?: string;
  contractType?: 'Determinado' | 'Indeterminado' | 'Estagio';
  contractClauses?: string[];
  subsidyTransport?: number;
  subsidyFood?: number;
  subsidyFamily?: number;
  subsidyHousing?: number;
  subsidyChristmas?: number;
  subsidyVacation?: number;
  subsidyOther?: number;
  gender?: 'M' | 'F';
  birthDate?: string;
  maritalStatus?: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viuvo';
  nationality?: string;
  address?: string;
  municipality?: string;
  neighborhood?: string;
  workLocationId?: string;
  companyId?: string;
  performanceScore?: number;
  turnoverRisk?: 'Low' | 'Medium' | 'High';
}

export interface SalarySlip {
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  professionCode?: string;
  baseSalary: number;
  allowances: number;
  bonuses: number;
  subsidies: number;
  subsidyTransport: number;
  subsidyFood: number;
  subsidyFamily: number;
  subsidyHousing: number;
  absences: number;
  advances: number;
  grossTotal: number;
  inss: number;
  irt: number;
  netTotal: number;
}

export interface HrTransaction {
  id: string;
  employeeId: string;
  date: string;
  type: 'BONUS' | 'ALLOWANCE' | 'ABSENCE' | 'ADVANCE';
  amount: number;
  description: string;
  processed?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  vatNumber: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province?: string;
  postalCode?: string;
  municipality?: string;
  country?: string;
  webPage?: string;
  inssNumber?: string;
  bankInitials?: string;
  iban?: string;
  swift?: string;
  supplierType?: string;
  accountBalance: number;
  transactions: any[];
}

export interface CashMovement {
  id: string;
  date: string;
  type: 'ENTRY' | 'EXIT' | 'TRANSFER_IN' | 'TRANSFER_OUT';
  amount: number;
  description: string;
  cashRegisterId: string;
  targetCashRegisterId?: string;
  documentRef?: string;
  operatorName: string;
  source: 'SALES' | 'PURCHASES' | 'MANUAL';
}

export interface HrVacation {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  year: number;
}

export interface PGCAccount {
  id: string;
  code: string;
  description: string;
  type: 'CLASSE' | 'GRUPO' | 'SUBGRUPO' | 'CONTA' | 'SUBCONTA';
  nature: 'DEBITO' | 'CREDITO' | 'AMBOS';
  parentCode?: string;
  systemAuto: boolean;
}

export interface SecretariaDocument {
  id: string;
  type: string;
  seriesId: string;
  seriesCode: string;
  number: string;
  date: string;
  dateExtended?: string;
  destinatarioNome: string;
  destinatarioIntro: string;
  destinatarioLocalidade?: string;
  destinatarioPais?: string;
  assunto: string;
  corpo: string;
  confidencial: boolean;
  imprimirPagina: boolean;
  createdBy: string;
  createdAt: string;
  isLocked: boolean;
  departamento: string;
}

export interface VatSettlement {
  id: string;
  month: number;
  year: number;
  dateProcessed: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  status: 'PROCESSED' | 'DRAFT';
  details?: any;
}

export interface OpeningBalance {
  id: string;
  accountCode: string;
  description: string;
  debit: number;
  credit: number;
  year: number;
  balanceType: 'DEBIT' | 'CREDIT';
}

export interface UserActivityLog {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  action: string;
  details: string;
}

export interface Contract {
  id: string;
  employeeId: string;
  type: 'Determinado' | 'Indeterminado' | 'Estagio';
  startDate: string;
  endDate?: string;
  status: 'Active' | 'Expired' | 'Terminated';
  clauses: string[];
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'Present' | 'Absent' | 'Late';
  justification?: string;
  overtimeHours?: number;
}

export interface Profession {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
  group?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  description?: string;
  managerName?: string;
  contact?: string;
  observations?: string;
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'ENTRY' | 'EXIT';
  productId: string;
  productName: string;
  quantity: number;
  warehouseId: string;
  documentRef?: string;
  notes?: string;
}

export interface PriceTable {
  id: string;
  name: string;
  percentage: number;
}

export interface ArchiveDocument {
  id: string;
  name: string;
  type: 'Administrativo' | 'Empresa' | 'Corporativo' | 'Clientes' | 'Outros';
  observations: string;
  contact: string;
  responsible: string;
  date: string;
  fileUrl?: string;
  occurrences: ArchiveOccurrence[];
  isSigned: boolean;
  associatedDocNo?: string;
}

export interface ArchiveOccurrence {
  id: string;
  date: string;
  description: string;
  user: string;
}

export interface TaxDocument {
  id: string;
  dateDoc: string;
  dateContab: string;
  name: string;
  description: string;
  reference: string;
  amountPaid: number;
  observations: string;
  fileUrl?: string;
  fileName?: string;
  occurrences: TaxOccurrence[];
}

export interface TaxOccurrence {
  id: string;
  date: string;
  description: string;
  user: string;
}

export interface WorkProject {
  id: string;
  clientId: string;
  clientName: string;
  startDate: string;
  endDate: string;
  title: string;
  code: string;
  personnelPerDay: number;
  totalPersonnel: number;
  location: string;
  description: string;
  contact: string;
  observations: string;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  status: 'PENDING' | 'INTERVIEW' | 'HIRED' | 'REJECTED';
  cvUrl?: string;
}

export interface PerformanceReview {
  id: string;
  employeeId: string;
  date: string;
  reviewerId: string;
  score: number;
  comments: string;
}

export interface DisciplinaryAction {
  id: string;
  employeeId: string;
  date: string;
  type: 'ADVERTENCIA' | 'SUSPENSAO' | 'DEMISSAO';
  reason: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface TrainingCourse {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  instructor: string;
  status: 'PLANNED' | 'ONGOING' | 'COMPLETED';
}

export interface SchoolStudent {
  id: string;
  registrationNumber: string;
  name: string;
  birthDate: string;
  gender: 'M' | 'F';
  address: string;
  parentName: string;
  parentPhone: string;
  status: 'ACTIVE' | 'INACTIVE' | 'TRANSFERED' | 'GRADUATED';
}

export interface SchoolTeacher {
  id: string;
  name: string;
  nif: string;
  specialization: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SchoolClass {
  id: string;
  name: string;
  courseId: string;
  roomNumber: string;
  period: 'MANHÃ' | 'TARDE' | 'NOITE';
  year: number;
  capacity: number;
}

export interface SchoolCourse {
  id: string;
  name: string;
  description?: string;
  durationYears: number;
}

export interface SchoolGrade {
  id: string;
  studentId: string;
  classId: string;
  subjectId: string;
  mac: number;
  cpp: number;
  exame: number;
  mf: number;
}

export interface SchoolAttendance {
  id: string;
  studentId: string;
  classId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'JUSTIFIED';
}

export interface SchoolOccurrence {
  id: string;
  studentId: string;
  date: string;
  type: 'DISCIPLINARY' | 'ACADEMIC' | 'MEDICAL';
  description: string;
}

export interface RestaurantTable {
  id: string;
  number: number;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  currentOrderValue?: number;
}

export interface HotelRoom {
  id: string;
  number: string;
  type: 'SINGLE' | 'DOUBLE' | 'SUITE' | 'MASTER';
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE';
  dailyRate: number;
}

export interface HotelReservation {
  id: string;
  guestName: string;
  guestDoc?: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestCount: number;
  status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  totalValue: number;
}

export interface HotelConsumption {
  id: string;
  reservationId: string;
  description: string;
  category: 'RESTAURANT' | 'MINIBAR' | 'LAUNDRY' | 'OTHERS';
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
}
