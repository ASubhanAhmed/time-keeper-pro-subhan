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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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
    const respond = (data: any, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // ─── LIST USERS ───
    if (action === "list-users") {
      const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (listError) return respond({ error: listError.message }, 500);

      const { data: roles } = await adminClient.from("user_roles").select("*");
      const rolesMap = new Map<string, string>();
      (roles || []).forEach((r: any) => rolesMap.set(r.user_id, r.role));

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

      return respond({ users: result });
    }

    // ─── USER ENTRIES ───
    if (action === "user-entries") {
      const targetUserId = url.searchParams.get("user_id");
      if (!targetUserId) return respond({ error: "user_id required" }, 400);

      const { data: entries, error: entriesError } = await adminClient
        .from("timetrack_entries")
        .select("*")
        .eq("user_id", targetUserId)
        .order("date", { ascending: false });

      if (entriesError) return respond({ error: entriesError.message }, 500);
      return respond({ entries: entries || [] });
    }

    // ─── USER DETAIL (entries + tasks + work hours breakdown) ───
    if (action === "user-detail") {
      const targetUserId = url.searchParams.get("user_id");
      if (!targetUserId) return respond({ error: "user_id required" }, 400);

      const [entriesRes, tasksRes, userRes] = await Promise.all([
        adminClient.from("timetrack_entries").select("*").eq("user_id", targetUserId).order("date", { ascending: false }),
        adminClient.from("kanban_tasks").select("*").eq("user_id", targetUserId).order("created_at", { ascending: false }),
        adminClient.auth.admin.getUserById(targetUserId),
      ]);

      const entries = entriesRes.data || [];
      const tasks = tasksRes.data || [];
      const userInfo = userRes.data?.user;

      // Calculate work stats
      let totalWorkMinutes = 0;
      let totalBreakMinutes = 0;
      let daysWorked = 0;
      const workEntries = entries.filter((e: any) => e.type === "work");
      daysWorked = workEntries.length;

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
          if (s.breakStart && s.breakEnd) {
            const [bsH, bsM] = s.breakStart.split(":").map(Number);
            const [beH, beM] = s.breakEnd.split(":").map(Number);
            let bMins = (beH * 60 + beM) - (bsH * 60 + bsM);
            if (bMins < 0) bMins += 24 * 60;
            totalBreakMinutes += Math.max(0, bMins);
          }
        }
      }

      const taskStats = {
        total: tasks.length,
        todo: tasks.filter((t: any) => t.status === "todo").length,
        inProgress: tasks.filter((t: any) => t.status === "in-progress").length,
        done: tasks.filter((t: any) => t.status === "done").length,
      };

      return respond({
        user: userInfo ? { id: userInfo.id, email: userInfo.email, created_at: userInfo.created_at, last_sign_in_at: userInfo.last_sign_in_at } : null,
        entries,
        tasks,
        stats: {
          totalWorkHours: Math.round(totalWorkMinutes / 60 * 10) / 10,
          totalBreakHours: Math.round(totalBreakMinutes / 60 * 10) / 10,
          netWorkHours: Math.round((totalWorkMinutes - totalBreakMinutes) / 60 * 10) / 10,
          daysWorked,
          avgHoursPerDay: daysWorked > 0 ? Math.round((totalWorkMinutes - totalBreakMinutes) / daysWorked / 60 * 10) / 10 : 0,
          taskStats,
        },
      });
    }

    // ─── SET ROLE ───
    if (action === "set-role" && req.method === "POST") {
      const body = await req.json();
      const { user_id: targetId, role } = body;
      if (!targetId || !["admin", "user"].includes(role)) {
        return respond({ error: "Invalid user_id or role" }, 400);
      }

      await adminClient.from("user_roles").delete().eq("user_id", targetId);
      const { error: insertError } = await adminClient.from("user_roles").insert({
        user_id: targetId,
        role,
      });

      if (insertError) return respond({ error: insertError.message }, 500);
      return respond({ success: true });
    }

    // ─── DELETE USER ───
    if (action === "delete-user" && req.method === "POST") {
      const body = await req.json();
      const { user_id: targetId } = body;
      if (!targetId) return respond({ error: "user_id required" }, 400);
      if (targetId === user.id) return respond({ error: "Cannot delete yourself" }, 400);

      // Clean up user data first
      await Promise.all([
        adminClient.from("timetrack_entries").delete().eq("user_id", targetId),
        adminClient.from("kanban_tasks").delete().eq("user_id", targetId),
        adminClient.from("user_roles").delete().eq("user_id", targetId),
      ]);

      const { error: delError } = await adminClient.auth.admin.deleteUser(targetId);
      if (delError) return respond({ error: delError.message }, 500);
      return respond({ success: true });
    }

    // ─── DELETE USER ENTRY ───
    if (action === "delete-entry" && req.method === "POST") {
      const body = await req.json();
      const { entry_id } = body;
      if (!entry_id) return respond({ error: "entry_id required" }, 400);

      const { error } = await adminClient.from("timetrack_entries").delete().eq("id", entry_id);
      if (error) return respond({ error: error.message }, 500);
      return respond({ success: true });
    }

    // ─── EXPORT ALL DATA ───
    if (action === "export-all") {
      const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const { data: allEntries } = await adminClient.from("timetrack_entries").select("*").order("date", { ascending: false });
      const { data: allTasks } = await adminClient.from("kanban_tasks").select("*");
      const { data: roles } = await adminClient.from("user_roles").select("*");

      return respond({
        users: (users || []).map((u: any) => ({ id: u.id, email: u.email, created_at: u.created_at })),
        entries: allEntries || [],
        tasks: allTasks || [],
        roles: roles || [],
        exported_at: new Date().toISOString(),
      });
    }

    // ─── STATS ───
    if (action === "stats") {
      const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const { data: allEntries } = await adminClient
        .from("timetrack_entries")
        .select("user_id, date, sessions, type");

      const totalUsers = users?.length || 0;
      const totalEntries = allEntries?.length || 0;
      const workEntries = (allEntries || []).filter((e: any) => e.type === "work");

      let totalWorkMinutes = 0;
      let totalBreakMinutes = 0;
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
          if (s.breakStart && s.breakEnd) {
            const [bsH, bsM] = s.breakStart.split(":").map(Number);
            const [beH, beM] = s.breakEnd.split(":").map(Number);
            let bMins = (beH * 60 + beM) - (bsH * 60 + bsM);
            if (bMins < 0) bMins += 24 * 60;
            totalBreakMinutes += Math.max(0, bMins);
          }
        }
      }

      const today = new Date().toISOString().split("T")[0];
      const activeToday = new Set(
        (allEntries || [])
          .filter((e: any) => e.date === today && e.type === "work")
          .map((e: any) => e.user_id)
      ).size;

      // Weekly activity (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split("T")[0];
      const activeThisWeek = new Set(
        (allEntries || [])
          .filter((e: any) => e.date >= weekAgoStr && e.type === "work")
          .map((e: any) => e.user_id)
      ).size;

      return respond({
        totalUsers,
        totalEntries,
        totalWorkHours: Math.round(totalWorkMinutes / 60 * 10) / 10,
        totalBreakHours: Math.round(totalBreakMinutes / 60 * 10) / 10,
        netWorkHours: Math.round((totalWorkMinutes - totalBreakMinutes) / 60 * 10) / 10,
        activeToday,
        activeThisWeek,
        avgEntriesPerUser: totalUsers > 0 ? Math.round(totalEntries / totalUsers * 10) / 10 : 0,
      });
    }

    return respond({ error: "Unknown action" }, 400);
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
