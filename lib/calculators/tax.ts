import { TaxProfileData, TaxCalculationResult, TaxBracket } from '@/types/tax'

export const TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 150000, rate: 0 },
  { min: 150000, max: 300000, rate: 0.05 },
  { min: 300000, max: 500000, rate: 0.10 },
  { min: 500000, max: 750000, rate: 0.15 },
  { min: 750000, max: 1000000, rate: 0.20 },
  { min: 1000000, max: 2000000, rate: 0.25 },
  { min: 2000000, max: 5000000, rate: 0.30 },
  { min: 5000000, max: null, rate: 0.35 },
]

export function calculateTax(profile: TaxProfileData): TaxCalculationResult {
  const totalIncome = profile.estimatedIncome + profile.bonus
  
  // 1. หักค่าใช้จ่าย 50% ไม่เกิน 100,000
  const deductibleExpenses = Math.min(totalIncome * 0.5, 100000)

  // 2. ค่าลดหย่อนครอบครัวและส่วนตัว
  const personalDeduction = 60000
  const spouseDeduction = profile.hasSpouse ? 60000 : 0
  const childrenDeduction = profile.childrenCount * 30000
  const parentsDeduction = profile.parentsCount * 30000
  const familyDeductions = personalDeduction + spouseDeduction + childrenDeduction + parentsDeduction

  // 3. ค่าลดหย่อนประกันชีวิตและสุขภาพ
  // ประกันสุขภาพสูงสุด 25,000 และ (ประกันสุขภาพ + ประกันชีวิต) รวมกันไม่เกิน 100,000
  const healthInsAllowed = Math.min(profile.healthInsurance, 25000)
  const lifeAndHealthAllowed = Math.min(profile.lifeInsurance + healthInsAllowed, 100000)
  
  // 4. กลุ่มเกษียณอายุ (SSF, RMF, PVD, กบข, ประกันบำนาญ) รวมกันไม่เกิน 500,000
  // เงื่อนไขย่อย:
  // - SSF: ไม่เกิน 30% ของรายได้ และไม่เกิน 200,000
  const ssfAllowed = Math.min(profile.ssf, totalIncome * 0.3, 200000)
  
  // - RMF: ไม่เกิน 30% ของรายได้ และไม่เกิน 500,000
  const rmfAllowed = Math.min(profile.rmf, totalIncome * 0.3, 500000)
  
  // - PVD: ไม่เกิน 15% ของรายได้ และไม่เกิน 500,000
  const pvdAllowed = Math.min(profile.providentFund, totalIncome * 0.15, 500000)
  
  // - ประกันบำนาญ: ไม่เกิน 15% ของรายได้ และไม่เกิน 200,000
  // (ถ้ารวมค่าลดหย่อนชีวิตทั่วไปไม่ถึง 100k สามารถเอาส่วนที่เหลือมาโปะเพิ่มได้ แต่เพื่อความเรียบง่ายเราใช้เพดานนี้)
  const pensionAllowed = Math.min(profile.pensionInsurance, totalIncome * 0.15, 200000)
  
  // เช็คเพดานรวมเกษียณ (ไม่เกิน 500,000)
  const retirementTotal = Math.min(ssfAllowed + rmfAllowed + pvdAllowed + pensionAllowed, 500000)

  // 5. Thai ESG (ใหม่ล่าสุด): ไม่เกิน 30% ของรายได้ และไม่เกิน 300,000 (แยกจากกลุ่มเกษียณ)
  const thaiEsgAllowed = Math.min(profile.thaiEsg, totalIncome * 0.3, 300000)

  // ประกันสังคม
  const socialSecurityAllowed = Math.min(profile.socialSecurity, 9000)

  // รวมค่าลดหย่อนก่อนบริจาค
  const preDonationDeductions = familyDeductions 
                        + lifeAndHealthAllowed 
                        + retirementTotal 
                        + thaiEsgAllowed 
                        + socialSecurityAllowed 
                        + Math.min(profile.homeLoanInterest, 100000)
                        + profile.otherDeductions

  // คำนวณเงินได้สุทธิก่อนหักบริจาค
  const netIncomeBeforeDonation = Math.max(0, totalIncome - deductibleExpenses - preDonationDeductions)

  // หักบริจาค: เงินบริจาคเพื่อการศึกษา/กีฬา/พยาบาล (2 เท่า) + เงินบริจาคทั่วไป (1 เท่า)
  // รวมกันต้องไม่เกิน 10% ของเงินได้สุทธิหลังหักค่าใช้จ่ายและค่าลดหย่อนอื่นๆ
  const maxDonationAllowed = netIncomeBeforeDonation * 0.10
  
  // หักบริจาค 2 เท่าก่อน
  let eduDonationDeducted = Math.min(profile.eduDonations * 2, maxDonationAllowed)
  
  // หักบริจาค 1 เท่า
  let normalDonationDeducted = Math.min(profile.donations, maxDonationAllowed - eduDonationDeducted)

  const totalDonations = eduDonationDeducted + normalDonationDeducted

  const totalDeductions = preDonationDeductions + totalDonations

  // คำนวณเงินได้สุทธิ
  const netIncome = Math.max(0, netIncomeBeforeDonation - totalDonations)

  // คำนวณภาษีตามขั้นบันได
  let taxAmount = 0
  let marginalTaxRate = 0
  let remainingNetIncome = netIncome

  for (const bracket of TAX_BRACKETS) {
    if (remainingNetIncome <= 0) break

    const bracketSize = bracket.max ? bracket.max - bracket.min : Infinity
    const amountInBracket = Math.min(remainingNetIncome, bracketSize)
    
    taxAmount += amountInBracket * bracket.rate
    marginalTaxRate = bracket.rate * 100
    
    remainingNetIncome -= amountInBracket
  }

  return {
    totalIncome,
    deductibleExpenses,
    totalDeductions,
    netIncome,
    taxAmount,
    marginalTaxRate
  }
}
