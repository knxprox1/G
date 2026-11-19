import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  applyIncomingPartnerSnapshot,
  canConfirmQuestion,
  computePartnerConnectionStatus,
  confirmQuestionAnswer,
  createInitialProgress,
  DEFAULT_HUSBAND_NAME,
  DEFAULT_WIFE_NAME,
  formatQuestionsCountArabic,
  getDefaultPartnerName,
  getNextIncompleteRealm,
  getNextIncompleteSetInRealm,
  getNextUnansweredIndexAfter,
  getNextUnansweredQuestionIndex,
  getOverallProgress,
  getPlatformProgress,
  getQuestionsViewProgress,
  getRealmProgress,
  getResumeTarget,
  getSetProgress,
  getNextMonotonicQuestionTimestamp,
  lockInitialDeviceRole,
  parseStoredProgress,
  resetSetProgress,
  shouldAcceptPartnerSnapshotUpdate,
  shouldApplyIncomingSnapshotRevision,
  switchDeviceRole,
  toArabicDigits,
  formatSetsCount,
  toggleOptionSelection,
  unpinPartnerDevice,
} from './engine';
import type { GameProgress } from '../data/types';
import { GAME_MODES, GAME_REALMS, HOME_ARTWORK_SRC } from '../data/gameData';
import { buildAnswerQissasa } from './reflection';
import {
  computeBatchOverlayPopCount,
  computeCollapseToHomeDelta,
  findBackDelta,
  getImmediateParentScreen,
  type AppHistoryEntry,
} from '../utils/backNavigation';
import { formatCloudErrorMessage } from '../utils/cloudErrors';
import { base64ToBytes, bytesToBase64 } from '../utils/encoding';
import { isSafeIdentifier, sanitizeDeviceId, sanitizeShortName } from '../utils/sanitize';
import {
  buildAnswersSnapshotPacket,
  buildHelloPacket,
  buildLiveEventPacket,
  ChunkAssembler,
  encodePacketFrames,
  encodeSyncPacket,
  NEARBY_SAFE_FRAME_BYTES,
  parseSyncPacket,
} from '../sync/protocol';
import { LiveSessionBus, type SyncTransport } from '../sync/liveBus';
import { formatNearbyErrorMessage } from '../sync/capacitorBridge';
import {
  attemptPinUnlock,
  consumePendingStorageWriteIssues,
  createInitialSecurityConfig,
  generatePinSalt,
  hashPinWithSalt,
  isLocalVaultWriteProtected,
  recordBootStorageIssue,
  reportStorageWriteIssue,
  resetLocalVaultSecurityStateForTests,
  sealLocalStoragePayload,
  shouldBlockEncryptedStorageOverwrite,
  subscribeStorageWriteIssues,
  unsealLocalStoragePayload,
  verifyPinDigest,
  type SecurityConfig,
  type StorageWriteIssue,
} from '../utils/security';
import {
  buildCloudInviteShareUrl,
  decryptChatMessageFromCloud,
  decryptSnapshotFromCloud,
  DEFAULT_PUBLIC_WEB_APP_URL,
  deriveJoinTokenHash,
  encryptChatMessageForCloud,
  encryptSnapshotForCloud,
  extractInviteCodeFromUrl,
  generateCloudInviteCredentials,
  parseCloudInviteCode,
} from '../utils/cloudCrypto';
import { parseUpdatedSyncSetIds } from '../utils/syncMarkers';
import {
  clearLocalChatHistory,
  clearPendingCloudClearWatermark,
  createInitialChatStore,
  createLocalChatMessage,
  markChatMessageDelivered,
  MAX_CHAT_HISTORY,
  mergeIncomingChatMessage,
  mergeIncomingChatMessagesBatch,
  parseChatStore,
} from '../utils/chatStorage';
import {
  clearAllSessionDrafts,
  clearChatDraft,
  clearQuestionDraft,
  clearQuestionDraftsForSet,
  loadChatDraft,
  loadQuestionDraft,
  saveChatDraft,
  saveQuestionDraft,
} from '../utils/sessionDrafts';

test('multi-select toggle adds and removes multiple options cleanly', () => {
  let picks: string[] = [];
  picks = toggleOptionSelection(picks, 'opt-1', true);
  assert.deepEqual(picks, ['opt-1']);

  picks = toggleOptionSelection(picks, 'opt-3', true);
  assert.deepEqual(picks, ['opt-1', 'opt-3']);

  picks = toggleOptionSelection(picks, 'opt-1', true);
  assert.deepEqual(picks, ['opt-3']);
});

test('single-select toggle enforces at most one selected option', () => {
  let picks: string[] = [];
  picks = toggleOptionSelection(picks, 'opt-1', false);
  assert.deepEqual(picks, ['opt-1']);

  picks = toggleOptionSelection(picks, 'opt-2', false);
  assert.deepEqual(picks, ['opt-2']);

  picks = toggleOptionSelection(picks, 'opt-2', false);
  assert.deepEqual(picks, []);
});

test('multi-select respects optional maxSelect cap', () => {
  let picks = ['opt-1', 'opt-2'];
  picks = toggleOptionSelection(picks, 'opt-3', true, 2);
  assert.deepEqual(picks, ['opt-2', 'opt-3']);
});

test('canConfirmQuestion requires at least minSelect options', () => {
  assert.equal(canConfirmQuestion([], 1), false);
  assert.equal(canConfirmQuestion(['opt-1'], 1), true);
  assert.equal(canConfirmQuestion(['opt-1', 'opt-2'], 1), true);
});

test('confirmQuestionAnswer persists multi-select answers and marks set complete when all answered', () => {
  let progress = createInitialProgress();
  const firstRealm = GAME_REALMS[0];
  const firstSet = firstRealm.sets[0];
  const totalQ = firstSet.questions.length;

  for (let i = 0; i < totalQ - 1; i++) {
    progress = confirmQuestionAnswer(
      progress,
      firstSet.id,
      firstSet.questions[i].id,
      ['opt-1', 'opt-2'],
      totalQ
    );
  }

  let setSummary = getSetProgress(progress, firstSet);
  assert.equal(setSummary.answeredQuestions, totalQ - 1);
  assert.equal(setSummary.totalSelectionsCount, (totalQ - 1) * 2);
  assert.equal(setSummary.isCompleted, false);
  assert.equal(setSummary.status, 'in-progress');

  // Answer final question
  progress = confirmQuestionAnswer(
    progress,
    firstSet.id,
    firstSet.questions[totalQ - 1].id,
    ['opt-3'],
    totalQ
  );

  setSummary = getSetProgress(progress, firstSet);
  assert.equal(setSummary.answeredQuestions, totalQ);
  assert.equal(setSummary.isCompleted, true);
  assert.equal(setSummary.percent, 100);
  assert.equal(setSummary.status, 'completed');
});

test('getSetProgress derives completion strictly from answered questions even if completedSetIds is stale', () => {
  const firstSet = GAME_REALMS[0].sets[0];
  const progress = {
    ...createInitialProgress(),
    answersBySet: {
      [firstSet.id]: {
        [firstSet.questions[2].id]: ['opt-1'],
      },
    },
    completedSetIds: [firstSet.id],
  };

  const summary = getSetProgress(progress, firstSet);
  assert.equal(summary.answeredQuestions, 1);
  assert.equal(summary.isCompleted, false);
  assert.equal(summary.status, 'in-progress');
  assert.equal(getNextUnansweredQuestionIndex(progress.answersBySet[firstSet.id], firstSet), 0);
});

test('getRealmProgress and getOverallProgress compute realm completion when all sets finish', () => {
  let progress = createInitialProgress();
  const realm = GAME_REALMS[0];

  for (const set of realm.sets) {
    for (const q of set.questions) {
      progress = confirmQuestionAnswer(progress, set.id, q.id, ['opt-1'], set.questions.length);
    }
  }

  const realmSummary = getRealmProgress(progress, realm);
  assert.equal(realmSummary.isRealmCompleted, true);
  assert.equal(realmSummary.percent, 100);

  const overall = getOverallProgress(progress, GAME_REALMS);
  assert.equal(overall.completedRealms, 1);
  assert.equal(overall.completedSets, realm.sets.length);

  const nextRealm = getNextIncompleteRealm(progress, GAME_REALMS, realm.id);
  assert.equal(nextRealm?.id, GAME_REALMS[1].id);
});

test('getResumeTarget prioritizes in-progress level and returns null when empty', () => {
  let progress = createInitialProgress();
  assert.equal(getResumeTarget(progress, GAME_REALMS), null);

  const targetSet = GAME_REALMS[1].sets[1];
  progress = confirmQuestionAnswer(
    progress,
    targetSet.id,
    targetSet.questions[0].id,
    ['opt-2'],
    targetSet.questions.length
  );

  const resume = getResumeTarget(progress, GAME_REALMS);
  assert.equal(resume?.realm.id, GAME_REALMS[1].id);
  assert.equal(resume?.set.id, targetSet.id);
  assert.equal(resume?.questionIndex, 1);
});

test('resetSetProgress clears only the specified set', () => {
  let progress = createInitialProgress();
  const set1 = GAME_REALMS[0].sets[0];
  const set2 = GAME_REALMS[0].sets[1];

  for (const q of set1.questions) {
    progress = confirmQuestionAnswer(progress, set1.id, q.id, ['opt-1'], set1.questions.length);
  }
  for (const q of set2.questions) {
    progress = confirmQuestionAnswer(progress, set2.id, q.id, ['opt-2'], set2.questions.length);
  }

  progress = resetSetProgress(progress, set1.id);
  assert.equal(getSetProgress(progress, set1).status, 'new');
  assert.equal(getSetProgress(progress, set2).status, 'completed');
});

test('parseStoredProgress sanitizes corrupted payloads safely', () => {
  const corrupted = parseStoredProgress('not-valid-json');
  const fresh = createInitialProgress();
  assert.equal(corrupted.role, fresh.role);
  assert.equal(corrupted.playerName, fresh.playerName);
  assert.deepEqual(corrupted.answersBySet, fresh.answersBySet);
  assert.ok(corrupted.deviceId.startsWith('lw-'));

  const sanitized = parseStoredProgress(
    JSON.stringify({
      playerName: '   ',
      answersBySet: {
        badSet: 'oops',
        'realm-01-beliefs-set-1': {
          q1: ['opt-1', 123, null],
          q2: 'not-array',
        },
      },
      completedSetIds: ['realm-01-beliefs-set-1', 42],
      settings: { soundEnabled: false, motionEnabled: 'yes' },
    })
  );

  assert.equal(sanitized.playerName, createInitialProgress().playerName);
  assert.deepEqual(sanitized.answersBySet, {
    'realm-01-beliefs-set-1': { q1: ['opt-1'] },
  });
  assert.deepEqual(sanitized.completedSetIds, ['realm-01-beliefs-set-1']);
  assert.equal(sanitized.settings.soundEnabled, false);
  assert.equal(sanitized.settings.motionEnabled, true);
});

test('toArabicDigits and formatSetsCount format Arabic numerals and grammar', () => {
  assert.equal(toArabicDigits(14), '١٤');
  assert.equal(toArabicDigits(0), '٠');
  assert.equal(formatSetsCount(1), 'مستوى واحد');
  assert.equal(formatSetsCount(2), 'مستويان');
  assert.equal(formatSetsCount(3), '٣ مستويات');
});

