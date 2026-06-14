# 🚀 SocialPulse AI — دليل النشر الكامل

## المتطلبات على السيرفر (VPS)

```bash
# Docker + Docker Compose V2
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
```

---

## 1️⃣ رفع المشروع

```bash
# على جهازك المحلي
scp -r socialpulse-v2/ user@YOUR_VPS_IP:/opt/socialpulse

# أو عبر Git
ssh user@YOUR_VPS_IP
git clone https://github.com/youruser/socialpulse.git /opt/socialpulse
cd /opt/socialpulse
```

---

## 2️⃣ إعداد بيئة التشغيل

```bash
cd /opt/socialpulse
cp .env.example .env
nano .env   # أو vim .env
```

**المتغيرات الإلزامية:**

| المتغير | الوصف | مثال |
|---------|-------|-------|
| `DOMAIN` | النطاق بدون https:// | `socialpulse.app` |
| `POSTGRES_PASSWORD` | كلمة مرور قاعدة البيانات | مولّدة عشوائياً |
| `JWT_SECRET` | مفتاح JWT (≥ 32 حرف) | `openssl rand -hex 32` |
| `API_SECRET_KEY` | مفتاح API (≥ 32 حرف) | `openssl rand -hex 32` |
| `ANTHROPIC_API_KEY` | مفتاح Anthropic | من console.anthropic.com |

```bash
# توليد مفاتيح آمنة
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # API_SECRET_KEY
openssl rand -hex 24   # POSTGRES_PASSWORD
```

---

## 3️⃣ ربط Cloudinary

1. سجّل في [cloudinary.com](https://cloudinary.com) (مجاني: 25 GB)
2. من Dashboard → Settings → API Keys
3. أضف في `.env`:
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxx
FILE_STORAGE=auto
```

---

## 4️⃣ ربط SMTP (البريد الإلكتروني)

### Resend (موصى به — مجاني حتى 3000 رسالة/شهر)
```
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxx
MAIL_FROM=SocialPulse <no-reply@yourdomain.com>
```

### Gmail App Password
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx   # App Password من Google Account
```

---

## 5️⃣ ربط النطاق (Domain)

في لوحة إدارة النطاق (Namecheap / Cloudflare / GoDaddy):

```
A Record:   @    →  YOUR_VPS_IP
A Record:   www  →  YOUR_VPS_IP
```

انتظر 5-30 دقيقة لانتشار DNS ثم تحقق:
```bash
dig +short yourdomain.com
```

---

## 6️⃣ إصدار SSL (أول مرة فقط)

```bash
cd /opt/socialpulse
chmod +x scripts/init-ssl.sh

# أضف بريدك لإشعارات Let's Encrypt
echo "LETSENCRYPT_EMAIL=admin@yourdomain.com" >> .env

./scripts/init-ssl.sh
```

> **ملاحظة:** السكريبت يبدأ بـ `--staging` (شهادة تجريبية). بعد التأكد من النجاح، عدّل السكريبت وأزل `--staging` للحصول على شهادة حقيقية.

---

## 7️⃣ النشر

```bash
./scripts/deploy.sh
```

---

## 8️⃣ التحقق

```bash
# فحص صحة الحاويات
docker compose ps

# السجلات
docker compose logs -f app
docker compose logs -f nginx

# فحص API
curl https://yourdomain.com/api/health/ping

# فحص SSL
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## تجديد SSL التلقائي

خدمة `certbot` في `docker-compose.yml` تجدد الشهادة تلقائياً كل 12 ساعة (تُجدّد فقط إن بقي أقل من 30 يوم).

---

## Prisma Migrations

```bash
# تشغيل الـ migrations (يتم تلقائياً عند بدء التطبيق)
docker compose exec app sh -c "cd backend && npx prisma migrate deploy --schema=./prisma/schema.prisma"

# عرض حالة الـ migrations
docker compose exec app sh -c "cd backend && npx prisma migrate status --schema=./prisma/schema.prisma"

# فتح Prisma Studio (للتطوير فقط)
docker compose exec app sh -c "cd backend && npx prisma studio --schema=./prisma/schema.prisma"
```

---

## الأمان — ملاحظات مهمة

- ✅ كلمات المرور مشفرة بـ **bcrypt** (12 rounds)
- ✅ JWT مع `exp`, `nbf`, `iat` وتحقق صارم من التوقيع
- ✅ حماية timing attacks في تسجيل الدخول
- ✅ HSTS + TLS 1.2/1.3 فقط
- ✅ Rate limiting على auth/AI endpoints
- ✅ Non-root Docker user
- ✅ Security headers كاملة
