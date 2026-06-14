const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const NodeCache = require('node-cache');
const logger = require('../utils/logger');
const Groq = require('groq-sdk');
 
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5-min cache
 
let groq = null;
 
function getGroq() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured on server');
  }
 
  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
 
  return groq;
}
 
// ─── Validation Schemas ───────────────────────────────────
const messageValidation = [
  body('messages').isArray({ min: 1, max: 20 }).withMessage('messages must be array of 1-20 items'),
  body('messages.*.role').isIn(['user', 'assistant']).withMessage('Invalid role'),
  body('messages.*.content').isString().trim().isLength({ min: 1, max: 4000 }).withMessage('Content must be 1-4000 chars'),
  body('max_tokens').optional().isInt({ min: 100, max: 2000 }).withMessage('max_tokens 100-2000'),
  body('system').optional().isString().trim().isLength({ max: 1000 }),
];
 
// ─── Helper ───────────────────────────────────────────────
async function callAI(messages, systemPrompt, maxTokens = 1000) {
  const completion = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    max_tokens: maxTokens,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages,
    ],
  });
 
  return {
    content: [
      { text: completion.choices?.[0]?.message?.content || '' }
    ]
  };
}
 
// ─── Safe JSON parse helper ────────────────────────────────
function safeParseJSON(raw) {
  const cleaned = (raw || '')
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
 
  try {
    return { ok: true, data: JSON.parse(cleaned) };
  } catch (err) {
    logger.error(`AI JSON parse failed: ${err.message} — raw: ${cleaned.slice(0, 200)}`);
    return { ok: false, error: err };
  }
}
 