test('getNextIncompleteSetInRealm wraps around to earlier incomplete sets when higher tier is finished first', () => {
  let progress = createInitialProgress();
  const realm = GAME_REALMS[0];
  const tier3 = realm.sets[2];

  for (const q of tier3.questions) {
    progress = confirmQuestionAnswer(progress, tier3.id, q.id, ['opt-1'], tier3.questions.length);
  }

  const nextSet = getNextIncompleteSetInRealm(progress, realm, tier3.id);
  assert.equal(nextSet?.id, realm.sets[0].id);

  // Completing tier 1 should suggest tier 2
  const tier1 = realm.sets[0];
  for (const q of tier1.questions) {
    progress = confirmQuestionAnswer(progress, tier1.id, q.id, ['opt-1'], tier1.questions.length);
  }
  assert.equal(getNextIncompleteSetInRealm(progress, realm, tier1.id)?.id, realm.sets[1].id);

  // Completing tier 2 leaves no incomplete sets in this realm
  const tier2 = realm.sets[1];
  for (const q of tier2.questions) {
    progress = confirmQuestionAnswer(progress, tier2.id, q.id, ['opt-1'], tier2.questions.length);
  }
  assert.equal(getNextIncompleteSetInRealm(progress, realm, tier2.id), null);
});

test('getNextUnansweredIndexAfter skips answered questions and wraps cleanly', () => {
  const set = GAME_REALMS[0].sets[0];
  let progress = createInitialProgress();
  progress = confirmQuestionAnswer(progress, set.id, set.questions[1].id, ['opt-1'], set.questions.length);

  // From index 0, index 1 is answered so it jumps to index 2
  assert.equal(getNextUnansweredIndexAfter(progress.answersBySet[set.id], set, 0), 2);

  // From the last question, wraps around to index 0 (unanswered)
  assert.equal(
    getNextUnansweredIndexAfter(progress.answersBySet[set.id], set, set.questions.length - 1),
    0
  );

  // When all questions are answered, returns -1
  for (const q of set.questions) {
    progress = confirmQuestionAnswer(progress, set.id, q.id, ['opt-1'], set.questions.length);
  }
  assert.equal(getNextUnansweredIndexAfter(progress.answersBySet[set.id], set, 0), -1);
});

test('buildAnswerQissasa generates tailored descriptive reflections and supports custom option reflections', () => {
  const realm = GAME_REALMS[2]; // علاقتكِ بجسدكِ
  const set = realm.sets[0];
  const q1 = set.questions[0];

  const multiQissasa = buildAnswerQissasa({
    realm,
    set,
    question: q1,
    questionNumber: 1,
    selectedIds: [q1.options[0].id, q1.options[1].id],
  });
  assert.equal(multiQissasa.selectedOptions.length, 2);
  assert.ok(multiQissasa.choiceEcho.includes(q1.options[0].label));
  assert.ok(multiQissasa.diagnosticText.length > 15);

  const customQuestion = {
    ...q1,
    options: q1.options.map((o, idx) =>
      idx === 0 ? { ...o, reflection: 'عبارة تشخيصية مخصصة لهذا الخيار بعينه.' } : o
    ),
  };
  const customQissasa = buildAnswerQissasa({
    realm,
    set,
    question: customQuestion,
    questionNumber: 1,
    selectedIds: [customQuestion.options[0].id],
  });
  assert.equal(customQissasa.diagnosticText, 'عبارة تشخيصية مخصصة لهذا الخيار بعينه.');
});

test('confirmQuestionAnswer deduplicates repeated option IDs', () => {
  const firstSet = GAME_REALMS[0].sets[0];
  const firstQ = firstSet.questions[0];
  let progress = createInitialProgress();
  progress = confirmQuestionAnswer(
    progress,
    firstSet.id,
    firstQ.id,
    ['opt-1', 'opt-2', 'opt-1', 'opt-2'],
    firstSet.questions.length
  );

  assert.deepEqual(progress.answersBySet[firstSet.id]?.[firstQ.id], ['opt-1', 'opt-2']);
  assert.equal(getSetProgress(progress, firstSet).totalSelectionsCount, 2);
});

test('getOverallProgress.totalSelectionsCount ignores orphaned sets and deleted question IDs', () => {
  const firstSet = GAME_REALMS[0].sets[0];
  const firstQ = firstSet.questions[0];
  let progress = createInitialProgress();
  progress = confirmQuestionAnswer(
    progress,
    firstSet.id,
    firstQ.id,
    ['opt-1', 'opt-2'],
    firstSet.questions.length
  );

  progress = {
    ...progress,
    answersBySet: {
      ...progress.answersBySet,
      [firstSet.id]: {
        ...progress.answersBySet[firstSet.id],
        'orphaned-question-id': ['opt-1', 'opt-2', 'opt-3'],
      },
      'orphaned-set-id': {
        q1: ['opt-1', 'opt-2'],
      },
    },
  };

  const overall = getOverallProgress(progress, GAME_REALMS);
  assert.equal(overall.answeredQuestions, 1);
  assert.equal(overall.totalSelectionsCount, 2);
});

