
import React, { useState, useMemo } from 'react';
import { SalarySlip, Employee } from '../types';
import { formatCurrency, exportToExcel, formatDate } from '../utils';
import { Printer, Download, Search, Calendar, Filter, FileText, Building2, X } from 'lucide-react';

interface SalaryMapProps {
  payroll: SalarySlip[];
  employees: Employee[];
}

const SalaryMap: React.FC<SalaryMapProps> = ({ payroll, employees }) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [endMonth, setEndMonth] = useState(12);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('ALL');
  const [isPrintMode, setIsPrintMode] = useState(false);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Helper: Mock days in month
  const getDaysInMonth = (monthIndex: number, year: number) => new Date(year, monthIndex + 1, 0).getDate();

  // Aggregate Data for the map based on employees and their settings
  const mapData = useMemo(() => {
      const data: any[] = [];
      const filteredEmployees = selectedEmployeeId === 'ALL' ? employees : employees.filter(e => e.id === selectedEmployeeId);

      filteredEmployees.forEach((emp, idx) => {
          // In a real scenario, this would iterate months or specific processed slips.
          // Here we generate one row per employee representing the "Current Month Snapshot" or aggregated logic for the print view 
          // (which usually shows a list of employees for a specific period).
          // Assuming the print view is for a specific month (e.g. Current Month).
          
          const slip = payroll.find(p => p.employeeId === emp.id) || {
              // Fallback mock if no slip processed yet
              employeeId: emp.id,
              employeeName: emp.name,
              employeeRole: emp.role,
              baseSalary: emp.baseSalary,
              allowances: 0,
              bonuses: 0,
              absences: 0,
              advances: 0,
              subsidies: 0,
              subsidyTransport: emp.subsidyTransport || 0,
              subsidyFood: emp.subsidyFood || 0,
              subsidyFamily: emp.subsidyFamily || 0,
              subsidyHousing: emp.subsidyHousing || 0,
              grossTotal: emp.baseSalary,
              inss: emp.baseSalary * 0.03,
              irt: 0,
              netTotal: emp.baseSalary * 0.97
          } as SalarySlip;

          data.push({
              index: idx + 1,
              name: emp.name,
              idNumber: emp.biNumber || emp.nif, // Using NIF/BI as ID
              province: 'LUANDA', // Static/Mock
              municipality: 'BELAS', // Static/Mock
              admission: emp.admissionDate,
              endDate: emp.terminationDate || '',
              daysBase: 30, // Standard
              daysWorked: 30,
              hoursLost: 0, // Mock
              overtimeHours: 0,
              overtimeValue: 0,
              baseSalary: slip.baseSalary,
              
              // Subsidies Breakdown
              subTransport: slip.subsidyTransport || emp.subsidyTransport || 0,
              subFood: slip.subsidyFood || emp.subsidyFood || 0,
              subFamily: slip.subsidyFamily || emp.subsidyFamily || 0,
              subHousing: slip.subsidyHousing || emp.subsidyHousing || 0,
              subOther: 0,
              
              // Totals
              adjustments: slip.advances,
              gross: slip.grossTotal, // Vencimentos Antes Impostos
              inss: slip.inss,
              irt: slip.irt,
              net: slip.netTotal,
              
              profession: emp.professionName || emp.role,
              inssCode: emp.professionId ? '925' : '' // Mock code if not linked
          });
      });
      return data;
  }, [employees, payroll, selectedEmployeeId]);

  const totals = mapData.reduce((acc, row) => ({
      baseSalary: acc.baseSalary + row.baseSalary,
      subTransport: acc.subTransport + row.subTransport,
      subFood: acc.subFood + row.subFood,
      subFamily: acc.subFamily + row.subFamily,
      subHousing: acc.subHousing + row.subHousing,
      subOther: acc.subOther + row.subOther,
      adjustments: acc.adjustments + row.adjustments,
      gross: acc.gross + row.gross,
      inss: acc.inss + row.inss,
      irt: acc.irt + row.irt,
      net: acc.net + row.net
  }), { baseSalary: 0, subTransport: 0, subFood: 0, subFamily: 0, subHousing: 0, subOther: 0, adjustments: 0, gross: 0, inss: 0, irt: 0, net: 0 });

  const f = (n: number) => formatCurrency(n).replace('Kz', '').trim();

  // PRINT VIEW COMPONENT
  const PrintView = () => (
      <div className="fixed inset-0 bg-white z-[100] overflow-auto p-4 print:p-0">
          <div className="max-w-[2000px] mx-auto min-w-[1200px]">
              {/* Header */}
              <div className="flex justify-between items-start mb-6 border-b-4 border-blue-900 pb-2">
                  <div className="flex items-center gap-4">
                      <div className="text-4xl font-black text-blue-900 uppercase tracking-tighter">LYG SUNAC</div>
                  </div>
                  <div className="text-right">
                      <div className="text-sm font-bold text-slate-700">Empresa: YGSUNAC INDUSTRIA - PRESTAÇÃO DE SERVIÇO E COMERCIO GERAL, LDA</div>
                      <div className="text-sm text-slate-600">Contribuinte N.: 5000732028</div>
                      <div className="text-sm text-slate-600">Janeiro de 2025</div>
                  </div>
              </div>

              {/* Close Button (Hidden on Print) */}
              <div className="fixed top-4 right-4 print:hidden flex gap-2">
                  <button onClick={() => window.print()} className="bg-blue-900 text-white px-4 py-2 rounded font-bold shadow-lg flex items-center gap-2">
                      <Printer size={16}/> Imprimir
                  </button>
                  <button onClick={() => setIsPrintMode(false)} className="bg-red-600 text-white p-2 rounded shadow-lg">
                      <X size={20}/>
                  </button>
              </div>

              {/* TABLE HEADER */}
              <div className="border-t-2 border-l-2 border-r-2 border-slate-400 text-[10px] font-sans">
                  <div className="grid grid-cols-[30px_1fr_100px_80px_120px_150px_200px_150px_120px_80px_100px] bg-slate-50 font-bold text-center border-b border-slate-400">
                      <div className="py-2 border-r border-slate-300"></div> {/* Index */}
                      <div className="py-2 border-r border-slate-300">No Identificação / B.I.</div>
                      <div className="py-2 border-r border-slate-300">Exercicio</div>
                      <div className="py-2 border-r border-slate-300">Data Vínculo</div>
                      <div className="py-2 border-r border-slate-300">Vencimento Base</div>
                      <div className="py-2 border-r border-slate-300">Faltas / Horas</div>
                      <div className="py-2 border-r border-slate-300">Subsídios</div>
                      <div className="py-2 border-r border-slate-300">Ajudas Custo / Acertos</div>
                      <div className="py-2 border-r border-slate-300">Vencimentos</div>
                      <div className="py-2 border-r border-slate-300">Impostos</div>
                      <div className="py-2">Vencimento Líquido</div>
                  </div>
                  
                  {/* DETAILED SUB-HEADER */}
                  <div className="grid grid-cols-[30px_1fr_100px_80px_120px_150px_200px_150px_120px_80px_100px] bg-white text-center border-b border-slate-400 text-[9px] text-slate-600 font-bold">
                        <div className="border-r border-slate-300 py-1"></div>
                        <div className="border-r border-slate-300 py-1 flex justify-between px-2">
                            <span>Contribuinte</span>
                            <span>INSS Antigo/Novo</span>
                        </div>
                        <div className="border-r border-slate-300 py-1 flex justify-between px-2">
                            <span>Provincia</span>
                            <span>Municipio</span>
                        </div>
                        <div className="border-r border-slate-300 py-1 flex justify-between px-2">
                            <span>Inicio</span>
                            <span>Fim</span>
                        </div>
                        <div className="border-r border-slate-300 py-1 flex justify-between px-2">
                            <span>Dias Base</span>
                            <span>Vct Base</span>
                        </div>
                        <div className="border-r border-slate-300 py-1 flex justify-between px-2">
                            <span>Férias</span>
                            <span>Hrs Perdidas</span>
                            <span>Hrs Extra</span>
                        </div>
                        <div className="border-r border-slate-300 py-1 grid grid-cols-5">
                            <span>Transp</span>
                            <span>Alim.</span>
                            <span>Aloj.</span>
                            <span>Fam.</span>
                            <span>Outros</span>
                        </div>
                        <div className="border-r border-slate-300 py-1">
                            Acertos / Penalizações
                        </div>
                        <div className="border-r border-slate-300 py-1">
                            Antes Impostos (Tributável)
                        </div>
                        <div className="border-r border-slate-300 py-1 grid grid-cols-2">
                            <span>IRT</span>
                            <span>INSS 3%</span>
                        </div>
                        <div className="py-1">Líquido a Receber</div>
                  </div>
              </div>

              {/* TABLE BODY */}
              <div className="border-l-2 border-r-2 border-b-2 border-slate-400 text-[10px]">
                  {mapData.map((row) => (
                      <div key={row.index} className="group border-b border-slate-300 last:border-0 break-inside-avoid">
                          {/* Row 1: Name & Profession */}
                          <div className="bg-slate-100 px-2 py-1 font-bold text-slate-800 flex justify-between border-b border-slate-200">
                              <div>{row.index} {row.name}</div>
                              <div className="uppercase">Profissão: {row.profession}</div>
                              <div>Código INSS: {row.inssCode}-{row.profession}</div>
                          </div>
                          
                          {/* Row 2: Data Columns */}
                          <div className="grid grid-cols-[30px_1fr_100px_80px_120px_150px_200px_150px_120px_80px_100px] items-center py-1 hover:bg-yellow-50">
                              <div className="text-center text-slate-400">{row.index}</div>
                              
                              <div className="px-2 border-r border-slate-200">
                                  <div className="font-mono">{row.idNumber}</div>
                              </div>
                              
                              <div className="px-2 border-r border-slate-200 text-center">
                                  <div>{row.province}</div>
                                  <div className="text-[8px] text-slate-500">{row.municipality}</div>
                              </div>
                              
                              <div className="px-2 border-r border-slate-200 text-center">
                                  <div>{formatDate(row.admission)}</div>
                                  <div className="text-[8px]">{row.endDate ? formatDate(row.endDate) : '-'}</div>
                              </div>
                              
                              <div className="px-2 border-r border-slate-200 text-right">
                                  <div className="flex justify-between text-[8px] text-slate-500"><span>30</span><span>Dias</span></div>
                                  <div className="font-bold">{f(row.baseSalary)}</div>
                              </div>
                              
                              <div className="px-2 border-r border-slate-200 text-center grid grid-cols-3 gap-1">
                                  <span>0</span>
                                  <span>0</span>
                                  <span>0</span>
                              </div>
                              
                              <div className="px-2 border-r border-slate-200 text-right grid grid-cols-5 gap-1 text-[9px]">
                                  <span>{f(row.subTransport)}</span>
                                  <span>{f(row.subFood)}</span>
                                  <span>{f(row.subHousing)}</span>
                                  <span>{f(row.subFamily)}</span>
                                  <span>{f(row.subOther)}</span>
                              </div>
                              
                              <div className="px-2 border-r border-slate-200 text-right text-red-600">
                                  {f(row.adjustments)}
                              </div>
                              
                              <div className="px-2 border-r border-slate-200 text-right font-bold">
                                  {f(row.gross)}
                              </div>
                              
                              <div className="px-2 border-r border-slate-200 text-right grid grid-cols-2 gap-2">
                                  <span>{f(row.irt)}</span>
                                  <span>{f(row.inss)}</span>
                              </div>
                              
                              <div className="px-2 text-right font-black text-xs">
                                  {f(row.net)}
                              </div>
                          </div>
                      </div>
                  ))}
              </div>

              {/* TOTALS FOOTER */}
              <div className="mt-4 border-2 border-slate-800 p-2 bg-slate-100 font-bold text-xs uppercase grid grid-cols-4 gap-4">
                  <div className="text-right">
                      <div className="text-[9px] text-slate-500">Total Vencimento Base</div>
                      <div>{f(totals.baseSalary)}</div>
                  </div>
                  <div className="text-right">
                      <div className="text-[9px] text-slate-500">Total Subsídios</div>
                      <div>{f(totals.subTransport + totals.subFood + totals.subHousing + totals.subFamily)}</div>
                  </div>
                  <div className="text-right">
                      <div className="text-[9px] text-slate-500">Total Impostos</div>
                      <div>{f(totals.irt + totals.inss)}</div>
                  </div>
                  <div className="text-right border-l-2 border-slate-400 pl-4">
                      <div className="text-[9px] text-slate-500">Total Líquido a Pagar</div>
                      <div className="text-lg font-black">{f(totals.net)}</div>
                  </div>
              </div>
              
              <div className="mt-8 flex justify-between text-xs text-slate-500 font-mono">
                  <div>Processado por IMATEC SOFTWARE (Licença: 25/AGT/2019)</div>
                  <div>Data: {new Date().toLocaleString()}</div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        {isPrintMode && <PrintView />}
        
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-blue-600"/> Mapa de Salários (Resumo)
            </h3>
            <button 
                onClick={() => setIsPrintMode(true)}
                className="bg-blue-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-black transition shadow-lg"
            >
                <Printer size={18}/> Imprimir Mapa Oficial
            </button>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                    <tr>
                        <th className="p-3 border-b">Nome</th>
                        <th className="p-3 border-b text-right">Base</th>
                        <th className="p-3 border-b text-right">Subsídios</th>
                        <th className="p-3 border-b text-right">Bruto</th>
                        <th className="p-3 border-b text-right">IRT</th>
                        <th className="p-3 border-b text-right">INSS</th>
                        <th className="p-3 border-b text-right bg-blue-50 text-blue-900">Líquido</th>
                    </tr>
                </thead>
                <tbody>
                    {mapData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 border-b border-slate-100">
                            <td className="p-3 font-medium">{row.name}</td>
                            <td className="p-3 text-right">{f(row.baseSalary)}</td>
                            <td className="p-3 text-right">{f(row.subTransport + row.subFood + row.subFamily + row.subHousing)}</td>
                            <td className="p-3 text-right font-bold">{f(row.gross)}</td>
                            <td className="p-3 text-right text-red-600">{f(row.irt)}</td>
                            <td className="p-3 text-right text-red-600">{f(row.inss)}</td>
                            <td className="p-3 text-right font-bold text-blue-700 bg-blue-50">{f(row.net)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="p-4 text-center text-slate-500 text-xs bg-slate-50 border-t">
                Visualização resumida. Clique em "Imprimir Mapa Oficial" para ver todos os detalhes.
            </div>
        </div>
    </div>
  );
};

export default SalaryMap;
