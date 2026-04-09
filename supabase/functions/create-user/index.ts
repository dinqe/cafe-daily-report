import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const { email, password, role, branch_id } = await req.json();
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400 });

  const { error: roleError } = await supabase.from("user_roles").insert({
    user_id: data.user.id,
    role,
    branch_id: branch_id || null,
  });

  if (roleError) return new Response(JSON.stringify({ error: roleError.message }), { status: 400 });

  return new Response(JSON.stringify({ user_id: data.user.id }), { status: 200 });
});
