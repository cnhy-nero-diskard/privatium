import { NextApiRequest, NextApiResponse } from "next";
import { getJournals } from "@/utils/supabaseClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const data = await getJournals();
    res.status(200).json({ entries: data });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch journals from Supabase";
    res.status(500).json({ error: errorMessage });
  }
}
