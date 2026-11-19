import type { User } from 'firebase/auth';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { ChatMessage, DeviceRole, GameProgress } from '../data/types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  decryptChatMessageFromCloud,
  decryptSnapshotFromCloud,
  deriveJoinTokenHash,
  encryptChatMessageForCloud,
  encryptSnapshotForCloud,
  generateCloudInviteCredentials,
  parseCloudInviteCode,
  type DecryptedCloudSnapshot,
} from '../utils/cloudCrypto';
import { formatCloudErrorMessage } from '../utils/cloudErrors';
import { sanitizeDeviceId, sanitizeShortName } from '../utils/sanitize';

export type CloudSyncStatus =
  | 'signed-out'
  | 'unlinked'
  | 'offline-pending'
  | 'syncing'
  | 'synced'
  | 'error';

export interface CloudVaultDoc {
  vaultId: string;
  ownerUid: string;
  wifeUid: string;
  husbandUid: string;
  memberUids: string[];
  wifeName: string;
  husbandName: string;
  joinTokenHash: string;
  joinProofHash: string;
  cipherText: string;
  cipherIv: string;
  sourceDeviceId: string;
  clientUpdatedAt: number;
}

const MAX_CLOUD_CIPHERTEXT_LEN = 131_072;

async function deleteMessagesInVault(
  vaultId: string,
  upToClientCreatedAt?: number
): Promise<void> {
  const messagesCol = collection(db, 'vaults', vaultId, 'messages');
  const hasRange =
    typeof upToClientCreatedAt === 'number' &&
    Number.isFinite(upToClientCreatedAt) &&
    upToClientCreatedAt > 0;

  while (true) {
    const q = hasRange
      ? query(messagesCol, where('clientCreatedAt', '<=', upToClientCreatedAt), limit(400))
      : query(messagesCol, limit(400));
    const snap = await getDocs(q);
    if (snap.empty) break;
    const batch = writeBatch(db);
    for (const msgDoc of snap.docs) {
      batch.delete(msgDoc.ref);
    }
    await batch.commit();
    if (snap.size < 400) break;
  }
}