test('dataset & artwork integrity: all 20 realms, 60 sets, questions, options, and local image assets are valid', () => {
  assert.equal(GAME_REALMS.length, 20);
  assert.ok(GAME_MODES.length >= 4);

  const cwd = process.cwd();
  const checkAssetExists = (artworkSrc: string, label: string) => {
    assert.ok(artworkSrc.startsWith('/src/assets/images/'), `${label} invalid artworkSrc: ${artworkSrc}`);
    const diskPath = path.join(cwd, artworkSrc.replace(/^\//, ''));
    assert.ok(fs.existsSync(diskPath), `${label} missing artwork file on disk: ${diskPath}`);
  };

  checkAssetExists(HOME_ARTWORK_SRC, 'HOME_ARTWORK_SRC');
  for (const mode of GAME_MODES) {
    checkAssetExists(mode.artworkSrc, `mode ${mode.id}`);
  }

  const realmIds = new Set<string>();
  const setIds = new Set<string>();
  let totalSets = 0;

  for (const realm of GAME_REALMS) {
    assert.ok(realm.id && !realmIds.has(realm.id), `Duplicate or empty realm id: ${realm.id}`);
    realmIds.add(realm.id);
    assert.ok(realm.title.trim().length > 0, `Realm ${realm.id} missing title`);
    checkAssetExists(realm.artworkSrc, `realm ${realm.id}`);
    assert.equal(realm.sets.length, 3, `Realm ${realm.id} expected 3 boldness tiers`);

    for (const set of realm.sets) {
      totalSets += 1;
      assert.ok(set.id && !setIds.has(set.id), `Duplicate or empty set id: ${set.id}`);
      setIds.add(set.id);
      assert.ok(set.questions.length > 0, `Set ${set.id} has no questions`);

      const questionIds = new Set<string>();
      for (const q of set.questions) {
        assert.ok(q.id && !questionIds.has(q.id), `Duplicate question id ${q.id} in set ${set.id}`);
        questionIds.add(q.id);
        assert.ok(q.prompt.trim().length > 0, `Empty prompt in ${set.id}/${q.id}`);
        assert.ok(q.options.length >= 2, `Expected >=2 options in ${set.id}/${q.id}`);
        assert.ok(q.minSelect >= 1 && q.minSelect <= q.options.length, `Invalid minSelect in ${set.id}/${q.id}`);
        if (typeof q.maxSelect === 'number') {
          assert.ok(q.maxSelect >= q.minSelect, `Invalid maxSelect in ${set.id}/${q.id}`);
        }

        const optIds = new Set<string>();
        for (const opt of q.options) {
          assert.ok(opt.id && !optIds.has(opt.id), `Duplicate option id ${opt.id} in ${set.id}/${q.id}`);
          optIds.add(opt.id);
          assert.ok(opt.label.trim().length > 0, `Empty option label in ${set.id}/${q.id}/${opt.id}`);
        }
      }
    }
  }

  assert.equal(totalSets, 60);
});

test('findBackDelta computes exact browser history steps for screen back and active overlays', () => {
  const stack: AppHistoryEntry[] = [
    { seq: 1, screen: 'home' },
    { seq: 2, screen: 'modes' },
    { seq: 3, screen: 'realms' },
    { seq: 4, screen: 'question' },
  ];

  // Direct back from question -> realms
  assert.equal(findBackDelta(stack, 'realms'), -1);

  // Target is not immediate parent -> fallback (0)
  assert.equal(findBackDelta(stack, 'modes'), 0);

  // When an overlay is open on top of question, back skips overlay + question atomically (-2)
  const stackWithOverlay: AppHistoryEntry[] = [
    ...stack,
    { seq: 5, screen: 'question', overlayId: 'question-modal' },
  ];
  assert.equal(findBackDelta(stackWithOverlay, 'realms'), -2);
  assert.equal(findBackDelta(stackWithOverlay, 'log'), 0);

  // Root entry has no parent
  assert.equal(findBackDelta([{ seq: 1, screen: 'home' }], 'home'), 0);
});

test('getQuestionsViewProgress and applyIncomingPartnerSnapshot isolate local vs partner answers by role', () => {
  const firstSet = GAME_REALMS[0].sets[0];
  let wifeProgress = createInitialProgress('wife', true);
  wifeProgress = confirmQuestionAnswer(
    wifeProgress,
    firstSet.id,
    firstSet.questions[0].id,
    ['opt-2'],
    firstSet.questions.length
  );

  // Local wife answers show in wife mode
  assert.deepEqual(getQuestionsViewProgress(wifeProgress).answersBySet[firstSet.id], {
    [firstSet.questions[0].id]: ['opt-2'],
  });

  // Husband starts empty until partner snapshot syncs
  let husbandProgress = createInitialProgress('husband', true);
  assert.deepEqual(getQuestionsViewProgress(husbandProgress).answersBySet, {});
  assert.equal(getPlatformProgress(husbandProgress, GAME_MODES, GAME_REALMS).partnerSynced, false);

  husbandProgress = applyIncomingPartnerSnapshot(husbandProgress, {
    partnerName: 'سارة',
    answersBySet: wifeProgress.answersBySet,
    completedSetIds: wifeProgress.completedSetIds,
    pairedDeviceId: wifeProgress.deviceId,
    pairedDeviceLabel: 'هاتف سارة',
    syncedAt: 1700000000000,
  });

  const husbandView = getQuestionsViewProgress(husbandProgress);
  assert.deepEqual(husbandView.answersBySet[firstSet.id], {
    [firstSet.questions[0].id]: ['opt-2'],
  });
  assert.equal(husbandProgress.partnerSnapshot.partnerName, 'سارة');
  assert.equal(husbandProgress.partnerSnapshot.lastSyncedAt, 1700000000000);
  assert.equal(getPlatformProgress(husbandProgress, GAME_MODES, GAME_REALMS).partnerSynced, true);
  // Original local answers on husband remain untouched
  assert.deepEqual(husbandProgress.answersBySet, {});
});

test('getPlatformProgress aggregates across modes and parseStoredProgress migrates legacy v1 data without duplication', () => {
  const legacyRaw = JSON.stringify({
    playerName: 'نور',
    answersBySet: {
      [GAME_REALMS[0].sets[0].id]: {
        [GAME_REALMS[0].sets[0].questions[0].id]: ['opt-1'],
      },
    },
    completedSetIds: [],
    settings: { soundEnabled: true, motionEnabled: false, hapticsEnabled: true },
  });

  const migrated = parseStoredProgress(legacyRaw);
  assert.equal(migrated.role, 'wife');
  assert.equal(migrated.playerName, 'نور');
  assert.ok(migrated.deviceId.startsWith('lw-'));
  assert.equal(
    migrated.answersBySet[GAME_REALMS[0].sets[0].id]?.[
      GAME_REALMS[0].sets[0].questions[0].id
    ]?.[0],
    'opt-1'
  );
  assert.equal('answersBySet' in migrated.modeProgress.questions, false);

  const enriched = {
    ...migrated,
    modeProgress: {
      ...migrated.modeProgress,
      cards: {
        sessionsCompleted: 2,
        drawnCount: 8,
        favoriteCardIds: ['c1', 'c2'],
        updatedAt: Date.now(),
      },
    },
  };

  const summary = getPlatformProgress(enriched, GAME_MODES, GAME_REALMS);
  assert.equal(summary.totalModes, GAME_MODES.length);
  assert.equal(summary.activeModesCount, 2);
  assert.equal(summary.totalRoundsCompleted, 2);
  assert.equal(summary.localRoundsCompleted, 2);
  assert.equal(summary.totalSavedEntries, 3); // 1 selection + 2 fav cards
  assert.equal(summary.partnerSynced, true);
});

test('sync protocol validates packets and rejects malformed payloads', () => {
  const wife = { ...createInitialProgress('wife', true), playerName: 'ليلى 🌹' };
  const hello = buildHelloPacket(wife);
  const parsedHello = parseSyncPacket(encodeSyncPacket(hello));
  assert.deepEqual(parsedHello, hello);

  const snapshot = buildAnswersSnapshotPacket(wife);
  const parsedSnap = parseSyncPacket(encodeSyncPacket(snapshot));
  assert.equal(parsedSnap?.kind, 'SYNC_ANSWERS');

  const live = buildLiveEventPacket(wife, {
    type: 'CARD_DRAWN',
    deckId: 'deck-1',
    cardId: 'card-7',
    drawnBy: 'wife',
    timestamp: 123456,
  });
  const parsedLive = parseSyncPacket(encodeSyncPacket(live));
  assert.equal(parsedLive?.kind, 'LIVE_EVENT');

  // Reject invalid / corrupted payloads
  assert.equal(parseSyncPacket('not-json'), null);
  assert.equal(parseSyncPacket(JSON.stringify({ kind: 'HELLO', deviceId: 'x', role: 'admin' })), null);
});

test('LiveSessionBus automatically exchanges wife answers snapshot to husband on connect, enforces role checks, and propagates HELLO updates', async () => {
  const firstSet = GAME_REALMS[0].sets[0];
  let wifeState = { ...createInitialProgress('wife', true), playerName: 'مريم' };
  wifeState = confirmQuestionAnswer(
    wifeState,
    firstSet.id,
    firstSet.questions[0].id,
    ['opt-1'],
    firstSet.questions.length
  );

  let husbandState = { ...createInitialProgress('husband', true), playerName: 'عمر' };

  const wifeBus = new LiveSessionBus(() => wifeState);
  const husbandBus = new LiveSessionBus(() => husbandState);

  const receivedLiveTypes: string[] = [];
  const helloNamesOnHusband: string[] = [];
  husbandBus.subscribeHello((packet) => {
    helloNamesOnHusband.push(packet.playerName);
  });
  husbandBus.subscribeSnapshot((packet) => {
    husbandState = applyIncomingPartnerSnapshot(husbandState, {
      partnerName: packet.playerName,
      answersBySet: packet.answersBySet,
      completedSetIds: packet.completedSetIds,
      pairedDeviceId: packet.deviceId,
      syncedAt: packet.updatedAt,
    });
  });
  husbandBus.subscribeLiveEvent((ev) => {
    receivedLiveTypes.push(ev.type);
  });

  const wifeToHusbandTransport: SyncTransport = {
    kind: 'capacitor-nearby',
    sendPacket: async (packet) => {
      await husbandBus.handleIncomingPacket(packet);
    },
    disconnect: async () => {},
  };

  const husbandToWifeTransport: SyncTransport = {
    kind: 'capacitor-nearby',
    sendPacket: async (packet) => {
      await wifeBus.handleIncomingPacket(packet);
    },
    disconnect: async () => {},
  };

  await wifeBus.attachTransport(wifeToHusbandTransport);
  await husbandBus.attachTransport(husbandToWifeTransport);

  assert.equal(wifeBus.getState().status, 'connected');
  assert.equal(husbandBus.getState().status, 'connected');
  assert.equal(husbandState.partnerSnapshot.partnerName, 'مريم');
  assert.deepEqual(husbandState.partnerSnapshot.answersBySet[firstSet.id], {
    [firstSet.questions[0].id]: ['opt-1'],
  });
  assert.deepEqual(helloNamesOnHusband, ['مريم']);

  // Name update triggers HELLO packet propagation
  wifeState = { ...wifeState, playerName: 'مريم ٢' };
  const sentHello = await wifeBus.sendHelloNow();
  assert.equal(sentHello, true);
  assert.deepEqual(helloNamesOnHusband, ['مريم', 'مريم ٢']);

  // Husband cannot send Question answer snapshots
  assert.equal(await husbandBus.sendSnapshotNow(), false);
  assert.equal(await wifeBus.sendSnapshotNow(), true);

  // Self-echo packet (same deviceId) is ignored
  await wifeBus.handleIncomingPacket(buildHelloPacket(wifeState));
  assert.equal(wifeBus.getState().status, 'connected');

  const sent = await wifeBus.emitLiveEvent({
    type: 'QUESTION_ANSWERED_LIVE',
    realmId: GAME_REALMS[0].id,
    setId: firstSet.id,
    questionId: firstSet.questions[1].id,
    selectedIds: ['opt-2'],
    updatedAt: Date.now(),
  });
  assert.equal(sent, true);
  assert.deepEqual(receivedLiveTypes, ['QUESTION_ANSWERED_LIVE']);

  // Same-role peer packet sets error state and drops packet
  const anotherWife = { ...createInitialProgress('wife', true), deviceId: 'lw-other-wife', playerName: 'سلمى' };
  await wifeBus.handleIncomingPacket(buildHelloPacket(anotherWife));
  assert.equal(wifeBus.getState().status, 'error');

  await wifeBus.disconnect();
  await husbandBus.disconnect();
  assert.equal(wifeBus.getState().status, 'idle');
  assert.equal(husbandBus.getState().status, 'idle');
});

test('lockInitialDeviceRole configures device role once and preserves custom or default names', () => {
  const fresh = createInitialProgress();
  assert.equal(fresh.roleConfigured, false);

  const lockedHusband = lockInitialDeviceRole(fresh, 'husband');
  assert.equal(lockedHusband.roleConfigured, true);
  assert.equal(lockedHusband.role, 'husband');
  assert.equal(lockedHusband.playerName, DEFAULT_HUSBAND_NAME);

  const lockedWifeCustom = lockInitialDeviceRole(fresh, 'wife', 'سارة');
  assert.equal(lockedWifeCustom.roleConfigured, true);
  assert.equal(lockedWifeCustom.role, 'wife');
  assert.equal(lockedWifeCustom.playerName, 'سارة');
});

test('parseStoredProgress distinguishes fresh onboarding from legacy configured saves', () => {
  const freshParsed = parseStoredProgress(null);
  assert.equal(freshParsed.roleConfigured, false);

  const unconfiguredSave = parseStoredProgress(
    JSON.stringify({
      deviceId: 'lw-fresh',
      role: 'wife',
      playerName: DEFAULT_WIFE_NAME,
      answersBySet: {},
      completedSetIds: [],
    })
  );
  assert.equal(unconfiguredSave.roleConfigured, false);

  const legacyHusbandSave = parseStoredProgress(
    JSON.stringify({
      deviceId: 'lw-old',
      role: 'husband',
      playerName: DEFAULT_HUSBAND_NAME,
      answersBySet: {},
      completedSetIds: [],
    })
  );
  assert.equal(legacyHusbandSave.roleConfigured, true);

  const legacyAnsweredWife = parseStoredProgress(
    JSON.stringify({
      deviceId: 'lw-old-wife',
      role: 'wife',
      playerName: DEFAULT_WIFE_NAME,
      answersBySet: { 'realm-01-beliefs-set-1': { 'realm-01-beliefs-set-1-q1': ['opt-1'] } },
      completedSetIds: [],
    })
  );
  assert.equal(legacyAnsweredWife.roleConfigured, true);
});

test('formatQuestionsCountArabic produces accurate Arabic grammar across counts', () => {
  assert.equal(formatQuestionsCountArabic(0), '٠ سؤال');
  assert.equal(formatQuestionsCountArabic(1), 'سؤال واحد');
  assert.equal(formatQuestionsCountArabic(2), 'سؤالان');
  assert.equal(formatQuestionsCountArabic(4), '٤ أسئلة');
  assert.equal(formatQuestionsCountArabic(11), '١١ سؤالاً');
});

test('sync protocol parses SET_RESET_LIVE and ALL_RESET_LIVE events', () => {
  const wife = createInitialProgress('wife', true);
  const resetSetPkt = buildLiveEventPacket(wife, {
    type: 'SET_RESET_LIVE',
    setId: 'realm-01-beliefs-set-1',
    updatedAt: 999,
  });
  assert.deepEqual(parseSyncPacket(encodeSyncPacket(resetSetPkt)), resetSetPkt);

  const resetAllPkt = buildLiveEventPacket(wife, {
    type: 'ALL_RESET_LIVE',
    updatedAt: 1000,
  });
  assert.deepEqual(parseSyncPacket(encodeSyncPacket(resetAllPkt)), resetAllPkt);
});

test('buildAnswerQissasa uses 3rd-person partner phrasing without feminine 2nd-person leaks in partnerView', () => {
  const realm = GAME_REALMS[0];
  const set = realm.sets[0];
  const question = set.questions[0];

  const wifeQissasa = buildAnswerQissasa({
    realm,
    set,
    question,
    questionNumber: 1,
    selectedIds: ['opt-1', 'opt-3'],
    isPartnerView: false,
  });
  assert.match(wifeQissasa.diagnosticText, /جمعكِ/);

  const partnerQissasa = buildAnswerQissasa({
    realm,
    set,
    question,
    questionNumber: 1,
    selectedIds: ['opt-1', 'opt-3'],
    isPartnerView: true,
    partnerName: 'نورة',
  });
  assert.ok(partnerQissasa.confirmationBadge.includes('نورة'));
  assert.equal(/إجابتكِ|جمعكِ|نفسكِ|اختياركِ/.test(partnerQissasa.diagnosticText), false);
  assert.equal(/إجابتكِ|جمعكِ|نفسكِ|اختياركِ/.test(partnerQissasa.confirmationBadge), false);
  assert.equal(/إجابتكِ|جمعكِ|نفسكِ|اختياركِ/.test(partnerQissasa.headline), false);
});

test('security vault seals localStorage payload and enforces 5-attempt PIN lockout', () => {
  const plainJson = JSON.stringify({ secret: 'إجابات خاصة لليالي الورد' });
  const sealed = sealLocalStoragePayload(plainJson, 'test-seed');
  assert.ok(sealed.startsWith('LWV1:'));
  assert.equal(sealed.includes('إجابات'), false);
  assert.equal(unsealLocalStoragePayload(sealed, 'test-seed'), plainJson);

  const deviceSalt = 'lw-device-1';
  let sec: SecurityConfig = {
    ...createInitialSecurityConfig(),
    pinEnabled: true,
    pinHash: hashPinWithSalt('2468', deviceSalt),
  };

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const fail = attemptPinUnlock(sec, '0000', deviceSalt, 1_000);
    assert.equal(fail.unlocked, false);
    assert.equal(fail.remainingLockoutMs, 0);
    assert.equal(fail.attemptsLeft, 5 - attempt);
    sec = fail.nextConfig;
  }

  const fifthFail = attemptPinUnlock(sec, '0000', deviceSalt, 2_000);
  assert.equal(fifthFail.unlocked, false);
  assert.equal(fifthFail.remainingLockoutMs, 30_000);
  sec = fifthFail.nextConfig;

  // Even correct PIN is blocked during active lockout
  const blockedCorrect = attemptPinUnlock(sec, '2468', deviceSalt, 10_000);
  assert.equal(blockedCorrect.unlocked, false);
  assert.ok(blockedCorrect.remainingLockoutMs > 0);

  // After lockout expiry, correct PIN succeeds and clears counters
  const unlocked = attemptPinUnlock(sec, '2468', deviceSalt, 35_000);
  assert.equal(unlocked.unlocked, true);
  assert.equal(unlocked.nextConfig.failedAttempts, 0);
  assert.equal(unlocked.nextConfig.lockedUntil, null);
});

test('encodePacketFrames splits >40KB Arabic snapshots under 16KB per frame and ChunkAssembler reassembles out-of-order frames', () => {
  const wife = createInitialProgress('wife', true);
  const largeAnswers: Record<string, Record<string, string[]>> = {};
  for (let s = 0; s < 30; s += 1) {
    const qMap: Record<string, string[]> = {};
    for (let q = 0; q < 20; q += 1) {
      qMap[`q-arabic-set-${s}-question-${q}`] = ['opt-alpha-1', 'opt-beta-2', 'opt-gamma-3'];
    }
    largeAnswers[`realm-set-${s}-مجموعة`] = qMap;
  }
  const bigWife: GameProgress = {
    ...wife,
    answersBySet: largeAnswers,
    completedSetIds: Object.keys(largeAnswers),
  };

  const snapshot = buildAnswersSnapshotPacket(bigWife);
  const rawBytes = new TextEncoder().encode(encodeSyncPacket(snapshot)).length;
  assert.ok(rawBytes > 40_000, `expected >40KB payload, got ${rawBytes}`);

  const frames = encodePacketFrames(snapshot);
  assert.ok(frames.length >= 3);
  for (const frame of frames) {
    const frameBytes = new TextEncoder().encode(frame).length;
    assert.ok(
      frameBytes <= NEARBY_SAFE_FRAME_BYTES,
      `frame exceeded safe limit: ${frameBytes} > ${NEARBY_SAFE_FRAME_BYTES}`
    );
  }

  // Reassemble in reverse order to verify ordering resilience
  const assembler = new ChunkAssembler();
  let reconstructed = null;
  for (const frame of [...frames].reverse()) {
    const res = assembler.ingest(frame);
    if (res) {
      reconstructed = res;
    }
  }
  assert.deepEqual(reconstructed, snapshot);
});

test('parseStoredProgress strips prototype-pollution keys and LiveSessionBus enforces pairedDeviceId pinning', async () => {
  const maliciousJson = JSON.stringify({
    deviceId: 'lw-clean',
    role: 'husband',
    answersBySet: {
      '__proto__': { q1: ['opt-1'] },
      constructor: { q1: ['opt-1'] },
      'valid-set': {
        prototype: ['opt-1'],
        'valid-q': ['opt-1', '__proto__'],
      },
    },
  });
  const parsed = parseStoredProgress(maliciousJson);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed.answersBySet, '__proto__'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(parsed.answersBySet, 'constructor'), false);
  assert.deepEqual(parsed.answersBySet['valid-set'], { 'valid-q': ['opt-1'] });

  let disconnectedCount = 0;
  let husbandState: GameProgress = {
    ...createInitialProgress('husband', true),
    deviceId: 'lw-husband',
    partnerSnapshot: {
      partnerName: 'مريم',
      answersBySet: {},
      completedSetIds: [],
      lastSyncedAt: Date.now(),
      pairedDeviceId: 'lw-trusted-wife',
      pairedDeviceLabel: 'هاتف مريم',
    },
  };

  const husbandBus = new LiveSessionBus(() => husbandState);
  await husbandBus.attachTransport({
    kind: 'capacitor-nearby',
    sendPacket: async () => {},
    disconnect: async () => {
      disconnectedCount += 1;
    },
  });

  // Rogue device with different deviceId is rejected and disconnects active transport
  const rogueWife = { ...createInitialProgress('wife', true), deviceId: 'lw-rogue-wife' };
  await husbandBus.handleIncomingPacket(buildHelloPacket(rogueWife));
  assert.equal(husbandBus.getState().status, 'error');
  assert.equal(disconnectedCount, 1);

  // Explicit unpinning clears pairedDeviceId while keeping synced answers
  husbandState = unpinPartnerDevice(husbandState);
  assert.equal(husbandState.partnerSnapshot.pairedDeviceId, null);
  await husbandBus.attachTransport({
    kind: 'capacitor-nearby',
    sendPacket: async () => {},
    disconnect: async () => {},
  });
  await husbandBus.handleIncomingPacket(buildHelloPacket(rogueWife));
  assert.equal(husbandBus.getState().status, 'connected');
  assert.equal(husbandBus.getState().peerDeviceId, 'lw-rogue-wife');
});

