# توثيق وخارطة طريق مشروع «ليالي الورد» (`layali-alward`)

> **آخر تحديث:** ١٧ نوفمبر ٢٠٢٦  
> **الحالة الحالية:** اكتمال **التأسيس المعماري والأمني + المزامنة السحابية التلقائية المشفّرة (AES-256-GCM) + غرفة الدردشة الحية الهجينة (بلوتوث / Wi-Fi Direct + السحابة المشفّرة)** مع التركيز الكامل على **بيئة أندرويد (Android)** والويب.  
> **المرحلة القادمة:** تحديث محتوى الأسئلة والعوالم (`src/data/gameData.ts`) ثم تطوير **الأنماط الحية الثلاثة** (`بطاقات الجرأة`، `همسات الحوار`، `تحديات المساء`).

---

## ١. التوجه العام وفلسفة المشروع

«ليالي الورد» تطبيق زوجي (Mobile-First, RTL Arabic) مصمم ليعمل **محلياً أولاً (Offline-First) على أندرويد والمتصفح** مع إتاحة **مزامنة ثنائية مرنة** تجمع بين:

1. **تحديد النسخة لمرة واحدة عند أول تشغيل (`roleConfigured`):**  
   عند تثبيت التطبيق لأول مرة، يختار المستخدم نسخته لمرة واحدة فقط (`نسخة الزوجة` أو `نسخة الزوج`) مع خطوة تأكيد نهائية واضحة تحذّر من عدم إمكانية التبديل لاحقاً من داخل التطبيق.
2. **تجربة ثنائية الأجهزة (`نسخة الزوجة` و`نسخة الزوج`):**
   - **نسخة الزوجة (`role: 'wife'`):** تلعب نمط الأسئلة الـ ٢٠ (٦٠ مستوى جرأة)، تختار وتعتمد إجاباتها، وتقرأ «القصاصة الفنية التفسيرية» مع الحفاظ على التوقيت البطيء المتدرج لظهور البطاقات (`1000ms`/`1200ms`) وخطوات القصاصة والختم الملكي، كما يمكنها **مراجعة المستويات المكتملة كبطاقات وقصاصات للقراءة فقط** أو إعادتها.
   - **نسخة الزوج (`role: 'husband'`):** يفتح نفس التطبيق بنفس الهوية البصرية، مع ملاءمة تامة للضمائر والصياغة له في كافة الشاشات (بما فيها حالات قبل/بعد المزامنة وشاشة خلاصة المستوى). وعند الدخول إلى «نمط الأسئلة» تفتح الأسئلة **محددة ومظللة تلقائياً باختيارات الزوجة المتزامنة** للقراءة والاستعراض فقط دون السماح له بتعديلها أو مسح بياناتها.
3. **العمل بدون إنترنت + الاقتران القريب المباشر لأندرويد (Bluetooth / Wi-Fi Direct):**
   - **الخطوط والأصول مدمجة بالكامل:** حُزمت خطوط `@fontsource/tajawal` و`@fontsource/baloo-bhaijaan-2` و`@fontsource/cormorant-garamond` داخل التطبيق مع إزالة أي روابط خارجية من `index.html` لضمان العمل ١٠٠٪ في وضع الطيران.
   - **الإضافة الأصلية `LayaliNearby` للأندرويد فقط:**
     - ملف كوتلن جاهز في `native/android/LayaliNearbyPlugin.kt` يعتمد على **Google Nearby Connections API** (`Strategy.P2P_POINT_TO_POINT`) مع تقسيم الحزم (`<= 16KB`) والتحقق الصريح عبر رمز اقتران رباعي وتثبيت هوية الشريك (`pairedDeviceId`) وحماية الشاشة (`FLAG_SECURE`).
     - تفعيل الاكتشاف القريب عند فتح نافذة الاقتران والمزامنة في بيئة Capacitor Android (مع إيقاف البث الخلفي عند الإغلاق قبل الاقتران)، ورفض أي اقتران بين جهازين يحملان نفس النسخة.
