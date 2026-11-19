import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Bluetooth,
  CheckCircle2,
  ChevronLeft,
  Cloud,
  EyeOff,
  KeyRound,
  Layers,
  Lock,
  Settings,
  ShieldCheck,
  Smartphone,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { DeviceRole, GameSettings } from '../../data/types';
import type { PartnerConnectionStatus } from '../../game/engine';
import type { PinSetupMode } from '../PrivacyLockOverlay';
import { RoseDivider } from '../RoseFiligree';
import { InlineConfirmBox, RoseModalShell, RoseSwitchRow } from '../SharedUI';

export interface ProfileSettingsModalProps {
  isOpen: boolean;
  isPinModalOpen: boolean;
  isHusband: boolean;
  roleLabel: string;
  targetRoleLabel: string;
  targetSwitchRole: DeviceRole;
  hasNativeNearby: boolean;
  effectiveStatus: PartnerConnectionStatus;
  settings: GameSettings;
  pinEnabled: boolean;
  lockOnBackground: boolean;
  motionEnabled: boolean;
  onClose: () => void;
  onOpenSyncModal?: () => void;
  onToggleSetting: (key: keyof GameSettings) => void;
  onSwitchRole?: (targetRole: DeviceRole) => Promise<void> | void;
  onOpenPinSetup: (mode: PinSetupMode) => void;
  onToggleLockOnBackground: () => void;
  onLockNow: () => void;
  onResetAllProgress: () => void;
  onTapFeedback?: () => void;
}

