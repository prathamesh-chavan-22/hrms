import { describe, expect, it, vi, beforeEach } from "vitest";

const mockService = {
  from: vi.fn(),
  auth: { admin: { createUser: vi.fn(), deleteUser: vi.fn() } },
};

vi.mock("../supabase.server", () => ({
  createSupabaseServiceClient: () => mockService,
}));

vi.mock("../plans", () => ({
  canAddEmployee: () => true,
}));

import { acceptInvite } from "./invites.server";

function makeChain(finalResult: unknown) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = () => builder;
  for (const method of ["select", "eq", "is", "gt", "update", "insert"]) {
    builder[method] = vi.fn(self);
  }
  builder.maybeSingle = vi.fn(async () => finalResult);
  return builder;
}

describe("acceptInvite", () => {
  const env = {} as Env;
  const token = "invite-token";
  const invite = {
    tenant_id: "tenant-1",
    email: "new@example.com",
    role: "employee",
    tenant: { plan: "starter" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("claims invite before creating user and rolls back on profile failure", async () => {
    const claimBuilder = makeChain({ data: invite, error: null });
    const rollbackBuilder = makeChain({ data: null, error: null });
    const countBuilder = makeChain({ count: 1, error: null });

    let inviteUpdateCalls = 0;
    mockService.from.mockImplementation((table: string) => {
      if (table === "invites") {
        return {
          update: vi.fn(() => {
            inviteUpdateCalls += 1;
            return inviteUpdateCalls === 1 ? claimBuilder : rollbackBuilder;
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn(() => countBuilder),
          insert: vi.fn(async () => ({ error: { message: "profile failed" } })),
        };
      }
      return makeChain({ data: null, error: null });
    });

    mockService.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockService.auth.admin.deleteUser.mockResolvedValue({ error: null });

    const result = await acceptInvite(env, token, {
      fullName: "New User",
      password: "password123",
    });

    expect(result.error).toBe("profile failed");
    expect(mockService.auth.admin.deleteUser).toHaveBeenCalledWith("user-1");
    expect(inviteUpdateCalls).toBe(2);
  });

  it("returns error when invite was already accepted", async () => {
    const claimBuilder = makeChain({ data: null, error: null });
    const lookupBuilder = makeChain({ data: { accepted_at: "2024-01-01" }, error: null });

    mockService.from.mockImplementation((table: string) => {
      if (table === "invites") {
        return {
          update: vi.fn(() => claimBuilder),
          select: vi.fn(() => lookupBuilder),
        };
      }
      return makeChain({ data: null, error: null });
    });

    const result = await acceptInvite(env, token, {
      fullName: "New User",
      password: "password123",
    });

    expect(result.error).toMatch(/already been accepted/i);
    expect(mockService.auth.admin.createUser).not.toHaveBeenCalled();
  });
});