4. **المزامنة السحابية التلقائية المشفّرة عند توفر الإنترنت (Firebase Auth + Firestore E2EE):**
   - حفظ كافة التعديلات محلياً في خزنة مغلقة (`LWV1:v3:` مع nonce عشوائي ووسم سلامة ومفتاح جهاز محفوظ في IndexedDB) حتى بدون شبكة، مع تعليم صندوق الصادر (`pendingUpload = true`).
   - عند تسجيل الدخول بحساب Google وربط الزوجين بخزنة سحابية واحدة (`vaults/{vaultId}`) عبر روابط مجزأة (`#joinVault=`) تُمسح فوراً من شريط العنوان مع التحقق من التزام الدعوة (`joinTokenHash`/`joinProofHash`)، تُشفَّر الإجابات محلياً بمفتاح **AES-256-GCM** (`src/utils/cloudCrypto.ts`) قبل مغادرة الجهاز وتُرفع تلقائياً فور اتصال الهاتف بالإنترنت، بينما يستقبلها هاتف الزوج لحظياً عبر `onSnapshot` ويفك تشفيرها محلياً.
5. **غرفة الدردشة الحية الهجينة بين الزوجين (`ChatRoomScreen`):**
   - تعمل تلقائياً عبر **البلوتوث وWi-Fi Direct** (`LiveSessionBus`: أحداث `CHAT_MESSAGE`، `CHAT_ACK`، `CHAT_CLEAR`) في وضع عدم الاتصال، وعبر **Firestore Subcollection المشفّرة طرفياً** (`/vaults/{vaultId}/messages/{messageId}`) عند توفر الإنترنت، مع منع تكرار الرسائل عبر معرّفات فريدة (`msgId`) وتفريغ تلقائي لصندوق الصادر فور عودة الاتصال.

---

## ٢. البنية المعمارية المحدثة (`src/`)

### أ. نموذج البيانات والمحرك (`src/data/` و `src/game/`)
- **`src/data/types.ts`:**
  - `DeviceRole`: `'wife' | 'husband'`.
  - `ChatMessage` & `ChatDeliveryVia`: تمثيل رسائل الدردشة وحالات التوصيل (`'local' | 'nearby' | 'cloud' | 'hybrid'`).
  - `ModeProgressRegistry.questions`: يحتوي `{ updatedAt: number | null }` فقط (مصدر حقيقة وحيد دون تكرار `answersBySet` في أكثر من موضع).
  - `GameSettings`: يتضمن `cloudAutoSyncEnabled` و`privacyCurtainEnabled` إلى جانب الصوت والحركة والاهتزاز.
- **`src/game/engine.ts`:**
  - `lockInitialDeviceRole(progress, role, name)`: اعتماد الدور لمرة واحدة (`roleConfigured: true`) مع إمكانية التبديل الصريح الآمن من الإعدادات عبر `switchDeviceRole`.
  - `getQuestionsViewProgress(progress)`: يقرأ إجابات الزوجة المحلية أو `partnerSnapshot` للزوج دون تعديل البيانات المحلية.
  - `getPlatformProgress(progress, modes, realms)`: يوحّد حساب التقدم بين شاشتي «الأنماط» و«الملف الشخصي»، ويوفر مؤشر `partnerSynced` للزوج لتمييز التقدّم المتزامن عن التقدّم المحلي.
  - `parseStoredProgress`: ترحيل متوافق للخلف مع تنقية مفاتيح `prototype` / `__proto__` / `constructor`.
- **`src/game/reflection.ts`:** توليد القصاصة الفنية التفسيرية (`buildAnswerQissasa`) مع التمييز الدقيق بين ضمائر الزوجة وصياغة الشريكة للزوج.