test('cloudCrypto encrypts and decrypts snapshots with AES-256-GCM, rejects wrong keys, and validates invite codes', async () => {
  const creds = generateCloudInviteCredentials();
  assert.ok(creds.vaultId.startsWith('lw_'));
  assert.ok(creds.vaultKey.length >= 20);

  const parsed = parseCloudInviteCode(`  ${creds.inviteCode}  `);
  assert.deepEqual(parsed, { vaultId: creds.vaultId, vaultKey: creds.vaultKey });
  assert.equal(parseCloudInviteCode('invalid-code'), null);
  assert.equal(parseCloudInviteCode('short.bad'), null);

  const payload = {
    answersBySet: {
      'realm-01-beliefs-set-1': {
        'realm-01-beliefs-set-1-q1': ['opt-1', 'opt-3'],
      },
    },
    completedSetIds: ['realm-01-beliefs-set-1'],
    updatedAt: 1730000000000,
    playerName: 'سارة',
  };

  const encrypted = await encryptSnapshotForCloud(payload, creds.vaultKey);
  assert.ok(encrypted.cipherText.length > 20);
  assert.ok(encrypted.cipherIv.length > 10);
  assert.equal(encrypted.cipherText.includes('سارة'), false);

  const decrypted = await decryptSnapshotFromCloud(
    encrypted.cipherText,
    encrypted.cipherIv,
    creds.vaultKey
  );
  assert.deepEqual(decrypted, payload);

  const otherCreds = generateCloudInviteCredentials();
  const wrongKeyResult = await decryptSnapshotFromCloud(
    encrypted.cipherText,
    encrypted.cipherIv,
    otherCreds.vaultKey
  );
  assert.equal(wrongKeyResult, null);
});

test('parseStoredProgress defaults cloudAutoSyncEnabled to true and respects explicit false', () => {
  const defaulted = parseStoredProgress(JSON.stringify({ role: 'wife', settings: {} }));
  assert.equal(defaulted.settings.cloudAutoSyncEnabled, true);

  const disabled = parseStoredProgress(
    JSON.stringify({ role: 'wife', settings: { cloudAutoSyncEnabled: false } })
  );
  assert.equal(disabled.settings.cloudAutoSyncEnabled, false);
});

test('sync protocol validates CHAT_MESSAGE, CHAT_ACK, and CHAT_CLEAR and supports bidirectional LiveSessionBus chat', async () => {
  const wife = { ...createInitialProgress('wife', true), playerName: 'مريم' };
  const husband = { ...createInitialProgress('husband', true), playerName: 'عمر' };

  const chatPacket = buildLiveEventPacket(husband, {
    type: 'CHAT_MESSAGE',
    messageId: 'msg_100_abc',
    senderName: 'عمر',
    text: 'مساء النور يا أجمل شريكة',
    createdAt: 1730000010000,
  });
  assert.deepEqual(parseSyncPacket(encodeSyncPacket(chatPacket)), chatPacket);

  const ackPacket = buildLiveEventPacket(wife, {
    type: 'CHAT_ACK',
    messageId: 'msg_100_abc',
    receivedAt: 1730000011000,
  });
  assert.deepEqual(parseSyncPacket(encodeSyncPacket(ackPacket)), ackPacket);

  const clearPacket = buildLiveEventPacket(wife, {
    type: 'CHAT_CLEAR',
    clearedAt: 1730000012000,
  });
  assert.deepEqual(parseSyncPacket(encodeSyncPacket(clearPacket)), clearPacket);

  // Reject empty or oversized chat text
  assert.equal(
    parseSyncPacket(
      encodeSyncPacket(
        buildLiveEventPacket(husband, {
          type: 'CHAT_MESSAGE',
          messageId: 'msg_empty',
          senderName: 'عمر',
          text: '   ',
          createdAt: 100,
        })
      )
    ),
    null
  );

  // Bidirectional chat delivery between Husband and Wife over LiveSessionBus
  const wifeBus = new LiveSessionBus(() => wife);
  const husbandBus = new LiveSessionBus(() => husband);
  const wifeEvents: string[] = [];
  const husbandEvents: string[] = [];

  wifeBus.subscribeLiveEvent((ev) => wifeEvents.push(ev.type));
  husbandBus.subscribeLiveEvent((ev) => husbandEvents.push(ev.type));

  await wifeBus.attachTransport({
    kind: 'capacitor-nearby',
    sendPacket: async (packet) => {
      await husbandBus.handleIncomingPacket(packet);
    },
    disconnect: async () => {},
  });
  await husbandBus.attachTransport({
    kind: 'capacitor-nearby',
    sendPacket: async (packet) => {
      await wifeBus.handleIncomingPacket(packet);
    },
    disconnect: async () => {},
  });

  await husbandBus.emitLiveEvent({
    type: 'CHAT_MESSAGE',
    messageId: 'msg_hb_1',
    senderName: 'عمر',
    text: 'كيف حالكِ؟',
    createdAt: 1730000020000,
  });
  await wifeBus.emitLiveEvent({
    type: 'CHAT_ACK',
    messageId: 'msg_hb_1',
    receivedAt: 1730000020500,
  });

  assert.deepEqual(wifeEvents, ['CHAT_MESSAGE']);
  assert.deepEqual(husbandEvents, ['CHAT_ACK']);

  await wifeBus.disconnect();
  await husbandBus.disconnect();
});

test('cloudCrypto encrypts and decrypts chat messages with AES-256-GCM and rejects wrong keys', async () => {
  const creds = generateCloudInviteCredentials();
  const payload = {
    id: 'msg_cloud_1',
    text: 'همسة مشفرة لا يقرأها سوانا',
    senderName: 'سارة',
    createdAt: 1730000030000,
  };

  const encrypted = await encryptChatMessageForCloud(payload, creds.vaultKey);
  assert.ok(encrypted.cipherText.length > 10);
  assert.ok(encrypted.cipherIv.length > 10);
  assert.equal(encrypted.cipherText.includes('همسة'), false);

  const decrypted = await decryptChatMessageFromCloud(
    encrypted.cipherText,
    encrypted.cipherIv,
    creds.vaultKey
  );
  assert.deepEqual(decrypted, payload);

  const wrongCreds = generateCloudInviteCredentials();
  const badDecrypt = await decryptChatMessageFromCloud(
    encrypted.cipherText,
    encrypted.cipherIv,
    wrongCreds.vaultKey
  );
  assert.equal(badDecrypt, null);
});

