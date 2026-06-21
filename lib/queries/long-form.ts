import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  LongFormProjectRow,
  LongFormSectionRow,
} from "@/lib/supabase/types";

export async function fetchLongFormProjects(
  supabase: SupabaseClient
): Promise<LongFormProjectRow[]> {
  const { data, error } = await supabase
    .from("long_form_projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as LongFormProjectRow[];
}

export async function fetchLongFormProjectDetail(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ project: LongFormProjectRow; sections: LongFormSectionRow[] }> {
  const { data: project, error: pErr } = await supabase
    .from("long_form_projects")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (pErr) throw pErr;

  const { data: sections, error: sErr } = await supabase
    .from("long_form_sections")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });

  if (sErr) throw sErr;

  return {
    project: project as LongFormProjectRow,
    sections: (sections ?? []) as LongFormSectionRow[],
  };
}
