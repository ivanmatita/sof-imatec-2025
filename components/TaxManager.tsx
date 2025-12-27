import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, InvoiceType, Company, Purchase, InvoiceStatus, SalarySlip, StockMovement, PurchaseType } from '../types';
import { formatDate, formatCurrency, exportToExcel } from '../utils';
import { Printer, Download, Calculator, Briefcase, ChevronDown, Save, ArrowRight, Table, FileText, HelpCircle, AlertCircle } from 'lucide-react';

interface TaxManagerProps {
  invoices: Invoice[];
  company: Company;
  purchases?: Purchase[]; // Added for automation
  payroll?: SalarySlip[]; // Added for automation
  stockMovements?: StockMovement[]; // Added for automation
}

const TaxManager: React.FC<TaxManagerProps> = ({ invoices, company, purchases = [], payroll = [], stockMovements = [] }) => {
  const [activeTab, setActiveTab] = useState('ANUAL');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  // State for Manual Inputs in Industrial Tax
  const [manualData, setManualData] = useState<Record<string, number>>({});

  const handleManualChange = (code: string, value: string) => {
      const numValue = parseFloat(value);
      setManualData(prev => ({
          ...prev,
          [code]: isNaN(numValue) ? 0 : numValue
      }));
  };

  // --- AUTOMATED INDUSTRIAL TAX CALCULATION (DETAILED) ---

  const calculateYearData = (targetYear: number, manualOverrides: Record<string, number> = {}) => {
      // Filter Data for Year
      const yearInvoices = invoices.filter(i => new Date(i.date).getFullYear() === targetYear && i.status !== InvoiceStatus.CANCELLED && i.isCertified);
      
      // INCLUDE ALL PURCHASES, NOT JUST PAID - ACCRUAL BASIS (Regime de Competência)
      const yearPurchases = purchases.filter(p => new Date(p.date).getFullYear() === targetYear);
      const yearPayroll = payroll; // Mock payroll accumulation

      // --- PROVEITOS OPERACIONAIS ---
      // 61.1/2 Vendas de Produtos
      const vendasProdutos = yearInvoices
          .flatMap(i => i.items.filter(item => item.type === 'PRODUCT'))
          .reduce((sum, item) => sum + (item.total / (1 + item.taxRate/100)), 0);
      
      const vendasMercadorias = manualOverrides['61.3'] !== undefined ? manualOverrides['61.3'] : 0;
      const embalagens = manualOverrides['61.4'] !== undefined ? manualOverrides['61.4'] : 0;
      const subsidios = manualOverrides['61.5'] !== undefined ? manualOverrides['61.5'] : 0;

      // 61.7 Devoluções (Sales Returns - Credit Notes)
      const devolucoes = invoices.filter(i => new Date(i.date).getFullYear() === targetYear && i.type === InvoiceType.NC)
          .reduce((sum, i) => sum + (i.currency === 'AOA' ? i.subtotal : i.contraValue || i.subtotal), 0);

      // 61.8 Descontos (Global Discounts given)
      const descontos = yearInvoices.reduce((sum, i) => sum + (i.subtotal * (i.globalDiscount/100)), 0);

      // 62.1.1/2.1 Prestações de Serviços Nacionais
      const servicosNacionais = yearInvoices
          .flatMap(i => i.items.filter(item => item.type === 'SERVICE'))
          .reduce((sum, item) => sum + (item.total / (1 + item.taxRate/100)), 0);

      const servicosEstrangeiros = manualOverrides['62.2'] !== undefined ? manualOverrides['62.2'] : 0;
      const outrosProveitos = manualOverrides['63'] !== undefined ? manualOverrides['63'] : 0;

      const totalProveitosOperacionais = (vendasProdutos + vendasMercadorias + embalagens + servicosNacionais + servicosEstrangeiros + subsidios + outrosProveitos) - devolucoes - descontos;

      // --- OUTROS PROVEITOS E GANHOS ---
      const variacaoInventario = manualOverrides['64'] !== undefined ? manualOverrides['64'] : 0;
      const trabalhosPropria = manualOverrides['65'] !== undefined ? manualOverrides['65'] : 0;
      const proveitosFinanceiros = manualOverrides['66'] !== undefined ? manualOverrides['66'] : 0;
      const proveitosFiliais = manualOverrides['67'] !== undefined ? manualOverrides['67'] : 0;
      const outrosNaoOperacionais = manualOverrides['68'] !== undefined ? manualOverrides['68'] : 0;
      const proveitosExtra = manualOverrides['69'] !== undefined ? manualOverrides['69'] : 0;

      const totalOutrosProveitos = variacaoInventario + trabalhosPropria + proveitosFinanceiros + proveitosFiliais + outrosNaoOperacionais + proveitosExtra;
      const totalProveitosGeral = totalProveitosOperacionais + totalOutrosProveitos;

      // --- CUSTOS E PERDAS POR NATUREZA ---
      // 71 CMVMC (Cost of Goods Sold) - Purchases of type FT/FR (Goods/Material)
      // Logic: If manual override exists, use it. Else calculate sum of purchases NOT marked as "Service/Expense" via type
      // Simplified: We assume purchase type 'FT' and 'FR' are goods unless manually adjusted.
      const cmvmc = yearPurchases.filter(p => p.type !== PurchaseType.REC).reduce((sum, p) => sum + p.subtotal, 0) || (manualOverrides['71'] || 0);

      // 72 Custos com Pessoal
      const remuneracoes = yearPayroll.reduce((sum, s) => sum + s.grossTotal, 0);
      const encargosSociais = yearPayroll.reduce((sum, s) => sum + (s.grossTotal * 0.08), 0); // 8% Employer INSS
      const segurosAcidentes = manualOverrides['72.3'] !== undefined ? manualOverrides['72.3'] : 0;
      const custosPessoalTotal = remuneracoes + encargosSociais + segurosAcidentes;

      const amortizacoes = manualOverrides['73'] !== undefined ? manualOverrides['73'] : 0;

      // 75.2 FSE (Fornecimentos e Serviços Terceiros)
      // Including Receipts (REC) and other expenses
      let fseTotal = yearPurchases.filter(p => p.type === PurchaseType.REC).reduce((sum, p) => sum + p.subtotal, 0);
      if (manualOverrides['75']) fseTotal = manualOverrides['75']; 

      // Breakdown of FSE (Visual only if total overridden)
      const fseAguaLuz = fseTotal * 0.10;
      const fseRendas = fseTotal * 0.20;
      const fseHonorarios = fseTotal * 0.15;
      const fseOutros = fseTotal * 0.55;

      const custosImpostos = manualOverrides['75.3'] !== undefined ? manualOverrides['75.3'] : 0;
      const despesasConfidenciais = manualOverrides['75.4'] !== undefined ? manualOverrides['75.4'] : 0;
      const quotizacoes = manualOverrides['75.5'] !== undefined ? manualOverrides['75.5'] : 0;
      const amostras = manualOverrides['75.6'] !== undefined ? manualOverrides['75.6'] : 0;
      const outrosCustosOperacionais = manualOverrides['75.8'] !== undefined ? manualOverrides['75.8'] : 0;

      const custosFinanceiros = manualOverrides['76'] !== undefined ? manualOverrides['76'] : 0;
      const custosFiliais = manualOverrides['77'] !== undefined ? manualOverrides['77'] : 0;
      const custosNaoOperacionais = manualOverrides['78'] !== undefined ? manualOverrides['78'] : 0;
      const custosExtra = manualOverrides['79'] !== undefined ? manualOverrides['79'] : 0;

      const totalCustos = cmvmc + custosPessoalTotal + amortizacoes + fseTotal + custosImpostos + despesasConfidenciais + quotizacoes + amostras + outrosCustosOperacionais + custosFinanceiros + custosFiliais + custosNaoOperacionais + custosExtra;

      // --- RESULTADOS ---
      const resultadoAntesImpostos = totalProveitosGeral - totalCustos;

      // --- APURAMENTO LUCRO TRIBUTÁVEL ---
      const acrescimosArt18 = manualOverrides['art18'] || 0; 
      const acrescimosArt37 = manualOverrides['art37'] || 0; 
      const acrescimosArt45 = manualOverrides['art45'] || 0; 
      const totalAcrescimos = acrescimosArt18 + acrescimosArt37 + acrescimosArt45;

      const deducoes = manualOverrides['deducoes'] || 0;

      const lucroTributavel = Math.max(0, resultadoAntesImpostos + totalAcrescimos - deducoes);

      // --- MATÉRIA COLECTÁVEL & IMPOSTO ---
      const materiaColectavel = lucroTributavel;
      const taxa = 0.25;
      const colecta = materiaColectavel * taxa;
      const deducoesColecta = manualOverrides['deducoesColecta'] || 0;
      const impostoPagar = Math.max(0, colecta - deducoesColecta);

      return {
          vendasProdutos, vendasMercadorias, embalagens, subsidios, devolucoes, descontos, servicosNacionais, servicosEstrangeiros, outrosProveitos,
          totalProveitosOperacionais,
          variacaoInventario, trabalhosPropria, proveitosFinanceiros, proveitosFiliais, outrosNaoOperacionais, proveitosExtra,
          totalOutrosProveitos,
          totalProveitosGeral,
          cmvmc,
          custosPessoalTotal, remuneracoes, encargosSociais, segurosAcidentes,
          amortizacoes,
          fseTotal, fseAguaLuz, fseRendas, fseHonorarios, fseOutros,
          custosImpostos, despesasConfidenciais, quotizacoes, amostras, outrosCustosOperacionais,
          custosFinanceiros, custosFiliais, custosNaoOperacionais, custosExtra,
          totalCustos,
          resultadoAntesImpostos,
          acrescimosArt18, acrescimosArt37, acrescimosArt45, totalAcrescimos,
          deducoes,
          lucroTributavel,
          materiaColectavel,
          taxa, colecta, deducoesColecta, impostoPagar
      };
  };

  const currentYearData = useMemo(() => calculateYearData(year, manualData), [year, invoices, purchases, payroll, manualData]);
  const previousYearData = useMemo(() => calculateYearData(year - 1), [year, invoices, purchases, payroll]);

  // --- STAMP DUTY LOGIC ---
  const stampDutyDocs = useMemo(() => invoices.filter(i => {
      const d = new Date(i.date);
      const isPeriod = d.getMonth() + 1 === month && d.getFullYear() === year;
      // Stamp Duty applies typically to Receipts (RG) and Cash Sales (FR/VD)
      const isType = i.type === InvoiceType.FR || i.type === InvoiceType.VD || i.type === InvoiceType.RG;
      const isValid = i.status !== InvoiceStatus.CANCELLED;
      return isPeriod && isType && isValid && i.isCertified;
  }), [invoices, month, year]);

  const totalStampDuty = stampDutyDocs.reduce((acc, i) => acc + (i.total * 0.01), 0);
  const totalBaseStamp = stampDutyDocs.reduce((acc, i) => acc + i.total, 0);

  // --- RENDERERS ---

  const FieldRow = ({ label, code, valCurrent, valPrevious, bold = false, indent = 0, isHeader = false, isTotal = false }: any) => {
      if (isHeader) {
          return (
              <div className="grid grid-cols-12 gap-1 py-2 border-b-2 border-blue-800 bg-blue-50 font-bold text-[10px] uppercase text-blue-900 mt-2">
                  <div className="col-span-6 pl-2">{label}</div>
                  <div className="col-span-3 text-right pr-2 text-blue-500 border-r border-blue-200">Exercicio {year - 1}</div>
                  <div className="col-span-3 text-right pr-2 text-blue-900">Exercicio {year}</div>
              </div>
          );
      }

      const format = (v: number) => formatCurrency(v).replace('Kz', '').trim();

      // Check if this field should be editable (Only Current Year column)
      // We assume if 'code' exists, it might be editable. Totals are usually not editable directly unless overridden (but logic is managed in calculateYearData)
      const isEditable = !isTotal && code; 

      return (
          <div className={`grid grid-cols-12 gap-1 py-1.5 border-b border-slate-200 text-[10px] items-center hover:bg-blue-50 transition-colors ${isTotal ? 'bg-blue-100 font-bold border-t border-blue-400 text-blue-900' : ''} ${bold ? 'font-bold' : ''}`}>
              <div className="col-span-6 flex items-center">
                  <span style={{ marginLeft: `${indent * 12}px` }} className="truncate flex items-center">
                      {code && <span className="font-mono text-slate-400 mr-2 text-[9px] bg-white border border-slate-200 px-1 rounded">{code}</span>}
                      {label}
                  </span>
              </div>
              <div className="col-span-3 text-right pr-2 font-mono text-slate-500 border-r border-slate-200 bg-slate-50/50">{format(valPrevious || 0)}</div>
              <div className="col-span-3 text-right pr-2 font-mono text-slate-900">
                  {isEditable ? (
                      <input 
                        type="number"
                        className={`w-full text-right bg-transparent outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1 ${manualData[code] !== undefined ? 'text-blue-700 font-bold' : ''}`}
                        value={manualData[code] !== undefined ? manualData[code] : valCurrent}
                        onChange={(e) => handleManualChange(code, e.target.value)}
                        placeholder={format(valCurrent || 0)}
                      />
                  ) : (
                      format(valCurrent || 0)
                  )}
              </div>
          </div>
      );
  };

  const renderModelo1Detailed = () => (
      <div className="flex flex-col xl:flex-row gap-6 animate-in zoom-in-95">
          {/* MAIN FORM */}
          <div className="flex-1 bg-white p-8 shadow-2xl border border-slate-300 font-sans text-xs print:shadow-none print:border-none">
              {/* Header - AGT Blue Theme */}
              <div className="flex items-center justify-between border-b-4 border-blue-900 pb-4 mb-6">
                  <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-900 text-white flex items-center justify-center font-bold text-xl rounded">M1</div>
                          <div>
                              <h1 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">Imposto Industrial</h1>
                              <h2 className="text-sm font-bold text-blue-600 uppercase">Modelo 1 - Declaração de Rendimentos</h2>
                          </div>
                      </div>
                  </div>
                  <div className="text-right border-l-2 border-blue-100 pl-4">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Exercício Fiscal</div>
                      <div className="text-4xl font-black text-blue-900">{year}</div>
                  </div>
              </div>

              <div className="space-y-6">
                  
                  {/* PROVEITOS SECTION */}
                  <div className="border border-blue-200 rounded overflow-hidden">
                      <div className="bg-blue-900 text-white p-2 font-bold uppercase text-xs flex justify-between items-center">
                          <span>Demonstração de Resultados - Proveitos</span>
                          <span className="opacity-70 text-[10px]">Unidade: Kz</span>
                      </div>
                      
                      <FieldRow label="Proveitos Operacionais" isHeader />
                      <FieldRow label="Vendas de produtos" code="61.1/2" valCurrent={currentYearData.vendasProdutos} valPrevious={previousYearData.vendasProdutos} />
                      <FieldRow label="Vendas de mercadorias" code="61.3" valCurrent={currentYearData.vendasMercadorias} valPrevious={previousYearData.vendasMercadorias} />
                      <FieldRow label="Embalagens de consumo" code="61.4" valCurrent={currentYearData.embalagens} valPrevious={previousYearData.embalagens} />
                      <FieldRow label="Subsídios a preços" code="61.5" valCurrent={currentYearData.subsidios} valPrevious={previousYearData.subsidios} />
                      <FieldRow label="Devoluções" code="61.7" valCurrent={-Math.abs(currentYearData.devolucoes)} valPrevious={-Math.abs(previousYearData.devolucoes)} />
                      <FieldRow label="Descontos e abatimentos" code="61.8" valCurrent={-Math.abs(currentYearData.descontos)} valPrevious={-Math.abs(previousYearData.descontos)} />
                      <FieldRow label="Prestações de Serviços Nacionais" code="62.1" valCurrent={currentYearData.servicosNacionais} valPrevious={previousYearData.servicosNacionais} />
                      <FieldRow label="Prestações de Serviços Estrangeiros" code="62.2" valCurrent={currentYearData.servicosEstrangeiros} valPrevious={previousYearData.servicosEstrangeiros} />
                      <FieldRow label="Outros proveitos operacionais" code="63" valCurrent={currentYearData.outrosProveitos} valPrevious={previousYearData.outrosProveitos} />
                      <FieldRow label="(A) SOMA DOS PROVEITOS OPERACIONAIS" isTotal valCurrent={currentYearData.totalProveitosOperacionais} valPrevious={previousYearData.totalProveitosOperacionais} />

                      <FieldRow label="Outros Proveitos e Ganhos" isHeader />
                      <FieldRow label="Variação de inventários" code="64" valCurrent={currentYearData.variacaoInventario} valPrevious={previousYearData.variacaoInventario} />
                      <FieldRow label="Trabalhos para própria empresa" code="65" valCurrent={currentYearData.trabalhosPropria} valPrevious={previousYearData.trabalhosPropria} />
                      <FieldRow label="Proveitos financeiros gerais" code="66" valCurrent={currentYearData.proveitosFinanceiros} valPrevious={previousYearData.proveitosFinanceiros} />
                      <FieldRow label="Proveitos financeiros de filiais" code="67" valCurrent={currentYearData.proveitosFiliais} valPrevious={previousYearData.proveitosFiliais} />
                      <FieldRow label="Outros proveitos não operacionais" code="68" valCurrent={currentYearData.outrosNaoOperacionais} valPrevious={previousYearData.outrosNaoOperacionais} />
                      <FieldRow label="Proveitos extraordinários" code="69" valCurrent={currentYearData.proveitosExtra} valPrevious={previousYearData.proveitosExtra} />
                      <FieldRow label="(B) SOMA DE OUTROS PROVEITOS" isTotal valCurrent={currentYearData.totalOutrosProveitos} valPrevious={previousYearData.totalOutrosProveitos} />

                      <div className="bg-blue-50 p-2 font-black flex justify-between text-xs border-t-2 border-blue-900">
                          <span className="uppercase text-blue-900">(C) Total de Proveitos (A + B)</span>
                          <div className="flex gap-8">
                              <span className="text-slate-400 font-mono">{formatCurrency(previousYearData.totalProveitosGeral)}</span>
                              <span className="text-blue-900 font-mono">{formatCurrency(currentYearData.totalProveitosGeral)}</span>
                          </div>
                      </div>
                  </div>

                  {/* CUSTOS SECTION */}
                  <div className="border border-blue-200 rounded overflow-hidden">
                      <div className="bg-blue-900 text-white p-2 font-bold uppercase text-xs">Custos e Perdas por Natureza</div>
                      <FieldRow label="CMVMC (Custo Mercadorias)" code="71" valCurrent={currentYearData.cmvmc} valPrevious={previousYearData.cmvmc} />
                      <FieldRow label="Custos com pessoal" code="72" valCurrent={currentYearData.custosPessoalTotal} valPrevious={previousYearData.custosPessoalTotal} />
                      <FieldRow label="Amortizações" code="73" valCurrent={currentYearData.amortizacoes} valPrevious={previousYearData.amortizacoes} />
                      <FieldRow label="Fornecimentos e serviços de terceiros" code="75" valCurrent={currentYearData.fseTotal} valPrevious={previousYearData.fseTotal} />
                      <FieldRow label="Impostos" code="75.3" valCurrent={currentYearData.custosImpostos} valPrevious={previousYearData.custosImpostos} />
                      <FieldRow label="Despesas confidenciais" code="75.4" valCurrent={currentYearData.despesasConfidenciais} valPrevious={previousYearData.despesasConfidenciais} />
                      <FieldRow label="Quotizações" code="75.5" valCurrent={currentYearData.quotizacoes} valPrevious={previousYearData.quotizacoes} />
                      <FieldRow label="Amostras" code="75.6" valCurrent={currentYearData.amostras} valPrevious={previousYearData.amostras} />
                      <FieldRow label="Outros custos" code="75.8" valCurrent={currentYearData.outrosCustosOperacionais} valPrevious={previousYearData.outrosCustosOperacionais} />
                      <FieldRow label="Custos financeiros" code="76" valCurrent={currentYearData.custosFinanceiros} valPrevious={previousYearData.custosFinanceiros} />
                      <FieldRow label="Custos financeiros com filiais" code="77" valCurrent={currentYearData.custosFiliais} valPrevious={previousYearData.custosFiliais} />
                      <FieldRow label="Custos não operacionais" code="78" valCurrent={currentYearData.custosNaoOperacionais} valPrevious={previousYearData.custosNaoOperacionais} />
                      <FieldRow label="Custos extraordinários" code="79" valCurrent={currentYearData.custosExtra} valPrevious={previousYearData.custosExtra} />
                      <FieldRow label="(D) TOTAL DE CUSTOS" isTotal valCurrent={currentYearData.totalCustos} valPrevious={previousYearData.totalCustos} />
                  </div>

                  {/* RESULTADOS */}
                  <div className="bg-blue-900 text-white p-4 rounded font-bold flex justify-between text-sm shadow-lg">
                      <span>(E) RESULTADO ANTES DE IMPOSTOS (C - D)</span>
                      <div className="flex gap-8">
                          <span className="opacity-50 font-mono text-xs mt-1">{formatCurrency(previousYearData.resultadoAntesImpostos)}</span>
                          <span className="font-mono text-lg">{formatCurrency(currentYearData.resultadoAntesImpostos)}</span>
                      </div>
                  </div>

                  {/* DETAILS SECTION */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-blue-200 rounded">
                          <div className="bg-blue-50 p-2 font-bold text-blue-900 uppercase border-b border-blue-200 text-[10px]">Detalhes - Custos Pessoal (72)</div>
                          <FieldRow label="Remunerações órgãos sociais" indent={1} valCurrent={0} valPrevious={0} />
                          <FieldRow label="Remunerações pessoal" indent={1} valCurrent={currentYearData.remuneracoes} valPrevious={previousYearData.remuneracoes} />
                          <FieldRow label="Encargos sobre remunerações" indent={1} valCurrent={currentYearData.encargosSociais} valPrevious={previousYearData.encargosSociais} />
                          <FieldRow label="Seguros de acidentes de trabalho" code="72.3" indent={1} valCurrent={currentYearData.segurosAcidentes} valPrevious={previousYearData.segurosAcidentes} />
                      </div>
                      <div className="border border-blue-200 rounded">
                          <div className="bg-blue-50 p-2 font-bold text-blue-900 uppercase border-b border-blue-200 text-[10px]">Detalhes - FSE (75)</div>
                          <FieldRow label="Água e Electricidade" indent={1} valCurrent={currentYearData.fseAguaLuz} valPrevious={previousYearData.fseAguaLuz} />
                          <FieldRow label="Rendas e Alugueres" indent={1} valCurrent={currentYearData.fseRendas} valPrevious={previousYearData.fseRendas} />
                          <FieldRow label="Honorários" indent={1} valCurrent={currentYearData.fseHonorarios} valPrevious={previousYearData.fseHonorarios} />
                          <FieldRow label="Outros Serviços" indent={1} valCurrent={currentYearData.fseOutros} valPrevious={previousYearData.fseOutros} />
                      </div>
                  </div>

                  {/* CALCULATION SECTION */}
                  <div className="border-t-4 border-blue-900 pt-6 mt-6">
                      <h3 className="font-black text-blue-900 text-lg uppercase mb-4 flex items-center gap-2"><Calculator/> Apuramento do Lucro Tributável</h3>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-2">
                          <FieldRow label="Resultado Líquido do Exercício" bold valCurrent={currentYearData.resultadoAntesImpostos} valPrevious={previousYearData.resultadoAntesImpostos} />
                          <FieldRow label="(+) Custos não documentados (Art. 18)" code="art18" valCurrent={currentYearData.acrescimosArt18} valPrevious={previousYearData.acrescimosArt18} />
                          <FieldRow label="(+) Amortizações não aceites (Art. 37)" code="art37" valCurrent={currentYearData.acrescimosArt37} valPrevious={previousYearData.acrescimosArt37} />
                          <FieldRow label="(+) Multas e Encargos (Art. 45)" code="art45" valCurrent={currentYearData.acrescimosArt45} valPrevious={previousYearData.acrescimosArt45} />
                          <FieldRow label="(-) Deduções Fiscais" code="deducoes" valCurrent={currentYearData.deducoes} valPrevious={previousYearData.deducoes} />
                          <FieldRow label="LUCRO TRIBUTÁVEL" isTotal valCurrent={currentYearData.lucroTributavel} valPrevious={previousYearData.lucroTributavel} />
                      </div>
                  </div>

              </div>
          </div>

          {/* RIGHT SIDEBAR - FIXED PREVIOUS YEAR & SUMMARY */}
          <div className="xl:w-80 space-y-4 print:hidden">
              <div className="bg-white border border-blue-200 shadow-lg rounded-xl overflow-hidden sticky top-6">
                  <div className="bg-blue-900 text-white p-4">
                      <h3 className="font-bold text-sm uppercase flex items-center gap-2"><Briefcase size={16}/> Resumo Comparativo</h3>
                      <p className="text-[10px] text-blue-200 mt-1">Dados Históricos vs Atuais</p>
                  </div>
                  
                  <div className="p-4 space-y-6">
                      <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Proveitos Totais</p>
                          <div className="flex justify-between items-end border-b border-dashed border-slate-300 pb-2">
                              <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">{year - 1}</span>
                                  <span className="text-sm font-mono text-slate-500">{formatCurrency(previousYearData.totalProveitosGeral)}</span>
                              </div>
                              <ArrowRight size={16} className="text-slate-300 mb-1"/>
                              <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">{year}</span>
                                  <span className="text-lg font-bold font-mono text-blue-900">{formatCurrency(currentYearData.totalProveitosGeral)}</span>
                              </div>
                          </div>
                      </div>

                      <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Custos Totais</p>
                          <div className="flex justify-between items-end border-b border-dashed border-slate-300 pb-2">
                              <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">{year - 1}</span>
                                  <span className="text-sm font-mono text-slate-500">{formatCurrency(previousYearData.totalCustos)}</span>
                              </div>
                              <ArrowRight size={16} className="text-slate-300 mb-1"/>
                              <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">{year}</span>
                                  <span className="text-lg font-bold font-mono text-blue-900">{formatCurrency(currentYearData.totalCustos)}</span>
                              </div>
                          </div>
                      </div>

                      <div>
                          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Matéria Colectável</p>
                          <div className="flex justify-between items-end border-b border-dashed border-slate-300 pb-2">
                              <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">{year - 1}</span>
                                  <span className="text-sm font-mono text-slate-500">{formatCurrency(previousYearData.materiaColectavel)}</span>
                              </div>
                              <ArrowRight size={16} className="text-slate-300 mb-1"/>
                              <div className="text-right">
                                  <span className="text-[10px] text-slate-400 block">{year}</span>
                                  <span className="text-lg font-bold font-mono text-blue-900">{formatCurrency(currentYearData.materiaColectavel)}</span>
                              </div>
                          </div>
                      </div>

                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <p className="text-xs font-bold text-blue-800 uppercase mb-2">Cálculo Imposto ({year})</p>
                          <div className="flex justify-between text-xs mb-1">
                              <span>Taxa Normal</span>
                              <span className="font-bold">25%</span>
                          </div>
                          <div className="flex justify-between text-xs mb-1">
                              <span>Colecta</span>
                              <span>{formatCurrency(currentYearData.colecta)}</span>
                          </div>
                          <div className="flex justify-between text-xs mb-2 text-red-500">
                              <span>Pag. Antecipados</span>
                              <span>({formatCurrency(currentYearData.deducoesColecta)})</span>
                          </div>
                          <div className="border-t border-blue-200 pt-2 flex justify-between items-center">
                              <span className="font-black text-blue-900 uppercase text-xs">A Pagar</span>
                              <span className="font-black text-xl text-blue-600">{formatCurrency(currentYearData.impostoPagar)}</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderStampDuty = () => {
      // Logic for Stamp Duty (1%) on Receipts (RG) and Cash Sales (VD/FR)
      const items = stampDutyDocs.map((doc, idx) => ({
          order: idx + 1,
          nif: doc.clientNif || '999999999',
          name: doc.clientName,
          type: doc.type,
          date: doc.date,
          origin: 'Sistema',
          number: doc.number,
          total: doc.total,
          base: doc.total,
          tax: doc.total * 0.01
      }));

      const totalBase = items.reduce((acc, i) => acc + i.base, 0);
      const totalTax = items.reduce((acc, i) => acc + i.tax, 0);

      // Recreating exact structure from description
      return (
          <div className="bg-white p-8 max-w-[1200px] mx-auto shadow-2xl border border-slate-300 font-sans animate-in zoom-in-95">
              {/* Header */}
              <div className="flex justify-between items-center mb-4 border-b pb-4">
                  <div>
                      <h2 className="text-sm font-bold text-slate-500 italic">Imposto Selo Verba 23.3</h2>
                  </div>
                  <div className="flex gap-4 items-center">
                      <select className="border rounded px-2 py-1 bg-slate-100 text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
                          {Array.from({length:12},(_,i)=>i+1).map(m => (
                             <option key={m} value={m}>{new Date(2024, m-1).toLocaleString('pt-PT', {month:'long'})}</option>
                          ))}
                      </select>
                      <button onClick={() => window.print()} className="bg-green-100 p-2 rounded-full text-green-700 hover:bg-green-200"><Printer size={20}/></button>
                      <button className="bg-green-600 p-2 rounded-full text-white hover:bg-green-700 font-bold text-xs">XLSX</button>
                      <div className="flex items-center gap-1 text-slate-400">
                          <HelpCircle size={24}/> <span className="text-lg font-bold text-blue-400">{year}</span>
                      </div>
                  </div>
              </div>

              {/* Main Form Box */}
              <div className="border-2 border-slate-800">
                  {/* Title Bar */}
                  <div className="flex border-b-2 border-slate-800">
                      <div className="w-48 border-r-2 border-slate-800 p-2 flex flex-col items-center justify-center">
                          <div className="text-blue-500 font-bold text-xl"><Calculator/></div>
                          <div className="text-[10px] font-bold text-slate-700">Powered By IMATEC SOFT</div>
                      </div>
                      <div className="flex-1 text-center p-2">
                          <h1 className="text-2xl font-bold text-blue-900 uppercase">Imposto Selo Verba 23.3</h1>
                          <p className="text-xs font-bold text-blue-800">Artº 7 nº1 Dec. Lei 7/19</p>
                      </div>
                  </div>

                  {/* Row 1: Period, Regime, NIF */}
                  <div className="flex border-b-2 border-slate-800 h-24">
                      <div className="w-1/4 border-r-2 border-slate-800">
                          <div className="bg-blue-900 text-white text-[10px] font-bold px-1">01 - PERIODO DE DECLARAÇÃO</div>
                          <div className="p-2 flex gap-4 mt-2 justify-center">
                              <div>
                                  <span className="text-[10px] block text-slate-500">Ano:</span>
                                  <div className="border border-black px-2 py-1 font-bold">{year}</div>
                              </div>
                              <div>
                                  <span className="text-[10px] block text-slate-500">Mês:</span>
                                  <div className="border border-black px-2 py-1 font-bold">{String(month).padStart(2,'0')}</div>
                              </div>
                          </div>
                      </div>
                      <div className="w-1/4 border-r-2 border-slate-800">
                          <div className="bg-blue-900 text-white text-[10px] font-bold px-1">02 - REGIME DE TRIBUTAÇÃO</div>
                          <div className="flex items-center justify-center h-full pb-4">
                              <span className="font-bold text-sm">REGIME DE NÃO SUJEIÇÃO</span>
                          </div>
                      </div>
                      <div className="w-1/2">
                          <div className="bg-blue-900 text-white text-[10px] font-bold px-1">03 - NUMERO DE IDENTIFICAÇÃO FISCAL</div>
                          <div className="flex items-center justify-center h-full pb-4 gap-2">
                              <span className="font-bold">NIF</span>
                              <div className="flex gap-1">
                                  {company.nif.split('').map((c,i) => (
                                      <div key={i} className="border border-black w-6 h-8 flex items-center justify-center font-bold">{c}</div>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Row 2: Contribuinte */}
                  <div className="border-b-2 border-slate-800">
                      <div className="bg-blue-900 text-white text-[10px] font-bold px-1">04 - IDENTIFICAÇÃO DO CONTRIBUINTE</div>
                      <div className="p-3 flex gap-4 items-end">
                          <span className="text-xs font-bold text-blue-900 uppercase">NOME/DESIGNAÇÃO</span>
                          <div className="flex-1 border-b border-black font-bold text-sm uppercase">{company.name}</div>
                      </div>
                  </div>

                  {/* Row 3: Table */}
                  <div>
                      <div className="bg-blue-900 text-white text-[10px] font-bold px-1">05 - RELACÇÃO DAS FACTURAS E DOCUMENTOS EQUIVALENTES GERADORES DE IMPOSTO</div>
                      <table className="w-full text-[10px] border-collapse">
                          <thead>
                              <tr className="border-b border-black text-center font-bold">
                                  <th className="border-r border-black p-1 w-16">N ORDEM</th>
                                  <th className="border-r border-black p-1 w-24">NUMERO DE IDENTIFICAÇÃO FISCAL</th>
                                  <th className="border-r border-black p-1">NOME/FIRMA</th>
                                  <th className="border-r border-black p-1 w-24">TIPO DE DOCUMENTO</th>
                                  <th className="border-r border-black p-1 w-20">DATA DO DOCUMENTO</th>
                                  <th className="border-r border-black p-1 w-16">Origem</th>
                                  <th className="border-r border-black p-1 w-24">NUMERO DO DOCUMENTO</th>
                                  <th className="border-r border-black p-1 w-24">VALOR DA FACTURA</th>
                                  <th className="border-r border-black p-1 w-24">VALOR TRIBUTAVEL</th>
                                  <th className="p-1 w-24">Imposto Gerado</th>
                              </tr>
                          </thead>
                          <tbody>
                              {items.map((row) => (
                                  <tr key={row.order} className="border-b border-black text-center h-6">
                                      <td className="border-r border-black">{row.order}</td>
                                      <td className="border-r border-black">{row.nif}</td>
                                      <td className="border-r border-black text-left pl-1 truncate max-w-[150px]">{row.name}</td>
                                      <td className="border-r border-black">{row.type}</td>
                                      <td className="border-r border-black">{formatDate(row.date)}</td>
                                      <td className="border-r border-black">{row.origin}</td>
                                      <td className="border-r border-black">{row.number}</td>
                                      <td className="border-r border-black text-right pr-1">{formatCurrency(row.total).replace('Kz','')}</td>
                                      <td className="border-r border-black text-right pr-1">{formatCurrency(row.base).replace('Kz','')}</td>
                                      <td className="text-right pr-1">{formatCurrency(row.tax).replace('Kz','')}</td>
                                  </tr>
                              ))}
                              {/* Empty Lines for Aesthetics */}
                              {Array.from({length: Math.max(0, 10 - items.length)}).map((_, i) => (
                                  <tr key={`empty-${i}`} className="border-b border-black h-6">
                                      <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                      <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td>
                                      <td className="border-r border-black"></td><td className="border-r border-black"></td><td className="border-r border-black"></td><td></td>
                                  </tr>
                              ))}
                          </tbody>
                          <tfoot>
                              <tr className="font-bold text-xs">
                                  <td colSpan={7} className="border-r border-black text-right pr-2">TOTAL</td>
                                  <td className="border-r border-black text-right pr-1">{formatCurrency(totalBase).replace('Kz','')}</td>
                                  <td className="border-r border-black text-right pr-1">{formatCurrency(totalBase).replace('Kz','')}</td>
                                  <td className="text-right pr-1">{formatCurrency(totalTax).replace('Kz','')}</td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen pb-20 animate-in fade-in">
         <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6 print:hidden">
            <div>
                 <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Calculator/> Gestão de Impostos</h1>
                 <p className="text-xs text-slate-500">Mapas fiscais e apuramentos oficiais</p>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto max-w-full">
                {['ANUAL', 'SELO'].map(t => (
                    <button 
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${activeTab === t ? 'bg-blue-900 text-white border-blue-900 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                    >
                        {t === 'ANUAL' ? 'Imposto Industrial (Modelo 1)' : 'Imposto Selo'}
                    </button>
                ))}
            </div>
        </div>

        {activeTab === 'ANUAL' && (
            <>
                <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6 flex flex-wrap gap-4 items-end print:hidden">
                     <div>
                         <label className="block text-xs font-bold mb-1">Ano Fiscal</label>
                         <select className="p-2 border rounded w-24 text-sm font-bold bg-slate-50" value={year} onChange={e => setYear(Number(e.target.value))}>
                             <option value={2023}>2023</option>
                             <option value={2024}>2024</option>
                             <option value={2025}>2025</option>
                         </select>
                     </div>
                     <div className="flex gap-2 ml-auto">
                         <div className="text-xs text-slate-500 self-center mr-4 flex items-center gap-1">
                             <AlertCircle size={12}/> Campos a Azul são editáveis manualmente.
                         </div>
                         <button onClick={() => window.print()} className="px-4 py-2 bg-blue-900 text-white rounded font-bold flex items-center gap-2 text-sm hover:bg-black transition"><Printer size={16}/> Imprimir</button>
                     </div>
                </div>
                {renderModelo1Detailed()}
            </>
        )}
        {activeTab === 'SELO' && renderStampDuty()}
    </div>
  );
};

export default TaxManager;