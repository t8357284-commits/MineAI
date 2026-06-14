const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const app = $('#app');
const state = { token: localStorage.getItem('sp_token') || '', user: null, usage: null, page: location.hash.replace('#','') || 'home' };
const platforms = [['tiktok','تيك توك'],['instagram','إنستغرام'],['twitter','X / تويتر'],['facebook','فيسبوك'],['snapchat','سناب شات']];
const plans = {free:'مجاني',pro:'Pro',business:'Business'};
const categories = ['Restaurants', 'Real Estate', 'E-commerce', 'Education', 'News', 'Fitness', 'Beauty', 'Finance', 'Technology', 'Motivation'];
const categoriesAr = {
  'Restaurants': 'مطاعم', 'Real Estate': 'عقارات', 'E-commerce': 'تجارة إلكترونية', 'Education': 'تعليم',
  'News': 'أخبار', 'Fitness': 'لياقة بدنية', 'Beauty': 'تجميل', 'Finance': 'مالية', 'Technology': 'تقنية', 'Motivation': 'تحفيز'
};
const fmtDate = d => d ? new Date(d).toLocaleString('ar-YE') : '—';
const safe = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const toast = (msg, ok=true) => { const el=document.createElement('div'); el.className='toast '+(ok?'ok':'err'); el.textContent=msg; $('#toast').appendChild(el); setTimeout(()=>el.remove(),4500); };
async function api(path, opts={}){
  const headers = opts.headers || {};
  if (!(opts.body instanceof FormData)) headers['Content-Type']='application/json';
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(path,{...opts,headers});
  const data = await res.json().catch(()=>({}));
  if(!res.ok){ throw new Error(data.error || data.message || (data.errors&&data.errors[0]?.msg) || 'حدث خطأ غير متوقع'); }
  return data;
}
async function loadMe(){ if(!state.token) return; try{ const d=await api('/api/auth/me'); state.user=d.user; state.usage=d.usage; }catch(e){ logout(false); } }
function setPage(p){ location.hash=p; state.page=p; render(); }
function logout(msg=true){ localStorage.removeItem('sp_token'); state.token=''; state.user=null; state.usage=null; if(msg) toast('تم تسجيل الخروج'); setPage('home'); }
function nav(){
  const logged=!!state.user;
  return `<header class="topbar"><div class="container nav"><a class="brand" href="#home"><span class="logo">⚡</span><span>SocialPulse AI</span></a><div class="navlinks">
  ${logged?`<button data-page="dashboard">لوحة التحكم</button><button data-page="projects">المشاريع</button><button data-page="ai">الذكاء الاصطناعي</button><button data-page="billing">الاشتراك</button>${state.user.role==='admin'?`<button data-page="admin">الأدمن</button>`:''}<button class="ghost danger" id="logoutBtn">خروج</button>`:`<button data-page="home">الرئيسية</button><button data-page="plans">الأسعار</button><button class="primary" data-page="auth">دخول / تسجيل</button>`}
  </div></div></header>`;
}
function bindNav(){ $$('[data-page]').forEach(b=>b.onclick=()=>setPage(b.dataset.page)); const lo=$('#logoutBtn'); if(lo) lo.onclick=()=>logout(); }
function shell(content){ app.innerHTML = nav()+content+`<footer class="footer"><div class="container">SocialPulse AI © منصة عربية لإدارة المحتوى والاشتراكات اليدوية</div></footer>`; bindNav(); }
function home(){ shell(`<main class="container"><section class="hero"><div><span class="badge">جاهز للإطلاق اليدوي والمدفوعات المحلية</span><h1>أنشئ محتوى سوشيال ميديا أسرع بذكاء اصطناعي عربي.</h1><p>منصة لإدارة مشاريع المحتوى، توليد سكريبتات، تحليل الحسابات، رفع الملفات، واستقبال مدفوعات يدوية مع لوحة أدمن كاملة.</p><div class="actions"><button class="primary" data-page="auth">ابدأ الآن</button><button class="ghost" data-page="plans">شاهد الخطط</button></div></div><div class="hero-card"><div class="grid"><div class="stat"><span class="muted">توليد سكريبت</span><b>JSON</b><span class="muted">مشاهد، هاشتاقات، كابشن</span></div><div class="stat"><span class="muted">إدارة</span><b>Admin</b><span class="muted">مستخدمين ومدفوعات وسجلات</span></div><div class="stat"><span class="muted">اشتراكات</span><b>يدوية</b><span class="muted">Pro / Business</span></div></div></div></section><section class="section grid grid-3"><div class="card"><h3>واجهة مستخدم حقيقية</h3><p class="muted">دخول، تسجيل، لوحة تحكم، مشاريع، دفع، ملفات، وأدمن.</p></div><div class="card"><h3>مدفوعات محلية</h3><p class="muted">كريمي، جوالي، ون كاش، تحويل بنكي مع رفع سند.</p></div><div class="card"><h3>جاهز للتطوير</h3><p class="muted">Backend API منظم مع Prisma وPostgreSQL وCloudinary.</p></div></section></main>`); bindNav(); }
function plansPage(){ shell(`<main class="container section"><h1>الخطط والأسعار</h1><div class="grid grid-3"><div class="card"><h2>Free</h2><div class="price">0</div><p class="muted">للتجربة</p><button class="ghost" data-page="auth">ابدأ مجاناً</button></div><div class="card"><h2>Pro</h2><div class="price">9$</div><p class="muted">محتوى وطلبات أكثر</p><button class="primary" data-page="billing">طلب ترقية</button></div><div class="card"><h2>Business</h2><div class="price">29$</div><p class="muted">للشركات والفرق</p><button class="primary" data-page="billing">طلب ترقية</button></div></div></main>`); bindNav(); }
function authPage(){ shell(`<main class="auth-wrap"><div class="card auth-card"><div class="tabs"><button class="tab active" data-auth="login">دخول</button><button class="tab" data-auth="register">تسجيل</button><button class="tab" data-auth="forgot">نسيت كلمة المرور</button></div><div id="authBox"></div></div></main>`); renderAuth('login'); $$('[data-auth]').forEach(b=>b.onclick=()=>{ $$('.tab').forEach(x=>x.classList.remove('active')); b.classList.add('active'); renderAuth(b.dataset.auth); }); }
function renderAuth(mode){
  const box=$('#authBox');
  if(mode==='register') box.innerHTML=`<form class="form" id="reg"><div class="field"><label>الاسم</label><input class="input" name="name" required minlength="2"></div><div class="field"><label>البريد</label><input class="input" name="email" type="email" required></div><div class="field"><label>كلمة المرور</label><input class="input" name="password" type="password" required minlength="8"></div><button class="primary">إنشاء الحساب</button></form>`;
  else if(mode==='forgot') box.innerHTML=`<form class="form" id="forgot"><p class="muted">أدخل بريدك وسنرسل رابط استعادة كلمة المرور.</p><div class="field"><label>البريد</label><input class="input" name="email" type="email" required></div><button class="primary">إرسال الرابط</button></form>`;
  else box.innerHTML=`<form class="form" id="login"><div class="field"><label>البريد</label><input class="input" name="email" type="email" required></div><div class="field"><label>كلمة المرور</label><input class="input" name="password" type="password" required></div><button class="primary">دخول</button></form>`;
  const f=$('form',box); f.onsubmit=async e=>{ e.preventDefault(); const body=Object.fromEntries(new FormData(f)); try{ const path=mode==='register'?'/api/auth/register':mode==='forgot'?'/api/auth/forgot-password':'/api/auth/login'; const d=await api(path,{method:'POST',body:JSON.stringify(body)}); if(d.token){ state.token=d.token; localStorage.setItem('sp_token',d.token); await loadMe(); toast(d.message||'تم بنجاح'); setPage('dashboard'); } else toast(d.message||'تم إرسال الطلب'); }catch(err){ toast(err.message,false); } };
}
function requireLogin(){ if(!state.user){ setPage('auth'); return false;} return true; }
function side(active){ const items=[['dashboard','الرئيسية'],['templates','متجر القوالب'],['projects','المشاريع'],['ai','أدوات الذكاء الاصطناعي'],['scripts','السكريبتات'],['billing','الاشتراك والدفع'],['files','ملفاتي']]; if(state.user?.role==='admin') items.push(['admin','لوحة الأدمن']); return `<aside class="card sidebar">${items.map(i=>`<button class="side-btn ${active===i[0]?'active':''}" data-page="${i[0]}">${i[1]}</button>`).join('')}</aside>`; }
function pageWrap(active, inner){ shell(`<main class="container layout">${side(active)}<section class="content">${inner}</section></main>`); bindNav(); }
function dashboard(){ if(!requireLogin())return; pageWrap('dashboard',`<div class="grid"><div class="card"><h2>مرحباً، ${safe(state.user.name)}</h2><p class="muted">الخطة الحالية: <span class="pill ${state.user.plan}">${plans[state.user.plan]||state.user.plan}</span> ${state.user.planExpiresAt?`— تنتهي: ${fmtDate(state.user.planExpiresAt)}`:''}</p><p class="muted">تفعيل البريد: ${state.user.emailVerified?'✅ مفعل':'⚠️ غير مفعل'} ${!state.user.emailVerified?`<button class="ghost" id="resendVerify">إعادة إرسال التفعيل</button>`:''}</p></div><div class="stats"><div class="stat"><span class="muted">طلبات AI اليوم</span><b>${state.usage?.aiRequests||0}</b></div><div class="stat"><span class="muted">الخطة</span><b>${plans[state.user.plan]}</b></div><div class="stat"><span class="muted">الحالة</span><b>${state.user.subscriptionStatus||'inactive'}</b></div><div class="stat"><span class="muted">الدور</span><b>${state.user.role}</b></div></div><div class="grid grid-3"><button class="primary" data-page="ai">توليد محتوى الآن</button><button class="ghost" data-page="projects">إدارة المشاريع</button><button class="ghost" data-page="billing">رفع سند دفع</button></div></div>`); const rv=$('#resendVerify'); if(rv) rv.onclick=async()=>{try{const d=await api('/api/auth/resend-verification',{method:'POST'});toast(d.message)}catch(e){toast(e.message,false)}}; }
async function projectsPage(){ if(!requireLogin())return; pageWrap('projects',`<div class="grid"><div class="card"><h2>المشاريع</h2><form class="form grid grid-3" id="projectForm"><input class="input" name="title" placeholder="اسم المشروع" required minlength="2"><select name="platform" class="input">${platforms.map(p=>`<option value="${p[0]}">${p[1]}</option>`).join('')}</select><input class="input" name="description" placeholder="وصف مختصر"><button class="primary">إضافة مشروع</button></form></div><div id="projectsList" class="grid"></div></div>`); $('#projectForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/projects',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});toast('تم إنشاء المشروع'); projectsPage();}catch(err){toast(err.message,false)}}; loadProjectsList(); }
async function loadProjectsList(){ const el=$('#projectsList'); if(!el)return; try{ const d=await api('/api/projects'); el.innerHTML=d.projects.length?d.projects.map(p=>`<div class="card"><h3>${safe(p.title)}</h3><p class="muted">${safe(p.platform)} — ${safe(p.description||'')}</p><div class="actions"><button class="ghost danger" data-del-project="${p.id}">حذف</button></div></div>`).join(''):`<div class="empty">لا توجد مشاريع بعد.</div>`; $$('[data-del-project]').forEach(b=>b.onclick=async()=>{ if(!confirm('حذف المشروع؟'))return; try{await api('/api/projects/'+b.dataset.delProject,{method:'DELETE'});toast('تم الحذف');loadProjectsList();}catch(e){toast(e.message,false)}}); }catch(e){el.innerHTML=`<div class="empty">${safe(e.message)}</div>`;} }
async function aiPage(){ if(!requireLogin())return; pageWrap('ai',`<div class="grid grid-2"><div class="card"><h2>توليد سكريبت فيديو</h2><form class="form" id="genScript"><select name="platform" class="input">${platforms.map(p=>`<option value="${p[0]}">${p[1]}</option>`).join('')}</select><input class="input" name="template" placeholder="القالب: Hook فيروسي" value="Hook فيروسي"><textarea name="topic" placeholder="موضوع الفيديو" required></textarea><input class="input" name="audience" placeholder="الجمهور المستهدف"><select name="language" class="input"><option value="ar">عربي</option><option value="en">English</option><option value="mixed">مختلط</option></select><button class="primary">توليد</button></form></div><div class="card"><h2>النتيجة</h2><div id="aiResult" class="result">ستظهر النتيجة هنا...</div><div class="actions" style="margin-top:12px"><button class="ghost" id="saveScriptBtn" disabled>حفظ كسكريبت</button></div></div><div class="card"><h2>هاشتاقات</h2><form class="form" id="hashForm"><input class="input" name="topic" placeholder="الموضوع" required><select name="platform" class="input">${platforms.map(p=>`<option value="${p[0]}">${p[1]}</option>`).join('')}</select><button class="primary">اقتراح هاشتاقات</button></form></div><div class="card"><h2>تحليل حساب</h2><form class="form" id="analysisForm"><input class="input" name="handle" placeholder="username بدون @" required><select name="platform" class="input">${platforms.map(p=>`<option value="${p[0]}">${p[1]}</option>`).join('')}</select><button class="primary">تحليل</button></form></div></div>`); let lastScript=null; $('#genScript').onsubmit=async e=>{e.preventDefault(); const btn=e.submitter; btn.disabled=true; $('#aiResult').textContent='جاري التوليد...'; try{ const d=await api('/api/ai/generate-script',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))}); lastScript=d.script; $('#aiResult').textContent=JSON.stringify(d.script,null,2); $('#saveScriptBtn').disabled=false; toast('تم التوليد'); await loadMe(); }catch(err){$('#aiResult').textContent=err.message; toast(err.message,false)} finally{btn.disabled=false} };
$('#saveScriptBtn').onclick=async()=>{if(!lastScript)return; try{await api('/api/scripts',{method:'POST',body:JSON.stringify({title:lastScript.title||'سكريبت جديد',platform:$('#genScript [name=platform]').value,content:lastScript})});toast('تم حفظ السكريبت');}catch(e){toast(e.message,false)}};
$('#hashForm').onsubmit=async e=>{e.preventDefault(); try{const d=await api('/api/ai/hashtags',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))}); $('#aiResult').textContent=JSON.stringify(d,null,2);}catch(err){toast(err.message,false)}};
$('#analysisForm').onsubmit=async e=>{e.preventDefault(); try{const d=await api('/api/ai/analyze-account',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))}); $('#aiResult').textContent=d.analysis;}catch(err){toast(err.message,false)}}; }
async function scriptsPage(){ if(!requireLogin())return; pageWrap('scripts',`<div class="grid"><div class="card"><h2>السكريبتات المحفوظة</h2></div><div id="scriptsList" class="grid"></div></div>`); try{ const d=await api('/api/scripts'); $('#scriptsList').innerHTML=d.scripts.length?d.scripts.map(s=>`<div class="card"><h3>${safe(s.title)}</h3><p class="muted">${safe(s.platform)} — ${fmtDate(s.createdAt)}</p><div class="result">${safe(JSON.stringify(s.content,null,2))}</div><button class="ghost danger" data-del-script="${s.id}">حذف</button></div>`).join(''):`<div class="empty">لا توجد سكريبتات محفوظة.</div>`; $$('[data-del-script]').forEach(b=>b.onclick=async()=>{try{await api('/api/scripts/'+b.dataset.delScript,{method:'DELETE'});toast('تم الحذف');scriptsPage();}catch(e){toast(e.message,false)}}); }catch(e){toast(e.message,false)} }
async function billingPage(){ if(!requireLogin())return; pageWrap('billing',`<div class="grid grid-2"><div class="card"><h2>اشتراكك الحالي</h2><div class="kv"><b>الخطة</b><span>${plans[state.user.plan]}</span><b>الحالة</b><span>${safe(state.user.subscriptionStatus)}</span><b>ينتهي في</b><span>${fmtDate(state.user.planExpiresAt)}</span><b>ملاحظة</b><span>${safe(state.user.subscriptionNote||'—')}</span></div></div><div class="card"><h2>رفع سند دفع</h2><form class="form" id="payForm"><select name="plan" class="input"><option value="pro">Pro</option><option value="business">Business</option></select><input class="input" name="amount" type="number" step="0.01" placeholder="المبلغ" required><select name="currency" class="input"><option value="YER">YER</option><option value="SAR">SAR</option><option value="USD">USD</option></select><select name="paymentMethod" class="input"><option>كريمي</option><option>جوالي</option><option>ون كاش</option><option>تحويل بنكي</option></select><input class="input" name="transactionNumber" placeholder="رقم العملية"><input class="input" name="requestedDays" type="number" value="30"><textarea name="note" placeholder="ملاحظة اختيارية"></textarea><input class="input" name="receipt" type="file" accept="image/*,application/pdf" required><button class="primary">إرسال طلب الدفع</button></form></div><div class="card" style="grid-column:1/-1"><h2>طلبات الدفع</h2><div id="myPayments"></div></div></div>`); $('#payForm').onsubmit=async e=>{e.preventDefault(); const fd=new FormData(e.target); try{await api('/api/payments/submit',{method:'POST',body:fd,headers:{}});toast('تم إرسال طلب الدفع للمراجعة');billingPage();}catch(err){toast(err.message,false)}}; loadMyPayments(); }
async function loadMyPayments(){ try{ const d=await api('/api/payments/my'); $('#myPayments').innerHTML=d.payments.length?`<div class="table-wrap"><table class="table"><tr><th>الخطة</th><th>المبلغ</th><th>الطريقة</th><th>الحالة</th><th>السند</th><th>التاريخ</th></tr>${d.payments.map(p=>`<tr><td>${plans[p.plan]}</td><td>${p.amount} ${p.currency}</td><td>${safe(p.paymentMethod)}</td><td><span class="pill ${p.status.toLowerCase()}">${p.status}</span></td><td><a class="ghost" target="_blank" href="${safe(p.receiptImage)}">فتح</a></td><td>${fmtDate(p.createdAt)}</td></tr>`).join('')}</table></div>`:`<div class="empty">لا توجد طلبات دفع.</div>`; }catch(e){toast(e.message,false)} }
async function filesPage(){ if(!requireLogin())return; pageWrap('files',`<div class="grid"><div class="card"><h2>ملفاتي</h2><form class="form grid grid-3" id="fileForm"><input class="input" name="file" type="file" required><input class="input" name="purpose" placeholder="الغرض: عام / مشروع"><button class="primary">رفع</button></form></div><div id="filesList" class="grid grid-3"></div></div>`); $('#fileForm').onsubmit=async e=>{e.preventDefault();try{await api('/api/uploads/media',{method:'POST',body:new FormData(e.target),headers:{}});toast('تم الرفع');filesPage();}catch(err){toast(err.message,false)}}; try{const d=await api('/api/uploads/my'); $('#filesList').innerHTML=d.assets.length?d.assets.map(a=>`<div class="card preview"><h3>${safe(a.originalName)}</h3><p class="muted">${safe(a.mimeType)} — ${Math.round(a.size/1024)} KB</p>${a.mimeType.startsWith('image/')?`<img src="${safe(a.url)}">`:a.mimeType.startsWith('video/')?`<video src="${safe(a.url)}" controls></video>`:`<a class="ghost" target="_blank" href="${safe(a.url)}">فتح الملف</a>`}<a class="primary" target="_blank" href="${safe(a.url)}">عرض / تحميل</a></div>`).join(''):`<div class="empty">لا توجد ملفات.</div>`;}catch(e){toast(e.message,false)} }
async function adminPage(){ if(!requireLogin())return; if(state.user.role!=='admin') return dashboard(); pageWrap('admin',`<div class="grid"><div class="card"><h2>لوحة الأدمن</h2><div class="actions"><button class="ghost" data-admin-tab="overview">الإحصائيات</button><button class="ghost" data-admin-tab="users">المستخدمون</button><button class="ghost" data-admin-tab="payments">طلبات الدفع</button><button class="ghost" data-admin-tab="logs">Audit Logs</button></div></div><div id="adminBox"></div></div>`); $$('[data-admin-tab]').forEach(b=>b.onclick=()=>renderAdmin(b.dataset.adminTab)); renderAdmin('overview'); }
async function renderAdmin(tab){ const box=$('#adminBox'); box.innerHTML='<div class="card">جاري التحميل...</div>'; try{ if(tab==='overview'){const d=await api('/api/admin/overview'); box.innerHTML=`<div class="stats"><div class="stat"><span>المستخدمون</span><b>${d.stats.users}</b></div><div class="stat"><span>النشطون</span><b>${d.stats.activeUsers}</b></div><div class="stat"><span>المشاريع</span><b>${d.stats.projects}</b></div><div class="stat"><span>AI اليوم</span><b>${d.stats.aiRequestsToday}</b></div></div>`;} 
else if(tab==='users'){const d=await api('/api/admin/users?pageSize=100'); box.innerHTML=`<div class="card"><h2>المستخدمون</h2><div class="table-wrap"><table class="table"><tr><th>الاسم</th><th>البريد</th><th>الخطة</th><th>الدور</th><th>الحالة</th><th>إجراءات</th></tr>${d.users.map(u=>`<tr><td>${safe(u.name)}</td><td>${safe(u.email)}</td><td><span class="pill ${u.plan}">${plans[u.plan]}</span><br><span class="mini">${fmtDate(u.planExpiresAt)}</span></td><td>${u.role}</td><td>${u.isActive?'نشط':'معطل'}</td><td><div class="actions"><button class="ghost" data-sub="${u.id}">تفعيل</button><button class="ghost" data-role="${u.id}" data-current="${u.role}">${u.role==='admin'?'جعله user':'جعله admin'}</button><button class="ghost danger" data-active="${u.id}" data-current="${u.isActive}">${u.isActive?'تعطيل':'تفعيل'}</button></div></td></tr>`).join('')}</table></div></div>`; bindAdminUsers();}
else if(tab==='payments'){const d=await api('/api/payments/admin?status=PENDING'); box.innerHTML=`<div class="card"><h2>طلبات الدفع المعلقة</h2>${d.payments.length?`<div class="table-wrap"><table class="table"><tr><th>المستخدم</th><th>الخطة</th><th>المبلغ</th><th>الطريقة</th><th>السند</th><th>إجراءات</th></tr>${d.payments.map(p=>`<tr><td>${safe(p.user?.name)}<br><span class="mini">${safe(p.user?.email)}</span></td><td>${plans[p.plan]}<br>${p.requestedDays} يوم</td><td>${p.amount} ${p.currency}</td><td>${safe(p.paymentMethod)}<br>${safe(p.transactionNumber)}</td><td><a class="ghost" target="_blank" href="${safe(p.receiptImage)}">عرض</a></td><td><div class="actions"><button class="ghost success" data-approve="${p.id}">قبول</button><button class="ghost danger" data-reject="${p.id}">رفض</button></div></td></tr>`).join('')}</table></div>`:'<div class="empty">لا توجد طلبات معلقة.</div>'}</div>`; bindAdminPayments();}
else {const d=await api('/api/admin/audit-logs?pageSize=100'); box.innerHTML=`<div class="card"><h2>Audit Logs</h2><div class="table-wrap"><table class="table"><tr><th>التاريخ</th><th>الفاعل</th><th>العملية</th><th>الكيان</th><th>التفاصيل</th></tr>${d.logs.map(l=>`<tr><td>${fmtDate(l.createdAt)}</td><td>${safe(l.actor?.email||'system')}</td><td>${safe(l.action)}</td><td>${safe(l.entityType)}<br><span class="mini">${safe(l.entityId)}</span></td><td><pre class="mini">${safe(JSON.stringify(l.metadata||{},null,2))}</pre></td></tr>`).join('')}</table></div></div>`;}
}catch(e){box.innerHTML=`<div class="empty">${safe(e.message)}</div>`;} }
function bindAdminUsers(){ $$('[data-sub]').forEach(b=>b.onclick=async()=>{const plan=prompt('الخطة: pro أو business أو free','pro'); if(!plan)return; const days=prompt('المدة بالأيام','30')||'30'; try{await api(`/api/admin/users/${b.dataset.sub}/subscription`,{method:'POST',body:JSON.stringify({plan,days:Number(days),note:'تفعيل يدوي من الواجهة'})});toast('تم تحديث الاشتراك');renderAdmin('users');}catch(e){toast(e.message,false)}}); $$('[data-role]').forEach(b=>b.onclick=async()=>{try{await api(`/api/admin/users/${b.dataset.role}`,{method:'PATCH',body:JSON.stringify({role:b.dataset.current==='admin'?'user':'admin'})});toast('تم تحديث الدور');renderAdmin('users');}catch(e){toast(e.message,false)}}); $$('[data-active]').forEach(b=>b.onclick=async()=>{try{await api(`/api/admin/users/${b.dataset.active}`,{method:'PATCH',body:JSON.stringify({isActive:b.dataset.current!=='true'})});toast('تم تحديث الحالة');renderAdmin('users');}catch(e){toast(e.message,false)}}); }
function bindAdminPayments(){ $$('[data-approve]').forEach(b=>b.onclick=async()=>{try{await api(`/api/payments/admin/${b.dataset.approve}/approve`,{method:'POST',body:JSON.stringify({adminNote:'تمت الموافقة من لوحة الأدمن'})});toast('تم قبول الدفع وتفعيل الاشتراك');renderAdmin('payments');}catch(e){toast(e.message,false)}}); $$('[data-reject]').forEach(b=>b.onclick=async()=>{const adminNote=prompt('سبب الرفض','السند غير واضح')||'تم الرفض'; try{await api(`/api/payments/admin/${b.dataset.reject}/reject`,{method:'POST',body:JSON.stringify({adminNote})});toast('تم رفض الطلب');renderAdmin('payments');}catch(e){toast(e.message,false)}}); }
function resetPasswordPage(token){ shell(`<main class="auth-wrap"><div class="card auth-card"><h2>تعيين كلمة مرور جديدة</h2><form class="form" id="resetForm"><input type="hidden" name="token" value="${safe(token||'')}"><div class="field"><label>كلمة المرور الجديدة</label><input class="input" name="password" type="password" minlength="8" required></div><button class="primary">تغيير كلمة المرور</button></form></div></main>`); $('#resetForm').onsubmit=async e=>{e.preventDefault();try{const d=await api('/api/auth/reset-password',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))}); state.token=d.token; localStorage.setItem('sp_token',d.token); await loadMe(); toast(d.message||'تم تغيير كلمة المرور'); setPage('dashboard');}catch(err){toast(err.message,false)}}; }
async function verifyEmailPage(token){ shell(`<main class="auth-wrap"><div class="card auth-card"><h2>تفعيل البريد الإلكتروني</h2><p class="muted">جاري التحقق من الرابط...</p></div></main>`); try{const d=await api('/api/auth/verify-email',{method:'POST',body:JSON.stringify({token})}); state.token=d.token; localStorage.setItem('sp_token',d.token); await loadMe(); toast(d.message||'تم التفعيل'); setPage('dashboard');}catch(e){toast(e.message,false); setPage('auth')} }
async function render(){ const url=new URL(location.href); const resetToken=url.searchParams.get('resetToken')||url.searchParams.get('token'); const verifyToken=url.searchParams.get('verifyToken'); const hash=location.hash.replace('#','')||'home'; if(resetToken && (hash==='home' || location.pathname.includes('reset-password'))) return resetPasswordPage(resetToken); if(verifyToken && (hash==='home' || location.pathname.includes('verify-email'))) return verifyEmailPage(verifyToken); if(hash==='reset-password') return resetPasswordPage(resetToken); if(hash==='verify-email') return verifyEmailPage(verifyToken||resetToken); await loadMe(); const p=hash; if(p==='home')return home(); if(p==='plans')return plansPage(); if(p==='auth')return authPage(); if(p==='dashboard')return dashboard(); if(p==='templates')return templatesPage(); if(p==='projects')return projectsPage(); if(p==='ai')return aiPage(); if(p==='scripts')return scriptsPage(); if(p==='billing')return billingPage(); if(p==='files')return filesPage(); if(p==='admin')return adminPage(); home(); }