test('chatStorage deduplicates hybrid nearby+cloud messages and honors clearedAt watermark', () => {
  let store = createInitialChatStore();
  const mine = createLocalChatMessage({
    id: 'msg_dual_1',
    senderRole: 'wife',
    senderName: 'مريم',
    senderDeviceId: 'lw-wife',
    text: 'رسالة عبر القناتين',
    createdAt: 5000,
    needsCloudUpload: true,
    needsNearbyAck: true,
  });

  store = mergeIncomingChatMessage(store, mine);
  assert.equal(store.messages.length, 1);
  assert.equal(store.messages[0].deliveredVia, 'local');

  // Delivery via Nearby upgrades status without duplicating
  store = markChatMessageDelivered(store, 'msg_dual_1', 'nearby');
  assert.equal(store.messages[0].deliveredVia, 'nearby');
  assert.equal(store.messages[0].pendingNearbyAck, false);
  assert.equal(store.messages[0].pendingCloudUpload, true);

  // Delivery via Cloud upgrades to hybrid and clears pendingCloudUpload
  store = mergeIncomingChatMessage(store, {
    ...mine,
    deliveredVia: 'cloud',
    pendingNearbyAck: false,
    pendingCloudUpload: false,
  });
  assert.equal(store.messages.length, 1);
  assert.equal(store.messages[0].deliveredVia, 'hybrid');
  assert.equal(store.messages[0].pendingNearbyAck, false);
  assert.equal(store.messages[0].pendingCloudUpload, false);

  // Clearing sets watermark; older messages cannot resurrect
  store = clearLocalChatHistory(store, 6000);
  assert.equal(store.messages.length, 0);
  store = mergeIncomingChatMessage(store, mine);
  assert.equal(store.messages.length, 0);

  // Newer message after clearedAt survives and roundtrips through parseChatStore
  const newer = createLocalChatMessage({
    id: 'msg_after_clear',
    senderRole: 'husband',
    senderName: 'عمر',
    senderDeviceId: 'lw-husband',
    text: 'صفحة جديدة',
    createdAt: 7000,
    needsCloudUpload: false,
    needsNearbyAck: false,
  });
  store = mergeIncomingChatMessage(store, newer);
  const parsed = parseChatStore(JSON.stringify(store));
  assert.equal(parsed.clearedAt, 6000);
  assert.equal(parsed.messages.length, 1);
  assert.equal(parsed.messages[0].id, 'msg_after_clear');
});

test('getDefaultPartnerName and parseStoredProgress fix stale unpaired Wife partner label', () => {
  assert.equal(getDefaultPartnerName('wife'), 'الشريك');
  assert.equal(getDefaultPartnerName('husband'), 'الشريكة');

  const wifeInit = createInitialProgress('wife', true);
  assert.equal(wifeInit.partnerSnapshot.partnerName, 'الشريك');

  const husbandInit = createInitialProgress('husband', true);
  assert.equal(husbandInit.partnerSnapshot.partnerName, 'الشريكة');

  // Legacy unpaired Wife record that saved 'الشريكة' as partnerName should migrate to 'الشريك'
  const migratedWife = parseStoredProgress(
    JSON.stringify({
      role: 'wife',
      roleConfigured: true,
      partnerSnapshot: {
        partnerName: 'الشريكة',
        answersBySet: {},
        completedSetIds: [],
        lastSyncedAt: null,
        pairedDeviceId: null,
      },
    })
  );
  assert.equal(migratedWife.partnerSnapshot.partnerName, 'الشريك');

  // Already-paired Wife record keeps an explicit partner name
  const pairedWife = parseStoredProgress(
    JSON.stringify({
      role: 'wife',
      roleConfigured: true,
      partnerSnapshot: {
        partnerName: 'خالد',
        answersBySet: {},
        completedSetIds: [],
        lastSyncedAt: 1730000000000,
        pairedDeviceId: 'lw-husband-1',
      },
    })
  );
  assert.equal(pairedWife.partnerSnapshot.partnerName, 'خالد');
});

test('switchDeviceRole clears partnerSnapshot, preserves deviceId/settings/wife answers, and updates default playerName', () => {
  const targetSet = GAME_REALMS[0].sets[0];
  let progress = createInitialProgress('wife', true);
  const originalDeviceId = progress.deviceId;
  progress = confirmQuestionAnswer(
    progress,
    targetSet.id,
    targetSet.questions[0].id,
    ['opt-1'],
    targetSet.questions.length
  );
  progress = applyIncomingPartnerSnapshot(progress, {
    partnerName: 'أحمد',
    answersBySet: { [targetSet.id]: { [targetSet.questions[0].id]: ['opt-2'] } },
    completedSetIds: [],
    syncedAt: 1730000000000,
    pairedDeviceId: 'lw-peer-husband',
  });

  // Switch Wife -> Husband
  const switchedToHusband = switchDeviceRole(progress, 'husband');
  assert.equal(switchedToHusband.role, 'husband');
  assert.equal(switchedToHusband.roleConfigured, true);
  assert.equal(switchedToHusband.deviceId, originalDeviceId);
  assert.equal(switchedToHusband.playerName, DEFAULT_HUSBAND_NAME);
  assert.equal(switchedToHusband.partnerSnapshot.partnerName, 'الشريكة');
  assert.equal(switchedToHusband.partnerSnapshot.pairedDeviceId, null);
  assert.deepEqual(switchedToHusband.partnerSnapshot.answersBySet, {});
  assert.deepEqual(switchedToHusband.answersBySet, progress.answersBySet);

  // Switch back with a custom name preserves custom playerName
  const namedHusband: GameProgress = {
    ...switchedToHusband,
    playerName: 'عمر',
  };
  const switchedBackToWife = switchDeviceRole(namedHusband, 'wife');
  assert.equal(switchedBackToWife.role, 'wife');
  assert.equal(switchedBackToWife.playerName, 'عمر');
  assert.equal(switchedBackToWife.partnerSnapshot.partnerName, 'الشريك');
});

test('computePartnerConnectionStatus returns connected, waiting, or offline accurately', () => {
  // Nearby connected always wins
  assert.equal(
    computePartnerConnectionStatus({
      nearbyStatus: 'connected',
      isCloudLinked: false,
      isOnline: false,
      cloudAutoSyncEnabled: false,
      cloudStatus: 'idle',
      cloudPartnerJoined: false,
    }),
    'connected'
  );

  // Cloud linked + online + auto-sync + partner joined => connected
  assert.equal(
    computePartnerConnectionStatus({
      nearbyStatus: 'idle',
      isCloudLinked: true,
      isOnline: true,
      cloudAutoSyncEnabled: true,
      cloudStatus: 'synced',
      cloudPartnerJoined: true,
    }),
    'connected'
  );

  // Cloud linked while partner hasn't joined yet => waiting
  assert.equal(
    computePartnerConnectionStatus({
      nearbyStatus: 'idle',
      isCloudLinked: true,
      isOnline: true,
      cloudAutoSyncEnabled: true,
      cloudStatus: 'synced',
      cloudPartnerJoined: false,
    }),
    'waiting'
  );

  // Offline or disabled auto-sync with no active nearby link => offline
  assert.equal(
    computePartnerConnectionStatus({
      nearbyStatus: 'idle',
      isCloudLinked: true,
      isOnline: false,
      cloudAutoSyncEnabled: true,
      cloudStatus: 'idle',
      cloudPartnerJoined: true,
    }),
    'offline'
  );
  assert.equal(
    computePartnerConnectionStatus({
      nearbyStatus: 'idle',
      isCloudLinked: false,
      isOnline: true,
      cloudAutoSyncEnabled: true,
      cloudStatus: 'idle',
      cloudPartnerJoined: false,
    }),
    'offline'
  );
});

test('confirmQuestionAnswer overwrites previous answer cleanly when editing during an active round', () => {
  const targetSet = GAME_REALMS[0].sets[0];
  const q1 = targetSet.questions[0];
  let progress = createInitialProgress('wife', true);
  progress = confirmQuestionAnswer(
    progress,
    targetSet.id,
    q1.id,
    [q1.options[0].id],
    targetSet.questions.length
  );
  assert.deepEqual(progress.answersBySet[targetSet.id][q1.id], [q1.options[0].id]);

  // Edit Q1 answer before completing the set
  const updatedOptId = q1.options[1]?.id ?? q1.options[0].id;
  progress = confirmQuestionAnswer(
    progress,
    targetSet.id,
    q1.id,
    [updatedOptId],
    targetSet.questions.length
  );
  assert.deepEqual(progress.answersBySet[targetSet.id][q1.id], [updatedOptId]);
  assert.equal(Object.keys(progress.answersBySet[targetSet.id]).length, 1);
  assert.equal(progress.completedSetIds.length, 0);
});

test('husband navigation helpers never target empty (0-answer) sets or realms', () => {
  const realm1 = GAME_REALMS[0];
  const realm2 = GAME_REALMS[1];
  const realm3 = GAME_REALMS[2];
  const set1 = realm1.sets[0];
  const set2 = realm1.sets[1];
  const realm3Set1 = realm3.sets[0];

  // Wife completed realm1 set1 & set2 (set3 untouched) and realm3 set1 (realm2 untouched)
  const answersBySet: Record<string, Record<string, string[]>> = {
    [set1.id]: Object.fromEntries(set1.questions.map((q) => [q.id, [q.options[0].id]])),
    [set2.id]: Object.fromEntries(set2.questions.map((q) => [q.id, [q.options[0].id]])),
    [realm3Set1.id]: {
      [realm3Set1.questions[0].id]: [realm3Set1.questions[0].options[0].id],
    },
  };

  let husband = createInitialProgress('husband', true);
  husband = applyIncomingPartnerSnapshot(husband, {
    answersBySet,
    completedSetIds: [set1.id, set2.id],
  });
  const view = getQuestionsViewProgress(husband);

  // Resume should target the partial synced set in realm3 (from Q1), never empty realm1 set3
  const resume = getResumeTarget(view, GAME_REALMS);
  assert.equal(resume?.realm.id, realm3.id);
  assert.equal(resume?.set.id, realm3Set1.id);
  assert.equal(resume?.questionIndex, 0);

  // If all synced sets are 100% completed, resume returns null rather than dropping into empty set3
  const allCompletedAnswers: Record<string, Record<string, string[]>> = {
    [set1.id]: Object.fromEntries(set1.questions.map((q) => [q.id, [q.options[0].id]])),
  };
  let husbandCompletedOnly = createInitialProgress('husband', true);
  husbandCompletedOnly = applyIncomingPartnerSnapshot(husbandCompletedOnly, {
    answersBySet: allCompletedAnswers,
    completedSetIds: [set1.id],
  });
  assert.equal(
    getResumeTarget(getQuestionsViewProgress(husbandCompletedOnly), GAME_REALMS),
    null
  );

  // Next set from set1 advances to synced set2; from set2 returns null instead of empty set3 or wrapping back to set1
  assert.equal(getNextIncompleteSetInRealm(view, realm1, set1.id)?.id, set2.id);
  assert.equal(getNextIncompleteSetInRealm(view, realm1, set2.id), null);

  // Next realm from realm1 skips empty realm2 and picks realm3 which has answers
  assert.equal(getNextIncompleteRealm(view, GAME_REALMS, realm1.id)?.id, realm3.id);
  // When only 1 realm has answers, next realm returns null
  assert.equal(
    getNextIncompleteRealm(
      getQuestionsViewProgress(husbandCompletedOnly),
      GAME_REALMS,
      realm1.id
    ),
    null
  );
});