export async function ensureUserCloudProfile(
  user: User,
  progress: GameProgress,
  vaultId: string | null,
  options?: { forceResetRole?: boolean }
): Promise<string | null> {
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const safeName = sanitizeShortName(
    progress.playerName,
    progress.role === 'husband' ? 'الزوج' : 'الزوجة'
  );
  const safeDeviceId = sanitizeDeviceId(progress.deviceId);
  const cleanVaultId = vaultId && /^[a-zA-Z0-9_-]{8,64}$/.test(vaultId) ? vaultId : '';

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        role: progress.role,
        displayName: safeName,
        deviceId: safeDeviceId,
        vaultId: cleanVaultId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return cleanVaultId || null;
    }

    const existingData = snap.data() as {
      role?: DeviceRole;
      vaultId?: string;
      displayName?: string;
      deviceId?: string;
    };

    // firestore.rules treats role as immutable on update; recreate profile cleanly after offline role switch
    if (options?.forceResetRole || existingData.role !== progress.role) {
      await deleteDoc(userRef);
      await setDoc(userRef, {
        uid: user.uid,
        role: progress.role,
        displayName: safeName,
        deviceId: safeDeviceId,
        vaultId: cleanVaultId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return cleanVaultId || null;
    }

    const resolvedVaultId = cleanVaultId || existingData.vaultId || '';
    if (
      existingData.displayName !== safeName ||
      existingData.deviceId !== safeDeviceId ||
      (cleanVaultId && existingData.vaultId !== cleanVaultId)
    ) {
      await updateDoc(userRef, {
        displayName: safeName,
        deviceId: safeDeviceId,
        vaultId: resolvedVaultId,
        updatedAt: serverTimestamp(),
      });
    }
    return resolvedVaultId || null;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createCoupleCloudVault(
  user: User,
  progress: GameProgress
): Promise<{ vaultId: string; vaultKey: string; inviteCode: string }> {
  if (!user.emailVerified) {
    throw new Error('يرجى تسجيل الدخول بحساب Google موثّق البريد الإلكتروني قبل إنشاء الخزنة.');
  }
  const { vaultId, vaultKey, inviteCode } = generateCloudInviteCredentials();
  const joinTokenHash = await deriveJoinTokenHash(vaultKey);
  const path = `vaults/${vaultId}`;
  const vaultRef = doc(db, 'vaults', vaultId);
  const userRef = doc(db, 'users', user.uid);
  const isWife = progress.role === 'wife';
  const safeName = sanitizeShortName(progress.playerName, isWife ? 'الزوجة' : 'الزوج');
  const safeDeviceId = sanitizeDeviceId(progress.deviceId);

  let cipherText = '';
  let cipherIv = '';
  const clientUpdatedAt = progress.modeProgress.questions.updatedAt ?? Date.now();

  if (isWife) {
    const encrypted = await encryptSnapshotForCloud(
      {
        answersBySet: progress.answersBySet,
        completedSetIds: progress.completedSetIds,
        updatedAt: clientUpdatedAt,
        playerName: safeName,
      },
      vaultKey
    );
    if (encrypted.cipherText.length > MAX_CLOUD_CIPHERTEXT_LEN) {
      throw new Error('حجم الإجابات يتجاوز الحد المسموح للمزامنة السحابية.');
    }
    cipherText = encrypted.cipherText;
    cipherIv = encrypted.cipherIv;
  }

  let userNeedsCreate = true;
  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const existingData = userSnap.data() as { role?: DeviceRole };
      if (existingData.role !== progress.role) {
        await deleteDoc(userRef);
        userNeedsCreate = true;
      } else {
        userNeedsCreate = false;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
  }

  try {
    const batch = writeBatch(db);
    batch.set(vaultRef, {
      vaultId,
      ownerUid: user.uid,
      wifeUid: isWife ? user.uid : '',
      husbandUid: isWife ? '' : user.uid,
      memberUids: [user.uid],
      wifeName: isWife ? 'الشريكة' : '',
      husbandName: isWife ? '' : 'الشريك',
      joinTokenHash,
      joinProofHash: '',
      cipherText,
      cipherIv,
      sourceDeviceId: safeDeviceId,
      clientUpdatedAt,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (userNeedsCreate) {
      batch.set(userRef, {
        uid: user.uid,
        role: progress.role,
        displayName: safeName,
        deviceId: safeDeviceId,
        vaultId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(userRef, {
        displayName: safeName,
        deviceId: safeDeviceId,
        vaultId,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return { vaultId, vaultKey, inviteCode };
}

export async function joinCoupleCloudVault(
  user: User,
  progress: GameProgress,
  rawInviteCode: string
): Promise<{ vaultId: string; vaultKey: string }> {
  if (!user.emailVerified) {
    throw new Error('يرجى تسجيل الدخول بحساب Google موثّق البريد الإلكتروني قبل الانضمام.');
  }
  const parsed = parseCloudInviteCode(rawInviteCode);
  if (!parsed) {
    throw new Error('رمز الربط السحابي غير صالح؛ يرجى التحقق من الرمز والمحاولة مجدداً.');
  }

  const { vaultId, vaultKey } = parsed;
  const joinProofHash = await deriveJoinTokenHash(vaultKey);
  const path = `vaults/${vaultId}`;
  const vaultRef = doc(db, 'vaults', vaultId);
  const userRef = doc(db, 'users', user.uid);
  const safeName = sanitizeShortName(
    progress.playerName,
    progress.role === 'husband' ? 'الزوج' : 'الزوجة'
  );
  const safeDeviceId = sanitizeDeviceId(progress.deviceId);

  let userNeedsCreate = true;
  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const existingData = userSnap.data() as { role?: DeviceRole; vaultId?: string };
      if (existingData.vaultId === vaultId) {
        throw new Error('هذا الحساب مرتبط بالفعل بهذه الخزنة نفسها.');
      }
      if (existingData.role !== progress.role) {
        await deleteDoc(userRef);
        userNeedsCreate = true;
      } else {
        userNeedsCreate = false;
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('هذا الحساب مرتبط بالفعل')) {
      throw error;
    }
    handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
  }

  try {
    const batch = writeBatch(db);
    if (progress.role === 'husband') {
      batch.update(vaultRef, {
        husbandUid: user.uid,
        husbandName: 'الشريك',
        memberUids: arrayUnion(user.uid),
        joinProofHash,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(vaultRef, {
        wifeUid: user.uid,
        wifeName: 'الشريكة',
        memberUids: arrayUnion(user.uid),
        joinProofHash,
        updatedAt: serverTimestamp(),
      });
    }

    if (userNeedsCreate) {
      batch.set(userRef, {
        uid: user.uid,
        role: progress.role,
        displayName: safeName,
        deviceId: safeDeviceId,
        vaultId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(userRef, {
        displayName: safeName,
        deviceId: safeDeviceId,
        vaultId,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } catch (wrapped) {
      throw new Error(formatCloudErrorMessage(wrapped, undefined, 'join'));
    }
  }

  return { vaultId, vaultKey };
}

export async function pushEncryptedSnapshotToCloud(
  user: User,
  progress: GameProgress,
  vaultId: string,
  vaultKey: string
): Promise<number> {
  const path = `vaults/${vaultId}`;
  const vaultRef = doc(db, 'vaults', vaultId);
  const safeName = sanitizeShortName(
    progress.playerName,
    progress.role === 'husband' ? 'الزوج' : 'الزوجة'
  );

  if (progress.role !== 'wife') {
    try {
      await updateDoc(vaultRef, {
        husbandName: 'الشريك',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
    return Date.now();
  }

  const updatedAt = progress.modeProgress.questions.updatedAt ?? Date.now();
  const encrypted = await encryptSnapshotForCloud(
    {
      answersBySet: progress.answersBySet,
      completedSetIds: progress.completedSetIds,
      updatedAt,
      playerName: safeName,
    },
    vaultKey
  );

  if (encrypted.cipherText.length > MAX_CLOUD_CIPHERTEXT_LEN) {
    throw new Error('حجم الإجابات يتجاوز الحد المسموح للمزامنة السحابية.');
  }

  try {
    await updateDoc(vaultRef, {
      wifeName: 'الشريكة',
      cipherText: encrypted.cipherText,
      cipherIv: encrypted.cipherIv,
      sourceDeviceId: sanitizeDeviceId(progress.deviceId),
      clientUpdatedAt: updatedAt,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  return updatedAt;
}

export async function fetchCoupleCloudVaultSnapshot(
  vaultId: string,
  vaultKey: string
): Promise<{
  vault: CloudVaultDoc;
  decryptedSnapshot: DecryptedCloudSnapshot | null;
} | null> {
  const path = `vaults/${vaultId}`;
  const vaultRef = doc(db, 'vaults', vaultId);
  try {
    const snap = await getDoc(vaultRef);
    if (!snap.exists()) return null;
    const data = snap.data() as CloudVaultDoc;
    if (!data.cipherText || !data.cipherIv) {
      return { vault: data, decryptedSnapshot: null };
    }
    const decryptedSnapshot = await decryptSnapshotFromCloud(
      data.cipherText,
      data.cipherIv,
      vaultKey
    );
    return { vault: data, decryptedSnapshot };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToCoupleCloudVault(
  vaultId: string,
  vaultKey: string,
  onVaultUpdate: (payload: {
    vault: CloudVaultDoc;
    decryptedSnapshot: DecryptedCloudSnapshot | null;
  }) => void,
  onVaultDeleted: () => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `vaults/${vaultId}`;
  const vaultRef = doc(db, 'vaults', vaultId);

  let latestVaultSeq = 0;

  return onSnapshot(
    vaultRef,
    (snapshot) => {
      const seq = ++latestVaultSeq;
      if (!snapshot.exists()) {
        onVaultDeleted();
        return;
      }
      const data = snapshot.data() as CloudVaultDoc;
      if (!data.cipherText || !data.cipherIv) {
        onVaultUpdate({ vault: data, decryptedSnapshot: null });
        return;
      }
      void decryptSnapshotFromCloud(data.cipherText, data.cipherIv, vaultKey)
        .then((decryptedSnapshot) => {
          if (seq !== latestVaultSeq) return;
          onVaultUpdate({ vault: data, decryptedSnapshot });
        })
        .catch((err) => {
          if (seq !== latestVaultSeq) return;
          onError(err instanceof Error ? err : new Error('تعذّر فك تشفير بيانات الخزنة السحابية'));
        });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function unlinkCoupleCloudVault(
  user: User,
  role: DeviceRole,
  vaultId: string,
  options?: { skipUserProfileReset?: boolean }
): Promise<void> {
  const vaultPath = `vaults/${vaultId}`;
  const vaultRef = doc(db, 'vaults', vaultId);
  const userRef = doc(db, 'users', user.uid);

  let userProfileExists = false;
  if (!options?.skipUserProfileReset) {
    try {
      const userSnap = await getDoc(userRef);
      userProfileExists = userSnap.exists();
    } catch {
      userProfileExists = false;
    }
  }

  try {
    const snap = await getDoc(vaultRef);
    let hasVaultOp = false;
    const batch = writeBatch(db);

    if (snap.exists()) {
      const data = snap.data() as Partial<CloudVaultDoc>;
      if (data.ownerUid === user.uid) {
        // Must delete subcollection messages before deleting parent vault so isVaultMember() holds
        await deleteMessagesInVault(vaultId);
        batch.delete(vaultRef);
        hasVaultOp = true;
      } else if (role === 'husband' && data.husbandUid === user.uid) {
        batch.update(vaultRef, {
          husbandUid: '',
          husbandName: '',
          joinProofHash: '',
          memberUids: arrayRemove(user.uid),
          updatedAt: serverTimestamp(),
        });
        hasVaultOp = true;
      } else if (role === 'wife' && data.wifeUid === user.uid) {
        batch.update(vaultRef, {
          wifeUid: '',
          wifeName: '',
          joinProofHash: '',
          memberUids: arrayRemove(user.uid),
          updatedAt: serverTimestamp(),
        });
        hasVaultOp = true;
      }
    }

    if (!options?.skipUserProfileReset && userProfileExists) {
      batch.update(userRef, {
        vaultId: '',
        updatedAt: serverTimestamp(),
      });
      hasVaultOp = true;
    }

    if (hasVaultOp) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, vaultPath);
  }
}

export async function deleteUserCloudProfile(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  try {
    await deleteDoc(doc(db, 'users', user.uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, userPath);
  }
}

export interface CloudChatMessageDoc {
  messageId: string;
  vaultId: string;
  senderUid: string;
  senderRole: DeviceRole;
  senderDeviceId: string;
  cipherText: string;
  cipherIv: string;
  clientCreatedAt: number;
}

const MAX_CLOUD_CHAT_CIPHERTEXT_LEN = 4096;

export async function pushEncryptedChatMessageToCloud(
  user: User,
  vaultId: string,
  vaultKey: string,
  message: ChatMessage
): Promise<void> {
  if (!/^[a-zA-Z0-9_-]{4,64}$/.test(message.id)) {
    throw new Error('معرّف الرسالة غير صالح');
  }
  const path = `vaults/${vaultId}/messages/${message.id}`;
  const msgRef = doc(db, 'vaults', vaultId, 'messages', message.id);

  const encrypted = await encryptChatMessageForCloud(
    {
      id: message.id,
      text: message.text,
      senderName: message.senderName,
      createdAt: message.createdAt,
    },
    vaultKey
  );

  if (encrypted.cipherText.length > MAX_CLOUD_CHAT_CIPHERTEXT_LEN) {
    throw new Error('طول الرسالة يتجاوز الحد المسموح للمزامنة السحابية');
  }

  try {
    await setDoc(msgRef, {
      messageId: message.id,
      vaultId,
      senderUid: user.uid,
      senderRole: message.senderRole,
      senderDeviceId: sanitizeDeviceId(message.senderDeviceId),
      cipherText: encrypted.cipherText,
      cipherIv: encrypted.cipherIv,
      clientCreatedAt: Math.max(0, Math.floor(message.createdAt)),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToCloudChatMessages(
  vaultId: string,
  vaultKey: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError: (err: Error) => void
): Unsubscribe {
  const path = `vaults/${vaultId}/messages`;
  const messagesQuery = query(
    collection(db, 'vaults', vaultId, 'messages'),
    orderBy('clientCreatedAt', 'asc'),
    limitToLast(200)
  );

  let latestSeq = 0;
  const decryptedCache = new Map<string, ChatMessage>();

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const seq = ++latestSeq;
      const docs = snapshot.docs.map((d) => d.data() as CloudChatMessageDoc);
      void Promise.all(
        docs.map(async (item): Promise<ChatMessage | null> => {
          const cacheKey = `${item.messageId}:${item.cipherIv}:${item.cipherText}:${item.clientCreatedAt}:${item.senderRole}:${item.senderDeviceId}`;
          const cached = decryptedCache.get(cacheKey);
          if (cached) {
            return cached;
          }
          const decrypted = await decryptChatMessageFromCloud(
            item.cipherText,
            item.cipherIv,
            vaultKey
          );
          if (!decrypted) return null;
          const built: ChatMessage = {
            id: item.messageId || decrypted.id,
            senderRole: item.senderRole === 'husband' ? 'husband' : 'wife',
            senderName: decrypted.senderName,
            senderDeviceId: item.senderDeviceId || 'cloud-peer',
            text: decrypted.text,
            createdAt:
              typeof item.clientCreatedAt === 'number'
                ? item.clientCreatedAt
                : decrypted.createdAt,
            deliveredVia: 'cloud',
            pendingNearbyAck: false,
            pendingCloudUpload: false,
          };
          if (decryptedCache.size >= 250) {
            decryptedCache.clear();
          }
          decryptedCache.set(cacheKey, built);
          return built;
        })
      ).then((resolved) => {
        if (seq !== latestSeq) return;
        onMessages(resolved.filter((m): m is ChatMessage => m !== null));
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

export async function clearCloudChatMessages(
  vaultId: string,
  upToClientCreatedAt?: number
): Promise<void> {
  const path = `vaults/${vaultId}/messages`;

  try {
    await deleteMessagesInVault(vaultId, upToClientCreatedAt);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
