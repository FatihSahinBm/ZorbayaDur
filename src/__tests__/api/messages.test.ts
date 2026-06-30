import { describe, it, expect, vi, beforeEach } from "vitest";

// Variables prefixed with 'mock' are allowed in vi.mock because they are hoisted
const mockReports: any[] = [];
const mockMessages: any[] = [];

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(() => ({
      from: vi.fn((table) => {
        if (table === "reports") {
          let queryId: string | null = null;
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((col, val) => {
              if (col === "id") queryId = val;
              return {
                single: vi.fn().mockImplementation(async () => {
                  const rep = mockReports.find(r => r.id === queryId);
                  if (!rep) return { data: null, error: { message: "Rapor bulunamadı" } };
                  return { data: rep, error: null };
                })
              };
            })
          };
        } else if (table === "anonymous_messages" || table === "messages") {
          let queryReportId: string | null = null;
          let updateValues: any = null;

          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockImplementation((col, val) => {
              if (col === "report_id") queryReportId = val;
              return {
                order: vi.fn().mockImplementation(async () => {
                  const msgs = mockMessages.filter(m => m.report_id === queryReportId);
                  return { data: msgs, error: null };
                })
              };
            }),
            update: vi.fn().mockImplementation((values) => {
              updateValues = values;
              return {
                eq: vi.fn().mockImplementation((col, val) => {
                  if (col === "report_id") queryReportId = val;
                  return {
                    in: vi.fn().mockImplementation((col2, val2) => {
                      return {
                        eq: vi.fn().mockImplementation(async (col3, val3) => {
                          mockMessages.forEach(m => {
                            if (
                              m.report_id === queryReportId &&
                              val2.includes(m.sender_role) &&
                              m.is_read === val3
                            ) {
                              Object.assign(m, updateValues);
                            }
                          });
                          return { error: null };
                        })
                      };
                    })
                  };
                })
              };
            }),
            insert: vi.fn().mockImplementation((arr) => {
              const inserted = arr.map((item: any) => {
                const newItem = {
                  id: `msg-${Math.floor(Math.random() * 9000 + 1000)}`,
                  created_at: new Date().toISOString(),
                  is_read: false,
                  ...item
                };
                mockMessages.push(newItem);
                return newItem;
              });
              return {
                select: vi.fn().mockReturnThis(),
                single: vi.fn().mockImplementation(async () => {
                  return { data: inserted[0], error: null };
                })
              };
            })
          };
        }
        throw new Error(`Unsupported table ${table}`);
      })
    }))
  };
});

// Import route handlers AFTER the mock is set up
import { GET, POST } from "../../app/api/messages/route";
import { NextRequest } from "next/server";

describe("anonymous_messages API integration tests", () => {
  beforeEach(() => {
    // Reset database state before each test
    mockReports.length = 0;
    mockMessages.length = 0;

    mockReports.push({ id: "rep-123", session_token: "tok-123" });
  });

  describe("GET /api/messages", () => {
    it("should return 400 if reportId is missing", async () => {
      const request = new NextRequest("http://localhost/api/messages?role=student");
      const response = await GET(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("reportId gerekli");
    });

    it("should return messages for pdr role without checking token", async () => {
      mockMessages.push({ id: "msg-1", report_id: "rep-123", sender_role: "student", content: "hello", created_at: "2026-06-30" });

      const request = new NextRequest("http://localhost/api/messages?reportId=rep-123&role=pdr");
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].content).toBe("hello");
    });

    it("should return messages for teacher role without checking token", async () => {
      mockMessages.push({ id: "msg-2", report_id: "rep-123", sender_role: "teacher", content: "hello from teacher", created_at: "2026-06-30" });

      const request = new NextRequest("http://localhost/api/messages?reportId=rep-123&role=teacher");
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].content).toBe("hello from teacher");
    });

    it("should return 401 for student role if token is missing", async () => {
      const request = new NextRequest("http://localhost/api/messages?reportId=rep-123&role=student");
      const response = await GET(request);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Token gerekli");
    });

    it("should return 404 if report is not found for student role", async () => {
      // Clear reports db
      mockReports.length = 0;

      const request = new NextRequest("http://localhost/api/messages?reportId=rep-123&role=student&token=tok-123");
      const response = await GET(request);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Rapor bulunamadı");
    });

    it("should return 403 if student token does not match report session_token", async () => {
      const request = new NextRequest("http://localhost/api/messages?reportId=rep-123&role=student&token=tok-different");
      const response = await GET(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Geçersiz token");
    });

    it("should return messages and update is_read for student role if token matches", async () => {
      mockMessages.push({ id: "msg-3", report_id: "rep-123", sender_role: "pdr", content: "hello student", created_at: "2026-06-30", is_read: false });

      const request = new NextRequest("http://localhost/api/messages?reportId=rep-123&role=student&token=tok-123");
      const response = await GET(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.messages).toHaveLength(1);
      
      // Verify that PDR message is marked as read in in-memory database
      expect(mockMessages[0].is_read).toBe(true);
    });
  });

  describe("POST /api/messages", () => {
    it("should return 400 if required body fields are missing", async () => {
      const request = new NextRequest("http://localhost/api/messages", {
        method: "POST",
        body: JSON.stringify({ content: "hello" }),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("reportId, content ve role gerekli");
    });

    it("should send message successfully for student role if token is valid", async () => {
      const request = new NextRequest("http://localhost/api/messages", {
        method: "POST",
        body: JSON.stringify({
          reportId: "rep-123",
          token: "tok-123",
          content: "hello counselor",
          role: "student",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message.content).toBe("hello counselor");
      expect(data.message.sender_role).toBe("student");
      expect(data.message.session_token).toBe("tok-123");
      expect(mockMessages).toHaveLength(1);
    });

    it("should return 403 for student role if token is invalid during POST", async () => {
      const request = new NextRequest("http://localhost/api/messages", {
        method: "POST",
        body: JSON.stringify({
          reportId: "rep-123",
          token: "tok-different",
          content: "hello counselor",
          role: "student",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Yetkisiz işlem");
    });

    it("should send message successfully for PDR role without requiring session token", async () => {
      const request = new NextRequest("http://localhost/api/messages", {
        method: "POST",
        body: JSON.stringify({
          reportId: "rep-123",
          content: "hello student from pdr",
          role: "pdr",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message.content).toBe("hello student from pdr");
      expect(data.message.sender_role).toBe("pdr");
      expect(data.message.session_token).toBe("pdr-system");
      expect(mockMessages).toHaveLength(1);
    });

    it("should send message successfully for Teacher role without requiring session token", async () => {
      const request = new NextRequest("http://localhost/api/messages", {
        method: "POST",
        body: JSON.stringify({
          reportId: "rep-123",
          content: "hello student from teacher",
          role: "teacher",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message.content).toBe("hello student from teacher");
      expect(data.message.sender_role).toBe("teacher");
      expect(data.message.session_token).toBe("teacher-system");
      expect(mockMessages).toHaveLength(1);
    });
  });
});
