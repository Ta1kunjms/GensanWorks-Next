import { supabaseAdmin } from "./supabase";

export const db = supabaseAdmin;

export async function dbSelect<T>(table: string, query: Record<string, unknown> = {}) {
  let q = db.from(table).select("*", { count: "exact" });
  
  if (query.filter) {
    Object.entries(query.filter as Record<string, unknown>).forEach(([key, value]) => {
      q = q.eq(key, value);
    });
  }
  
  if (query.in) {
    Object.entries(query.in as Record<string, unknown[]>).forEach(([key, values]: [string, unknown[]]) => {
      q = q.in(key, values);
    });
  }
  
  if (query.ilike) {
    Object.entries(query.ilike as Record<string, string>).forEach(([key, pattern]: [string, unknown]) => {
      q = q.ilike(key, `%${pattern}%`);
    });
  }
  
  if (query.order) {
    q = q.order(query.order as string, { ascending: (query.ascending ?? false) as boolean });
  }
  
  if (query.limit) {
    q = q.range(0, (query.limit as number) - 1);
  }
  
  if (query.offset) {
    const offset = query.offset as number;
    const limit = (query.limit as number) || 10;
    q = q.range(offset, offset + limit - 1);
  }
  
  return q;
}

export async function dbInsert<T>(table: string, data: unknown) {
  const { data: result, error } = await db
    .from(table)
    .insert(data as never)
    .select()
    .single();
  
  if (error) throw error;
  return result as T;
}

export async function dbUpdate<T>(table: string, id: string, data: unknown) {
  const { data: result, error } = await db
    .from(table)
    .update({ ...data as Record<string, unknown>, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return result as T;
}

export async function dbDelete(table: string, id: string) {
  const { error } = await db
    .from(table)
    .delete()
    .eq("id", id);
  
  if (error) throw error;
  return { success: true };
}

export async function dbGetById<T>(table: string, id: string) {
  const { data, error } = await db
    .from(table)
    .select("*")
    .eq("id", id)
    .single();
  
  if (error) throw error;
  return data as T;
}

export async function dbCount(table: string, filter?: Record<string, unknown>) {
  let q = db.from(table).select("*", { count: "exact", head: true });
  
  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      q = q.eq(key, value);
    });
  }
  
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}