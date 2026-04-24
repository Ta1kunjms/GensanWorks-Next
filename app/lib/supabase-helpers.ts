import { supabaseAdmin } from "./supabase";

export async function dbSelect(table: string, query: Record<string, unknown> = {}) {
  let q = supabaseAdmin.from(table).select("*", { count: "exact" });
  
  if (query.filter) {
    Object.entries(query.filter).forEach(([key, value]) => {
      q = q.eq(key, value);
    });
  }
  
  if (query.in) {
    Object.entries(query.in).forEach(([key, values]: [string, unknown[]]) => {
      q = q.in(key, values as string[]);
    });
  }
  
  if (query.ilike) {
    Object.entries(query.ilike).forEach(([key, pattern]: [string, unknown]) => {
      q = q.ilike(key, `%${String(pattern)}%`);
    });
  }
  
  if (query.order) {
    q = q.order(query.order as string, { ascending: (query.ascending as boolean) ?? false });
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

export async function dbInsert(table: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabaseAdmin
    .from(table)
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
}

export async function dbUpdate(table: string, id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabaseAdmin
    .from(table)
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  
  if (error) throw error;
  return result;
}

export async function dbDelete(table: string, id: string) {
  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq("id", id);
  
  if (error) throw error;
  return { success: true };
}

export async function dbGetById(table: string, id: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .eq("id", id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function dbCount(table: string, filter?: Record<string, unknown>) {
  let q = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  
  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      q = q.eq(key, value as string);
    });
  }
  
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export function parseFilter(params: URLSearchParams) {
  const filter: Record<string, string> = {};
  const ilike: Record<string, string> = {};
  const inFilter: Record<string, string[]> = {};
  
  params.forEach((value, key) => {
    if (key.startsWith("ilike_")) {
      const field = key.replace("ilike_", "");
      ilike[field] = value;
    } else if (key.startsWith("in_")) {
      const field = key.replace("in_", "");
      inFilter[field] = value.split(",");
    } else {
      filter[key] = value;
    }
  });
  
  return { filter, ilike, inFilter };
}

export function parsePagination(params: URLSearchParams) {
  const limit = Math.min(Math.max(Number(params.get("limit") ?? 20) || 20, 1), 100);
  const offset = Math.max(Number(params.get("offset") ?? 0) || 0, 0);
  return { limit, offset };
}

export function parseSort(params: URLSearchParams, allowedFields: string[] = []) {
  const sortBy = allowedFields.includes(params.get("sortBy") || "") 
    ? params.get("sortBy") 
    : "created_at";
  const sortOrder = params.get("sortOrder") === "asc";
  return { sortBy, sortOrder };
}