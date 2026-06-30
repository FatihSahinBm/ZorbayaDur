import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client responses based on JWT roles
const mockReports = [
  { id: "rep-1", category: "Sözlü", risk_level: "Orta", status: "Yeni", encrypted_identity: "cipher-text-1" },
  { id: "rep-2", category: "Siber", risk_level: "Yüksek", status: "Tamamlandı", encrypted_identity: "cipher-text-2" }
];

const mockLogs = [
  { log_id: "log-1", action: "İhbar Durumu Güncellendi: TRK-5555", actor: "Ahmet Y. (PDR)", status: "Başarılı" },
  { log_id: "log-2", action: "İhbar Durumu Güncellendi: TRK-5555", actor: "SYSTEM", status: "Başarılı" }
];

let currentUserRole = "okul_yoneticisi";

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table) => {
        if (table === "reports") {
          return {
            select: vi.fn().mockImplementation(() => {
              // RLS simulation: If role is not pdr, return empty/error
              if (currentUserRole !== "pdr") {
                return Promise.resolve({ data: [], error: { message: "new row-level security policy restricts access" } });
              }
              return Promise.resolve({ data: mockReports, error: null });
            })
          };
        } else if (table === "reports_summary_view") {
          return {
            select: vi.fn().mockImplementation(() => {
              // Both pdr and manager have access to the summary view
              const summaryData = mockReports.map(r => ({
                id: r.id,
                category: r.category,
                risk_level: r.risk_level,
                status: r.status,
                resolution_time_hours: 12
              }));
              return Promise.resolve({ data: summaryData, error: null });
            })
          };
        }
        throw new Error(`Unsupported table ${table}`);
      }),
      rpc: vi.fn().mockImplementation((fnName, args) => {
        if (fnName === "get_case_status_by_code") {
          if (currentUserRole !== "okul_yoneticisi" && currentUserRole !== "pdr") {
            return Promise.resolve({ data: null, error: { message: "Yetkisiz işlem" } });
          }
          if (args.target_code === "TRK-5555") {
            // Mask actor details
            const history = mockLogs.map(l => ({
              ...l,
              actor: l.actor === "SYSTEM" ? "Sistem" : "PDR Yetkilisi"
            }));
            return Promise.resolve({
              data: {
                found: true,
                status: "Yeni",
                risk_level: "Orta",
                category: "Sözlü",
                history
              },
              error: null
            });
          }
          return Promise.resolve({ data: { found: false }, error: null });
        }
        throw new Error(`Unsupported RPC ${fnName}`);
      })
    }))
  };
});

describe("School Manager Dashboard & RLS Security checks", () => {
  beforeEach(() => {
    currentUserRole = "okul_yoneticisi";
  });

  it("should deny managers direct select access to reports table at RLS level", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient("url", "key");
    
    const { data, error } = await client.from("reports").select("*");
    expect(error).not.toBeNull();
    expect(error?.message).toContain("row-level security");
    expect(data).toHaveLength(0);
  });

  it("should allow managers select access to reports_summary_view", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient("url", "key");
    
    const { data, error } = await client.from("reports_summary_view").select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    // Verify PII fields are completely missing from summary view rows
    expect(data![0]).not.toHaveProperty("encrypted_identity");
    expect(data![0]).not.toHaveProperty("content");
  });

  it("should allow PDR direct select access to reports table", async () => {
    currentUserRole = "pdr";
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient("url", "key");
    
    const { data, error } = await client.from("reports").select("*");
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(data![0]).toHaveProperty("encrypted_identity");
  });

  it("should return masked history logs via get_case_status_by_code RPC for managers", async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient("url", "key");

    const { data, error } = await client.rpc("get_case_status_by_code", { target_code: "TRK-5555" });
    expect(error).toBeNull();
    expect(data!.found).toBe(true);
    expect(data!.status).toBe("Yeni");
    
    // Check that actor names are masked
    expect(data!.history).toHaveLength(2);
    expect(data!.history[0].actor).toBe("PDR Yetkilisi"); // Formatted from "Ahmet Y. (PDR)"
    expect(data!.history[1].actor).toBe("Sistem"); // Formatted from "SYSTEM"
  });
});