// ─── POST /api/ai/chat ─────────────────────────────────────
router.post('/chat', messageValidation, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
 
  try {
    const { messages, system, max_tokens } = req.body;
 
    // Cache key from last user message
    const lastMsg = messages[messages.length - 1]?.content || '';
    const cacheKey = `chat:${Buffer.from(lastMsg).toString('base64').slice(0, 40)}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for chat request');
      return res.json({ ...cached, cached: true });
    }
 
    const data = await callAI(messages, system, max_tokens || 800);
    cache.set(cacheKey, data);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
 
// ─── POST /api/ai/generate-script ─────────────────────────
router.post('/generate-script', [
  body('platform').isIn(['tiktok','instagram','twitter','facebook','snapchat']),
  body('topic').isString().trim().isLength({ min: 3, max: 500 }),
  body('template').isString().trim().isLength({ min: 1, max: 100 }),
  body('audience').optional().isString().trim().isLength({ max: 200 }),
  body('language').optional().isIn(['ar','en','mixed']),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
 
  try {
    const { platform, topic, template, audience = 'الجمهور العام', language = 'ar', handle = '' } = req.body;
 
    const PLATFORM_NAMES = {
      tiktok:'TikTok', instagram:'Instagram', twitter:'Twitter/X',
      facebook:'Facebook', snapchat:'Snapchat'
    };
 
    const langNote = language==='ar'?'اكتب بالعربية':language==='en'?'Write in English':'مزيج عربي وإنجليزي';
 
    const systemPrompt = `أنت خبير عالمي في صناعة المحتوى الفيروسي لمنصات TikTok وInstagram Reels وYouTube Shorts بخبرة 15 سنة.
مهمتك إنشاء محتوى لمنصة ${PLATFORM_NAMES[platform]} قادر على تحقيق أعلى نسبة احتفاظ بالمشاهدين (Retention) وأعلى معدل تفاعل (Engagement).
 
قواعد صارمة:
1. أجب بـ JSON صالح فقط.
2. لا تستخدم أي كلمات عامة أو مكررة.
3. اجعل الـ Hook صادماً ويجذب الانتباه خلال أول ثانيتين.
4. اجعل كل مشهد قصيراً وسريع الإيقاع.
5. استخدم لغة عربية طبيعية وحديثة.
6. لا تستخدم نصوصاً مملة أو أكاديمية.
7. اجعل CTA يدفع المشاهد للتعليق أو المشاركة.
8. اقترح هاشتاقات حقيقية ومتداولة.
9. قدّم أفضل وقت للنشر بناءً على منصة ${PLATFORM_NAMES[platform]}.
10. أعطِ تقييم engagement_score من 1 إلى 100 بناءً على احتمالية الأداء.
 
أعد النتيجة بصيغة JSON صحيح فقط دون أي شرح خارجي.`;
 
    const userPrompt = `المنصة: ${PLATFORM_NAMES[platform]}
القالب: ${template}
الموضوع: ${topic}
الجمهور: ${audience}
الحساب: ${handle || 'غير محدد'}
اللغة: ${langNote}
 
أنشئ سكريبت فيديو احترافي كامل.
 
{
  "title": "عنوان جذاب",
  "hook": "الـ Hook الأول (جملة واحدة صادمة)",
  "scenes": [
    {"id":1,"duration":3,"text":"نص المشهد","direction":"توجيه بصري"},
    {"id":2,"duration":4,"text":"نص المشهد","direction":"توجيه بصري"},
    {"id":3,"duration":3,"text":"نص المشهد","direction":"توجيه بصري"},
    {"id":4,"duration":3,"text":"CTA قوي","direction":"توجيه بصري"}
  ],
  "hashtags": ["#1","#2","#3","#4","#5","#6"],
  "caption": "كابشن المنشور الكامل",
  "best_time": "أفضل وقت نشر",
  "predicted_reach": "الوصول المتوقع",
  "engagement_score": رقم,
  "algo_tip": "نصيحة الخوارزمية",
  "audio_suggestion": "اقتراح الموسيقى"
}`;
 
    const data = await callAI(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
      1200
    );
 
    const raw = data.content?.map(c => c.text || '').join('') || '';
    const result = safeParseJSON(raw);
    if (!result.ok) {
      return res.status(502).json({ success: false, error: 'AI returned invalid response format' });
    }
    res.json({ success: true, script: result.data });
  } catch (err) {
    next(err);
  }
});
 
// ─── POST /api/ai/analyze-account ─────────────────────────
router.post('/analyze-account', [
  body('handle').isString().trim().isLength({ min: 1, max: 50 }),
  body('platform').isIn(['tiktok','instagram','twitter','facebook','snapchat']),
  body('type').optional().isIn(['full','algo','content','competitors']),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
 
  try {
    const { handle, platform, type = 'full' } = req.body;
    const PLATFORM_NAMES = {tiktok:'TikTok',instagram:'Instagram',twitter:'Twitter/X',facebook:'Facebook',snapchat:'Snapchat'};
 
    const prompt = `أنت محلل بيانات خبير في ${PLATFORM_NAMES[platform]}.
 
حلل حساب @${handle} على ${PLATFORM_NAMES[platform]}.
نوع التحليل: ${type}
 
اكتب تقريراً احترافياً بالعربية يشمل:
**ملخص الأداء** — تقييم سريع 3 جمل
**نقاط القوة** — 3 نقاط محددة قابلة للقياس  
**فرص التحسين** — 3 توصيات عملية فورية
**استراتيجية الخوارزمية** — كيف تهزم خوارزمية ${PLATFORM_NAMES[platform]} تحديداً
**خطة 30 يوم** — خطوات أسبوعية منظمة
 
كن مباشراً وعملياً. لا مقدمات غير ضرورية.`;
 
    const data = await callAI([{ role: 'user', content: prompt }], null, 1000);
    const text = data.content?.map(c => c.text || '').join('') || '';
    res.json({ success: true, analysis: text });
  } catch (err) {
    next(err);
  }
});
 
// ─── POST /api/ai/hashtags ────────────────────────────────
router.post('/hashtags', [
  body('topic').isString().trim().isLength({ min: 2, max: 200 }),
  body('platform').isIn(['tiktok','instagram','twitter','facebook','snapchat']),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
 
  try {
    const { topic, platform } = req.body;
    const PNAMES = {tiktok:'TikTok',instagram:'Instagram',twitter:'Twitter/X',facebook:'Facebook',snapchat:'Snapchat'};
 
    const prompt = `خبير SEO وهاشتاقات ${PNAMES[platform]}.
الموضوع: "${topic}"
 
أجب بـ JSON فقط:
{
  "trending": ["#1","#2","#3","#4","#5"],
  "niche": ["#1","#2","#3"],
  "long_tail": ["#1","#2","#3"],
  "avoid": ["#1","#2"],
  "tip": "نصيحة مهمة"
}`;
 
    const cacheKey = `hashtags:${platform}:${Buffer.from(topic).toString('base64').slice(0,30)}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ success: true, ...cached, cached: true });
 
    const data = await callAI([{ role: 'user', content: prompt }], null, 400);
    const raw = data.content?.map(c=>c.text||'').join('') || '';
    const result = safeParseJSON(raw);
    if (!result.ok) {
      return res.status(502).json({ success: false, error: 'AI returned invalid response format' });
    }
    const parsed = result.data;
    cache.set(cacheKey, parsed, 600); // 10 min cache for hashtags
    res.json({ success: true, ...parsed });
  } catch (err) {
    next(err);
  }
});
 
