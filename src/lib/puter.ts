export type PuterChatChunk = {
  text?: string;
};

export type PuterChatStream = AsyncIterable<PuterChatChunk>;

export type PuterUser = {
  username?: string;
  email?: string;
  uuid?: string;
};

export type PuterGlobal = {
  auth: {
    signIn: (options?: { attempt_temp_user_creation?: boolean }) => Promise<unknown>;
    signOut: () => void | Promise<void>;
    isSignedIn: () => boolean;
    getUser: () => Promise<PuterUser>;
  };
  ai: {
    chat: (
      prompt: string,
      options?: {
        model?: string;
        stream?: boolean;
      },
    ) => Promise<string | PuterChatStream>;
  };
};

declare global {
  interface Window {
    puter?: PuterGlobal;
  }
}

export function getPuter() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.puter || null;
}

export async function ensurePuterSignedIn(forceSwitch = false) {
  const puter = getPuter();
  if (!puter) {
    throw new Error("Puter n'est pas charge dans l'application.");
  }

  if (forceSwitch && puter.auth.isSignedIn()) {
    await puter.auth.signOut();
  }

  if (!puter.auth.isSignedIn()) {
    await puter.auth.signIn();
  }

  return puter;
}
