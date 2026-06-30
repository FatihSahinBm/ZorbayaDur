import { describe, it, expect, vi, beforeEach } from "vitest";
import { triggerEscalationIfApplicable } from "../../lib/ai/escalation";

// Mock Supabase
const mockReport = {
  id: "rep-crit-1",
  tracking_code: "TRK-9999",
  risk_level: "Kritik",
  ai_analysis: {
    urgency: {
      urgency_score: 95
    }
  }
};

const mockNonCritReport = {
  id: "rep-noncrit-1",
  tracking_code: "TRK-0000",
  risk_level: "Orta",
  ai_analysis: {
    urgency: {
      urgency_score: 45
    }
  }
};

const mockWorkingHoursIn = [
  { day_of_week: 1, start_time: "00:00:00", end_time: "23:59:59" }
];

const mockWorkingHoursOut = [
  { day_of_week: 1, start_time: "09:00:00", end_time: "15:00:00" } // Suppose current time is mocked outside this range
];

const mockRoster = {
  id: "ros-1",
  day_of_week: 1,
  start_time: "00:00:00",
  end_time: "23:59:59",
  assigned_name: "Mehmet Gök",
  contact_channel: "email",
  contact_address: "mehmet@school.edu.tr",
  is_active: true
};

let workingHoursMock = mockWorkingHoursIn;
let reportMock: any = mockReport;
let escalationsTable: any[] = [];
let auditLogsTable: any[] = [];

// Mock Date to consistently evaluate day_of_week = 1 (Monday) and time = 18:00:00 (outside 09:00-15:00)
const mockedDate = new Date("2026-06-29T18:00:00.000Z"); // June 29, 2026 is Monday
vi.useFakeTimers();
vi.setSystemTime(mockedDate);

const mockSupabaseClient: any = {
  from: vi.fn((table) => {
    return {
      select: vi.fn(() => ({
        eq: vi.fn((col, val) => {
          if (table === "reports") {
            return {
              single: vi.fn().mockResolvedValue({ data: reportMock, error: null })
            };
          }
          if (table === "pdr_working_hours") {
            return Promise.resolve({ data: workingHoursMock, error: null });
          }
          if (table === "escalations") {
            // Duplicate check
            const found = escalationsTable.some(e => e.report_id === val);
            return {
              maybeSingle: vi.fn().mockResolvedValue({ data: found ? { id: "esc-exist" } : null, error: null })
            };
          }
          if (table === "on_call_roster") {
            return {
              eq: vi.fn(() => Promise.resolve({ data: [mockRoster], error: null }))
            };
          }
          return Promise.resolve({ data: [], error: null });
        })
      })),
      insert: vi.fn((arr) => {
        if (table === "escalations") {
          escalationsTable.push(...arr);
        }
        if (table === "audit_logs") {
          auditLogsTable.push(...arr);
        }
        return Promise.resolve({ error: null });
      })
    };
  })
};

describe("Critical Out-of-Hours Escalation System tests", () => {
  beforeEach(() => {
    workingHoursMock = mockWorkingHoursIn;
    reportMock = mockReport;
    escalationsTable = [];
    auditLogsTable = [];
  });

  it("should NOT trigger escalation if report is submitted during PDR working hours", async () => {
    // In working hours since mockWorkingHoursIn covers 00:00-23:59
    workingHoursMock = mockWorkingHoursIn;
    
    const res = await triggerEscalationIfApplicable("rep-crit-1", mockSupabaseClient);
    expect(res.escalated).toBe(false);
    expect(res.reason).toBe("Çalışma saatleri dahilinde");
    expect(escalationsTable).toHaveLength(0);
    expect(auditLogsTable).toHaveLength(0);
  });

  it("should trigger escalation and log audits if critical report is submitted outside PDR working hours", async () => {
    // Current simulated time is Monday 18:00:00, which is outside mockWorkingHoursOut (09:00-15:00)
    workingHoursMock = mockWorkingHoursOut;
    
    const res = await triggerEscalationIfApplicable("rep-crit-1", mockSupabaseClient);
    expect(res.escalated).toBe(true);
    
    // Check escalation tracker table entry
    expect(escalationsTable).toHaveLength(1);
    expect(escalationsTable[0].report_id).toBe("rep-crit-1");
    expect(escalationsTable[0].is_acknowledged).toBe(false);

    // Check audit logs table entry
    expect(auditLogsTable).toHaveLength(1);
    expect(auditLogsTable[0].action).toContain("ESKALASYON_BILDIRIMI_GONDERILDI");
    expect(auditLogsTable[0].actor).toBe("SYSTEM");
  });

  it("should NOT trigger escalation if the report is not critical (urgency score < 80)", async () => {
    workingHoursMock = mockWorkingHoursOut;
    reportMock = mockNonCritReport;

    const res = await triggerEscalationIfApplicable("rep-noncrit-1", mockSupabaseClient);
    expect(res.escalated).toBe(false);
    expect(res.reason).toBe("Risk seviyesi kritik değil");
    expect(escalationsTable).toHaveLength(0);
  });
});
