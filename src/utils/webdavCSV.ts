import Papa from "papaparse";
import { getWebDAVClient } from "@/utils/webdavClient";

export async function readCSVFromWebDAV(filePath: string) {
    try {
        const client = getWebDAVClient();
        const fileContent = await client.getFileContents(filePath, { format: "text" });
        const result = Papa.parse(fileContent, { header: true });
        if (result.errors && result.errors.length > 0) {
            throw new Error(`CSV parse error: ${result.errors.map(e => e.message).join(", ")}`);
        }
        return result.data;
    } catch (error) {
        console.error(`Failed to read CSV from WebDAV: ${error}`);
        throw error;
    }
}

export async function saveCSVToWebDAV(filePath: string, data: any[]) {
    try {
        const client = getWebDAVClient();
        const csv = Papa.unparse(data);
        await client.putFileContents(filePath, csv, { overwrite: true });
    } catch (error) {
        console.error(`Failed to save CSV to WebDAV: ${error}`);
        throw error;
    }
}