### ب. طبقة الأمان والمزامنة واللعب الحي (`src/utils/` و `src/sync/`)
- **`src/utils/security.ts` & `src/components/PrivacyLockOverlay.tsx`:** قفل رمز PIN (تمديد ٢٠,٠٠٠ جولة SHA-256 وملح عشوائي مستقل `pinSalt` مع حد ٥ محاولات وقفلة ٣٠ ثانية)، وستارة الخصوصية عند الانتقال للخلفية و`FLAG_SECURE` في أندرويد، وتغليف `localStorage` (`LWV1:v3:`).
- **`src/utils/chatStorage.ts`:** تخزين الدردشة محلياً بصيغة مغلّفة (`layali_alward_chat_v1`)، دمج هجين لا يكرر الرسائل الواصلة عبر القناتين (`mergeIncomingChatMessage`)، ومؤشر `clearedAt` لمنع عودة الرسائل الممسوحة.
- **`src/utils/cloudCrypto.ts` & `src/sync/cloudSync.ts`:** تشفير وفك تشفير AES-256-GCM محلياً لكلٍ من الإجابات والرسائل، وتوليد بصمة الدعوة `deriveJoinTokenHash`، وإدارة خزنة الزوجين والمحادثات في Firestore مع تنظيف كامل للمجموعة الفرعية للرسائل عند حذف الخزنة والتحقق الصارم عبر `firestore.rules`.
- **`src/sync/protocol.ts`:** عقود حزم `HELLO` و`SYNC_ANSWERS` و`LIVE_EVENT` (بما فيها `CHAT_MESSAGE` و`CHAT_ACK` و`CHAT_CLEAR` وأحداث الألعاب الحية) و`ACK` مع تقسيم وإعادة تجميع الإطارات (`ChunkAssembler`).
- **`src/sync/liveBus.ts`:** قناة النقل المحلية `'capacitor-nearby'` مع التحقق من الدور ومنع تكرار الصدى وتثبيت هوية الجلسة النشطة `activeSessionPeerId` و`pairedDeviceId`.
- **`src/sync/capacitorBridge.ts`:** يربط `@capacitor/core` و`@capacitor/app` في أندرويد والمتصفح (`'android' | 'web'`).

### ج. الواجهات والتجربة (`src/components/` و `src/App.tsx`)
- **`src/App.tsx` و `src/components/AppErrorBoundary.tsx`:** توحيد إدارة النوافذ العائمة، تتبع حالة الشبكة، الرفع التلقائي للخزنة المشفّرة وللرسائل، الاستماع اللحظي لتحديثات الزوجة ورسائل الطرفين.
- **`src/components/ChatRoomScreen.tsx` & `src/components/BottomNavDock.tsx`:** غرفة الدردشة الحية الهجينة بخمسة تبويبات متناسقة في الشريط السفلي مع شارة للرسائل غير المقروءة.
- **`src/components/PartnerSyncModal.tsx`:** يجمع الاقتران القريب لأندرويد (Bluetooth / Wi-Fi Direct) مع المزامنة السحابية التلقائية المشفّرة بحساب Google.

---

## ٣. خطوات التصدير النهائي لبناء أندرويد (Android APK / AAB)

تم إعداد `capacitor.config.ts` والملف الأصلي للأندرويد في `native/android/`. في بيئة بها Android Studio تُنفّذ الخطوات التالية:

```bash
npm run build
npx cap add android
npx cap sync android
```
ثم يُنسخ `native/android/LayaliNearbyPlugin.kt` إلى مجلد حزمة الأندرويد ويُسجَّل مع `MainActivity` مع إضافة أذونات البلوتوث والموقع/الواي فاي القريب في `AndroidManifest.xml`.

---

## ٤. المرحلة القادمة (مؤجلة وفق توجيه المستخدم)

1. تحديث محتوى الأسئلة والعوالم في `src/data/gameData.ts`.
2. بناء **الأنماط الحية الثلاثة** (`mode-cards`، `mode-dialogue`، `mode-challenges`) فوق العقود الجاهزة في `src/sync/protocol.ts` و`LiveSessionBus`.
