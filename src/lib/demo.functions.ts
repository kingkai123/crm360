import { createServerFn } from "@tanstack/react-start";

const DEMO_USERS = [
  { email: "admin@crm360.app", password: "Crm360Demo1", name: "Aarav Admin", role: "admin", title: "Platform Admin" },
  {
    email: "manager@crm360.app",
    password: "Crm360Demo1",
    name: "Meera Manager",
    role: "sales_manager",
    title: "Sales Manager",
  },
  {
    email: "exec@crm360.app",
    password: "Crm360Demo1",
    name: "Rohan Executive",
    role: "sales_executive",
    title: "Sales Executive",
  },
] as const;

/** Creates the three fixed demo accounts if they do not exist yet. */
export const seedDemoAccounts = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  for (const u of DEMO_USERS) {
    const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("email", u.email).maybeSingle();
    let userId = existing?.id as string | undefined;

    if (!userId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.name },
      });
      if (error || !data.user) continue;
      userId = data.user.id;
    }

    await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: u.name, email: u.email, job_title: u.title });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: u.role });
  }

  return { ok: true };
});
