import { supabase } from "./supabaseClient";
import { saveProfile } from "./profileStorage";

const LOCAL_USER_ID_KEY = "local-user-id";
const canUseLocalAuthFallback = import.meta.env.DEV;

export type AuthUser = {
  id: string;
  email?: string;
};

function getLocalUserId() {
  const existingUserId = localStorage.getItem(LOCAL_USER_ID_KEY);
  if (existingUserId) return existingUserId;

  const userId = crypto.randomUUID();
  localStorage.setItem(LOCAL_USER_ID_KEY, userId);
  return userId;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  if (!supabase) {
    if (!canUseLocalAuthFallback) {
      throw new Error(
        "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your deployment environment.",
      );
    }

    return {
      id: getLocalUserId(),
      email: "Local development",
    };
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  return session?.user
    ? { id: session.user.id, email: session.user.email }
    : null;
}

export async function getCurrentUserId() {
  if (!supabase) {
    if (!canUseLocalAuthFallback) {
      throw new Error(
        "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your deployment environment.",
      );
    }

    return getLocalUserId();
  }

  const user = await getAuthUser();
  if (!user) {
    throw new Error("You need to sign in first.");
  }

  return user.id;
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your deployment environment.",
    );
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return getAuthUser();
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
) {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your deployment environment.",
    );
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  const user = await getAuthUser();
  if (user) {
    await saveProfile({
      id: user.id,
      displayName,
      createdAt: new Date().toISOString(),
    });
  }

  return user;
}

export async function signOut() {
  if (!supabase) {
    if (canUseLocalAuthFallback) {
      localStorage.removeItem(LOCAL_USER_ID_KEY);
    }

    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
