# نَواة | Nawa — دليل التطوير والإطلاق (v5.1.0)

نَواة تطبيق إنتاجية عربي لإدارة المهام والتذكيرات وجلسات التركيز. هذا المستودع يشغّل واجهة React واحدة، ويستخدم Vite للبناء، ثم يغلّف نفس الواجهة كـ PWA للويب، أو كتطبيق Android/iOS عبر Capacitor، أو كتطبيق سطح مكتب عبر Tauri.

> **مهم:** البيانات محلية في كل تثبيت. لا توجد في هذه النسخة حسابات مستخدمين أو قاعدة بيانات سحابية أو مزامنة تلقائية بين الأجهزة. كذلك لا يوجد خادم Web Push لإرسال إشعارات الويب بعد إغلاق المتصفح.

---

## 1. الوظائف الحالية

- إدارة المهام: إضافة، تعديل، حذف، تكرار، إكمال وإعادة فتح.
- تصنيفات وأولويات ومواعيد إنجاز وتذكيرات مستقلة.
- البحث والفرز وفلاتر: الكل، اليوم، القادمة، المتأخرة، والمكتملة.
- لوحة إحصائيات وسجل نشاط أسبوعي.
- مؤقت تركيز مع حفظ حالته محليًا واستعادتها.
- ثيم فاتح وداكن، واجهة عربية RTL، وتخطيط متجاوب.
- مركز تنبيهات داخل التطبيق، وعدّاد لغير المقروء، وفتح المهمة المرتبطة بالتنبيه وتأجيل التذكير.
- استيراد وتصدير نسخة JSON من المهام.
- PWA قابلة للتثبيت مع Service Worker وتخزين مسبق لملفات الواجهة.
- تكامل Native للإشعارات المحلية والاهتزاز ومشاركة الملفات على الهاتف، وإشعارات النظام ونوافذ الملفات على سطح المكتب.

### أبرز تغييرات 5.1.0

- نقل أداة البناء من Create React App إلى Vite، مع الإبقاء على React وCapacitor وTauri.
- فصل إعدادات مسارات الويب عن مسارات WebView، وإصلاح مسارات الأيقونات والخطوط لتعمل في Vercel ونسخ Native.
- إصلاح إنشاء قنوات إشعارات Android عند تفعيل الاهتزاز أو إيقافه.
- إزالة حقول إشعار غير مدعومة، وعدم تمرير خيارات Android الخاصة إلى iOS.
- إضافة فحص وطلب صلاحية Alarms & reminders في Android عند دعم الإضافة.
- إضافة اختبارات مباشرة لمسار جدولة إشعارات Android وصلاحية المنبهات الدقيقة.
- إصلاح اختبار iOS الذي كان يعتمد على متغير وقت خارج نطاقه.
- توحيد رقم الإصدار في ملفات الويب وTauri وCargo، وإعادة كتابة دليل التطوير والنشر.

## 2. المتطلبات العامة

| الأداة | المتطلب |
|---|---|
| Node.js | `22.12.0` أو أحدث ضمن الإصدار الرئيسي 22 |
| npm | 10 أو أحدث |
| Git | مستحسن لإدارة التعديلات |

إصدار Node محدد في `.nvmrc`، كما أن `package.json` يتحقق من نطاق الإصدار المدعوم بواسطة Vite الحالي.

### تجهيز Node على Arch Linux

إن كنت تستخدم `nvm`:

```bash
nvm install 22
nvm use 22
node --version
npm --version
```

أو استخدم مدير إصدارات Node الذي تفضله، بشرط توفير Node 22.12 أو أحدث.

### تثبيت الاعتماديات

من جذر المشروع:

```bash
npm install
```

عند أول تثبيت، أضف ملف `package-lock.json` الناتج إلى Git حتى تصبح عمليات التثبيت القادمة قابلة للتكرار:

```bash
git add package-lock.json
```

