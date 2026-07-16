import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function inspect() {
  console.log("Fetching projects...");
  const { data: projects, error: projErr } = await supabase.from("projects").select("*");
  if (projErr) {
    console.error("Proj Error:", projErr);
    return;
  }
  console.log("Projects:", JSON.stringify(projects, null, 2));

  console.log("Fetching analysis runs...");
  const { data: runs, error: runsErr } = await supabase
    .from("product_analysis_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  if (runsErr) {
    console.error("Runs Error:", runsErr);
    return;
  }
  console.log("Latest Runs:", JSON.stringify(runs, null, 2));
}

inspect().catch(console.error);
