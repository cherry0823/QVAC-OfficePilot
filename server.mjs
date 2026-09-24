import http from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadModel,
  unloadModel,
  completion,
  LLAMA_3_2_1B_INST_Q4_0
} from "@qvac/sdk";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
let modelId = null;
let loading = null;

async function getModel() {
  if (modelId) return modelId;
  if (loading) return loading;
  loading = loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: p => {
      process.stdout.write(`\rQVAC model loading: ${p.percentage.toFixed(0)}%`);
      if (p.percentage >= 100) process.stdout.write("\n");
    }
  }).then(id => modelId = id).finally(() => loading = null);
  return loading;
}

async function generateReport(employee, department, work) {
  const id = await getModel();
  const prompt = `You are OfficePilot, a concise employee work-report assistant.
Employee: ${employee}
Department: ${department}
Raw work update:
${work}

Create a professional daily work report. Return ONLY valid JSON:
{
  "summary": "one concise paragraph",
  "completed": ["item"],
  "pending": ["item"],
  "priorities": ["item"],
  "blockers": ["item"],
  "managerNote": "one concise sentence"
}
Do not invent specific facts. If a section has no information, use an empty array.`;

  const result = completion({
    modelId: id,
    history: [{ role: "user", content: prompt }],
    stream: true
  });

  let text = "";
  for await (const token of result.tokenStream) text += token;
  const cleaned = text.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(body);
}

async function body(req) {
  let s = "";
  for await (const chunk of req) s += chunk;
  if (s.length > 100000) throw new Error("Request too large");
  return JSON.parse(s || "{}");
}

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/report") {
      const data = await body(req);
      if (!String(data.work || "").trim())
        return json(res, 400, { error: "Please enter a work update." });

      const report = await generateReport(
        String(data.employee || "Employee"),
        String(data.department || "General"),
        String(data.work)
      );
      return json(res, 200, { ...report, local: true });
    }

    if (req.method === "GET") {
      const path = req.url === "/" ? "/index.html" : req.url;
      const file = join(__dirname, "public", path.replaceAll("..", ""));
      const content = await readFile(file);
      res.writeHead(200, { "Content-Type": mime[extname(file)] || "text/plain" });
      return res.end(content);
    }

    json(res, 404, { error: "Not found" });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: e.message || "QVAC generation failed." });
  }
});

async function shutdown() {
  server.close();
  if (modelId) {
    try { await unloadModel({ modelId }); } catch {}
  }
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(PORT, () =>
  console.log(`\nOfficePilot running at http://localhost:${PORT}`)
);