async function templatesPage() {
  if (!requireLogin()) return;
  pageWrap('templates', `
    <div class="grid">
      <div class="card">
        <h2>متجر القوالب</h2>
        <div class="filters-bar">
          <button class="filter-chip active" data-cat="">الكل</button>
          ${categories.map(c => `<button class="filter-chip" data-cat="${c}">${categoriesAr[c]}</button>`).join('')}
        </div>
        <div class="form" style="margin-bottom:20px">
          <input class="input" id="tplSearch" placeholder="بحث عن قالب...">
        </div>
      </div>
      <div id="templatesList" class="template-grid"></div>
      <div id="tplPagination" class="actions" style="justify-content:center; margin-top:20px"></div>
    </div>
    <div id="modalContainer"></div>
  `);

  let currentCat = '';
  let currentSearch = '';
  let currentPage = 1;

  const load = async () => {
    const el = $('#templatesList');
    el.innerHTML = '<div class="empty">جاري التحميل...</div>';
    try {
      const d = await api(`/api/templates?category=${currentCat}&q=${currentSearch}&page=${currentPage}`);
      el.innerHTML = d.templates.length ? d.templates.map(t => `
        <div class="card template-card">
          ${t.isPremium ? '<span class="premium-badge">PREMIUM</span>' : ''}
          <img src="${safe(t.thumbnail)}" class="template-thumb" onerror="this.src='https://placehold.co/600x400/10223b/8ea4bf?text=Template'">
          <div class="template-info">
            <span class="template-category">${categoriesAr[t.category] || t.category}</span>
            <h3 class="template-title">${safe(t.title)}</h3>
            <p class="template-desc">${safe(t.description)}</p>
            <div class="template-footer">
              <button class="primary mini" data-preview="${t.id}">معاينة</button>
              <button class="fav-btn ${t.isFavorited ? 'active' : ''}" data-fav="${t.id}">❤️</button>
            </div>
          </div>
        </div>
      `).join('') : '<div class="empty">لا توجد قوالب تطابق بحثك.</div>';
      
      renderPagination(d.pagination);
      bindTemplateEvents();
    } catch (e) { el.innerHTML = `<div class="empty">${safe(e.message)}</div>`; }
  };

  const renderPagination = (p) => {
    const pg = $('#tplPagination');
    pg.innerHTML = '';
    if (p.totalPages <= 1) return;
    for (let i = 1; i <= p.totalPages; i++) {
      const b = document.createElement('button');
      b.className = `ghost ${i === p.page ? 'active' : ''}`;
      b.textContent = i;
      b.onclick = () => { currentPage = i; load(); };
      pg.appendChild(b);
    }
  };

  const bindTemplateEvents = () => {
    $$('[data-preview]').forEach(b => b.onclick = () => showPreview(b.dataset.preview));
    $$('[data-fav]').forEach(b => b.onclick = async () => {
      try {
        const res = await api(`/api/templates/${b.dataset.fav}/favorite`, { method: 'POST' });
        b.classList.toggle('active', res.favorited);
        toast(res.message);
      } catch (e) { toast(e.message, false); }
    });
  };

  const showPreview = async (id) => {
    const mc = $('#modalContainer');
    mc.innerHTML = '<div class="modal-overlay"><div class="modal-content"><div class="modal-body">جاري التحميل...</div></div></div>';
    try {
      const { template: t } = await api(`/api/templates/${id}`);
      mc.innerHTML = `
        <div class="modal-overlay" id="tplModal">
          <div class="modal-content">
            <div class="modal-header">
              <h3>${safe(t.title)}</h3>
              <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
              <div class="template-preview-grid">
                <div>
                  <img src="${safe(t.thumbnail)}" class="preview-image" onerror="this.src='https://placehold.co/600x400/10223b/8ea4bf?text=Preview'">
                  <div class="tag-list">
                    ${t.recommendedHashtags.map(h => `<span class="tag">#${safe(h)}</span>`).join('')}
                  </div>
                </div>
                <div>
                  <span class="pill ${t.category}">${categoriesAr[t.category] || t.category}</span>
                  <p style="margin:15px 0; line-height:1.6">${safe(t.description)}</p>
                  <div class="card" style="background:rgba(0,0,0,0.2); margin-bottom:20px">
                    <h4 style="margin-top:0">هيكل السكريبت المقترح:</h4>
                    <pre class="mini">${safe(JSON.stringify(t.scriptStructure, null, 2))}</pre>
                  </div>
                  <div class="actions">
                    <button class="primary" id="cloneBtn">استخدام هذا القالب</button>
                    ${t.isPremium ? '<span class="pill pro">قالب بريميوم</span>' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      $('.modal-close').onclick = () => mc.innerHTML = '';
      $('#tplModal').onclick = (e) => { if (e.target.id === 'tplModal') mc.innerHTML = ''; };
      $('#cloneBtn').onclick = async () => {
        try {
          const res = await api(`/api/templates/${id}/clone`, { method: 'POST' });
          toast(res.message);
          setPage('scripts');
        } catch (e) { toast(e.message, false); }
      };
    } catch (e) { toast(e.message, false); mc.innerHTML = ''; }
  };

  $$('.filter-chip').forEach(b => b.onclick = () => {
    $$('.filter-chip').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    currentCat = b.dataset.cat;
    currentPage = 1;
    load();
  });

  $('#tplSearch').oninput = (e) => {
    currentSearch = e.target.value;
    currentPage = 1;
    // Debounce search
    clearTimeout(window.tplST);
    window.tplST = setTimeout(load, 500);
  };

  load();
}
window.addEventListener('hashchange',()=>render());
render();
