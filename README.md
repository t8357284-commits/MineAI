# ⚡ SocialPulse AI — منصة المحتوى الذكي

> منصة SaaS احترافية لتحليل حسابات التواصل الاجتماعي وتوليد محتوى الفيديو بالذكاء الاصطناعي

---

## 📦 هيكل المشروع

```
socialpulse/
├── backend/                 # Node.js + Express API
│   ├── routes/
│   │   ├── anthropic.js     # Claude AI proxy (آمن)
│   │   ├── analytics.js     # بيانات التحليلات
│   │   ├── content.js       # القوالب والجداول
│   │   └── health.js        # Health checks
│   ├── middleware/
│   │   ├── auth.js          # API key auth
│   │   └── errorHandler.js  # Error handling
│   ├── utils/
│   │   └── logger.js        # Winston logger
│   ├── server.js            # Entry point
│   └── package.json
├── frontend/
│   └── public/
│       └── index.html       # SPA كاملة
├── nginx/
│   └── nginx.conf           # Nginx + SSL + Rate limiting
├── scripts/
│   ├── deploy.sh            # نشر تلقائي
│   └── setup-vps.sh         # إعداد VPS جديد
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🚀 النشر على السرفر

### المتطلبات
- VPS بـ Ubuntu 20.04 أو 22.04
- 1GB RAM حداً أدنى (نوصي 2GB)
- مفتاح Anthropic API من [console.anthropic.com](https://console.anthropic.com)
- دومين مربوط بـ IP السرفر (للـ SSL)

---

### الخطوة 1 — إعداد السرفر

```bash
# على السرفر الجديد (root)
wget -O setup.sh https://raw.githubusercontent.com/yourrepo/socialpulse/main/scripts/setup-vps.sh
bash setup.sh
```

أو يدوياً:
```bash
# تثبيت Docker
curl -fsSL https://get.docker.com | sh

# تثبيت Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose
```

---

### الخطوة 2 — رفع الملفات

```bash
# من جهازك المحلي
scp -r socialpulse-prod/ root@YOUR_SERVER_IP:/opt/socialpulse
ssh root@YOUR_SERVER_IP
cd /opt/socialpulse
```

أو عبر Git:
```bash
git clone https://github.com/yourrepo/socialpulse.git /opt/socialpulse
cd /opt/socialpulse
```

---

### الخطوة 3 — إعداد البيئة

```bash
cp .env.example .env
nano .env
```

عدّل هذه القيم:
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
ALLOWED_ORIGINS=https://yourdomain.com
NODE_ENV=production
```

---

### الخطوة 4 — SSL Certificate

```bash
# احصل على شهادة مجانية من Let's Encrypt
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# انسخ الشهادات
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   nginx/ssl/key.pem
```

---

### الخطوة 5 — النشر

```bash
bash scripts/deploy.sh
```

أو بدون cache:
```bash
bash scripts/deploy.sh --no-cache
```

---

### الخطوة 6 — عدّل النطاق في Nginx

```bash
nano nginx/nginx.conf
# عدّل: server_name yourdomain.com www.yourdomain.com;
# ثم أعد التشغيل:
docker-compose restart nginx
```

---

## ✅ التحقق من النجاح

```bash
# Health check
curl https://yourdomain.com/api/health

# Logs
docker-compose logs -f app
docker-compose logs -f nginx
```

---

## 🛠️ الأوامر المفيدة

```bash
# إيقاف
docker-compose down

# إعادة تشغيل
docker-compose restart app

# تحديث الكود
git pull
bash scripts/deploy.sh --no-cache

# عرض الـ containers
docker-compose ps

# استهلاك الموارد
docker stats
```

---

