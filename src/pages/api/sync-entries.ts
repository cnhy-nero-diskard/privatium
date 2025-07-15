import { NextApiRequest, NextApiResponse } from "next";
import { readCSVFromWebDAV } from "@/utils/webdavCSV";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const filePath = process.env.KOONAME;
    if (!filePath) {
      return res.status(500).json({ error: "CSV file path is not defined in environment variables" });
    }
    const data = await readCSVFromWebDAV(filePath);
    res.status(200).json({ entries: data.slice(0, 20) });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to fetch CSV" });
  }
}
