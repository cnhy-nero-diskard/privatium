import { NextApiRequest, NextApiResponse } from "next";
import { getJournals } from "@/utils/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const headerUrl = req.headers['x-supabase-url'] as string | undefined;
    const headerKey = req.headers['x-supabase-key'] as string | undefined;

    const data = await getJournals(undefined, headerUrl && headerKey ? { supabaseUrl: headerUrl, supabaseKey: headerKey } : undefined);
    res.status(200).json({ entries: data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch journals from Supabase";
    res.status(500).json({ error: errorMessage });
  }
}
