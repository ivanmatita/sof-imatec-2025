
import { Invoice, InvoiceType } from "./types";

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-AO', {
    style: 'currency',
    currency: 'AOA',
  }).format(value);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Simulate Angolan Certification Hash (Short version for UI)
export const generateInvoiceHash = (invoice: Invoice): string => {
  // In a real scenario, this involves RSA-SHA1 signing of data
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let hash = "";
  for(let i=0; i<4; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
};

export const generateQrCodeUrl = (data: string): string => {
  // Uses a public API to generate QR code images for the print view
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
};

export const exportToExcel = (data: any[], fileName: string) => {
  // Simple CSV export simulation
  const header = Object.keys(data[0]).join(",");
  const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(","));
  const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Helper for Document Prefixes ---
export const getDocumentPrefix = (type: InvoiceType): string => {
  switch (type) {
    case InvoiceType.FT: return 'FT';
    case InvoiceType.FR: return 'FR';
    case InvoiceType.RG: return 'RC'; // Recibo
    case InvoiceType.NC: return 'NC';
    case InvoiceType.ND: return 'ND';
    case InvoiceType.PP: return 'PP';
    case InvoiceType.OR: return 'OR';
    case InvoiceType.GT: return 'GT';
    case InvoiceType.GR: return 'GR';
    default: return 'DOC';
  }
};

// --- Number to Words (Extenso) Logic ---

const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezasseis", "dezassete", "dezoito", "dezanove"];
const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

const converteGrupo = (n: number): string => {
  if (n === 0) return "";
  if (n === 100) return "cem";
  
  let extenso = "";
  
  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;

  if (c > 0) {
    extenso += centenas[c];
    if (d > 0 || u > 0) extenso += " e ";
  }

  if (d >= 2) {
    extenso += dezenas[d];
    if (u > 0) extenso += " e " + unidades[u];
  } else if (n % 100 > 0) {
    // Caso 0-19 (tratado pelo resto da divisão por 100)
    extenso += unidades[n % 100];
  }

  return extenso;
};

export const numberToExtenso = (valor: number, moedaPlural: string = "Kwanzas", moedaSingular: string = "Kwanza"): string => {
  if (valor === 0) return "Zero " + moedaPlural;

  const inteiro = Math.floor(valor);
  const decimal = Math.round((valor - inteiro) * 100);

  let extenso = "";
  let resto = inteiro;
  let contador = 0;

  const qualificadores = [
    ["", ""],
    ["mil", "mil"],
    ["milhão", "milhões"],
    ["mil milhões", "mil milhões"], // ou bilião/biliões
    ["bilião", "biliões"],
    ["bilião", "biliões"] // Simplificado para escalas maiores
  ];

  while (resto > 0) {
    const grupo = resto % 1000;
    
    if (grupo > 0) {
      let grupoExtenso = converteGrupo(grupo);
      
      // Tratamento especial para "um mil" -> "mil"
      if (contador === 1 && grupo === 1) {
        grupoExtenso = ""; 
      }

      const qualificador = grupo === 1 ? qualificadores[contador][0] : qualificadores[contador][1];
      
      // Concatenação
      const prefixo = extenso ? (contador > 0 && grupo < 100 ? " e " : " ") : ""; // simplificação de conectivos
      
      extenso = `${grupoExtenso} ${qualificador}${prefixo}${extenso}`;
    }

    resto = Math.floor(resto / 1000);
    contador++;
  }

  extenso = extenso.trim();
  
  // Adicionar nome da moeda
  if (inteiro === 1) extenso += " " + moedaSingular;
  else if (inteiro > 0) {
      // Se termina em milhão/milhões/etc, adiciona "de"
      if (extenso.endsWith("ilhões") || extenso.endsWith("ilhão")) {
          extenso += " de " + moedaPlural;
      } else {
          extenso += " " + moedaPlural;
      }
  }

  // Tratamento de decimais (Cêntimos)
  if (decimal > 0) {
    if (inteiro > 0) extenso += " e ";
    extenso += converteGrupo(decimal);
    extenso += decimal === 1 ? " Cêntimo" : " Cêntimos";
  }

  return extenso;
};


// --- Payroll Calculations (Angola AGT) ---

export const calculateINSS = (grossSalary: number): number => {
  // 3% Employee Share
  return grossSalary * 0.03; 
};

export const calculateINSSEntity = (grossSalary: number): number => {
  // 8% Employer Share
  return grossSalary * 0.08;
};

export const calculateIRT = (grossSalary: number, inss: number): number => {
  // Simplified Progressive Table (Based on Standard AGT Logic)
  // Taxable amount = Gross - INSS
  const taxable = grossSalary - inss;
  
  if (taxable <= 70000) return 0;
  if (taxable <= 100000) return (taxable - 70000) * 0.10 + 3000;
  if (taxable <= 150000) return (taxable - 100000) * 0.13 + 6000;
  if (taxable <= 200000) return (taxable - 150000) * 0.16 + 12500;
  if (taxable <= 300000) return (taxable - 200000) * 0.18 + 31250;
  if (taxable <= 500000) return (taxable - 300000) * 0.19 + 49250;
  if (taxable <= 1000000) return (taxable - 500000) * 0.20 + 87250;
  if (taxable <= 1500000) return (taxable - 1000000) * 0.21 + 187250;
  if (taxable <= 2000000) return (taxable - 1500000) * 0.22 + 292250;
  if (taxable <= 2500000) return (taxable - 2000000) * 0.23 + 402250;
  if (taxable <= 3000000) return (taxable - 2500000) * 0.24 + 517250;
  if (taxable <= 5000000) return (taxable - 3000000) * 0.245 + 637250;
  
  return (taxable - 5000000) * 0.25 + 1127250; // Max bracket approx
};
