import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const isDev = Boolean(import.meta.env?.DEV);
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: isDev ? auth.currentUser?.email : undefined,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: isDev ? provider.email : undefined,
        })) ?? [],
    },
    operationType,
    path,
  };
  if (isDev) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  } else {
    console.error(
      'Firestore Error: ',
      JSON.stringify({
        error: errInfo.error,
        operationType: errInfo.operationType,
        path: errInfo.path,
        userId: errInfo.authInfo.userId ?? null,
      })
    );
  }
  throw new Error(JSON.stringify(errInfo));
}

let connectionTestedForUid: string | null = null;

async function testConnection(uid: string) {
  if (typeof window === 'undefined' || connectionTestedForUid === uid) return;
  connectionTestedForUid = uid;
  try {
    await getDocFromServer(doc(db, 'users', uid));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
      void testConnection(user.uid);
    } else if (!user) {
      connectionTestedForUid = null;
    }
  });
}