لا تستخدم `npm audit fix --force` بصورة عمياء؛ قد يفرض تحديثات رئيسية غير متوافقة. افحص التفاصيل أولًا:

```bash
npm audit
```

إذا ظهر تحذير حول install scripts، راجع اسم الحزمة والسكربت قبل الموافقة عليه. لا توافق على سكربت لمجرد إسكات التحذير.

---

## 3. التطوير المحلي واختبارات الجودة

### تشغيل خادم التطوير

```bash
npm run dev
```

يفتح Vite على:

```text
http://localhost:1420
```

ويمكن استخدام الأمر المختصر التالي أيضًا:

```bash
npm start
```

### فحوصات المشروع

```bash
npm run verify:native
npm run test:ci
npm run build:web
npm run build:native
```

- `verify:native`: يتحقق من وجود ملفات المنصات وإعدادات Capacitor/Tauri وتطابق المعرّفات والإصدارات.
- `test:ci`: يشغّل اختبارات Vitest مرة واحدة دون وضع المراقبة.
- `build:web`: يبني نسخة الويب بمسارات مناسبة للنشر على الدومين.
- `build:native`: يبني نفس الواجهة بمسارات نسبية لتضمينها داخل WebView في الهاتف أو سطح المكتب.

لم يرفق المشروع ملف lock موحّدًا عند تسليم هذه النسخة. لذلك يجب تشغيل `npm install` في بيئة التطوير، ثم حفظ `package-lock.json` الناتج في Git. لا تعتبر اجتياز فحص الإعدادات وحده بديلًا عن تشغيل الاختبارات والبناء على جهازك.

---

## 4. نشر نسخة الويب على Vercel

المشروع يستخدم Vite الآن، وليس Create React App.

إعدادات المشروع في Vercel:

| الإعداد | القيمة |
|---|---|
| Framework Preset | Vite |
| Install Command | `npm install` |
| Build Command | `npm run build:web` |
| Output Directory | `build` |
| Node.js Version | `22.x` |

ملف `vercel.json` يحتوي على أمر البناء ومجلد الإخراج وترويسات إعادة التحقق لملف Service Worker وملف Manifest.

قبل النشر، اختبر البناء محليًا:

```bash
npm run build:web
npm run preview
```

افتح عنوان المعاينة الذي يطبعه Vite وتأكد من تحميل CSS والخطوط والصور. بعد ذلك ارفع المشروع إلى GitHub واربط المستودع بـ Vercel.

### تثبيت PWA للمستخدمين

- **Android:** يفتح المستخدم رابط الموقع في متصفح يدعم تثبيت PWA، ثم يختار Install app أو Add to Home Screen بحسب المتصفح.
- **iPhone/iPad:** يفتح الموقع في Safari، ثم Share → Add to Home Screen.
- يجب نشر نسخة الإنتاج عبر HTTPS حتى يعمل Service Worker والتثبيت بصورة صحيحة.

### حدود إشعارات الويب

نسخة الويب تستخدم Notification API ومؤقتات الصفحة لفحص المواعيد. قد يقيّد المتصفح هذه المؤقتات عندما تنتقل الصفحة للخلفية، ولا يمكن اعتبار التنبيهات مضمونة بعد إغلاق المتصفح أو التطبيق بالكامل. يحتوي Service Worker على معالج لحدث Push، لكن هذا المستودع لا ينشئ اشتراكات Push ولا يتضمن خادمًا يرسل الرسائل؛ لذلك لا توجد خدمة Web Push مكتملة في هذه النسخة.

### حدود بيانات PWA

تُخزن المهام في Local Storage على نفس المتصفح/الأصل. تثبيت PWA على هاتف آخر لا ينقل بيانات الهاتف الأول. استخدم تصدير JSON ثم استيراده يدويًا لنقل المهام.

---

## 5. تطبيق Android مستقل

### المتطلبات

- Android Studio وAndroid SDK.
- JDK 21 متوافق مع إعدادات Android Gradle Plugin المستخدمة.
- إعداد متغيرات Android SDK في البيئة أو داخل Android Studio.