export function ProfileSettingsModal({
  isOpen,
  isPinModalOpen,
  isHusband,
  roleLabel,
  targetRoleLabel,
  targetSwitchRole,
  hasNativeNearby,
  effectiveStatus,
  settings,
  pinEnabled,
  lockOnBackground,
  motionEnabled,
  onClose,
  onOpenSyncModal,
  onToggleSetting,
  onSwitchRole,
  onOpenPinSetup,
  onToggleLockOnBackground,
  onLockNow,
  onResetAllProgress,
  onTapFeedback,
}: ProfileSettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSwitchRole, setConfirmSwitchRole] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState(false);
  const confirmSwitchRoleRef = useRef<HTMLDivElement | null>(null);
  const confirmResetRef = useRef<HTMLDivElement | null>(null);
  const resetNoticeRef = useRef<HTMLDivElement | null>(null);

  const isHapticsSupported =
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  useEffect(() => {
    if (!isOpen) {
      const t = window.setTimeout(() => {
        setConfirmReset(false);
        setConfirmSwitchRole(false);
        setSwitchError(null);
      }, 190);
      return () => window.clearTimeout(t);
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPinModalOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isPinModalOpen, onClose]);

  useEffect(() => {
    if (confirmSwitchRole && confirmSwitchRoleRef.current) {
      confirmSwitchRoleRef.current.scrollIntoView({
        behavior: motionEnabled ? 'smooth' : 'auto',
        block: 'nearest',
      });
    }
  }, [confirmSwitchRole, motionEnabled]);

  useEffect(() => {
    if (confirmReset && confirmResetRef.current) {
      confirmResetRef.current.scrollIntoView({
        behavior: motionEnabled ? 'smooth' : 'auto',
        block: 'nearest',
      });
    }
  }, [confirmReset, motionEnabled]);

  useEffect(() => {
    if (resetNotice && resetNoticeRef.current) {
      resetNoticeRef.current.scrollIntoView({
        behavior: motionEnabled ? 'smooth' : 'auto',
        block: 'nearest',
      });
    }
  }, [resetNotice, motionEnabled]);

  useEffect(() => {
    if (!resetNotice) return;
    const timer = window.setTimeout(() => {
      setResetNotice(false);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [resetNotice]);

  const handleOpenSyncFromSettings = () => {
    onTapFeedback?.();
    onOpenSyncModal?.();
  };

  const handleConfirmSwitchRole = async () => {
    if (!onSwitchRole || switchingRole) return;
    onTapFeedback?.();
    setSwitchError(null);
    setSwitchingRole(true);
    try {
      await onSwitchRole(targetSwitchRole);
      setConfirmSwitchRole(false);
      onClose();
    } catch {
      setSwitchError('تعذّر إتمام تبديل النسخة الآن؛ يرجى المحاولة مجدداً.');
    } finally {
      setSwitchingRole(false);
    }
  };

  return (
    <RoseModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="settings-modal-title"
      motionEnabled={motionEnabled}
      insetFrame={false}
      scrollableBody
      cardPaddingClass="p-0"
    >
      <div className="flex-1 min-h-0 max-h-[84dvh] flex flex-col">
        <div className="shrink-0 px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-white to-[#FFE2ED] border border-[#E88FB2] flex items-center justify-center text-[#D6286C] shrink-0 shadow-xs">
              <Settings className="w-4 h-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#5E364A]">تفضيلات التجربة</p>
              <h2
                id="settings-modal-title"
                className="font-display-ar text-xl font-bold text-[#360D21] leading-snug"
              >
                الإعدادات والخصوصية
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة الإعدادات"
            className="min-w-[44px] min-h-[44px] rounded-full bg-white/95 border border-[#EFCBD7] flex items-center justify-center text-[#5E364A] hover:text-[#D6286C] active:scale-95 transition-[color,transform] duration-150 cursor-pointer shrink-0 shadow-sm"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="shrink-0 px-4 pb-2">
          <RoseDivider color="#D6286C" />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto ad-no-scrollbar px-4 pb-4 flex flex-col gap-3">
          {onOpenSyncModal && (
            <div className="shrink-0 flex flex-col gap-1.5">
              <p className="text-[11px] font-bold text-[#5E364A] px-1">الربط بين الزوجين</p>
              <button
                type="button"
                onClick={handleOpenSyncFromSettings}
                className="ad-cut-tile bg-white/95 border border-[#EECCDA] hover:border-[#D6286C] active:scale-[0.98] px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-right cursor-pointer shadow-xs transition-[border-color,transform] duration-150"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 ad-cut-chip bg-[#FCECF1] border border-[#F4C6D7] flex items-center justify-center text-[#D6286C] shrink-0">
                    {hasNativeNearby ? (
                      <Bluetooth className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Cloud className="w-4 h-4" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-[#360D21]">
                      {hasNativeNearby
                        ? 'الاقتران القريب والمزامنة السحابية'
                        : 'المزامنة السحابية وربط الهاتفين'}
                    </p>
                    <p className="text-[11px] text-[#5E364A] leading-snug truncate">
                      {roleLabel} ·{' '}
                      {effectiveStatus === 'connected'
                        ? 'متصلان الآن'
                        : effectiveStatus === 'error'
                          ? 'تعذّرت المزامنة الأخيرة'
                          : effectiveStatus === 'pending'
                            ? 'معلّق حتى توفر الإنترنت'
                            : effectiveStatus === 'waiting'
                              ? isHusband
                                ? 'بانتظار دخول الشريكة'
                                : 'بانتظار دخول الشريك'
                              : hasNativeNearby
                                ? 'بلوتوث أندرويد أو تلقائياً بالنت'
                                : 'خزنة مشفّرة عبر الحساب'}
                    </p>
                  </div>
                </div>
                <ChevronLeft className="w-4 h-4 text-[#D6286C] shrink-0" aria-hidden="true" />
              </button>
            </div>
          )}

          <div className="shrink-0 flex flex-col gap-1.5">
            <p className="text-[11px] font-bold text-[#5E364A] px-1">تفضيلات الصوت والحركة</p>
            <div className="ad-cut-tile bg-white/95 border border-[#EECCDA] divide-y divide-[#F6DCE6] overflow-hidden shadow-xs">
              <RoseSwitchRow
                icon={
                  settings.soundEnabled ? (
                    <Volume2 className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <VolumeX className="w-4 h-4" aria-hidden="true" />
                  )
                }
                title="المؤثرات الصوتية"
                description="نغمات هادئة عند تحديد الخيارات"
                checked={settings.soundEnabled}
                onToggle={() => onToggleSetting('soundEnabled')}
              />

              <RoseSwitchRow
                icon={<Layers className="w-4 h-4" aria-hidden="true" />}
                title="الحركة والانتقالات"
                description="تأثيرات التنقل بين البطاقات والشاشات"
                checked={settings.motionEnabled}
                onToggle={() => onToggleSetting('motionEnabled')}
              />

              <RoseSwitchRow
                icon={<Smartphone className="w-4 h-4" aria-hidden="true" />}
                title="الاهتزاز التفاعلي"
                description={
                  isHapticsSupported
                    ? 'استجابة لمسية خفيفة على الأجهزة الداعمة'
                    : 'غير مدعوم في هذا المتصفح'
                }
                checked={isHapticsSupported && settings.hapticsEnabled}
                disabled={!isHapticsSupported}
                statusLabel={!isHapticsSupported ? 'غير مدعوم' : undefined}
                onToggle={() => onToggleSetting('hapticsEnabled')}
              />
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-1.5">
            <p className="text-[11px] font-bold text-[#5E364A] px-1">الأمان والخصوصية</p>
            <div className="ad-cut-tile bg-white/95 border border-[#EECCDA] divide-y divide-[#F6DCE6] overflow-hidden shadow-xs">
              <RoseSwitchRow
                icon={<Cloud className="w-4 h-4" aria-hidden="true" />}
                iconContainerClassName="bg-[#FCECF1] border-[#F4C6D7] text-[#D6286C]"
                title="مزامنة تلقائية عند توفر الإنترنت"
                description="رفع واستقبال اختيارات الزوجين تلقائياً بتشفير خاص"
                checked={settings.cloudAutoSyncEnabled}
                onToggle={() => onToggleSetting('cloudAutoSyncEnabled')}
              />

              {!settings.cloudAutoSyncEnabled && (
                <div
                  role="status"
                  className="px-3.5 py-2 bg-[#FFF7EC] text-[11px] font-semibold text-[#6F430C] leading-relaxed"
                >
                  تنبيه: إيقاف المزامنة التلقائية يُبقي الإجابات والرسائل الجديدة محلية مؤقتاً حتى تفعيلها أو المزامنة اليدوية.
                </div>
              )}

              <RoseSwitchRow
                icon={<EyeOff className="w-4 h-4" aria-hidden="true" />}
                iconContainerClassName="bg-[#FCECF1] border-[#F4C6D7] text-[#D6286C]"
                title="ستار الخصوصية التلقائي"
                description="إخفاء المحتوى في مبدّل التطبيقات وعند مغادرة الشاشة"
                checked={settings.privacyCurtainEnabled}
                onToggle={() => onToggleSetting('privacyCurtainEnabled')}
              />

              <div className="px-3.5 py-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-right min-w-0">
                    <div className="w-9 h-9 ad-cut-chip bg-[#FCECF1] border border-[#F4C6D7] flex items-center justify-center text-[#D6286C] shrink-0">
                      <KeyRound className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-[#360D21]">
                        قفل التطبيق برمز شخصي
                      </p>
                      <p className="text-[11px] text-[#5E364A] leading-snug">
                        {pinEnabled
                          ? 'مفعل برمز من ٤ أرقام لحماية الخصوصية'
                          : isHusband
                            ? 'أضف رمزاً شخصياً من ٤ أرقام لفتح التطبيق'
                            : 'أضيفي رمزاً شخصياً من ٤ أرقام لفتح التطبيق'}
                      </p>
                    </div>
                  </div>

                  {!pinEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        onTapFeedback?.();
                        onOpenPinSetup('create');
                      }}
                      className="min-h-[44px] px-3 ad-cut-chip bg-[#D6286C] text-white text-xs font-bold cursor-pointer shrink-0 hover:brightness-95 active:scale-[0.97] transition-[transform,filter] duration-150"
                    >
                      تفعيل الرمز
                    </button>
                  )}
                </div>

                {pinEnabled && (
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onTapFeedback?.();
                        onOpenPinSetup('change');
                      }}
                      className="min-h-[44px] px-2.5 ad-cut-chip bg-[#FCEEF3] text-[#360D21] text-xs font-bold cursor-pointer hover:bg-[#FADCE7] active:scale-[0.97] transition-[background-color,transform] duration-150"
                    >
                      تغيير الرمز
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onTapFeedback?.();
                        onOpenPinSetup('disable');
                      }}
                      className="min-h-[44px] px-2.5 ad-cut-chip bg-white border border-[#EFCBD7] text-[#8E184B] text-xs font-bold cursor-pointer hover:bg-[#FFF8FA] active:scale-[0.97] transition-[background-color,transform] duration-150"
                    >
                      إلغاء القفل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onTapFeedback?.();
                        onLockNow();
                      }}
                      className="col-span-2 min-h-[44px] px-3 ad-cut-chip bg-[#D6286C] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-95 active:scale-[0.98] transition-[transform,filter] duration-150"
                    >
                      <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>قفل التطبيق الآن</span>
                    </button>
                  </div>
                )}
              </div>

              {pinEnabled && (
                <RoseSwitchRow
                  icon={<ShieldCheck className="w-4 h-4" aria-hidden="true" />}
                  iconContainerClassName="bg-[#FCECF1] border-[#F4C6D7] text-[#A84B78]"
                  title="القفل الفوري عند الخروج"
                  description="طلب الرمز تلقائياً عند العودة للتطبيق"
                  checked={lockOnBackground}
                  onToggle={() => {
                    onTapFeedback?.();
                    onToggleLockOnBackground();
                  }}
                />
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-1.5">
            <p className="text-[11px] font-bold text-[#5E364A] px-1">النسخة وإدارة البيانات</p>
            {onSwitchRole &&
              (!confirmSwitchRole ? (
                <div className="ad-cut-tile bg-white/95 border border-[#EECCDA] px-3.5 py-3 shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onTapFeedback?.();
                      setConfirmSwitchRole(true);
                    }}
                    className="w-full min-h-[44px] flex items-center justify-between gap-2 text-right active:scale-[0.98] transition-transform duration-150 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className="w-9 h-9 ad-cut-chip bg-[#FCECF1] border border-[#F4C6D7] flex items-center justify-center text-[#D6286C] shrink-0">
                        <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs sm:text-sm font-semibold text-[#360D21]">
                          تبديل نسخة الجهاز ({targetRoleLabel})
                        </span>
                        <span className="block text-[11px] text-[#5E364A] leading-snug">
                          النسخة الحالية: {roleLabel}
                        </span>
                      </span>
                    </span>
                    <ChevronLeft className="w-4 h-4 text-[#D6286C] shrink-0" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <InlineConfirmBox
                  containerRef={confirmSwitchRoleRef}
                  variant="primary"
                  centeredText={false}
                  busy={switchingRole}
                  className="shadow-xs"
                  message={
                    isHusband
                      ? `سيتم فك ربط الخزنة السحابية والاقتران القريب الحالية والانتقال إلى ${targetRoleLabel} مع الحفاظ على تفضيلات الصوت والخصوصية. هل تودّ المتابعة؟`
                      : `سيتم فك ربط الخزنة السحابية والاقتران القريب الحالية والانتقال إلى ${targetRoleLabel} مع الحفاظ على تفضيلات الصوت والخصوصية. هل تودّين المتابعة؟`
                  }
                  confirmLabel={switchingRole ? 'جارٍ التبديل...' : `التحويل إلى ${targetRoleLabel}`}
                  cancelLabel="تراجع"
                    onConfirm={() => void handleConfirmSwitchRole()}
                    onCancel={() => {
                      setSwitchError(null);
                      setConfirmSwitchRole(false);
                    }}
                  />
              ))}

            {switchError && (
              <div
                role="alert"
                className={`ad-cut-tile bg-[#FFF0F4] border border-[#E89CB7] ps-3 pe-1 py-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-[#9E194D] ${
                  motionEnabled ? 'ad-anim-toast-in' : ''
                }`}
              >
                <span className="flex-1 text-right">{switchError}</span>
                <button
                  type="button"
                  onClick={() => setSwitchError(null)}
                  aria-label="إغلاق رسالة الخطأ"
                  className="min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[#8E184B] hover:bg-[#FADCE7] cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}

            <div className="ad-cut-tile bg-white/95 border border-[#E9A9BE] divide-y divide-[#F6DCE6] overflow-hidden shadow-xs">
              <div className="px-3.5 py-3">
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => {
                      setResetNotice(false);
                      setConfirmReset(true);
                    }}
                    className="w-full min-h-[44px] flex items-center justify-between text-right text-xs sm:text-sm font-semibold text-[#B92859] hover:text-[#981D47] active:scale-[0.98] transition-[color,transform] duration-150 cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>
                        {isHusband
                          ? 'مسح الذاكرة المؤقتة والمزامنة المحلية'
                          : 'إعادة ضبط جميع بيانات التقدم'}
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-[#5E364A] shrink-0">مسح</span>
                  </button>
                ) : (
                  <InlineConfirmBox
                    containerRef={confirmResetRef}
                    variant="destructive"
                    centeredText={false}
                    message={
                      isHusband
                        ? 'سيتم مسح نسخة اختيارات الشريكة المحفوظة مؤقتاً على هذا الجهاز فقط مع الإبقاء على تفضيلات الصوت والخصوصية، ولن تتأثر بيانات جهاز الزوجة. هل تودّ المتابعة؟'
                        : 'هل تودّين مسح جميع السجلات والبيانات المحفوظة عبر الأنماط والبدء من جديد مع الإبقاء على تفضيلاتكِ؟'
                    }
                    confirmLabel="تأكيد المسح"
                    cancelLabel="تراجع"
                    onConfirm={() => {
                      onResetAllProgress();
                      setConfirmReset(false);
                      setResetNotice(true);
                    }}
                    onCancel={() => setConfirmReset(false)}
                  />
                )}
              </div>

              <div className="px-3.5 py-2.5 text-right bg-[#FFFBFD]">
                <p className="text-xs font-bold text-[#360D21]">الخصوصية والحفظ المحلي</p>
                <p className="text-[11px] text-[#5E364A] leading-relaxed mt-0.5">
                  {isHusband
                    ? 'تُحفظ بيانات اللعب وتقدمك وإعداداتك محلياً على هذا الجهاز فقط.'
                    : 'تُحفظ بيانات اللعب وتقدمكِ وإعداداتكِ محلياً على هذا الجهاز فقط.'}
                </p>
              </div>
            </div>
          </div>

          {resetNotice && (
            <div
              ref={resetNoticeRef}
              role="status"
              aria-live="polite"
              className={`shrink-0 ad-cut-tile bg-white border border-[#D6286C]/35 px-3 py-2 flex items-center gap-2 text-xs font-semibold text-[#360D21] ${
                motionEnabled ? 'ad-anim-toast-in' : ''
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-[#D6286C] shrink-0" aria-hidden="true" />
              <span>
                {isHusband
                  ? 'تم مسح الذاكرة المؤقتة المحلية على هذا الجهاز بنجاح.'
                  : 'تم مسح جميع البيانات وإعادة التقدم إلى الصفر بنجاح.'}
              </span>
            </div>
          )}

          <p className="shrink-0 text-[11px] text-[#5E364A] font-semibold text-center">
            ليالي الورد · تُحفظ الإعدادات تلقائياً
          </p>
        </div>
      </div>
    </RoseModalShell>
  );
}
