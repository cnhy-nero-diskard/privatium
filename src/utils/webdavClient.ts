import { createClient } from "webdav";

export function getWebDAVClient() {
  const username = process.env.WEBDAVUSER;
  const password = process.env.WEBDAVPASS;
  const url = process.env.KOONAME;
  if (!username || !password || !url) throw new Error("Missing WebDAV credentials or URL");
  return createClient(url, { username, password });
}
