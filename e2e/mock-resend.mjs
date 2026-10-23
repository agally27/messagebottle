// Local stand-in for the Resend API, for e2e only. POST /emails records the
// message; GET /__emails lists them (newest last); DELETE /__emails clears.
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 3199);
const emails = [];

createServer((req, res) => {
  const send = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.method === "GET" && req.url === "/") return send(200, { ok: true });
  if (req.url === "/__emails" && req.method === "GET") return send(200, emails);
  if (req.url === "/__emails" && req.method === "DELETE") {
    emails.length = 0;
    return send(200, { ok: true });
  }
  if (req.url === "/emails" && req.method === "POST") {
    if (req.headers.authorization !== "Bearer re_e2e_key") return send(401, { message: "bad key" });
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const id = `mock_${emails.length + 1}`;
      emails.push({ id, ...JSON.parse(raw) });
      send(200, { id });
    });
    return;
  }
  send(404, { message: "not found" });
}).listen(port, "127.0.0.1");
