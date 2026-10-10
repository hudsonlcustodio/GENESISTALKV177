import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** Session-bound, org-authorized batch; never lists the Auth directory. */
export async function carregarNomesDoRoster(db: SupabaseClient<Database>, organizationId: string) {
  const { data, error } = await db.rpc("fn_genesis_nomes_do_roster", { p_org: organizationId });
  if (error) throw new Error("Não foi possível carregar os nomes da equipe.");
  return new Map((data ?? []).map((row) => [row.user_id, { name: row.name, email: row.email }]));
}