// ─── POST /api/ai/hooks ───────────────────────────────────
router.post('/hooks', [
  body('topic').isString().trim().isLength({ min: 2, max: 300 }),
  body('platform').isIn(['tiktok','instagram','twitter','facebook','snapchat']),
  body('style').optional().isIn(['question','fact','story','challenge','controversial']),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
 
  try {
    const { topic, platform, style = 'question' } = req.body;
    const PNAMES = {tiktok:'TikTok',instagram:'Instagram',twitter:'Twitter/X',facebook:'Facebook',snapchat:'Snapchat'};
    const styleMap = {question:'أسئلة صادمة',fact:'حقائق مفاجئة',story:'بدايات قصص',challenge:'تحديات',controversial:'آراء جريئة'};
 
    const prompt = `5 Hooks لفيديو ${PNAMES[platform]} عن: "${topic}"
الأسلوب: ${styleMap[style]}
كل Hook: جملة واحدة أو جملتان، صادمة تجعل المشاهد يكمل.
 
JSON فقط: {"hooks": ["hook1","hook2","hook3","hook4","hook5"]}`;
 
    const data = await callAI([{ role: 'user', content: prompt }], null, 400);
    const raw = data.content?.map(c=>c.text||'').join('') || '';
    const result = safeParseJSON(raw);
    if (!result.ok) {
      return res.status(502).json({ success: false, error: 'AI returned invalid response format' });
    }
    res.json({ success: true, hooks: result.data.hooks });
  } catch (err) {
    next(err);
  }
});
 
// ─── POST /api/ai/caption ─────────────────────────────────
router.post('/caption', [
  body('description').isString().trim().isLength({ min: 5, max: 500 }),
  body('platform').isIn(['tiktok','instagram','twitter','facebook','snapchat']),
  body('tone').optional().isIn(['professional','casual','motivational','humorous']),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
 
  try {
    const { description, platform, tone = 'casual' } = req.body;
    const PNAMES = {tiktok:'TikTok',instagram:'Instagram',twitter:'Twitter/X',facebook:'Facebook',snapchat:'Snapchat'};
    const toneMap = {professional:'احترافي رسمي',casual:'ودي طبيعي',motivational:'تحفيزي ملهم',humorous:'فكاهي خفيف'};
 
    const prompt = `كابشن لـ ${PNAMES[platform]} عن: "${description}"
النبرة: ${toneMap[tone]}
 
JSON فقط: {"caption": "نص الكابشن الكامل", "hashtags": ["#1","#2","#3","#4","#5"]}`;
 
    const data = await callAI([{ role: 'user', content: prompt }], null, 500);
    const raw = data.content?.map(c=>c.text||'').join('') || '';
    const result = safeParseJSON(raw);
    if (!result.ok) {
      return res.status(502).json({ success: false, error: 'AI returned invalid response format' });
    }
    res.json({ success: true, caption: result.data.caption, hashtags: result.data.hashtags });
  } catch (err) {
    next(err);
  }
});
 
// ─── POST /api/ai/ab-test ─────────────────────────────────
router.post('/ab-test', [
  body('titleA').isString().trim().isLength({ min: 3, max: 200 }),
  body('titleB').isString().trim().isLength({ min: 3, max: 200 }),
  body('platform').isIn(['tiktok','instagram','twitter','facebook','snapchat']),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
 
  try {
    const { titleA, titleB, platform } = req.body;
    const PNAMES = {tiktok:'TikTok',instagram:'Instagram',twitter:'Twitter/X',facebook:'Facebook',snapchat:'Snapchat'};
 
    const prompt = `قارن عنوانين لـ ${PNAMES[platform]}:
A: "${titleA}"
B: "${titleB}"
 
JSON فقط:
{
  "winner": "A أو B",
  "score_a": رقم_1_10,
  "score_b": رقم_1_10,
  "reason_a": "نقطة قوة A",
  "reason_b": "نقطة قوة B",
  "weakness_a": "نقطة ضعف A",
  "weakness_b": "نقطة ضعف B",
  "suggestion": "عنوان محسّن يجمع أفضل الاثنين"
}`;
 
    const data = await callAI([{ role: 'user', content: prompt }], null, 400);
    const raw = data.content?.map(c=>c.text||'').join('') || '';
    const result = safeParseJSON(raw);
    if (!result.ok) {
      return res.status(502).json({ success: false, error: 'AI returned invalid response format' });
    }
    res.json({ success: true, result: result.data });
  } catch (err) {
    next(err);
  }
});
 
module.exports = router;