test('getImmediateParentScreen and computeCollapseToHomeDelta handle overlays and nested stacks accurately', () => {
  const fromLogToRealms: AppHistoryEntry[] = [
    { seq: 1, screen: 'home' },
    { seq: 2, screen: 'log' },
    { seq: 3, screen: 'realms' },
    { seq: 4, screen: 'realms', overlayId: 'realms-modal' },
  ];
  assert.equal(getImmediateParentScreen(fromLogToRealms), 'log');
  assert.equal(computeCollapseToHomeDelta(fromLogToRealms), -3);

  const deepSession: AppHistoryEntry[] = [
    { seq: 1, screen: 'home' },
    { seq: 2, screen: 'modes' },
    { seq: 3, screen: 'realms' },
    { seq: 4, screen: 'question' },
    { seq: 5, screen: 'question', overlayId: 'app-modal' },
  ];
  assert.equal(getImmediateParentScreen(deepSession), 'realms');
  assert.equal(computeCollapseToHomeDelta(deepSession), -4);
  assert.equal(computeCollapseToHomeDelta([{ seq: 1, screen: 'home' }]), 0);
});

test('unsealLocalStoragePayload remains backwards-compatible with legacy LWV1 payloads', () => {
  const seed = 'legacy-seed-test';
  const plainJson = JSON.stringify({ role: 'wife', msg: 'إجابة قديمة محفوظة' });
  const plainBytes = Buffer.from(plainJson, 'utf8');
  const keyChunks: Buffer[] = [];
  let blockIndex = 0;
  let total = 0;
  while (total < plainBytes.length) {
    const digest = createHash('sha256')
      .update(`layali-vault:${seed}:${blockIndex}`)
      .digest();
    keyChunks.push(digest);
    total += digest.length;
    blockIndex += 1;
  }
  const keyStream = Buffer.concat(keyChunks).subarray(0, plainBytes.length);
  const cipher = Buffer.alloc(plainBytes.length);
  for (let i = 0; i < plainBytes.length; i += 1) {
    cipher[i] = plainBytes[i] ^ keyStream[i];
  }
  const legacySealed = `LWV1:${cipher.toString('base64')}`;

  assert.equal(unsealLocalStoragePayload(legacySealed, seed), plainJson);

  // V3 payload seals with unique random nonces, authenticates MAC tag, and unseals cleanly
  const v3SealedA = sealLocalStoragePayload(plainJson, seed);
  const v3SealedB = sealLocalStoragePayload(plainJson, seed);
  assert.ok(v3SealedA.startsWith('LWV1:v3:'));
  assert.ok(v3SealedB.startsWith('LWV1:v3:'));
  assert.notEqual(v3SealedA, v3SealedB);
  assert.equal(unsealLocalStoragePayload(v3SealedA, seed), plainJson);
  assert.equal(unsealLocalStoragePayload(v3SealedB, seed), plainJson);

  // Tampering with V3 ciphertext or tag is rejected
  const tampered = `${v3SealedA.slice(0, -2)}AA`;
  assert.throws(() => unsealLocalStoragePayload(tampered, seed));

  // V2 payload remains backwards-compatible
  const v2WordsBuf = createHash('sha256').update(`layali-vault-v2:${seed}`).digest();
  const w0 = v2WordsBuf.readUInt32BE(0);
  const w1 = v2WordsBuf.readUInt32BE(4);
  const w2 = v2WordsBuf.readUInt32BE(8);
  const w3 = v2WordsBuf.readUInt32BE(12);
  const w4 = v2WordsBuf.readUInt32BE(16);
  const w5 = v2WordsBuf.readUInt32BE(20);
  const w6 = v2WordsBuf.readUInt32BE(24);
  const w7 = v2WordsBuf.readUInt32BE(28);
  let s0 = (w0 ^ w4 ^ 0x9e3779b9) >>> 0;
  let s1 = (w1 ^ w5 ^ 0x7f4a7c15) >>> 0;
  let s2 = (w2 ^ w6 ^ 0x85ebca6b) >>> 0;
  let s3 = (w3 ^ w7 ^ 0xc2b2ae35) >>> 0;
  const v2Cipher = Buffer.alloc(plainBytes.length);
  let v2Offset = 0;
  let v2Counter = 1;
  while (v2Offset < plainBytes.length) {
    s0 = (s0 + Math.imul(s1 ^ v2Counter, 0x85ebca6b)) >>> 0;
    s1 = (((s1 << 13) | (s1 >>> 19)) ^ s2) >>> 0;
    s2 = (s2 + Math.imul(s3 ^ s0, 0xc2b2ae35)) >>> 0;
    s3 = (((s3 << 7) | (s3 >>> 25)) ^ s0) >>> 0;
    const z = (s0 ^ s1 ^ s2 ^ s3) >>> 0;
    for (let b = 0; b < 4 && v2Offset < plainBytes.length; b += 1) {
      v2Cipher[v2Offset] = plainBytes[v2Offset] ^ ((z >>> (b * 8)) & 0xff);
      v2Offset += 1;
    }
    v2Counter += 1;
  }
  const v2Sealed = `LWV1:v2:${v2Cipher.toString('base64')}`;
  assert.equal(unsealLocalStoragePayload(v2Sealed, seed), plainJson);
});

test('mergeIncomingChatMessagesBatch deduplicates, upgrades hybrid delivery, sorts once, and honors clearedAt', () => {
  let store = createInitialChatStore();
  const m1 = createLocalChatMessage({
    id: 'batch_m1',
    senderRole: 'wife',
    senderName: 'مريم',
    senderDeviceId: 'lw-w',
    text: 'الأولى',
    createdAt: 2000,
    needsCloudUpload: true,
    needsNearbyAck: true,
  });
  store = mergeIncomingChatMessage(store, m1);

  const m1Cloud = {
    ...m1,
    deliveredVia: 'cloud' as const,
    pendingNearbyAck: false,
    pendingCloudUpload: false,
  };
  const m0 = createLocalChatMessage({
    id: 'batch_m0',
    senderRole: 'husband',
    senderName: 'عمر',
    senderDeviceId: 'lw-h',
    text: 'قبلها',
    createdAt: 1000,
    needsCloudUpload: false,
    needsNearbyAck: false,
  });
  const m2 = createLocalChatMessage({
    id: 'batch_m2',
    senderRole: 'husband',
    senderName: 'عمر',
    senderDeviceId: 'lw-h',
    text: 'الأحدث',
    createdAt: 3000,
    needsCloudUpload: false,
    needsNearbyAck: false,
  });

  // Batch with m1 upgrade to cloud + m2 + m0 out of order -> sorted by createdAt
  const batch1 = mergeIncomingChatMessagesBatch(store, [m2, m1Cloud, m0]);
  assert.deepEqual(
    batch1.messages.map((m) => m.id),
    ['batch_m0', 'batch_m1', 'batch_m2']
  );
  assert.equal(batch1.messages[1].deliveredVia, 'cloud');
  assert.equal(batch1.messages[1].pendingCloudUpload, false);

  // Re-applying identical batch returns exact same store reference (no unnecessary state churn)
  const batchIdempotent = mergeIncomingChatMessagesBatch(batch1, [m1Cloud, m0, m2]);
  assert.equal(batchIdempotent, batch1);

  // Delivery via nearby upgrades cloud -> hybrid in batch
  const m1Nearby = {
    ...m1,
    deliveredVia: 'nearby' as const,
    pendingNearbyAck: false,
    pendingCloudUpload: false,
  };
  const batchHybrid = mergeIncomingChatMessagesBatch(batch1, [m1Nearby]);
  assert.equal(batchHybrid.messages[1].deliveredVia, 'hybrid');

  // Messages at or before clearedAt are ignored
  const clearedStore = clearLocalChatHistory(batchHybrid, 2000);
  const afterClear = mergeIncomingChatMessagesBatch(clearedStore, [m0, m1]);
  assert.equal(afterClear, clearedStore);
  assert.deepEqual(
    afterClear.messages.map((m) => m.id),
    ['batch_m2']
  );
});

test('formatCloudErrorMessage sanitizes FirestoreErrorInfo JSON payloads and maps error codes cleanly', () => {
  const rawJson = JSON.stringify({
    error: 'Missing or insufficient permissions.',
    operationType: 'get',
    path: 'vaults/lw_secret_123',
    authInfo: {
      userId: 'uid_private_999',
      email: 'wife@private.example',
    },
  });
  const sanitizedPerm = formatCloudErrorMessage(new Error(rawJson));
  assert.ok(!sanitizedPerm.includes('uid_private_999'));
  assert.ok(!sanitizedPerm.includes('wife@private.example'));
  assert.ok(!sanitizedPerm.includes('lw_secret_123'));
  assert.ok(sanitizedPerm.includes('تعذّر الوصول'));

  assert.ok(
    formatCloudErrorMessage(new Error('Quota exceeded on Firestore')).includes('الحد اليومي')
  );
  assert.ok(
    formatCloudErrorMessage(new Error('Client is offline / unavailable')).includes('اتصال الهاتف')
  );
  assert.ok(
    formatCloudErrorMessage(new Error('unauthenticated request')).includes('انتهت جلسة')
  );
  assert.ok(
    formatCloudErrorMessage(new Error('not-found: missing doc')).includes('العثور على الخزنة')
  );
  assert.ok(
    formatCloudErrorMessage(new Error('WebCrypto subtle missing')).includes('التشفير السحابي')
  );

  const fallback = 'خطأ مخصص';
  assert.equal(formatCloudErrorMessage(new Error('arbitrary_internal_stack_trace'), fallback), fallback);
  const safeMsg = 'رمز الربط السحابي غير صالح أو غير مكتمل.';
  assert.equal(formatCloudErrorMessage(new Error(safeMsg), fallback), safeMsg);
});

test('bytesToBase64 and base64ToBytes round-trip UTF-8 text and large multi-chunk buffers', () => {
  const empty = new Uint8Array(0);
  assert.equal(bytesToBase64(empty), '');
  assert.equal(base64ToBytes('').length, 0);

  const arabicBytes = new TextEncoder().encode('ليالي الورد — ميثاق المودة والحنين 🌹');
  const arabicB64 = bytesToBase64(arabicBytes);
  assert.equal(new TextDecoder().decode(base64ToBytes(arabicB64)), 'ليالي الورد — ميثاق المودة والحنين 🌹');

  const large = new Uint8Array(20_000);
  for (let i = 0; i < large.length; i += 1) {
    large[i] = (i * 31 + 7) & 0xff;
  }
  const roundTripped = base64ToBytes(bytesToBase64(large));
  assert.equal(roundTripped.length, large.length);
  assert.deepEqual(roundTripped, large);
});

test('sanitize helpers reject prototype-pollution keys and enforce safe bounds', () => {
  assert.equal(isSafeIdentifier('__proto__'), false);
  assert.equal(isSafeIdentifier('constructor'), false);
  assert.equal(isSafeIdentifier('prototype'), false);
  assert.equal(isSafeIdentifier(''), false);
  assert.equal(isSafeIdentifier('r'.repeat(97)), false);
  assert.equal(isSafeIdentifier('realm-01-set-02'), true);

  assert.equal(sanitizeShortName('   مريم   ', 'الزوجة'), 'مريم');
  assert.equal(sanitizeShortName('   ', 'الزوجة'), 'الزوجة');
  assert.equal(sanitizeShortName('أ'.repeat(40), 'الزوجة').length, 24);

  assert.equal(sanitizeDeviceId('  lw-device-123  '), 'lw-device-123');
  assert.equal(sanitizeDeviceId(''), 'lw-device');
  assert.equal(sanitizeDeviceId('x'.repeat(80)).length, 64);
});

