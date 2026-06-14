require('dotenv').config();
const prisma = require('../utils/prisma');

const templates = [
  {
    title: 'خطة تسويق مطعم',
    description: 'قالب متكامل لإنشاء سكريبتات ترويجية للمطاعم تركز على تجربة العميل وجودة الطعام.',
    category: 'Restaurants',
    thumbnail: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
    prompt: 'أريد سكريبت فيديو ترويجي لمطعم يقدم وجبات [نوع الطعام]. ركز على المشاهد البصرية والروائح الموصوفة.',
    scriptStructure: {
      hook: 'هل تبحث عن أفضل [نوع الطعام] في المدينة؟',
      body: 'نحن في [اسم المطعم] نهتم بكل التفاصيل...',
      cta: 'تفضل بزيارتنا اليوم أو اطلب عبر التطبيق.'
    },
    recommendedHashtags: ['مطاعم', 'أكل_صحي', 'تجربة_طعام'],
    isPremium: false
  },
  {
    title: 'عرض عقاري احترافي',
    description: 'قالب لعرض العقارات والمنازل بطريقة جذابة تبرز المميزات والمساحات.',
    category: 'Real Estate',
    thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80',
    prompt: 'أنشئ سكريبت جولة عقارية لمنزل بمساحة [المساحة] في منطقة [المنطقة].',
    scriptStructure: {
      hook: 'منزل أحلامك أصبح حقيقة!',
      body: 'شاهد هذه التفاصيل المعمارية الرائعة في قلب [المنطقة]...',
      cta: 'اتصل بنا للمعاينة الآن.'
    },
    recommendedHashtags: ['عقارات', 'منزل_للبيع', 'استثمار_عقاري'],
    isPremium: true
  },
  {
    title: 'إطلاق منتج تجارة إلكترونية',
    description: 'قالب مثالي لإطلاق المنتجات الجديدة وزيادة المبيعات عبر السوشيال ميديا.',
    category: 'E-commerce',
    thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80',
    prompt: 'سكريبت إطلاق منتج [اسم المنتج] مع التركيز على حل مشكلة [المشكلة].',
    scriptStructure: {
      hook: 'وداعاً لمشكلة [المشكلة] مع منتجنا الجديد!',
      body: 'يتميز [المنتج] بتقنيات حديثة تجعل حياتك أسهل...',
      cta: 'احصل عليه الآن بخصم 20%.'
    },
    recommendedHashtags: ['تجارة_إلكترونية', 'تسوق', 'منتجات_جديدة'],
    isPremium: false
  }
];

async function main() {
  console.log('🌱 Seeding templates...');
  for (const t of templates) {
    await prisma.template.create({
      data: t
    });
  }
  console.log('✅ Seeding completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
