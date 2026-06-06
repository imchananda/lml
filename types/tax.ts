export interface TaxProfileData {
  id?: string;
  year: number;
  
  estimatedIncome: number;
  bonus: number;
  
  hasSpouse: boolean;
  childrenCount: number;
  parentsCount: number;
  
  providentFund: number;
  lifeInsurance: number;
  healthInsurance: number;
  pensionInsurance: number;
  ssf: number;
  rmf: number;
  thaiEsg: number;
  socialSecurity: number;
  homeLoanInterest: number;
  donations: number;
  eduDonations: number;
  otherDeductions: number;
}

export interface TaxCalculationResult {
  totalIncome: number;
  deductibleExpenses: number; // หักค่าใช้จ่าย 50% ไม่เกิน 100k
  totalDeductions: number;    // รวมค่าลดหย่อนทั้งหมด
  netIncome: number;          // เงินได้สุทธิ
  taxAmount: number;          // ภาษีที่ต้องจ่าย
  marginalTaxRate: number;    // ฐานภาษีสูงสุดที่ตกอยู่ (%)
}

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}
