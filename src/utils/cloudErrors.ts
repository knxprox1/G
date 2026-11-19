const SAFE_ARABIC_PREFIXES = [
  'رمز الربط السحابي غير صالح',
  'حجم الإجابات يتجاوز',
  'طول الرسالة يتجاوز',
  'معرّف الرسالة غير صالح',
  'يرجى تسجيل الدخول',
  'يرجى التأكّد',
  'يُرجى ',
  'يتطلب تبديل الخزنة',
  'يتطلب الربط السحابي',
  'يتطلب تسجيل الدخول عبر Google',
  'الخزنة الحالية مرتبطة',
  'هذا الحساب مرتبط بالفعل',
  'تعذّر الوصول إلى هذه الخزنة',
  'تعذّر الانضمام إلى الخزنة السحابية',
  'تعذّر تسجيل الدخول',
  'تعذّر إرسال البيانات القريبة',
  'المتصفح منع نافذة تسجيل الدخول',
  'تعذّر إتمام المزامنة السحابية',
  'تم إنهاء الخزنة السحابية',
  'انتهت مهلة',
  'انقطع الاتصال',
];

function extractInnerErrorText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: unknown };
      if (typeof parsed.error === 'string' && parsed.error.trim()) {
        return parsed.error.trim();
      }
    } catch {
      // Fall back to raw text inspection
    }
  }
  return trimmed;
}

/**
 * Translates internal FirestoreErrorInfo JSON payloads or Firebase error codes
 * into safe, user-facing Arabic messages without exposing UIDs, emails, or DB paths.
 */
export function formatCloudErrorMessage(
  error: unknown,
  fallback = 'تعذّر إتمام المزامنة السحابية الآن؛ يرجى المحاولة مجدداً.',
  context: 'default' | 'join' = 'default'
): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (!raw) return fallback;

  if (SAFE_ARABIC_PREFIXES.some((prefix) => raw.startsWith(prefix))) {
    return raw;
  }

  const inner = extractInnerErrorText(raw);
  const lower = inner.toLowerCase();

  if (
    lower.includes('permission-denied') ||
    lower.includes('missing or insufficient permissions')
  ) {
    if (context === 'join') {
      return 'تعذّر الانضمام إلى الخزنة السحابية: قد تكون الخزنة مكتملة بطرفين بالفعل، أو مسجّلة على نفس النسخة (الزوج/الزوجة)، أو مُنشأة بهذا الحساب نفسه، أو أن رمز الدعوة غير صحيح.';
    }
    return 'تعذّر الوصول إلى هذه الخزنة السحابية بهذا الحساب؛ يرجى التأكّد من تسجيل الدخول بالحساب المرتبط بالخزنة أو إنشاء ربط جديد.';
  }

  if (lower.includes('quota exceeded') || lower.includes('resource-exhausted')) {
    return 'تم بلوغ الحد اليومي المؤقت لخدمة المزامنة السحابية؛ ستتوفر المحاولة تلقائياً عند تجدّد الحصة.';
  }

  if (
    lower.includes('unavailable') ||
    lower.includes('client is offline') ||
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('deadline-exceeded')
  ) {
    return 'تعذّر الاتصال بالخزنة السحابية حالياً؛ يرجى التأكّد من اتصال الهاتف بالإنترنت والمحاولة مجدداً.';
  }

  if (lower.includes('unauthenticated')) {
    return 'انتهت جلسة تسجيل الدخول؛ يرجى تسجيل الدخول بحساب Google مجدداً.';
  }

  if (lower.includes('not-found')) {
    return 'تعذّر العثور على الخزنة السحابية المطلوبة؛ يرجى التأكّد من صحة رمز الربط أو إنشاء خزنة جديدة.';
  }

  if (lower.includes('failed-precondition') || lower.includes('aborted')) {
    return 'تزامن تعديل آخر على الخزنة؛ يرجى إعادة المحاولة بعد لحظة.';
  }

  if (lower.includes('webcrypto')) {
    return 'التشفير السحابي غير مدعوم في بيئة التصفح الحالية.';
  }

  return fallback;
}