test('v2 PIN hashing upgrades legacy v1 digests transparently on unlock', () => {
  const legacyDeviceSalt = 'lw-legacy-dev-1';
  let legacyDigest = `layali:pin:v1:${legacyDeviceSalt}:7391`;
  for (let i = 0; i < 1_000; i += 1) {
    legacyDigest = createHash('sha256').update(`${legacyDigest}:${i}`).digest('hex');
  }
  assert.equal(legacyDigest.startsWith('v2:'), false);

  const legacyCfg: SecurityConfig = {
    ...createInitialSecurityConfig(),
    pinEnabled: true,
    pinHash: legacyDigest,
    pinSalt: null,
  };
  assert.equal(verifyPinDigest('7391', legacyDeviceSalt, legacyCfg.pinHash, legacyDeviceSalt), true);

  const unlocked = attemptPinUnlock(legacyCfg, '7391', legacyDeviceSalt, 50_000);
  assert.equal(unlocked.unlocked, true);
  assert.ok(unlocked.nextConfig.pinHash?.startsWith('v2:'));
  assert.ok(unlocked.nextConfig.pinSalt && unlocked.nextConfig.pinSalt.length >= 8);
  assert.equal(
    verifyPinDigest('7391', unlocked.nextConfig.pinSalt!, unlocked.nextConfig.pinHash),
    true
  );

  const freshSalt = generatePinSalt();
  const freshV2 = hashPinWithSalt('1234', freshSalt);
  assert.ok(freshV2.startsWith('v2:'));
  assert.equal(verifyPinDigest('1234', freshSalt, freshV2), true);
  assert.equal(verifyPinDigest('9999', freshSalt, freshV2), false);
});

test('parseUpdatedSyncSetIds supports sealed LWV1 payloads and legacy JSON arrays while filtering unsafe keys', () => {
  const sealedIds = sealLocalStoragePayload(
    JSON.stringify(['set-1', '__proto__', 'set-2', 'set-1', 'constructor'])
  );
  assert.deepEqual(parseUpdatedSyncSetIds(sealedIds), ['set-1', 'set-2']);

  const legacyPlain = JSON.stringify(['set-a', 'prototype', 'set-b']);
  assert.deepEqual(parseUpdatedSyncSetIds(legacyPlain), ['set-a', 'set-b']);
  assert.deepEqual(parseUpdatedSyncSetIds('not-valid-json'), []);
});

test('deriveJoinTokenHash derives deterministic SHA-256 hex commitments unique to each vaultKey', async () => {
  const credsA = generateCloudInviteCredentials();
  const credsB = generateCloudInviteCredentials();
  const hashA1 = await deriveJoinTokenHash(credsA.vaultKey);
  const hashA2 = await deriveJoinTokenHash(credsA.vaultKey);
  const hashB = await deriveJoinTokenHash(credsB.vaultKey);

  assert.match(hashA1, /^[0-9a-f]{64}$/);
  assert.equal(hashA1, hashA2);
  assert.notEqual(hashA1, hashB);
  assert.notEqual(hashA1, credsA.vaultKey);
});

test('LiveSessionBus rejects mid-session deviceId or role spoofing before partner is pinned', async () => {
  const husbandState = { ...createInitialProgress('husband', true), deviceId: 'lw-husband-1' };
  let disconnects = 0;
  const mockTransport: SyncTransport = {
    kind: 'capacitor-nearby',
    sendPacket: async () => {},
    disconnect: async () => {
      disconnects += 1;
    },
  };

  const bus = new LiveSessionBus(() => husbandState);
  await bus.attachTransport(mockTransport);

  const wifePeer = { ...createInitialProgress('wife', true), deviceId: 'lw-wife-peer' };
  await bus.handleIncomingPacket(buildHelloPacket(wifePeer));
  assert.equal(bus.getState().status, 'connected');
  assert.equal(bus.getState().peerDeviceId, 'lw-wife-peer');

  // Different deviceId on the same active session is rejected
  const imposter = { ...createInitialProgress('wife', true), deviceId: 'lw-imposter' };
  await bus.handleIncomingPacket(buildHelloPacket(imposter));
  assert.equal(bus.getState().status, 'error');
  assert.equal(disconnects, 1);

  // Re-attach and verify mid-session role flip with same deviceId is rejected
  await bus.attachTransport(mockTransport);
  await bus.handleIncomingPacket(buildHelloPacket(wifePeer));
  const flippedRolePacket = buildLiveEventPacket(
    { ...wifePeer, role: 'husband' },
    { type: 'ALL_RESET_LIVE', updatedAt: Date.now() }
  );
  await bus.handleIncomingPacket(flippedRolePacket);
  assert.equal(bus.getState().status, 'error');
  assert.equal(disconnects, 2);
});

test('shouldApplyIncomingSnapshotRevision enforces monotonic wife snapshot ordering across transports', () => {
  assert.equal(shouldApplyIncomingSnapshotRevision(null, 1_000), true);
  assert.equal(shouldApplyIncomingSnapshotRevision(0, 1_000), true);
  assert.equal(shouldApplyIncomingSnapshotRevision(5_000, 4_999), false);
  assert.equal(shouldApplyIncomingSnapshotRevision(5_000, 5_000), false);
  assert.equal(shouldApplyIncomingSnapshotRevision(5_000, 5_001), true);
  assert.equal(shouldApplyIncomingSnapshotRevision(5_000, null), false);
});

test('computeBatchOverlayPopCount pops all contiguous trailing unconsumed overlays in one batch', () => {
  const stack: AppHistoryEntry[] = [
    { seq: 1, screen: 'home' },
    { seq: 2, screen: 'profile' },
    { seq: 3, screen: 'profile', overlayId: 'sync-modal' },
    { seq: 4, screen: 'profile', overlayId: 'confirm-reset' },
  ];
  assert.equal(computeBatchOverlayPopCount(stack, new Set([3, 4])), 2);
  assert.equal(computeBatchOverlayPopCount(stack, new Set([4])), 1);
  // Stop at un-popped overlay 4 when only 3 is unmounted out of order
  assert.equal(computeBatchOverlayPopCount(stack, new Set([3])), 0);
  assert.equal(computeBatchOverlayPopCount(stack, new Set()), 0);
});

test('buildCloudInviteShareUrl avoids localhost on Android Capacitor and round-trips via extractInviteCodeFromUrl', () => {
  const { inviteCode } = generateCloudInviteCredentials();

  const androidUrl = buildCloudInviteShareUrl(inviteCode, {
    isCapacitorNative: true,
    currentHref: 'https://localhost/',
  });
  assert.ok(androidUrl);
  assert.ok(androidUrl.startsWith(DEFAULT_PUBLIC_WEB_APP_URL));
  assert.equal(extractInviteCodeFromUrl(androidUrl), inviteCode);

  const customUrl = buildCloudInviteShareUrl(inviteCode, {
    isCapacitorNative: true,
    publicAppUrl: 'https://layali.example.com/',
    currentHref: 'https://localhost/',
  });
  assert.equal(
    customUrl,
    `https://layali.example.com/#joinVault=${encodeURIComponent(inviteCode)}`
  );
  assert.equal(extractInviteCodeFromUrl(customUrl), inviteCode);

  const webUrl = buildCloudInviteShareUrl(inviteCode, {
    isCapacitorNative: false,
    currentHref: 'https://web.layali.app/session',
  });
  assert.equal(
    webUrl,
    `https://web.layali.app/session#joinVault=${encodeURIComponent(inviteCode)}`
  );
  assert.equal(extractInviteCodeFromUrl('https://web.layali.app/#joinVault=invalid'), null);
});

test('ChunkAssembler notifies onExpired and cleans up incomplete frames after TTL', () => {
  const expiredEvents: Array<{ msgId: string; received: number; total: number }> = [];
  const assembler = new ChunkAssembler({
    onExpired: (msgId, received, total) => {
      expiredEvents.push({ msgId, received, total });
    },
  });

  const wife = createInitialProgress('wife', true);
  wife.answersBySet['set-1'] = Object.fromEntries(
    Array.from({ length: 120 }, (_, i) => [`q-${i}`, [`opt-${i}-a`, `opt-${i}-b`]])
  );
  const frames = encodePacketFrames(buildAnswersSnapshotPacket(wife), 900);
  assert.ok(frames.length > 2);

  // Feed only the first frame at t = 1_000
  assert.equal(assembler.ingest(frames[0], 1_000), null);
  assert.equal(assembler.getPendingCount(), 1);

  // Advance past CHUNK_TTL_MS (30_000ms) -> triggers expiry notification and clears buffer
  assert.ok(assembler.ingest(JSON.stringify(buildHelloPacket(wife)), 35_000));
  assert.equal(expiredEvents.length, 1);
  assert.equal(expiredEvents[0].received, 1);
  assert.equal(expiredEvents[0].total, frames.length);
  assert.equal(assembler.getPendingCount(), 0);
});

test('formatCloudErrorMessage distinguishes join permission denials and preserves vault termination notice', () => {
  const permDenied = new Error(
    JSON.stringify({
      error: 'Missing or insufficient permissions.',
      operationType: 'update',
      path: 'vaults/lw_12345678',
    })
  );
  const joinMsg = formatCloudErrorMessage(permDenied, undefined, 'join');
  assert.ok(joinMsg.includes('تعذّر الانضمام إلى الخزنة السحابية'));
  assert.ok(!joinMsg.includes('lw_12345678'));

  const terminatedNotice = 'تم إنهاء الخزنة السحابية المشتركة من قِبل الشريك.';
  assert.equal(formatCloudErrorMessage(new Error(terminatedNotice)), terminatedNotice);
});

test('clearLocalChatHistory preserves and clears pendingCloudClearAt watermark safely', () => {
  let store = createInitialChatStore();
  store = mergeIncomingChatMessage(
    store,
    createLocalChatMessage({
      id: 'c_msg_1',
      senderRole: 'wife',
      senderName: 'مريم',
      senderDeviceId: 'lw-wife-1',
      text: 'رسالة قبل المسح',
      createdAt: 1_500,
      needsCloudUpload: false,
      needsNearbyAck: false,
    })
  );
  assert.equal(store.messages.length, 1);

  const clearedOffline = clearLocalChatHistory(store, 2_000, { pendingCloudClearAt: 2_000 });
  assert.equal(clearedOffline.messages.length, 0);
  assert.equal(clearedOffline.pendingCloudClearAt, 2_000);

  const reparsed = parseChatStore(JSON.stringify(clearedOffline));
  assert.equal(reparsed.pendingCloudClearAt, 2_000);

  const syncedClear = clearPendingCloudClearWatermark(reparsed);
  assert.equal(syncedClear.pendingCloudClearAt, null);
  assert.equal(clearPendingCloudClearWatermark(syncedClear), syncedClear);
});

