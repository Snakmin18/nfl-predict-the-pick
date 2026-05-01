import type { Profile } from "../types/profile";

const {
  saveProfileMock,
  supabaseState,
} = vi.hoisted(() => ({
  saveProfileMock: vi.fn(),
  supabaseState: {
    current: null as null | {
      auth: {
        getSession: ReturnType<typeof vi.fn>;
        signInWithPassword: ReturnType<typeof vi.fn>;
        signUp: ReturnType<typeof vi.fn>;
        signOut: ReturnType<typeof vi.fn>;
      };
    },
  },
}));

vi.mock("../lib/supabase/client", () => ({
  get supabase() {
    return supabaseState.current;
  },
}));

vi.mock("./profileStorage", () => ({
  saveProfile: saveProfileMock,
}));

import {
  getAuthUser,
  getCurrentUserId,
  signInWithEmail,
  signOut,
  signUpWithEmail,
} from "./auth";

describe("auth utils", () => {
  beforeEach(() => {
    supabaseState.current = null;
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("uses a stable local fallback user id when Supabase is unavailable in dev", async () => {
    vi.useFakeTimers();
    const uuidSpy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("00000000-0000-0000-0000-000000000321");

    const user = await getAuthUser();
    const currentUserId = await getCurrentUserId();

    expect(user).toEqual({
      id: "00000000-0000-0000-0000-000000000321",
      email: "Local development",
    });
    expect(currentUserId).toBe("00000000-0000-0000-0000-000000000321");
    expect(localStorage.getItem("local-user-id")).toBe(
      "00000000-0000-0000-0000-000000000321",
    );

    uuidSpy.mockRestore();
    vi.useRealTimers();
  });

  it("returns the authenticated Supabase user from the session", async () => {
    const getSessionMock = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "jake@example.com",
          },
        },
      },
      error: null,
    });

    supabaseState.current = {
      auth: {
        getSession: getSessionMock,
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      },
    };

    await expect(getAuthUser()).resolves.toEqual({
      id: "user-1",
      email: "jake@example.com",
    });
    await expect(getCurrentUserId()).resolves.toBe("user-1");
  });

  it("throws when getCurrentUserId is called without a signed-in Supabase user", async () => {
    supabaseState.current = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      },
    };

    await expect(getCurrentUserId()).rejects.toThrow("You need to sign in first.");
  });

  it("signs in with email/password and returns the current auth user", async () => {
    const signInWithPasswordMock = vi.fn().mockResolvedValue({ error: null });
    const getSessionMock = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "jake@example.com",
          },
        },
      },
      error: null,
    });

    supabaseState.current = {
      auth: {
        getSession: getSessionMock,
        signInWithPassword: signInWithPasswordMock,
        signUp: vi.fn(),
        signOut: vi.fn(),
      },
    };

    const user = await signInWithEmail("jake@example.com", "secret");

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "jake@example.com",
      password: "secret",
    });
    expect(user).toEqual({
      id: "user-1",
      email: "jake@example.com",
    });
  });

  it("creates a profile after sign-up when a user session exists", async () => {
    const signUpMock = vi.fn().mockResolvedValue({ error: null });
    const getSessionMock = vi.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "jake@example.com",
          },
        },
      },
      error: null,
    });

    supabaseState.current = {
      auth: {
        getSession: getSessionMock,
        signInWithPassword: vi.fn(),
        signUp: signUpMock,
        signOut: vi.fn(),
      },
    };

    const before = Date.now();
    const user = await signUpWithEmail("jake@example.com", "secret", "Jake");
    const after = Date.now();

    expect(signUpMock).toHaveBeenCalledWith({
      email: "jake@example.com",
      password: "secret",
    });
    expect(user).toEqual({
      id: "user-1",
      email: "jake@example.com",
    });
    expect(saveProfileMock).toHaveBeenCalledTimes(1);

    const savedProfile = saveProfileMock.mock.calls[0][0] as Profile;
    expect(savedProfile.id).toBe("user-1");
    expect(savedProfile.displayName).toBe("Jake");
    expect(savedProfile.createdAt).toBeDefined();
    expect(new Date(savedProfile.createdAt ?? "").getTime()).toBeGreaterThanOrEqual(
      before,
    );
    expect(new Date(savedProfile.createdAt ?? "").getTime()).toBeLessThanOrEqual(
      after,
    );
  });

  it("clears the local fallback user id on sign out when Supabase is unavailable", async () => {
    localStorage.setItem("local-user-id", "user-1");

    await signOut();

    expect(localStorage.getItem("local-user-id")).toBeNull();
  });

  it("calls Supabase signOut when configured", async () => {
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    supabaseState.current = {
      auth: {
        getSession: vi.fn(),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: signOutMock,
      },
    };

    await signOut();

    expect(signOutMock).toHaveBeenCalled();
  });
});
