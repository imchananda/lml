import { PrismaClient, TransactionType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const categories = [
    { name: 'อาหารและเครื่องดื่ม', icon: 'Utensils', color: '#f59e0b', type: TransactionType.EXPENSE },
    { name: 'การเดินทาง', icon: 'Car', color: '#3b82f6', type: TransactionType.EXPENSE },
    { name: 'ที่อยู่อาศัย', icon: 'Home', color: '#8b5cf6', type: TransactionType.EXPENSE },
    { name: 'บิลและค่าสาธารณูปโภค', icon: 'FileText', color: '#ef4444', type: TransactionType.EXPENSE },
    { name: 'ช้อปปิ้ง', icon: 'ShoppingBag', color: '#ec4899', type: TransactionType.EXPENSE },
    { name: 'บันเทิง', icon: 'Film', color: '#a855f7', type: TransactionType.EXPENSE },
    { name: 'สุขภาพ', icon: 'Heart', color: '#14b8a6', type: TransactionType.EXPENSE },
    { name: 'ประกันภัยและภาษี', icon: 'Shield', color: '#6366f1', type: TransactionType.EXPENSE },
    { name: 'หนี้สินและสินเชื่อ', icon: 'CreditCard', color: '#dc2626', type: TransactionType.EXPENSE },
    { name: 'ครอบครัวและสัตว์เลี้ยง', icon: 'Users', color: '#f43f5e', type: TransactionType.EXPENSE },
    { name: 'การศึกษา', icon: 'BookOpen', color: '#0ea5e9', type: TransactionType.EXPENSE },
    { name: 'ออมและการลงทุน', icon: 'PiggyBank', color: '#10b981', type: TransactionType.EXPENSE },
    { name: 'ทำบุญและบริจาค', icon: 'Gift', color: '#d946ef', type: TransactionType.EXPENSE },
    
    { name: 'เงินเดือน', icon: 'Wallet', color: '#10b981', type: TransactionType.INCOME },
    { name: 'รายได้เสริม', icon: 'Coins', color: '#059669', type: TransactionType.INCOME },
    { name: 'ธุรกิจส่วนตัว', icon: 'Briefcase', color: '#0284c7', type: TransactionType.INCOME },
    { name: 'เงินปันผล/ดอกเบี้ย', icon: 'TrendingUp', color: '#047857', type: TransactionType.INCOME },
  ]

  console.log('Start seeding...')
  for (const c of categories) {
    const existing = await prisma.category.findFirst({ where: { name: c.name } })
    if (!existing) {
      const category = await prisma.category.create({ data: c })
      console.log(`Created category: ${category.name}`)
    } else {
      console.log(`Category already exists: ${existing.name}`)
    }
  }
  console.log('Seeding transaction categories finished.')

  // Food database seeding
  const foodItems = [
    { name: 'ข้าวมันไก่', calories: 590, proteinG: 20.0, carbsG: 70.0, fatG: 25.0, isCustom: false },
    { name: 'ผัดไทยกุ้งสด', calories: 650, proteinG: 18.0, carbsG: 90.0, fatG: 20.0, isCustom: false },
    { name: 'กะเพราไก่ไข่ดาว', calories: 630, proteinG: 25.0, carbsG: 75.0, fatG: 24.0, isCustom: false },
    { name: 'ส้มตำไทย', calories: 120, proteinG: 4.0, carbsG: 25.0, fatG: 1.0, isCustom: false },
    { name: 'ต้มยำกุ้งน้ำข้น', calories: 320, proteinG: 22.0, carbsG: 15.0, fatG: 18.0, isCustom: false },
    { name: 'ข้าวผัดหมู', calories: 550, proteinG: 18.0, carbsG: 80.0, fatG: 16.0, isCustom: false },
    { name: 'แกงเขียวหวานไก่', calories: 450, proteinG: 20.0, carbsG: 12.0, fatG: 35.0, isCustom: false },
    { name: 'ก๋วยเตี๋ยวเรือน้ำตกหมู', calories: 350, proteinG: 15.0, carbsG: 45.0, fatG: 12.0, isCustom: false },
    { name: 'อกไก่ย่าง', calories: 165, proteinG: 31.0, carbsG: 0.0, fatG: 3.6, isCustom: false },
    { name: 'ไข่ต้ม', calories: 75, proteinG: 6.3, carbsG: 0.6, fatG: 5.0, isCustom: false },
    { name: 'ข้าวสวย (1 ทัพพี/80ก.)', calories: 80, proteinG: 1.5, carbsG: 18.0, fatG: 0.2, isCustom: false },
    { name: 'กล้วยน้ำว้า (1 ลูก)', calories: 60, proteinG: 0.8, carbsG: 15.0, fatG: 0.1, isCustom: false },
    { name: 'นมสดจืด (200มล.)', calories: 120, proteinG: 6.4, carbsG: 9.6, fatG: 6.4, isCustom: false },
    { name: 'กาแฟดำอเมริกาโน่เย็น', calories: 10, proteinG: 0.5, carbsG: 2.0, fatG: 0.0, isCustom: false },
    { name: 'ชานมไข่มุก', calories: 360, proteinG: 3.0, carbsG: 65.0, fatG: 10.0, isCustom: false },
  ]

  console.log('Start seeding food items...')
  for (const f of foodItems) {
    const existing = await prisma.foodItem.findFirst({ where: { name: f.name, isCustom: false } })
    if (!existing) {
      const food = await prisma.foodItem.create({ data: f })
      console.log(`Created food item: ${food.name}`)
    } else {
      console.log(`Food item already exists: ${existing.name}`)
    }
  }
  console.log('Seeding food items finished.')
  console.log('All seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
