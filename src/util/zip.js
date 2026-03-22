import archiver from "archiver";
import { PassThrough } from "stream";

export async function zipJsonToBuffer(filename, jsonObj) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const pass = new PassThrough();
    pass.on("data", (c) => chunks.push(c));
    pass.on("end", () => resolve(Buffer.concat(chunks)));
    pass.on("error", reject);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", reject);
    archive.pipe(pass);
    archive.append(JSON.stringify(jsonObj, null, 2), { name: filename });
    archive.finalize();
  });
}
