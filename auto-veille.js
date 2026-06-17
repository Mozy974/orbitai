// auto-veille.js — Veille automatique 100% locale sans dépendance
//
// Usage: node auto-veille.js
// Output: console + veille_auto_<timestamp>.txt
//
// Sources: Hacker News (AI keyword), configurable via RSS_URL

const https = require('https');
const http = require('http');
const fs = require('fs');

// ⚙️ Configuration
const RSS_URL = "https://hnrss.org/frontpage?q=AI";
const OLLAMA_MODEL = "llama3.2";
const EXPORT_FILE = `veille_auto_${Date.now()}.txt`;

// 🌐 Récupérer le flux RSS
function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// 🤖 Appeler Ollama (même protocole que server.js)
function askOllama(prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false
    });

    const options = {
      hostname: '127.0.0.1',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.response);
        } catch (e) {
          reject("Erreur de parsing Ollama");
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 🚀 Routine principale
async function lancerVeille() {
  console.log("📡 Récupération du flux RSS...");
  try {
    const xml = await fetchRSS(RSS_URL);

    // ✂️ Parsing XML sans dépendance externe
    const items = xml.split('<item>').slice(1, 4); // Top 3 articles
    let articlesSummary = "";

    items.forEach((item, index) => {
      const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/);
      const linkMatch = item.match(/<link>(.*?)<\/link>/);

      if (titleMatch && linkMatch) {
        articlesSummary += `\nArticle ${index + 1}: ${titleMatch[1]} (Lien: ${linkMatch[1]})`;
      }
    });

    if (!articlesSummary) {
      console.log("⚠️ Aucun article trouvé.");
      return;
    }

    console.log(`📰 ${items.length} articles trouvés. Analyse en cours par ${OLLAMA_MODEL}...`);

    // 🧠 Prompt pour l'IA
    const prompt = `Voici une liste d'articles d'actualité récents sur l'IA : ${articlesSummary}\n\nFais-moi un résumé concis en français de ces actualités, en dégageant la tendance principale. Sois direct et professionnel.`;

    const analyse = await askOllama(prompt);

    console.log("\n==================================");
    console.log("✨ RAPPORT DE VEILLE ORBITAI ✨");
    console.log("==================================\n");
    console.log(analyse);
    console.log("\n==================================");

    // 💾 Sauvegarde locale
    fs.writeFileSync(EXPORT_FILE, `OrbitAI - Rapport Auto\nDate: ${new Date().toLocaleString()}\n\n${analyse}`);
    console.log(`\n💾 Rapport sauvegardé dans : ${EXPORT_FILE}`);

  } catch (err) {
    console.error("❌ Erreur lors de la veille :", err);
  }
}

lancerVeille();