test('V3 unseal failure without ready IDB key write-protects existing LWV1:v3 localStorage entries', () => {
  const prevWindow = (globalThis as { window?: unknown }).window;
  const backing = new Map<string, string>();
  const mockLocalStorage = {
    getItem: (k: string) => backing.get(k) ?? null,
    setItem: (k: string, v: string) => {
      backing.set(k, v);
    },
    removeItem: (k: string) => {
      backing.delete(k);
    },
  };
  (globalThis as { window?: unknown }).window = { localStorage: mockLocalStorage };

  try {
    resetLocalVaultSecurityStateForTests();
    const sealed = sealLocalStoragePayload(JSON.stringify({ ok: true }), 'real-idb-device-seed');
    backing.set('layali_alward_progress_v1', sealed);

    assert.equal(isLocalVaultWriteProtected(), false);
    assert.throws(() => unsealLocalStoragePayload(sealed));
    assert.equal(isLocalVaultWriteProtected(), true);
    assert.equal(shouldBlockEncryptedStorageOverwrite('layali_alward_progress_v1'), true);
    assert.equal(shouldBlockEncryptedStorageOverwrite('unprotected_other_key'), false);
  } finally {
    resetLocalVaultSecurityStateForTests();
    if (prevWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
  }
});

test('computePartnerConnectionStatus returns error and pending statuses distinctly', () => {
  assert.equal(
    computePartnerConnectionStatus({
      nearbyStatus: 'error',
      isCloudLinked: false,
      isOnline: true,
      cloudAutoSyncEnabled: true,
      cloudStatus: 'idle',
      cloudPartnerJoined: false,
    }),
    'error'
  );

  assert.equal(
    computePartnerConnectionStatus({
      nearbyStatus: 'idle',
      isCloudLinked: true,
      isOnline: true,
      cloudAutoSyncEnabled: true,
      cloudStatus: 'error',
      cloudPartnerJoined: true,
    }),
    'error'
  );

  assert.equal(
    computePartnerConnectionStatus({
      nearbyStatus: 'idle',
      isCloudLinked: true,
      isOnline: true,
      cloudAutoSyncEnabled: true,
      cloudStatus: 'offline-pending',
      cloudPartnerJoined: true,
    }),
    'pending'
  );
});

test('formatNearbyErrorMessage translates native Nearby errors to Arabic and preserves existing Arabic text', () => {
  assert.ok(
    formatNearbyErrorMessage(new Error('Permissions denied for Bluetooth and Wi-Fi')).includes('أذونات')
  );
  assert.ok(
    formatNearbyErrorMessage(new Error('Endpoint is not connected')).includes('لا يوجد اتصال قريب')
  );
  assert.ok(
    formatNearbyErrorMessage(new Error('Payload size exceeded limit')).includes('يتجاوز الحد')
  );
  assert.ok(
    formatNearbyErrorMessage(new Error('Connection timeout elapsed')).includes('انتهت مهلة')
  );
  const arabic = 'تعذّر بدء الاتصال القريب الآن.';
  assert.equal(formatNearbyErrorMessage(new Error(arabic)), arabic);
  assert.equal(formatNearbyErrorMessage(null, 'رسالة افتراضية'), 'رسالة افتراضية');
});

test('subscribeStorageWriteIssues delivers write issues and cleans up on unsubscribe and test reset', () => {
  resetLocalVaultSecurityStateForTests();
  const seen: StorageWriteIssue[] = [];
  const unsubscribe = subscribeStorageWriteIssues((issue) => {
    seen.push(issue);
  });

  reportStorageWriteIssue('write-protected', 'layali_alward_progress_v1');
  reportStorageWriteIssue('quota', 'layali_alward_chat_v1');
  assert.equal(seen.length, 2);
  assert.equal(seen[0].reason, 'write-protected');
  assert.equal(seen[1].reason, 'quota');

  unsubscribe();
  reportStorageWriteIssue('error', 'layali_alward_progress_v1');
  assert.equal(seen.length, 2);

  const seenAfterReset: StorageWriteIssue[] = [];
  subscribeStorageWriteIssues((issue) => seenAfterReset.push(issue));
  resetLocalVaultSecurityStateForTests();
  reportStorageWriteIssue('error', 'layali_alward_progress_v1');
  assert.equal(seenAfterReset.length, 0);
});

test('boot storage issues queue deduplicates before UI mount and drains once via consumePendingStorageWriteIssues', () => {
  resetLocalVaultSecurityStateForTests();
  recordBootStorageIssue('write-protected', 'layali_alward_progress_v1');
  recordBootStorageIssue('write-protected', 'layali_alward_progress_v1');
  recordBootStorageIssue('error', 'layali_alward_chat_v1');

  const drained = consumePendingStorageWriteIssues();
  assert.equal(drained.length, 2);
  assert.deepEqual(
    drained.map((i) => `${i.reason}:${i.storageKey}`).sort(),
    ['error:layali_alward_chat_v1', 'write-protected:layali_alward_progress_v1']
  );
  assert.deepEqual(consumePendingStorageWriteIssues(), []);

  const sealedWithDifferentSeed = sealLocalStoragePayload(
    JSON.stringify({ ok: true }),
    'other-device-seed-xyz'
  );
  assert.throws(() => unsealLocalStoragePayload(sealedWithDifferentSeed));
  assert.equal(isLocalVaultWriteProtected(), true);
  const unsealIssues = consumePendingStorageWriteIssues();
  assert.ok(
    unsealIssues.some(
      (i) => i.reason === 'write-protected' && i.storageKey === 'local_vault_key'
    )
  );
  resetLocalVaultSecurityStateForTests();
});

test('chatStorage protects pending outbox messages from 200-item trim and scopes pendingCloudClearVaultId', () => {
  let store = createInitialChatStore();
  const pendingOutbox = createLocalChatMessage({
    id: 'msg_pending_outbox',
    senderRole: 'wife',
    senderName: 'ريم',
    senderDeviceId: 'lw-w1',
    text: 'رسالة قديمة بانتظار المزامنة',
    createdAt: 100,
    needsCloudUpload: true,
    needsNearbyAck: false,
  });

  const filler = Array.from({ length: MAX_CHAT_HISTORY + 15 }, (_, idx) => ({
    id: `msg_filler_${idx}`,
    senderRole: 'husband' as const,
    senderName: 'أحمد',
    senderDeviceId: 'lw-h1',
    text: `رسالة رقم ${idx}`,
    createdAt: 1_000 + idx,
    deliveredVia: 'cloud' as const,
    pendingNearbyAck: false,
    pendingCloudUpload: false,
  }));

  store = mergeIncomingChatMessagesBatch(store, [pendingOutbox, ...filler]);
  assert.equal(store.messages.length, MAX_CHAT_HISTORY);
  assert.ok(store.messages.some((m) => m.id === 'msg_pending_outbox'));
  assert.ok(!store.messages.some((m) => m.id === 'msg_filler_0'));

  const cleared = clearLocalChatHistory(store, 50_000, {
    pendingCloudClearAt: 50_000,
    pendingCloudClearVaultId: 'vault_alpha',
  });
  assert.equal(cleared.pendingCloudClearVaultId, 'vault_alpha');

  const reparsed = parseChatStore(JSON.stringify(cleared));
  assert.equal(reparsed.pendingCloudClearVaultId, 'vault_alpha');
  assert.equal(reparsed.pendingCloudClearAt, 50_000);

  const withoutWatermark = clearPendingCloudClearWatermark(reparsed);
  assert.equal(withoutWatermark.pendingCloudClearAt, null);
  assert.equal(withoutWatermark.pendingCloudClearVaultId, null);
});

test('shouldAcceptPartnerSnapshotUpdate heals equal-timestamp differing snapshots and rejects stale ones', () => {
  const baseSnap = {
    partnerName: 'ريم',
    answersBySet: {
      'realm-01-beliefs-set-1': { q1: ['opt-1'] },
    },
    completedSetIds: [],
    lastSyncedAt: 5_000,
    pairedDeviceId: 'lw-w1',
    pairedDeviceLabel: 'جهاز الزوجة',
  };

  assert.equal(
    shouldAcceptPartnerSnapshotUpdate(
      baseSnap,
      5_000,
      { 'realm-01-beliefs-set-1': { q1: ['opt-1'] } },
      []
    ),
    false
  );
  assert.equal(
    shouldAcceptPartnerSnapshotUpdate(
      baseSnap,
      5_000,
      { 'realm-01-beliefs-set-1': { q1: ['opt-1', 'opt-2'] } },
      ['realm-01-beliefs-set-1']
    ),
    true
  );
  assert.equal(
    shouldAcceptPartnerSnapshotUpdate(
      baseSnap,
      4_999,
      { 'realm-01-beliefs-set-1': { q1: ['opt-2'] } },
      []
    ),
    false
  );
  assert.equal(
    shouldAcceptPartnerSnapshotUpdate(
      baseSnap,
      5_001,
      { 'realm-01-beliefs-set-1': { q1: ['opt-1'] } },
      []
    ),
    true
  );
});

test('getNextMonotonicQuestionTimestamp, applyIncomingPartnerSnapshot, and parseStoredProgress preserve monotonic state and rescue truncated JSON', () => {
  const bumped = getNextMonotonicQuestionTimestamp(9_999_999_999_000, 1_000_000);
  assert.equal(bumped, 9_999_999_999_001);

  const husband = createInitialProgress('husband', true);
  const syncedWithoutTimestamp = applyIncomingPartnerSnapshot(husband, {
    partnerName: 'ريم',
    answersBySet: { 'realm-01-beliefs-set-1': { q1: ['opt-1'] } },
    completedSetIds: [],
  });
  assert.equal(syncedWithoutTimestamp.partnerSnapshot.lastSyncedAt, 1);

  const withGhostCompleted = parseStoredProgress(
    JSON.stringify({
      role: 'wife',
      roleConfigured: true,
      answersBySet: { 'realm-01-beliefs-set-1': { q1: ['opt-1'] } },
      completedSetIds: ['realm-01-beliefs-set-1', 'ghost-set-without-answers'],
    })
  );
  assert.deepEqual(withGhostCompleted.completedSetIds, ['realm-01-beliefs-set-1']);

  const truncated = '{"deviceId":"lw-keep-1234","role":"husband","answersBySet":{"x":';
  const rescued = parseStoredProgress(truncated);
  assert.equal(rescued.role, 'husband');
  assert.equal(rescued.deviceId, 'lw-keep-1234');
});

test('sessionDrafts persists chat and question drafts and clears per-set/all safely', () => {
  const prevWindow = (globalThis as { window?: unknown }).window;
  const storeMap = new Map<string, string>();
  const mockSessionStorage: Storage = {
    get length() {
      return storeMap.size;
    },
    clear() {
      storeMap.clear();
    },
    getItem(key: string) {
      return storeMap.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(storeMap.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storeMap.delete(key);
    },
    setItem(key: string, value: string) {
      storeMap.set(key, value);
    },
  };

  (globalThis as { window?: { sessionStorage: Storage } }).window = {
    sessionStorage: mockSessionStorage,
  };

  try {
    clearAllSessionDrafts();
    saveChatDraft('مسودة رسالة طويلة');
    assert.equal(loadChatDraft(), 'مسودة رسالة طويلة');
    clearChatDraft();
    assert.equal(loadChatDraft(), '');

    saveQuestionDraft('realm-01-beliefs-set-1', 'q1', ['opt-1', 'opt-3']);
    saveQuestionDraft('realm-01-beliefs-set-1', 'q2', ['opt-2']);
    saveQuestionDraft('realm-02-set-1', 'q1', ['opt-4']);
    assert.deepEqual(loadQuestionDraft('realm-01-beliefs-set-1', 'q1'), ['opt-1', 'opt-3']);

    clearQuestionDraft('realm-01-beliefs-set-1', 'q1');
    assert.equal(loadQuestionDraft('realm-01-beliefs-set-1', 'q1'), null);
    assert.deepEqual(loadQuestionDraft('realm-01-beliefs-set-1', 'q2'), ['opt-2']);

    clearQuestionDraftsForSet('realm-01-beliefs-set-1');
    assert.equal(loadQuestionDraft('realm-01-beliefs-set-1', 'q2'), null);
    assert.deepEqual(loadQuestionDraft('realm-02-set-1', 'q1'), ['opt-4']);

    clearAllSessionDrafts();
    assert.equal(loadQuestionDraft('realm-02-set-1', 'q1'), null);
  } finally {
    if (prevWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
  }
});


