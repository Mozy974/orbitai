const http = require("http");

const PORT = 3001;
const OLLAMA_URL = "http://localhost:11434/api/generate";

// Parse JSON body from incoming request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error("JSON invalide"));
      }
    });
    req.on("error", reject);
  });
}

// Set CORS headers so the browser can call us
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Fetch available models from Ollama
function fetchOllamaModels() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "127.0.0.1",
      port: 11434,
      path: "/api/tags",
      method: "GET",
      family: 4
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          const models = (parsed.models || []).map(m => ({
            name: m.name,
            size: m.size || 0,
            family: m.details?.family || "?"
          }));
          resolve(models);
        } catch (e) {
          reject(new Error("Réponse Ollama /api/tags illisible"));
        }
      });
    });

    req.on("error", (e) => reject(new Error(`Ollama injoignable : ${e.message}`)));
    req.end();
  });
}

// Send JSON response
function json(res, status, data) {
  setCors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// Call Ollama and stream the response, collecting the full reply
function callOllama(prompt, model) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: model || "llama3.2",
      prompt: prompt,
      stream: false
    });

    const options = {
      hostname: "127.0.0.1",
      port: 11434,
      path: "/api/generate",
      method: "POST",
      family: 4,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", chunk => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.response || "(réponse vide)");
        } catch (e) {
          reject(new Error("Réponse Ollama illisible"));
        }
      });
    });

    req.on("error", (e) => {
      reject(new Error(`Ollama injoignable : ${e.message}`));
    });

    req.write(postData);
    req.end();
  });
}

// Main server
const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /api/models — list available Ollama models
  if (req.method === "GET" && req.url === "/api/models") {
    try {
      const models = await fetchOllamaModels();
      json(res, 200, { models });
    } catch (err) {
      console.error(`[OrbitAI] Erreur /api/models: ${err.message}`);
      json(res, 500, { error: err.message });
    }
    return;
  }

  // Only accept POST /api/analyze
  if (req.method !== "POST" || req.url !== "/api/analyze") {
    json(res, 404, { error: "Endpoint introuvable. Utilise POST /api/analyze" });
    return;
  }

  try {
    const body = await parseBody(req);

    if (!body.prompt || !body.prompt.trim()) {
      json(res, 400, { error: "Le champ 'prompt' est requis." });
      return;
    }

    console.log(`[OrbitAI] Requête reçue — modèle: ${body.model || "llama3.2"}, prompt: "${body.prompt.slice(0, 80)}..."`);

    const reply = await callOllama(body.prompt, body.model);

    console.log(`[OrbitAI] Réponse Ollama — ${reply.length} caractères`);
    json(res, 200, { reply });

  } catch (err) {
    console.error(`[OrbitAI] Erreur: ${err.message}`);
    json(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`🚀 OrbitAI backend démarré sur http://localhost:${PORT}`);
  console.log(`   → Ollama ciblé sur http://localhost:11434`);
  console.log(`   → Modèle par défaut: llama3.2`);
});
