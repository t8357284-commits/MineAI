const express = require('express');
const router = express.Router();

const TEMPLATES = {
  tiktok:    [{t:'Hook فيروسي',d:'0-15 ثانية',tip:'ابدأ بصدمة أو سؤال جريء فوراً'},{t:'POV قصيرة',d:'15-30 ثانية',tip:'اجعل المشاهد البطل'},{t:'تعليمي ترفيهي',d:'45-60 ثانية',tip:'نقطة واحدة + تأثير بصري'},{t:'Trend Hijack',d:'10-21 ثانية',tip:'موسيقى رائجة + محتوى نيشك'}],
  instagram: [{t:'ريلز Hook',d:'7-15 ثانية',tip:'أول فريم = الخطاف'},{t:'Talking Head',d:'30-60 ثانية',tip:'خلفية بسيطة + كابشن مطابق'},{t:'Aesthetic B-Roll',d:'15-30 ثانية',tip:'موسيقى + نص إلهامي'},{t:'Tutorial سريع',d:'60-90 ثانية',tip:'3 خطوات، النتيجة أولاً'}],
  twitter:   [{t:'Thread + فيديو',d:'30-60 ثانية',tip:'ادعاء جريء ثم الدليل'},{t:'Reaction Video',d:'45-90 ثانية',tip:'رأي حاد = انطباعات ضخمة'},{t:'Poll + مقطع',d:'10-20 ثانية',tip:'سؤال في الفيديو + Poll'},{t:'News Commentary',d:'60 ثانية',tip:'حدث جاري + رأيك'}],
  facebook:  [{t:'فيديو ناتيف',d:'3-5 دقائق',tip:'ارفع مباشرة لا من يوتيوب'},{t:'Facebook Live',d:'+15 دقيقة',tip:'انتظر 4 دق قبل المحتوى'},{t:'Reels فيسبوك',d:'15-30 ثانية',tip:'TikTok بدون علامة مائية'},{t:'قصة يومية',d:'20-30 ثانية',tip:'نص كبير + وجه إنساني'}],
  snapchat:  [{t:'Spotlight فيروسي',d:'10-60 ثانية',tip:'أول ثانيتين = لحظة مذهلة'},{t:'قصة متسلسلة',d:'5-10 ثوانٍ×10',tip:'سلسلة = مشاهدات 4x'},{t:'AR Lens محتوى',d:'10-20 ثانية',tip:'فلاتر رائجة للاكتشاف'},{t:'Behind Scenes',d:'15-30 ثانية',tip:'خام وغير مصقول = ثقة'}],
};

router.get('/templates/:platform', (req, res) => {
  const { platform } = req.params;
  const templates = TEMPLATES[platform];
  if (!templates) return res.status(400).json({ error: 'Invalid platform' });
  res.json({ success: true, templates });
});

router.get('/schedule/:platform', (req, res) => {
  res.json({
    success: true,
    schedule: [
      { day: 'الاثنين 9:00م', type: 'Hook فيروسي', topic: 'أكبر خطأ في مجالك', reach: '~24K' },
      { day: 'الأربعاء 8:00م', type: 'Tutorial سريع', topic: 'نصيحة تغير اللعبة', reach: '~41K' },
      { day: 'الخميس 7:30م', type: 'Trend Hijack', topic: 'رأيك في ترند اليوم', reach: '~58K' },
      { day: 'الجمعة 9:30م', type: 'قصة قصيرة', topic: 'تجربة شخصية صادمة', reach: '~33K' },
    ],
  });
});

module.exports = router;
