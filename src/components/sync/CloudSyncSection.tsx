import React, { useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, Copy, Link2, LogIn, LogOut, RefreshCw, Share2, Unlink } from 'lucide-react';
import type { CloudSyncStatus } from '../../sync/cloudSync';
import type { LocalCloudSyncState } from '../../utils/cloudCrypto';
import { InlineConfirmBox } from '../SharedUI';

export function CloudSyncSection({
  isOnline,
  isHusband,
  cloudUserEmail,
  cloudUserName,
  cloudState,
  cloudStatus,
  cloudPartnerJoined,
  cloudAutoSyncEnabled,
  serverExistingVaultId = null,
  initialInviteCode,
  hasVaultAccountMismatch,
  hasConflictingExistingVault,
  cloudInviteCode,
  cloudBusy,
  joinCodeInput,
  setJoinCodeInput,
  showJoinInput,
  setShowJoinInput,
  confirmCloudUnlink,
  setConfirmCloudUnlink,
  confirmCloudUnlinkRef,
  copiedCode,
  copiedLink,
  formatTimestamp,
  onTapFeedback,
  onCloudAction,
  onCloudSignIn,
  onCloudSignOut,
  onCreateCloudVault,
  onJoinCloudVault,
  onSwitchCloudVault,
  onClearMismatchedLocalVault,
  onCloudSyncNow,
  onUnlinkCloudVault,
  onDismissPendingInvite,
  onCopyInviteCode,
  onShareInviteLink,
  onShowBanner,
  motionEnabled = true,
}: {
  isOnline: boolean;
  isHusband: boolean;
  cloudUserEmail: string | null;
  cloudUserName: string | null;
  cloudState: LocalCloudSyncState;
  cloudStatus: CloudSyncStatus;
  cloudPartnerJoined: boolean;
  cloudAutoSyncEnabled: boolean;
  serverExistingVaultId?: string | null;
  initialInviteCode: string | null;
  hasVaultAccountMismatch: boolean;
  hasConflictingExistingVault: boolean;
  cloudInviteCode: string | null;
  cloudBusy: boolean;
  joinCodeInput: string;
  setJoinCodeInput: (val: string) => void;
  showJoinInput: boolean;
  setShowJoinInput: React.Dispatch<React.SetStateAction<boolean>>;
  confirmCloudUnlink: boolean;
  setConfirmCloudUnlink: (val: boolean) => void;
  confirmCloudUnlinkRef: React.RefObject<HTMLDivElement | null>;
  copiedCode: boolean;
  copiedLink: boolean;
  formatTimestamp: (ts: number | null) => string;
  onTapFeedback?: () => void;
  onCloudAction: (fn: () => Promise<void>) => Promise<void>;
  onCloudSignIn: () => Promise<void>;
  onCloudSignOut: (options?: { clearLocalVault?: boolean }) => Promise<void>;
  onCreateCloudVault: () => Promise<void>;
  onJoinCloudVault: (inviteCode: string) => Promise<void>;
  onSwitchCloudVault?: (inviteCode: string) => Promise<void>;
  onClearMismatchedLocalVault?: () => void;
  onCloudSyncNow: () => Promise<boolean>;
  onUnlinkCloudVault: () => Promise<void>;
  onDismissPendingInvite?: () => void;
  onCopyInviteCode: () => Promise<void>;
  onShareInviteLink: () => Promise<void>;
  onShowBanner: (msg: string) => void;
  motionEnabled?: boolean;
}) {
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const confirmSignOutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (confirmSignOut && confirmSignOutRef.current) {
      confirmSignOutRef.current.scrollIntoView({
        behavior: motionEnabled ? 'smooth' : 'auto',
        block: 'nearest',
      });
    }
  }, [confirmSignOut, motionEnabled]);

  return (
    <div className="relative z-10 ad-cut-tile bg-white/95 border border-[#EECCDA] p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isOnline ? (
            <Cloud className="w-4 h-4 text-[#D6286C] shrink-0" aria-hidden="true" />
          ) : (
            <CloudOff className="w-4 h-4 text-[#5E364A] shrink-0" aria-hidden="true" />
          )}
          <span className="text-xs font-bold text-[#360D21]">المزامنة السحابية المشفّرة</span>
        </div>
        <span className="text-[11px] font-semibold text-[#5E364A] shrink-0">
          {isOnline ? 'متصل بالشبكة' : 'بدون إنترنت'}
        </span>
      </div>

      {!cloudUserEmail ? (
        <>
          <p className="text-[11px] text-[#5E364A] leading-relaxed">
            {initialInviteCode
              ? isHusband
                ? 'وصلك رابط دعوة جاهز! سجّل الدخول بحساب Google لإكمال الانضمام إلى خزنة الشريكة.'
                : 'وصلكِ رابط دعوة جاهز! سجّلي الدخول بحساب Google لإكمال الانضمام إلى خزنة الشريك.'
              : isHusband
                ? 'سجّل الدخول بحساب Google لرفع التغييرات تلقائياً بمجرد اتصال الهاتف بالإنترنت واستقبالها من هاتف الشريكة بتشفير خاص (AES-256).'
                : 'سجّلي الدخول بحساب Google لرفع التغييرات تلقائياً بمجرد اتصال الهاتف بالإنترنت ومزامنتها مع هاتف الشريك بتشفير خاص (AES-256).'}
          </p>
          <button
            type="button"
            disabled={cloudBusy}
            onClick={() => void onCloudAction(onCloudSignIn)}
            className="w-full min-h-[44px] ad-cut-tile bg-[#D6286C] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:brightness-95 active:scale-[0.98] transition-[transform,filter] duration-150 disabled:opacity-65"
          >
            <LogIn className="w-4 h-4" aria-hidden="true" />
            <span>{cloudBusy ? 'جارٍ تسجيل الدخول...' : 'الدخول بحساب Google للمزامنة'}</span>
          </button>
        </>
      ) : (
        <>
          <div className="border-t border-[#F4D9E3] pt-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0 text-right">
              <p className="text-[11px] font-bold text-[#360D21] truncate">
                {cloudUserName || 'حساب موثّق'}
              </p>
              <p className="text-[11px] text-[#5E364A] truncate" dir="ltr">
                {cloudUserEmail}
              </p>
            </div>
            <button
              type="button"
              disabled={cloudBusy}
              onClick={() => {
                if (!cloudState.vaultId) {
                  void onCloudAction(() => onCloudSignOut());
                  return;
                }
                onTapFeedback?.();
                setConfirmSignOut((prev) => !prev);
              }}
              className="min-h-[44px] px-3 ad-cut-chip bg-[#FFF6F9] border border-[#EFCBD7] text-[11px] font-semibold text-[#8E184B] flex items-center gap-1 cursor-pointer shrink-0 hover:bg-[#FCEEF3] active:scale-[0.97] transition-[background-color,transform] duration-150"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>خروج</span>
            </button>
          </div>

          {confirmSignOut && cloudState.vaultId && (
            <div
              ref={confirmSignOutRef}
              className={`ad-cut-chip bg-[#FFF6F9] border border-[#E8AFC3] p-2.5 flex flex-col gap-2 ${
                motionEnabled ? 'ad-anim-toast-in' : ''
              }`}
            >
              <p className="text-[11px] font-bold text-[#360D21] leading-relaxed">
                {isHusband
                  ? 'هل تودّ الاحتفاظ برمز الخزنة على هذا الجهاز لتسجيل الدخول لاحقاً أم مسحه أيضاً؟'
                  : 'هل تودّين الاحتفاظ برمز الخزنة على هذا الجهاز لتسجيل الدخول لاحقاً أم مسحه أيضاً؟'}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={() =>
                    void onCloudAction(async () => {
                      await onCloudSignOut({ clearLocalVault: false });
                      setConfirmSignOut(false);
                    })
                  }
                  className="min-h-[44px] px-2 ad-cut-chip bg-white border border-[#EFCBD7] text-[#360D21] text-[11px] font-bold cursor-pointer hover:bg-[#FCEEF3] active:scale-[0.97] transition-[background-color,transform] duration-150 disabled:opacity-65"
                >
                  خروج وإبقاء الربط
                </button>
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={() =>
                    void onCloudAction(async () => {
                      await onCloudSignOut({ clearLocalVault: true });
                      setConfirmSignOut(false);
                    })
                  }
                  className="min-h-[44px] px-2 ad-cut-chip bg-[#D6286C] text-white text-[11px] font-bold cursor-pointer hover:brightness-95 active:scale-[0.97] transition-[transform,filter] duration-150 disabled:opacity-65"
                >
                  خروج ومسح المفتاح
                </button>
              </div>
              <button
                type="button"
                disabled={cloudBusy}
                onClick={() => setConfirmSignOut(false)}
                className="min-h-[44px] w-full ad-cut-chip bg-transparent text-[#5E364A] text-[11px] font-semibold cursor-pointer hover:text-[#360D21] active:scale-[0.98] transition-[color,transform] duration-150"
              >
                تراجع
              </button>
            </div>
          )}

          {hasVaultAccountMismatch ? (
            <div
              className={`ad-cut-chip bg-[#FFF0F4] border border-[#E89CB7] p-3 flex flex-col gap-2 ${
                motionEnabled ? 'ad-anim-toast-in' : ''
              }`}
            >
              <p className="text-[11px] font-bold text-[#9E194D] leading-relaxed">
                الخزنة السحابية المحفوظة على هذا الجهاز مرتبطة بحساب Google آخر غير المسجل حالياً. لن تُحذف بيانات السحابة تلقائياً حمايةً لها.
              </p>
              <p className="text-[11px] text-[#5E364A] leading-relaxed">
                {isHusband
                  ? 'يمكنك تسجيل الخروج أعلاه للعودة إلى الحساب السابق، أو مسح ارتباط الخزنة من هذا الهاتف لبدء ربط جديد بهذا الحساب.'
                  : 'يمكنكِ تسجيل الخروج أعلاه للعودة إلى الحساب السابق، أو مسح ارتباط الخزنة من هذا الهاتف لبدء ربط جديد بهذا الحساب.'}
              </p>
              {onClearMismatchedLocalVault && (
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={() => {
                    onTapFeedback?.();
                    onClearMismatchedLocalVault();
                    onShowBanner('تم فك الارتباط المحلي بالخزنة السابقة بنجاح');
                  }}
                  className="w-full min-h-[44px] ad-cut-chip bg-[#D6286C] text-white text-xs font-bold cursor-pointer hover:brightness-95 active:scale-[0.98] transition-[transform,filter] duration-150 disabled:opacity-65"
                >
                  إزالة الارتباط المحلي والبدء بهذا الحساب
                </button>
              )}
            </div>
          ) : !cloudState.vaultId ? (
            <div className="flex flex-col gap-2">
              {serverExistingVaultId && (
                <div
                  className={`ad-cut-chip bg-[#FFF6F9] border border-[#E8AFC3] p-2.5 text-[11px] text-[#5E364A] leading-relaxed ${
                    motionEnabled ? 'ad-anim-toast-in' : ''
                  }`}
                >
                  {isHusband
                    ? 'تم العثور على خزنة سحابية سابقة مرتبطة بهذا الحساب، ولأن مفتاح التشفير محفوظ محلياً على الجهاز السابق فقط، يمكنك إدخال رمز الربط الأصلي إذا كان لديك أو إنشاء خزنة جديدة بأمان.'
                    : 'تم العثور على خزنة سحابية سابقة مرتبطة بهذا الحساب، ولأن مفتاح التشفير محفوظ محلياً على الجهاز السابق فقط، يمكنكِ إدخال رمز الربط الأصلي إذا كان لديكِ أو إنشاء خزنة جديدة بأمان.'}
                </div>
              )}
              <p className="text-[11px] text-[#5E364A] leading-relaxed">
                {isHusband
                  ? 'أنشئ خزنة زوجين سحابية مرة واحدة أو الصق رمز الربط القادم من هاتف الشريكة لبدء المزامنة التلقائية.'
                  : 'أنشئي خزنة زوجين سحابية مرة واحدة أو الصقي رمز الربط القادم من هاتف الشريك لبدء المزامنة التلقائية.'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={() =>
                    void onCloudAction(async () => {
                      await onCreateCloudVault();
                      onShowBanner('تم إنشاء الخزنة السحابية المشفّرة بنجاح');
                    })
                  }
                  className="min-h-[44px] px-2.5 ad-cut-chip bg-[#D6286C] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-95 active:scale-[0.97] transition-[transform,filter] duration-150 disabled:opacity-65"
                >
                  <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>إنشاء ربط جديد</span>
                </button>
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={() => {
                    onTapFeedback?.();
                    setShowJoinInput((prev) => !prev);
                  }}
                  className="min-h-[44px] px-2.5 ad-cut-chip bg-[#FCEEF3] text-[#360D21] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#FADCE7] active:scale-[0.97] transition-[background-color,transform] duration-150"
                >
                  <Link2 className="w-3.5 h-3.5 text-[#D6286C]" aria-hidden="true" />
                  <span>لدي رمز ربط</span>
                </button>
              </div>

              {showJoinInput && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!joinCodeInput.trim()) return;
                    void onCloudAction(async () => {
                      await onJoinCloudVault(joinCodeInput.trim());
                      setJoinCodeInput('');
                      setShowJoinInput(false);
                      onShowBanner('تم الربط السحابي المشفّر بنجاح');
                    });
                  }}
                  className={`flex flex-col gap-2 pt-1 ${motionEnabled ? 'ad-anim-toast-in' : ''}`}
                >
                  <input
                    type="text"
                    dir="ltr"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value)}
                    placeholder={isHusband ? 'الصق رمز الربط السحابي هنا' : 'الصقي رمز الربط السحابي هنا'}
                    className="w-full min-h-[44px] px-3 ad-cut-chip bg-white border border-[#E8AFC3] text-xs text-[#360D21] text-center focus:outline-none focus:border-[#D6286C]"
                  />
                  <button
                    type="submit"
                    disabled={cloudBusy || !joinCodeInput.trim()}
                    className="w-full min-h-[44px] ad-cut-chip bg-[#D6286C] text-white text-xs font-bold cursor-pointer hover:brightness-95 active:scale-[0.98] transition-[transform,filter] duration-150 disabled:opacity-60"
                  >
                    {cloudBusy ? 'جارٍ الربط...' : 'تأكيد الانضمام للخزنة'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {hasConflictingExistingVault && initialInviteCode && (
                <div
                  className={`ad-cut-chip bg-[#FFF5F9] border-t-2 border-[#D6286C]/45 p-2.5 flex flex-col gap-2 ${
                    motionEnabled ? 'ad-anim-toast-in' : ''
                  }`}
                >
                  <p className="text-[11px] font-bold text-[#360D21] leading-relaxed">
                    وصلك رابط دعوة لخزنة ربط سحابية جديدة، بينما هذا الجهاز مرتبط حالياً بخزنة قائمة.
                  </p>
                  {!isOnline && (
                    <p className="text-[11px] font-semibold text-[#9E194D]">
                      {isHusband
                        ? 'يتطلب تبديل الخزنة اتصالاً بالإنترنت لحفظ بياناتك قبل المغادرة.'
                        : 'يتطلب تبديل الخزنة اتصالاً بالإنترنت لحفظ بياناتكِ قبل المغادرة.'}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={cloudBusy || !isOnline}
                      onClick={() =>
                        void onCloudAction(async () => {
                          if (onSwitchCloudVault) {
                            await onSwitchCloudVault(initialInviteCode);
                          } else {
                            await onUnlinkCloudVault();
                            await onJoinCloudVault(initialInviteCode);
                          }
                          onDismissPendingInvite?.();
                          onShowBanner('تم تبديل الخزنة السحابية والربط بنجاح');
                        })
                      }
                      className="min-h-[44px] px-2 ad-cut-chip bg-[#D6286C] text-white text-[11px] font-bold cursor-pointer hover:brightness-95 active:scale-[0.97] transition-[transform,filter] duration-150 disabled:opacity-65 disabled:cursor-not-allowed"
                    >
                      {cloudBusy ? 'جارٍ التبديل...' : 'الانضمام للخزنة الجديدة'}
                    </button>
                    <button
                      type="button"
                      disabled={cloudBusy}
                      onClick={() => {
                        onTapFeedback?.();
                        onDismissPendingInvite?.();
                      }}
                      className="min-h-[44px] px-2 ad-cut-chip bg-white border border-[#EFCBD7] text-[#360D21] text-[11px] font-semibold cursor-pointer hover:bg-[#FCEEF3] active:scale-[0.97] transition-[background-color,transform] duration-150"
                    >
                      إبقاء الحالية
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-[#5E364A] tabular-nums-ar">
                <span className="font-bold text-[#360D21]">
                  {!cloudPartnerJoined
                    ? isHusband
                      ? 'بانتظار دخول الشريكة بالرمز'
                      : 'بانتظار دخول الشريك بالرمز'
                    : cloudStatus === 'syncing'
                      ? 'جارٍ المزامنة السحابية...'
                      : cloudStatus === 'offline-pending'
                        ? 'تعديلات محفوظة · ستُرفع تلقائياً عند توفر النت'
                        : !cloudAutoSyncEnabled
                          ? 'المزامنة التلقائية متوقفة من الإعدادات'
                          : 'الطرفان متصلان بالخزنة'}
                </span>
                <span>{formatTimestamp(cloudState.lastCloudSyncedAt)}</span>
              </div>

              {cloudInviteCode && (
                <div className="border-t border-[#F4D9E3] pt-2.5 flex flex-col gap-2">
                  <div className="min-w-0 text-right ad-cut-chip bg-[#FFF6F9] px-2.5 py-2">
                    <p className="text-[11px] font-bold text-[#360D21]">
                      {isHusband
                        ? 'رمز ربط هاتف الشريكة (يُستخدم مرة واحدة)'
                        : 'رمز ربط هاتف الشريك (يُستخدم مرة واحدة)'}
                    </p>
                    <p className="text-[11px] font-mono text-[#5E364A] truncate mt-0.5" dir="ltr">
                      {cloudInviteCode}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => void onCopyInviteCode()}
                      className="min-h-[44px] px-2.5 ad-cut-chip bg-white border border-[#EFCBD7] text-[#D6286C] text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-[#FCEEF3] active:scale-[0.97] transition-[background-color,transform] duration-150"
                    >
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{copiedCode ? 'تم نسخ الرمز' : 'نسخ الرمز'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void onShareInviteLink()}
                      className="min-h-[44px] px-2.5 ad-cut-chip bg-white border border-[#EFCBD7] text-[#7B1E48] text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer hover:bg-[#FCEEF3] active:scale-[0.97] transition-[background-color,transform] duration-150"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#D6286C]" aria-hidden="true" />
                      <span>{copiedLink ? 'تم نسخ الرابط' : 'مشاركة رابط'}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={cloudBusy || !isOnline}
                  onClick={() =>
                    void onCloudAction(async () => {
                      const ok = await onCloudSyncNow();
                      if (ok) {
                        onShowBanner('تمت المزامنة السحابية المشفّرة الآن');
                      }
                    })
                  }
                  className="min-h-[44px] px-2.5 ad-cut-chip bg-[#D6286C] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-95 active:scale-[0.97] transition-[transform,filter] duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      motionEnabled && (cloudBusy || cloudStatus === 'syncing') ? 'animate-spin' : ''
                    }`}
                    aria-hidden="true"
                  />
                  <span>مزامنة سحابية</span>
                </button>
                <button
                  type="button"
                  disabled={cloudBusy}
                  onClick={() => {
                    onTapFeedback?.();
                    setConfirmCloudUnlink(true);
                  }}
                  className="min-h-[44px] px-2.5 ad-cut-chip bg-[#FCEEF3] text-[#8E184B] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#FADCE7] active:scale-[0.97] transition-[background-color,transform] duration-150"
                >
                  <Unlink className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>فك الربط السحابي</span>
                </button>
              </div>

              {!isOnline && (
                <p className="text-[11px] font-semibold text-[#5E364A] text-center">
                  تتطلّب المزامنة السحابية اليدوية اتصالاً بالإنترنت
                </p>
              )}

              {confirmCloudUnlink && (
                <InlineConfirmBox
                  containerRef={confirmCloudUnlinkRef}
                  variant="destructive"
                  centeredText={false}
                  busy={cloudBusy}
                  message={
                    isHusband
                      ? 'سيتم فك ارتباط هذا الجهاز بالخزنة السحابية (وإذا كنتَ من أنشأها فستُحذف الخزنة السحابية نهائياً) مع بقاء بياناتك المحلية كما هي. هل تودّ المتابعة؟'
                      : 'سيتم فك ارتباط هذا الجهاز بالخزنة السحابية (وإذا كنتِ من أنشأها فستُحذف الخزنة السحابية نهائياً) مع بقاء إجاباتكِ المحلية كما هي. هل تودّين المتابعة؟'
                  }
                  confirmLabel="تأكيد فك الربط"
                  cancelLabel="تراجع"
                  onConfirm={() =>
                    void onCloudAction(async () => {
                      await onUnlinkCloudVault();
                      setConfirmCloudUnlink(false);
                    })
                  }
                  onCancel={() => setConfirmCloudUnlink(false)}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
