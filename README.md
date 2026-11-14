# نَواة | مساحة إنجازك — Native Edition 4.0

نَواة تطبيق إنتاجية عربي لإدارة المهام والتذكيرات والتركيز. يحتوي هذا المستودع على واجهة React واحدة تُبنى كتطبيق ويب، أو كتطبيق Android/iOS مستقل عبر Capacitor، أو كتطبيق سطح مكتب عبر Tauri.

## ما الذي يعمل في النسخ المستقلة؟

- كل وظائف إدارة المهام والتصنيفات والأولويات والفلاتر والبحث والإحصائيات.
- ثيم فاتح وداكن، تخطيط RTL، تخطيط متجاوب، وقائمة جانبية وتنقل للموبايل.
- إشعارات محلية أصلية على Android وiOS. يُسجّل نظام التشغيل مواعيد التذكير بدل الاعتماد على مؤقت صفحة ويب، لذلك يمكنه عرض التذكير عندما تكون الواجهة مغلقة.
- عند الضغط على إشعار الهاتف، تفتح المهمة المرتبطة به داخل التطبيق.
- على Android: إذن إشعارات النظام، قناة مستقلة للتذكيرات، صلاحية المنبهات الدقيقة، زر رجوع الهاتف، واهتزاز Haptics.
- على iOS: إشعارات محلية ومشاركة ملفات النسخ الاحتياطية.
- على سطح المكتب: إشعارات نظام التشغيل، ونافذة حفظ أصلية للنسخ الاحتياطية.
- تصدير النسخة الاحتياطية: مشاركة ملف JSON على الهاتف، واختيار مسار الحفظ على سطح المكتب.
- استيراد نسخة JSON من منتقي الملفات.
- مؤقت التركيز وسجل النشاط والإعدادات محفوظة ضمن تخزين كل تثبيت.

## المتطلبات العامة

- Node.js 20 أو أحدث (يفضّل إصدار LTS حديثًا).
- npm.
- اتصال بالإنترنت عند أول تثبيت للحزم.

## التشغيل كويب

```bash
npm install
npm start
```

بناء الويب للنشر على GitHub Pages:

```bash
npm run build
```

## تطبيق Android مستقل

المتطلبات: Android Studio، Android SDK، JDK 21، وبيئة Gradle التي يوفرها مشروع Android.

أول مرة فقط، أضف المشروع الأصلي وأيقونات نَواة وصلاحيات التنبيه:

```bash
npm install
npm run mobile:add:android
```

إنشاء APK تجريبي للتثبيت على الهاتف:

```bash
npm run mobile:android:debug
```

الملف الناتج:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

فتح المشروع في Android Studio:

```bash
npm run mobile:android
```

إنشاء Android App Bundle للنشر:

```bash
npm run mobile:android:release
```

الملف الناتج يكون `android/app/build/outputs/bundle/release/app-release.aab`. يلزم إعداد توقيع Release في Gradle قبل نشره أو توزيعه كنسخة إنتاجية.

### تنبيهات Android

- Android 13 وما بعده يتطلب موافقة المستخدم على إشعارات التطبيق.
- Android 12 وما بعده قد يتطلب السماح للتطبيق باستخدام **Alarms & reminders** حتى تعمل التذكيرات في موعدها بدقة. أضفت `SCHEDULE_EXACT_ALARM` إلى Manifest، ويعرض النظام شاشة الإذن عند الحاجة. إذا لم يمنح المستخدم الإذن، قد يحوّل النظام بعض التذكيرات إلى مواعيد تقريبية بدلًا من الدقيقة المحددة.
- أذونات النظام وتوفير الطاقة ووضع عدم الإزعاج يمكن أن تؤثر على طريقة ظهور التنبيه.

## تطبيق iPhone / iPad مستقل

يتطلب macOS وXcode. أول مرة:

```bash
npm install
npm run mobile:add:ios
npm run mobile:ios
```

يفتح الأمر الأخير مشروع iOS في Xcode. يتم توقيع التطبيق وإخراج ملف التوزيع من Xcode وفق حساب المطوّر وإعدادات التوقيع لديك. لا يمكن بناء تطبيق iOS على Linux أو Windows.

