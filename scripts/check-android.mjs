import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

function readText(relPath) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`الملف المطلوب غير موجود: ${relPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function assertCheck(condition, label) {
  if (!condition) {
    throw new Error(`فشل فحص أندرويد: ${label}`);
  }
  console.log(`✓ ${label}`);
}

function main() {
  const capConfig = readText('capacitor.config.ts');
  assertCheck(
    capConfig.includes("appId: 'com.layalialward.app'"),
    'معرّف تطبيق Capacitor مضبوط على com.layalialward.app'
  );
  assertCheck(
    capConfig.includes("androidScheme: 'https'"),
    'مخطط Android WebView مضبوط على https'
  );
  assertCheck(
    capConfig.includes("webDir: 'dist'"),
    'مجلد مخرجات الويب في Capacitor مضبوط على dist'
  );

  const kotlinPlugin = readText('native/android/LayaliNearbyPlugin.kt');
  const tsBridge = readText('src/sync/capacitorBridge.ts');

  const kotlinServiceMatch = kotlinPlugin.match(/DEFAULT_SERVICE_ID\s*=\s*"([^"]+)"/);
  const tsServiceMatch = tsBridge.match(/LAYALI_NEARBY_SERVICE_ID\s*=\s*'([^']+)'/);
  assertCheck(
    Boolean(kotlinServiceMatch && tsServiceMatch && kotlinServiceMatch[1] === tsServiceMatch[1]),
    `تطابق معرّف خدمة Nearby Connections بين Kotlin وTypeScript (${tsServiceMatch?.[1] ?? 'غير موجود'})`
  );

  assertCheck(
    kotlinPlugin.includes('@CapacitorPlugin(') && kotlinPlugin.includes('name = "LayaliNearby"'),
    'تعريف الإضافة الأصلية LayaliNearby سليم في LayaliNearbyPlugin.kt'
  );
  assertCheck(
    kotlinPlugin.includes('call.getString("serviceId")'),
    'الإضافة الأصلية تقرأ serviceId القادم من طبقة TypeScript'
  );
  assertCheck(
    kotlinPlugin.includes('WindowManager.LayoutParams.FLAG_SECURE'),
    'دعم ستار الخصوصية FLAG_SECURE مفعّل في الإضافة الأصلية'
  );
  assertCheck(
    kotlinPlugin.includes('ACCESS_FINE_LOCATION') &&
      kotlinPlugin.includes('BLUETOOTH_ADVERTISE') &&
      kotlinPlugin.includes('BLUETOOTH_CONNECT') &&
      kotlinPlugin.includes('BLUETOOTH_SCAN') &&
      kotlinPlugin.includes('NEARBY_WIFI_DEVICES'),
    'تصاريح البلوتوث والموقع وNearby Wi-Fi مهيّأة في LayaliNearbyPlugin.kt'
  );

  assertCheck(
    tsBridge.includes('registerCapacitorAppUrlOpenListener') &&
      tsBridge.includes('getCapacitorLaunchUrl'),
    'التقاط روابط الدعوة Deep Links مفعّل عبر Capacitor App plugin'
  );

  const cloudCrypto = readText('src/utils/cloudCrypto.ts');
  assertCheck(
    cloudCrypto.includes('DEFAULT_PUBLIC_WEB_APP_URL') &&
      cloudCrypto.includes('buildCloudInviteShareUrl'),
    'بناء روابط المشاركة السحابية يستخدم رابط الويب العام بدل https://localhost على أندرويد'
  );

  const cloudController = readText('src/hooks/useCloudSyncController.ts');
  assertCheck(
    cloudController.includes('isCapacitorNative()') &&
      cloudController.includes('signInWithPopup'),
    'حماية مسار تسجيل الدخول على Android WebView مفعّلة في useCloudSyncController.ts'
  );

  const viteConfig = readText('vite.config.ts');
  assertCheck(
    viteConfig.includes('PRODUCTION_CSP') &&
      viteConfig.includes('https://accounts.google.com') &&
      viteConfig.includes('https://*.googleapis.com'),
    'سياسة CSP الإنتاجية تدعم نقاط نهاية Firebase وGoogle Auth'
  );

  const html = readText('index.html');
  assertCheck(
    html.includes('lang="ar"') && html.includes('dir="rtl"') && html.includes('viewport-fit=cover'),
    'تهيئة index.html للعربية RTL وحواف الشاشة الآمنة للهاتف مكتملة'
  );

  console.log('\nاكتملت جميع فحوصات تكامل Capacitor Android بنجاح.');
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
