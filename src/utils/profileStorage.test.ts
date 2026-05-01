import type { Profile } from "../types/profile";

const { supabaseState } = vi.hoisted(() => ({
  supabaseState: {
    current: null as null | {
      from: ReturnType<typeof vi.fn>;
    },
  },
}));

vi.mock("../lib/supabase/client", () => ({
  get supabase() {
    return supabaseState.current;
  },
}));

import { loadProfile, saveProfile } from "./profileStorage";

function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    displayName: "Jake",
    isAppAdmin: true,
    createdAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("profileStorage", () => {
  beforeEach(() => {
    supabaseState.current = null;
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("saves and loads a profile locally when Supabase is unavailable", async () => {
    const profile = createProfile();

    await saveProfile(profile);
    await expect(loadProfile("user-1")).resolves.toEqual(profile);
  });

  it("inserts only the writable profile fields into Supabase", async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    supabaseState.current = {
      from: vi.fn().mockReturnValue({ insert: insertMock }),
    };

    await saveProfile(createProfile());

    expect(insertMock).toHaveBeenCalledWith({
      id: "user-1",
      display_name: "Jake",
    });
  });

  it("maps a Supabase profile row back to the app profile shape", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: "user-1",
        display_name: "Jake",
        is_app_admin: true,
        created_at: "2026-04-01T00:00:00.000Z",
      },
      error: null,
    });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });

    supabaseState.current = {
      from: vi.fn().mockReturnValue({ select: selectMock }),
    };

    await expect(loadProfile("user-1")).resolves.toEqual({
      id: "user-1",
      displayName: "Jake",
      isAppAdmin: true,
      createdAt: "2026-04-01T00:00:00.000Z",
    });
    expect(eqMock).toHaveBeenCalledWith("id", "user-1");
  });
});
