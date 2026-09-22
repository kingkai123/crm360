import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BOOTSTRAP_EMAIL = "abhiramkrishna5494@gmail.com";
const BOOTSTRAP_PASSWORD = "admin123";

type Role = "admin" | "sales_manager" | "sales_executive";

/**
 * Creates the very first administrator account when the workspace has no admin yet.
 * Safe to call from the sign-in page: it does nothing once an admin exists.
 */
export const bootstrapAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin").limit(1);
  if (admins && admins.length > 0) return { created: false };

  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", BOOTSTRAP_EMAIL)
    .maybeSingle();

  let userId = existing?.id as string | undefined;

  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: BOOTSTRAP_EMAIL,
      password: BOOTSTRAP_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Administrator" },
    });
    if (error || !data.user) return { created: false };
    userId = data.user.id;
  }

  await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, full_name: "Administrator", email: BOOTSTRAP_EMAIL, job_title: "Administrator", must_setup: true });
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
  await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });

  return { created: true };
});

async function assertAdmin(context: { supabase: { rpc: Function }; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Only an administrator can do this");
}

/** Admin creates a team member with a starting password and a role. */
export const createMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; fullName: string; phone: string; jobTitle: string; role: Role }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.trim().toLowerCase();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName.trim() },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create this member");

    const userId = created.user.id;
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: data.fullName.trim().slice(0, 80),
      email,
      phone: data.phone.trim() || null,
      job_title: data.jobTitle.trim().slice(0, 80) || null,
      must_setup: false,
    });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: data.role });

    return { id: userId };
  });

/**
 * Admin removes a member. Their records are kept: everything they owned is either
 * transferred to another member or left unassigned.
 */
export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; transferTo: string | null }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    if (data.userId === context.userId) throw new Error("You cannot remove your own account");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const to = data.transferTo ?? null;
    const id = data.userId;

    await supabaseAdmin.from("customers").update({ owner_id: to }).eq("owner_id", id);
    await supabaseAdmin.from("customers").update({ created_by: to }).eq("created_by", id);
    await supabaseAdmin.from("leads").update({ assigned_to: to }).eq("assigned_to", id);
    await supabaseAdmin.from("leads").update({ created_by: to }).eq("created_by", id);
    await supabaseAdmin.from("tasks").update({ assigned_to: to }).eq("assigned_to", id);
    await supabaseAdmin.from("tasks").update({ created_by: to }).eq("created_by", id);
    await supabaseAdmin.from("activities").update({ actor_id: null }).eq("actor_id", id);
    await supabaseAdmin.from("notifications").delete().eq("user_id", id);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", id);
    await supabaseAdmin.from("profiles").delete().eq("id", id);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

/** First-run admin setup: replaces the starter email and password with the admin's own. */
export const completeAdminSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; password: string; fullName: string; phone: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.trim().toLowerCase();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("profiles")
      .update({
        email,
        full_name: data.fullName.trim().slice(0, 80) || "Administrator",
        phone: data.phone.trim() || null,
        must_setup: false,
      })
      .eq("id", context.userId);

    return { ok: true };
  });