## 🌐 API Endpoints

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/health` | Server health |
| POST | `/api/ai/generate-script` | توليد سكريبت فيديو |
| POST | `/api/ai/analyze-account` | تحليل حساب |
| POST | `/api/ai/hashtags` | بحث هاشتاقات |
| POST | `/api/ai/hooks` | توليد hooks |
| POST | `/api/ai/caption` | كتابة كابشن |
| POST | `/api/ai/ab-test` | مقارنة عناوين |
| POST | `/api/ai/chat` | محادثة AI |
| GET | `/api/analytics/metrics/:platform` | إحصائيات المنصة |
| GET | `/api/analytics/best-times/:platform` | أفضل أوقات النشر |
| GET | `/api/content/templates/:platform` | قوالب المحتوى |

---

## 🔒 الأمان

- مفتاح Anthropic محمي في السرفر فقط (لا يُرسل للمتصفح)
- Rate limiting: 10 طلب/دقيقة للـ AI، 200 طلب/15 دقيقة عام
- Helmet.js لحماية HTTP headers
- CORS محدود بالنطاقات المسموح بها
- Non-root Docker user

---

## 📊 المنصات المدعومة

| المنصة | التحليل | التوليد | الخوارزمية |
|--------|---------|---------|------------|
| TikTok | ✅ | ✅ | ✅ |
| Instagram | ✅ | ✅ | ✅ |
| Twitter/X | ✅ | ✅ | ✅ |
| Facebook | ✅ | ✅ | ✅ |
| Snapchat | ✅ | ✅ | ✅ |

---

## 📄 License

MIT — استخدم المشروع بحرية لمشاريعك التجارية والشخصية.

---

## ✅ تحديث MVP المضاف في هذه النسخة

تمت إضافة طبقة تشغيل تجارية أولية بدون إعادة بناء المشروع:

### 1) نظام حسابات
- `POST /api/auth/register` تسجيل مستخدم جديد.
- `POST /api/auth/login` تسجيل دخول.
- `GET /api/auth/me` بيانات المستخدم والاستخدام اليومي.
- أول مستخدم يتم إنشاؤه يصبح `admin` تلقائياً.

### 2) حماية أدوات الذكاء الاصطناعي
- جميع مسارات `/api/ai/*` أصبحت تتطلب تسجيل دخول بتوكن Bearer.
- يوجد حد استخدام يومي حسب الباقة:
  - Free: 10 طلبات يومياً.
  - Pro: 100 طلب يومياً.
  - Business: 1000 طلب يومياً.

### 3) تخزين مؤقت عملي
- تمت إضافة قاعدة بيانات ملفية داخل `data/socialpulse-db.json`.
- مناسبة لإطلاق MVP وتجربة السوق.
- عند التوسع التجاري الأفضل نقلها إلى PostgreSQL.

### 4) حفظ المشاريع والسكريبتات
- `GET /api/projects`
- `POST /api/projects`
- `DELETE /api/projects/:id`
- `GET /api/scripts`
- `POST /api/scripts`
- `DELETE /api/scripts/:id`

### 5) واجهة تسجيل دخول داخل الصفحة
- تمت إضافة صندوق دخول/تسجيل سريع في الواجهة.
- بعد تسجيل الدخول يتم حفظ التوكن في المتصفح واستخدامه تلقائياً مع طلبات AI.

---

## ⚠️ ملاحظات مهمة قبل الرفع

قبل التشغيل الإنتاجي عدّل ملف `.env`:

```env
ANTHROPIC_API_KEY=ضع_مفتاحك_هنا
API_SECRET_KEY=غيّر_هذه_القيمة_إلى_سر_طويل
JWT_SECRET=غيّر_هذه_القيمة_إلى_سر_طويل_آخر
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
DATA_DIR=/app/data
```

لا تستخدم القيم الافتراضية في الإنتاج.

---

## نسبة الجاهزية بعد هذا التحديث

- كنسخة MVP قابلة للرفع والتجربة: **80% تقريباً**.
- كمنتج SaaS تجاري كامل: **60% تقريباً**.

المتبقي للنسخة التجارية الكاملة:
- PostgreSQL بدلاً من التخزين الملفي.
- لوحة Admin كاملة لإدارة المستخدمين والباقات.
- نظام دفع أو تفعيل يدوي من لوحة الإدارة.
- ربط تحليلات حقيقية من TikTok/Instagram API إن أمكن.
- اختبارات آلية CI/CD.

---

## تحديث الخطوة 1: PostgreSQL + Prisma

تم تحويل التخزين من ملف JSON محلي إلى قاعدة بيانات PostgreSQL حقيقية عبر Prisma.

### ما تمت إضافته

- `backend/prisma/schema.prisma`
- Prisma Client
- جداول: Users / Projects / Scripts / Usage
- Docker Compose يحتوي PostgreSQL
- Health readiness: `/api/health/ready`
- سكربت ترحيل البيانات القديمة من `data/socialpulse-db.json`

### تشغيل محلي عبر Docker

```bash
cp .env.example .env
# عدّل POSTGRES_PASSWORD و JWT_SECRET و ANTHROPIC_API_KEY

docker compose up -d --build
```

بعد التشغيل:

```bash
curl http://localhost:3000/api/health/ready
```

### تشغيل محلي بدون Docker

```bash
cd backend
npm install
npx prisma db push --schema=./prisma/schema.prisma
npm run dev
```

### ترحيل بيانات النسخة السابقة JSON إلى PostgreSQL

بعد تشغيل قاعدة البيانات:

```bash
cd backend
npm run db:migrate-json
```

### ملاحظة إنتاجية

في الإنتاج الأفضل لاحقاً استبدال `prisma db push` بمهاجرات رسمية:

```bash
npm run prisma:dev -- --name init
npm run prisma:migrate
```

## Step 2 — Admin Dashboard

تمت إضافة لوحة مدير أولية قابلة للتطوير:

### Backend
- `GET /api/admin/overview` إحصائيات المنصة:
  - إجمالي المستخدمين
  - المستخدمون النشطون
  - عدد المشاريع
  - عدد السكريبتات
  - طلبات الذكاء الاصطناعي اليوم
  - توزيع الخطط
- `GET /api/admin/users` عرض المستخدمين مع البحث.
- `PATCH /api/admin/users/:id` تعديل:
  - الخطة: `free | pro | business`
  - الدور: `user | admin`
  - الحالة: نشط / معطل
- Middleware جديد: `requireAdmin`.

### Frontend
- صفحة جديدة: 🛡️ لوحة المدير.
- تظهر تلقائياً فقط لحساب المدير.
- أول حساب يتم إنشاؤه في النظام يصبح `admin` تلقائياً.
- يمكن للمدير تغيير خطة المستخدم أو تعطيله أو ترقيته.

### ملاحظات مهمة
- هذه لوحة Admin MVP وليست لوحة SaaS نهائية.
- الخطوة التالية المقترحة: نظام الخطط والاشتراكات `Plans + Subscriptions + Payments`.

---

## Step 3 - التفعيل اليدوي للاشتراكات

تمت إضافة نظام اشتراكات يدوي مناسب كبداية بدون بوابة دفع:

### ما الذي أضيف؟

- حقول اشتراك جديدة في جدول المستخدمين:
  - `planStartedAt`
  - `planExpiresAt`
  - `subscriptionStatus`
  - `subscriptionNote`
- تفعيل اشتراك من لوحة المدير مباشرة.
- اختيار الخطة: Free / Pro / Business.
- تحديد مدة الاشتراك بالأيام، مثال: 30 يوم أو 365 يوم.
- إضافة ملاحظة مثل رقم الحوالة أو اسم وسيلة الدفع.
- إلغاء الاشتراك يدوياً وإرجاع المستخدم إلى الخطة المجانية.
- عند انتهاء تاريخ الاشتراك، يتم التعامل مع المستخدم كخطة مجانية في حدود الاستخدام.

### طريقة الاستخدام من لوحة المدير

1. ادخل بحساب Admin.
2. افتح لوحة المدير.
3. من جدول المستخدمين اختر الخطة والمدة.
4. اكتب ملاحظة الدفع، مثل: `كريمي - رقم العملية 12345`.
5. اضغط تفعيل.

### ملاحظة مهمة بعد تحديث Prisma

بعد رفع هذه النسخة أو تشغيلها محلياً، نفذ:

```bash
cd backend
npx prisma generate
npx prisma db push
```

أو عند استخدام Docker:

```bash
docker compose exec app npx prisma generate
docker compose exec app npx prisma db push
```


---

## Step 4 - نظام المدفوعات اليدوية وإثباتات الدفع

تمت إضافة دورة مدفوعات يدوية كاملة كبداية مناسبة للسوق اليمني والخليجي بدون بوابة دفع إلكترونية.

### للمستخدم
- صفحة جديدة: 💳 الاشتراك والدفع.
- اختيار الخطة: Pro أو Business.
- إدخال المبلغ والعملة.
- اختيار وسيلة الدفع:
  - كريمي
  - جوالي
  - ون كاش
  - تحويل بنكي
  - نقداً
- إدخال رقم العملية أو الحوالة.
- تحديد مدة الاشتراك بالأيام.
- رفع صورة السند أو ملف PDF.
- متابعة حالة الطلب: قيد المراجعة / مقبول / مرفوض.

### للأدمن
- قسم جديد داخل لوحة المدير: طلبات الدفع.
- فلترة الطلبات حسب الحالة.
- عرض السند المرفوع.
- قبول السند وتفعيل الاشتراك تلقائياً.
- رفض السند مع ملاحظة للعميل.

### Backend APIs
- `POST /api/payments/submit` رفع طلب دفع مع سند.
- `GET /api/payments/my` عرض طلبات المستخدم الحالي.
- `GET /api/payments/admin?status=PENDING` عرض طلبات الدفع للمدير.
- `POST /api/payments/admin/:id/approve` قبول الطلب وتفعيل الاشتراك.
- `POST /api/payments/admin/:id/reject` رفض الطلب.

### Prisma
تمت إضافة نموذج `Payment` وحالة `PaymentStatus`.

بعد تشغيل النسخة نفذ:

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
```

أو عبر Docker:

```bash
docker compose up -d --build
docker compose exec app npx prisma generate
docker compose exec app npx prisma db push
```

### ملاحظة إنتاجية مهمة
ملفات السندات تحفظ حالياً محلياً داخل مجلد `uploads/payment-receipts`.
هذا مناسب كبداية على VPS، لكن عند التوسع الأفضل نقلها إلى Cloudinary أو S3.

---

## ✅ تحديث الخطوة 5 — Cloudinary ورفع الملفات

تمت إضافة تخزين إنتاجي للملفات:

- رفع سندات الدفع إلى Cloudinary عند ضبط مفاتيحه.
- بقاء التخزين المحلي `/uploads` كخيار احتياطي للتجربة.
- صفحة جديدة داخل الواجهة: **ملفاتي**.
- API لرفع ملفات المستخدمين: صور، PDF، وفيديوهات قصيرة.
- حفظ بيانات الملفات في PostgreSQL عبر جدول `MediaAsset`.
- حفظ مزود السند `receiptProvider` ومعرّف Cloudinary `receiptPublicId` داخل جدول `Payment`.

### إعداد Cloudinary

أضف القيم التالية في `.env`:

```env
FILE_STORAGE=auto
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RECEIPT_MAX_MB=5
MEDIA_MAX_MB=25
```

إذا تركت مفاتيح Cloudinary فارغة سيعمل النظام محلياً على مجلد `uploads`.

### مسارات الملفات الجديدة

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/api/uploads/media` | رفع ملف للمستخدم |
| GET | `/api/uploads/my` | عرض ملفات المستخدم |

### بعد تحديث هذه النسخة

نفّذ:

```bash
cd backend
npm install
npx prisma generate --schema=./prisma/schema.prisma
npx prisma db push --schema=./prisma/schema.prisma
```

أو عبر Docker:

```bash
docker-compose build --no-cache app
docker-compose up -d
```

---

## ✅ التحديث النهائي — استعادة كلمة المرور + البريد الإلكتروني + Audit Logs

تمت إضافة ثلاث طبقات إنتاجية مهمة قبل الإطلاق:

### 1) استعادة كلمة المرور
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- إنشاء Token آمن لمدة ساعة واحدة.
- تعطيل كل روابط الاستعادة القديمة بعد نجاح تغيير كلمة المرور.
- صفحة الواجهة تتعامل تلقائياً مع الرابط: `/?resetToken=...`.

### 2) تفعيل البريد الإلكتروني وإرسال الإشعارات
- إرسال رابط تفعيل البريد عند التسجيل.
- `POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
- إرسال إشعار عند قبول الدفع وتفعيل الاشتراك.
- إذا لم تضبط SMTP يعمل النظام بدون توقف، ويكتب تنبيه في السجلات فقط.

أضف هذه القيم إلى `.env`:

```env
APP_BASE_URL=https://yourdomain.com
MAIL_FROM=SocialPulse AI <no-reply@yourdomain.com>
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

يمكن استخدام Resend SMTP أو SendGrid SMTP أو Mailgun أو أي مزود SMTP.

### 3) Audit Logs
تمت إضافة جدول `AuditLog` وتسجيل العمليات الحساسة، مثل:
- إنشاء حساب جديد.
- نجاح/فشل تسجيل الدخول.
- طلب استعادة كلمة المرور.
- إكمال تغيير كلمة المرور.
- إرسال/تفعيل البريد.
- تعديل المستخدم من الأدمن.
- تفعيل/إلغاء الاشتراك يدوياً.
- رفع سند دفع.
- قبول/رفض سند الدفع.

داخل لوحة المدير تمت إضافة قسم: **سجل النشاطات Audit Logs**.

### مسارات الأدمن الجديدة

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/admin/audit-logs` | عرض آخر نشاطات النظام |

### بعد تشغيل هذه النسخة

نفّذ:

```bash
cd backend
npm install
npx prisma generate --schema=./prisma/schema.prisma
npx prisma db push --schema=./prisma/schema.prisma
npm start
```

أو عبر Docker:

```bash
docker-compose build --no-cache app
docker-compose up -d
docker-compose exec app npx prisma generate --schema=./prisma/schema.prisma
docker-compose exec app npx prisma db push --schema=./prisma/schema.prisma
```

> ملاحظة: أول مستخدم يسجل في النظام يصبح Admin تلقائياً كما في النسخ السابقة.

## تحديث الواجهة الأمامية النهائية

تمت إضافة Frontend حقيقي بدون خطوة بناء إضافية داخل `frontend/public`، ويعمل مباشرة من Express كـ Single Page Application.

الصفحات المتوفرة:
- الرئيسية والأسعار.
- تسجيل / دخول / نسيت كلمة المرور.
- لوحة المستخدم.
- إدارة المشاريع.
- أدوات الذكاء الاصطناعي لتوليد السكريبتات والهاشتاقات وتحليل الحساب.
- السكريبتات المحفوظة.
- الاشتراك والدفع اليدوي ورفع السند.
- ملفاتي لرفع الصور وملفات PDF والفيديوهات القصيرة.
- لوحة الأدمن: إحصائيات، مستخدمون، تفعيل اشتراكات، قبول/رفض المدفوعات، Audit Logs.

ملاحظات مهمة قبل النشر:
- روابط البريد الحالية تستخدم `?resetToken=` و `?verifyToken=` وهي مدعومة من الواجهة.
- أول مستخدم يتم تسجيله يصبح Admin تلقائياً حسب منطق الباكند.
- لا تحتاج `npm run build` للواجهة لأنها Static جاهزة.

---

## ✅ تحديث جديد — استوديو التعليق الصوتي AI Voice Over Studio

تمت إضافة وحدة كاملة لتوليد التعليق الصوتي بالذكاء الاصطناعي باستخدام مزودين:

- **ElevenLabs** — صوت متعدد اللغات (`eleven_multilingual_v2`) يدعم العربية والإنجليزية.
- **PlayHT** — توليد صوت عبر `PlayHT2.0` بصيغة MP3.

### الميزات
- توليد تعليق صوتي من نص السكريبت.
- أصوات عربية وإنجليزية، ذكر وأنثى.
- تحميل الملف الناتج بصيغة MP3.
- معاينة الصوت داخل المتصفح قبل التحميل.
- سجل كامل لكل عمليات التوليد (ناجحة، فاشلة، قيد المعالجة).

### نماذج Prisma الجديدة
- `VoiceJob` — يمثل طلب التوليد (المزود، الصوت، اللغة، الجنس، النص، الحالة).
- `GeneratedAudio` — يمثل الملف الصوتي الناتج (الرابط، الصيغة، الحجم) ومرتبط بـ `VoiceJob` عبر علاقة 1:1.

### مسارات API الجديدة

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/voice/voices` | عرض قائمة الأصوات المتاحة (يمكن تصفيتها بـ `provider` و`language` و`gender`) |
| POST | `/api/voice/generate` | توليد تعليق صوتي جديد من نص |
| GET | `/api/voice/history` | عرض سجل التوليد للمستخدم (مع ترقيم صفحات) |
| GET | `/api/voice/:id` | عرض تفاصيل مهمة توليد محددة |
| DELETE | `/api/voice/:id` | حذف مهمة توليد من السجل |

### إعداد مفاتيح المزودين

أضف القيم التالية إلى `.env`:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key
PLAYHT_API_KEY=your_playht_api_key
PLAYHT_USER_ID=your_playht_user_id
```

> إذا لم يتم ضبط مفاتيح أحد المزودين، يبقى النظام يعمل، وسيتم رفض طلبات التوليد لذلك المزود فقط برسالة `503` واضحة، بينما يبقى المزود الآخر يعمل بشكل طبيعي.

### كتالوج الأصوات
قائمة الأصوات (Voice IDs) لكل مزود/لغة/جنس موجودة في `backend/config/voices.js`. يمكنك استبدال أي `voiceId` بصوت مستنسخ (Cloned Voice) أو صوت مميز من حسابك الخاص في ElevenLabs أو PlayHT دون الحاجة لتعديل أي مسار API أو واجهة.

### تخزين الملفات الصوتية
يتم رفع ملفات MP3 الناتجة باستخدام نفس آلية التخزين المستخدمة للملفات الأخرى (`backend/utils/storage.js`):
- تُحفظ على Cloudinary تلقائياً إذا كانت مفاتيحه مضبوطة (`resource_type: video`، وهو ما يستخدمه Cloudinary للملفات الصوتية).
- وإلا تُحفظ محلياً داخل `uploads/voice-overs`.

### الواجهة الأمامية
صفحة جديدة في القائمة الجانبية: **استوديو التعليق الصوتي**، وتشمل:
- نموذج لاختيار المزود، اللغة، الجنس، الصوت، وكتابة النص.
- مشغّل صوت لمعاينة النتيجة فوراً.
- زر تحميل MP3.
- سجل كامل لكل الأصوات المولّدة مع إمكانية الحذف.

### بعد تشغيل هذه النسخة

نفّذ:

```bash
cd backend
npm install
npx prisma generate --schema=./prisma/schema.prisma
npx prisma db push --schema=./prisma/schema.prisma
npm start
```

أو عبر Docker:

```bash
docker-compose build --no-cache app
docker-compose up -d
docker-compose exec app npx prisma generate --schema=./prisma/schema.prisma
docker-compose exec app npx prisma db push --schema=./prisma/schema.prisma
```

