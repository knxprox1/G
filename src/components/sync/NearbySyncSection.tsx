import React from 'react';
import { Bluetooth, Loader2, Smartphone } from 'lucide-react';
import type { DeviceRole } from '../../data/types';
import type { DiscoveredPeer, LiveBusState } from '../../sync/liveBus';

export function NearbySyncSection({
  hasNativeNearby,
  isHusband,
  role,
  busState,
  nearbyPeers,
  isStartingNearby,
  connectingEndpointId = null,
  nearbyBusy,
  isNearbyActionDisabled,
  onTriggerDiscovery,
  onPairNearbyPeer,
  motionEnabled = true,
}: {
  hasNativeNearby: boolean;
  isHusband: boolean;
  role: DeviceRole;
  busState: LiveBusState;
  nearbyPeers: DiscoveredPeer[];
  isStartingNearby: boolean;
  connectingEndpointId?: string | null;
  nearbyBusy: boolean;
  isNearbyActionDisabled: boolean;
  onTriggerDiscovery: () => void;
  onPairNearbyPeer: (endpointId: string) => void;
  motionEnabled?: boolean;
}) {
  return (
    <div
      className={`relative z-10 ad-cut-tile p-3 flex flex-col gap-2 ${
        hasNativeNearby
          ? 'bg-white/95 border border-[#EECCDA]'
          : 'bg-[#FFF8FB]/75 border border-dashed border-[#E8AFC3]'
      }`}
    >
      <div className="flex items-center gap-2">
        <Bluetooth className="w-4 h-4 text-[#D6286C] shrink-0" aria-hidden="true" />
        <span className="text-xs font-bold text-[#360D21]">
          {hasNativeNearby
            ? 'بلوتوث وواي فاي مباشر (تلقائي بدون إنترنت)'
            : 'الاقتران القريب (تطبيق أندرويد فقط)'}
        </span>
      </div>

      {hasNativeNearby ? (
        <>
          <p className="text-[11px] text-[#5E364A] leading-relaxed">
            {isHusband
              ? 'افتح هذه الشاشة على الهاتفين مع تفعيل البلوتوث أو الواي فاي المباشر ليتم الاكتشاف والمزامنة تلقائياً وبشكل مباشر.'
              : 'افتحي هذه الشاشة على الهاتفين مع تفعيل البلوتوث أو الواي فاي المباشر ليتم الاكتشاف والمزامنة تلقائياً وبشكل مباشر.'}
          </p>
          {busState.status !== 'connected' && (
            <button
              type="button"
              disabled={isNearbyActionDisabled}
              onClick={onTriggerDiscovery}
              className="w-full min-h-[46px] ad-cut-tile bg-[#D6286C] text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer hover:brightness-95 active:scale-[0.98] transition-[transform,filter] duration-150 disabled:opacity-65 disabled:cursor-not-allowed"
            >
              <Smartphone className="w-4 h-4" aria-hidden="true" />
              <span>
                {isStartingNearby || nearbyBusy
                  ? 'جارٍ تشغيل الاكتشاف القريب...'
                  : busState.status === 'discovering'
                    ? 'إعادة البحث عن الجهاز القريب'
                    : 'البحث عن الجهاز القريب'}
              </span>
            </button>
          )}
          {busState.status === 'discovering' && nearbyPeers.length === 0 && !isStartingNearby && (
            <div
              role="status"
              aria-live="polite"
              className="ad-cut-chip bg-[#FFF6F9] border border-[#F1AFC8] px-3 py-2 flex items-center justify-center gap-2 text-[11px] font-semibold text-[#5E364A]"
            >
              <Loader2
                className={`w-3.5 h-3.5 text-[#D6286C] shrink-0 ${motionEnabled ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>جارٍ البحث عن الجهاز الآخر بالقرب منك...</span>
            </div>
          )}
          {nearbyPeers.length > 0 && busState.status !== 'connected' && (
            <div className="flex flex-col gap-1.5">
              {nearbyPeers.map((peer) => {
                const isSameRole = peer.role !== undefined && peer.role === role;
                const isConnectingThisPeer =
                  connectingEndpointId === peer.endpointId && busState.status === 'connecting';
                const peerRoleLabel =
                  peer.role === 'husband'
                    ? 'نسخة الزوج'
                    : peer.role === 'wife'
                      ? 'نسخة الزوجة'
                      : null;
                return (
                  <button
                    key={peer.endpointId}
                    type="button"
                    disabled={isSameRole || isNearbyActionDisabled}
                    onClick={() => onPairNearbyPeer(peer.endpointId)}
                    className={`w-full min-h-[44px] px-3 py-2 ad-cut-chip border flex items-center justify-between gap-2 text-xs font-bold transition-[border-color,transform] duration-150 disabled:opacity-65 ${
                      isSameRole || isNearbyActionDisabled
                        ? 'bg-[#FFF0F4] border-[#E8AFC3] text-[#5E364A] cursor-not-allowed'
                        : 'bg-[#FFF6F9] border-[#F1AFC8] text-[#360D21] cursor-pointer hover:border-[#D6286C] active:scale-[0.98]'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <span className="truncate">{peer.label}</span>
                      {peerRoleLabel && (
                        <span className="text-[11px] font-semibold text-[#5E364A] shrink-0">
                          ({peerRoleLabel})
                        </span>
                      )}
                    </span>
                    <span className={`shrink-0 inline-flex items-center gap-1 ${isSameRole ? 'text-[#9E194D] text-[11px]' : 'text-[#D6286C]'}`}>
                      {isSameRole ? (
                        'نفس النسخة (غير متوافق)'
                      ) : isConnectingThisPeer ? (
                        <>
                          <Loader2
                            className={`w-3.5 h-3.5 ${motionEnabled ? 'animate-spin' : ''}`}
                            aria-hidden="true"
                          />
                          <span>جارٍ الاتصال...</span>
                        </>
                      ) : (
                        'اقتران'
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <p className="text-[11px] text-[#5E364A] leading-relaxed">
          {isHusband
            ? 'على المتصفح تُستخدم المزامنة السحابية أعلاه؛ وعند تثبيت تطبيق أندرويد يتفعّل البلوتوث وWi-Fi Direct لاستقبال اختيارات الزوجة حتى بدون إنترنت.'
            : 'على المتصفح تُستخدم المزامنة السحابية أعلاه؛ وعند تثبيت تطبيق أندرويد يتفعّل البلوتوث وWi-Fi Direct لمشاركة اختياراتكِ حتى بدون إنترنت.'}
        </p>
      )}
    </div>
  );
}