### إضافة مشروع Android لأول مرة

نفّذ الأمر مرة واحدة من جذر المشروع:

```bash
npm run mobile:add:android
```

ينشئ Capacitor مجلد `android/`، ثم ينسخ إعدادات أيقونة نَواة وأيقونة الإشعار وصلاحيات الإشعارات والمنبهات.

### مزامنة تغييرات الواجهة مع Android

```bash
npm run mobile:sync
```

### تشغيل التطبيق من Android Studio

```bash
npm run mobile:android
```

### إنشاء APK للتجربة

```bash
npm run mobile:android:debug
```

المخرج:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### إنشاء Android App Bundle

```bash
npm run mobile:android:release
```

المخرج:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

يجب إعداد توقيع Release ومفاتيح النشر بشكل آمن قبل إرسال AAB إلى Google Play. لا تضع keystore أو كلمات مروره في Git.

### تذكيرات Android

- يطلب التطبيق إذن `POST_NOTIFICATIONS` على إصدارات Android التي تتطلب موافقة المستخدم.
- يستخدم التطبيق Local Notifications لجدولة التذكيرات على نظام التشغيل بدل الاعتماد على مؤقت JavaScript داخل الصفحة.
- قد يحتاج Android إلى إذن Alarms & reminders للسماح بمواعيد دقيقة. يوضح قسم الإعدادات حالة صلاحية التنبيهات الدقيقة ويوفر فتح صفحة إعداداتها عند دعم إصدار الإضافة ذلك.
- إذا لم يمنح المستخدم إذن التنبيهات أو المنبهات الدقيقة، أو فرض النظام قيودًا على الطاقة، فقد لا يصل التذكير في الثانية المحددة. لا تعد المستخدم بتسليم مضمون في كل ظروف النظام.
- جدولة التذكيرات يعاد تحديثها عند تعديل المهام أو إكمالها أو حذفها، وعند عودة التطبيق إلى الواجهة.

---

## 6. تطبيق iOS مستقل

يتطلب بناء iOS جهاز macOS مع Xcode؛ لا يمكن إنشاء تطبيق iOS نهائي من Arch Linux أو Windows وحدهما.

على جهاز Mac، أضف المنصة أول مرة:

```bash
npm run mobile:add:ios
npm run mobile:ios
```

يفتح الأمر مشروع Xcode. اضبط Team وBundle Signing وملف التوقيع ثم ابنِ ووزّع التطبيق من Xcode.

يحتفظ التطبيق بأقرب 60 تذكيرًا قادمًا في قائمة إشعارات iOS ويعيد مزامنتها عند فتح التطبيق أو عودته إلى الواجهة. قد تتأثر الإشعارات بإعدادات المستخدم والنظام.

---

## 7. تطبيق سطح المكتب عبر Tauri

### Arch Linux

تثبيت متطلبات النظام الخاصة ببناء Tauri:

```bash
sudo pacman -Syu
sudo pacman -S --needed \
  webkit2gtk-4.1 \
  base-devel \
  curl \
  wget \
  file \
  openssl \
  appmenu-gtk-module \
  libappindicator-gtk3 \
  librsvg \
  xdotool \
  rustup
```

جهّز Rust stable:

```bash
rustup default stable
rustc --version
cargo --version
```

يشترط المشروع Rust 1.90 أو أحدث بسبب إصدار Tauri الحالي.

### تشغيل نسخة سطح المكتب أثناء التطوير

```bash
npm run desktop:dev
```

### بناء AppImage على Linux

```bash
npm run desktop:build:appimage
```

المخرجات تكون داخل:

```text
src-tauri/target/release/bundle/appimage/
```

يمكن بناء حزم Tauri المتاحة للنظام الحالي باستخدام:

```bash
npm run desktop:build
```

