import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.3/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the calling user is admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client to verify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "list-users") {
      // List all users with their roles and entry stats
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (listError) {
        return new Response(JSON.stringify({ error: listError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get roles
      const { data: roles } = await adminClient.from("user_roles").select("*");
      const rolesMap = new Map<string, string>();
      (roles || []).forEach((r: any) => rolesMap.set(r.user_id, r.role));

      // Get entry counts per user
      const { data: entryCounts } = await adminClient
        .from("timetrack_entries")
        .select("user_id, id");

      const countMap = new Map<string, number>();
      (entryCounts || []).forEach((e: any) => {
        countMap.set(e.user_id, (countMap.get(e.user_id) || 0) + 1);
      });

      const result = users.map((u: any) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        role: rolesMap.get(u.id) || "user",
        entry_count: countMap.get(u.id) || 0,
      }));

      return new Response(JSON.stringify({ users: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "user-entries") {
      const targetUserId = url.searchParams.get("user_id");
      if (!targetUserId) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: entries, error: entriesError } = await adminClient
        .from("timetrack_entries")
        .select("*")
        .eq("user_id", targetUserId)
        .order("date", { ascending: false });

      if (entriesError) {
        return new Response(JSON.stringify({ error: entriesError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ entries: entries || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set-role" && req.method === "POST") {
      const body = await req.json();
      const { user_id: targetId, role } = body;
      if (!targetId || !["admin", "user"].includes(role)) {
        return new Response(JSON.stringify({ error: "Invalid user_id or role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert role
      await adminClient.from("user_roles").delete().eq("user_id", targetId);
      const { error: insertError } = await adminClient.from("user_roles").insert({
        user_id: targetId,
        role,
      });

      if (insertError) {
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-user" && req.method === "POST") {
      const body = await req.json();
      const { user_id: targetId } = body;
      if (!targetId) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Prevent self-deletion
      if (targetId === user.id) {
        return new Response(JSON.stringify({ error: "Cannot delete yourself" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: delError } = await adminClient.auth.admin.deleteUser(targetId);
      if (delError) {
        return new Response(JSON.stringify({ error: delError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "stats") {
      // Get aggregate stats
      const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const { data: allEntries } = await adminClient
        .from("timetrack_entries")
        .select("user_id, date, sessions, type");

      const totalUsers = users?.length || 0;
      const totalEntries = allEntries?.length || 0;
      const workEntries = (allEntries || []).filter((e: any) => e.type === "work");

      let totalWorkMinutes = 0;
      for (const entry of workEntries) {
        const sessions = entry.sessions as any[];
        for (const s of sessions) {
          if (s.clockIn && s.clockOut) {
            const [inH, inM] = s.clockIn.split(":").map(Number);
            const [outH, outM] = s.clockOut.split(":").map(Number);
            let mins = (outH * 60 + outM) - (inH * 60 + inM);
            if (mins < 0) mins += 24 * 60;
            totalWorkMinutes += Math.max(0, mins);
          }
        }
      }

      // Active today
      const today = new Date().toISOString().split("T")[0];
      const activeToday = new Set(
        (allEntries || [])
          .filter((e: any) => e.date === today && e.type === "work")
          .map((e: any) => e.user_id)
      ).size;

      return new Response(JSON.stringify({
        totalUsers,
        totalEntries,
        totalWorkHours: Math.round(totalWorkMinutes / 60 * 10) / 10,
        activeToday,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});