## تطبيق سطح المكتب المستقل

### Ubuntu / Linux

ثبّت Rust stable (1.90 أو أحدث) وأدوات WebView والبناء الخاصة بتوزيعتك. على Ubuntu/Debian:

```bash
sudo apt update
sudo apt install build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev patchelf libwebkit2gtk-4.1-dev
```

ثم:

```bash
npm install
npm run desktop:dev
```

لبناء حزم التثبيت:

```bash
npm run desktop:build
```

تظهر المخرجات في:

```text
src-tauri/target/release/bundle/
```

سيبني Tauri صيغ التوزيع المتاحة لنظام البناء الحالي (مثل `.deb` و`.AppImage` على Linux، وصيغ Windows/macOS عند البناء على أنظمتهما).

### Windows

ثبّت Rust مع MSVC Build Tools وWebView2، ثم شغّل `npm install` و`npm run desktop:build` من بيئة Windows.

### macOS

ثبّت Rust وXcode Command Line Tools، ثم شغّل `npm install` و`npm run desktop:build`.

## تذكيرات النظام وحدودها

- Android وiOS يستخدمان Local Notifications؛ نظام التشغيل يتولى تسليم التذكير في الموعد المحدد. لا يحتاج هذا النوع من التذكيرات إلى خادم Push أو اتصال إنترنت بعد جدولة الموعد. مع ذلك، لا يمكن ضمان التسليم إذا عطّل المستخدم إذن الإشعارات أو قيود المنبهات أو كانت إعدادات النظام تمنعها.
- iOS يحتفظ بعدد محدود من الإشعارات المجدولة؛ لذلك يجدول التطبيق أقرب 60 تذكيرًا قادمًا ويعيد ملء قائمة النظام عند فتح التطبيق أو عودته للواجهة. هذا يترك مساحة تحت حد النظام الذي يحتفظ بأقرب 64 إشعارًا. راجع [وثائق Apple حول الإشعارات المحلية](https://developer.apple.com/documentation/UIKit/UILocalNotification).
- نسخة سطح المكتب ترسل إشعار النظام عند استحقاق المهمة ما دام برنامج نَواة يعمل. إغلاق البرنامج بالكامل يوقف مؤقت فحص المواعيد في هذه النسخة.
- نسخة الويب ما زالت تستخدم إشعارات المتصفح، وقد يقيّد المتصفح المؤقتات بعد إغلاق الصفحة.

## البيانات والنسخ الاحتياطي

- البيانات محفوظة محليًا في كل تثبيت؛ لا يوجد حساب أو خادم مزامنة في هذه النسخة.
- الهاتف واللابتوب لا يتشاركان المهام تلقائيًا. استخدم تصدير JSON من الجهاز الأول ثم استيراده على الجهاز الثاني لنقل بياناتك.
- تحديث التطبيق على نفس الجهاز لا يحذف بيانات Local Storage الخاصة بالتثبيت عادةً. حذف التطبيق نفسه أو مسح بياناته قد يحذفها؛ احتفظ بنسخة احتياطية.

## معمارية المشروع

```text
src/                  React UI + task logic
src/platform/         Native runtime adapters
src/utils/            Task, reminder and validation utilities
native/android/       Android launcher and notification resources
scripts/              Native setup, build and verification scripts
src-tauri/            Tauri desktop application (Rust)
capacitor.config.json Capacitor Android/iOS settings
```

كل منصة تشارك مصدر React نفسه. `npm run build:native` يبني ملفات الواجهة بمسارات نسبية لتعمل داخل WebView المضمّن، بينما `npm run build` يحافظ على مسارات GitHub Pages للنشر كويب.

## فحوصات المشروع

```bash
npm run verify:native
npm test -- --watchAll=false
npm run build
```

اختبارات وحدات التذكيرات لا تتطلب جهاز Android/iOS. بناء APK أو برنامج سطح المكتب يحتاج SDK وأدوات البناء الأصلية على الجهاز المستهدف.