إشعارات نسخة سطح المكتب في هذا الإصدار تُرسل ما دام برنامج نَواة يعمل. لا توجد خدمة خلفية أو جدولة Rust مستقلة تضمن تذكيرًا بعد إغلاق البرنامج بالكامل.

### Windows وmacOS

ابنِ التطبيق على نظام التشغيل المستهدف مع متطلبات Tauri الخاصة به. بناء macOS يتطلب Xcode، وبناء Windows يتطلب أدوات MSVC وWebView2. لا تعتمد على ملف Linux الناتج كبديل لحزم الأنظمة الأخرى.

---

## 8. البيانات والنسخ الاحتياطي والخصوصية

- المهام، الثيم، إعدادات الإشعارات، سجل التنبيهات ومؤقت التركيز محفوظة محليًا على الجهاز.
- لا يوجد خادم مركزي ولا تسجيل دخول ولا مزامنة تلقائية بين الأجهزة.
- نسخة JSON الحالية تحفظ قائمة المهام فقط؛ لا تتضمن إعدادات التطبيق أو سجل التنبيهات أو حالة مؤقت التركيز.
- الاستيراد يستبدل قائمة المهام الحالية بعد تأكيد المستخدم. صدّر نسخة من بياناتك قبل الاستيراد عند الحاجة.
- حذف التطبيق أو مسح بياناته قد يؤدي إلى فقدان البيانات المحلية. احتفظ بنسخ احتياطية منتظمة.

---

## 9. هيكل المشروع

```text
.
├── index.html                 # Vite HTML entry
├── public/                    # PWA manifest, icons, fonts, service worker
├── src/
│   ├── components/            # React UI components
│   ├── data/                  # Default categories and app constants
│   ├── hooks/                 # Task, notification and PWA state
│   ├── platform/              # Capacitor / Tauri runtime adapters
│   ├── utils/                 # Task, reminder and validation logic
│   ├── assets/fonts/          # Font files processed by Vite
│   ├── App.js
│   ├── index.js
│   └── serviceWorkerRegistration.js
├── native/android/            # Android launcher and notification assets
├── scripts/                   # Native setup, build and verification
├── src-tauri/                 # Tauri desktop shell and Rust source
├── capacitor.config.json
├── vite.config.mjs
├── vercel.json
└── package.json
```

### إرشادات عند تعديل المشروع

1. ضع منطق المهام والتحقق من البيانات في `src/utils/` واكتب له اختبارات.
2. ضع تكاملات النظام في `src/platform/nativeRuntime.js`، ولا تستدعِ Capacitor/Tauri APIs مباشرة من المكونات إلا عند الضرورة.
3. عند إضافة صلاحية أو plugin جديد، حدّث إعداد Capacitor أو Tauri وملف `scripts/verify-native-setup.mjs` والتوثيق.
4. عند تغيير ملفات PWA الثابتة أو استراتيجية التخزين المؤقت، ارفع رقم `CACHE_NAME` في `public/service-worker.js` لإبطال الكاش القديم.
5. حافظ على تطابق الإصدار بين `package.json` و`src-tauri/tauri.conf.json` و`src-tauri/Cargo.toml`.
6. اختبر نسخة الويب ونسخة Native؛ نجاح بناء Vite وحده لا يثبت أن صلاحيات Android أو Xcode أو Rust تعمل.

---

## 10. أوامر سريعة

| المهمة | الأمر |
|---|---|
| تشغيل الويب محليًا | `npm run dev` |
| فحص إعدادات المشروع | `npm run verify:native` |
| تشغيل الاختبارات | `npm run test:ci` |
| بناء الويب | `npm run build:web` |
| بناء ملفات Native المشتركة | `npm run build:native` |
| إضافة Android أول مرة | `npm run mobile:add:android` |
| مزامنة Android/iOS | `npm run mobile:sync` |
| APK تجريبي | `npm run mobile:android:debug` |
| Android AAB | `npm run mobile:android:release` |
| تشغيل Desktop | `npm run desktop:dev` |
| بناء AppImage | `npm run desktop:build:appimage` |

