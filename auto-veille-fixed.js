// auto-veille-fixed.js — Veille automatique (via curl)
const { execSync } = require('child_process');
const http = require('http');
const fs = require('fs');

const RSS_URL = "https://news.ycombinator.com/rss";
const OLLAMA_MODEL = "llama3.2";
const EXPORT_FILE = `${process.env.HOME}/Bureau/orbitai/veille_auto_${Date.now()}.txt`;

const AI_KEYWORDS = /\b(AI|LLM|GPT|OpenAI|Anthropic|Claude|Gemini|machine learning|deep learning|neural|model|AGI|copilot|transformer|inference|training|GPU|chip|broadcom|qualcomm|nvidia|krea|GLM|qwen|llama|mistral|ollama|RAG|embedding|fine-tun|diffusion|image model|language model|computer use|agent)\b/i;

function fetchRSS(url) {
  return execSync(`curl -sL --max-time 20 -A "OrbitAI/1.0" "${url}"`, { encoding: 'utf8', timeout: 25000 });
}

function askOllama(prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ model: OLLAMA_MODEL, prompt: prompt, stream: false });
    const options = {
      hostname: '127.0.0.1', port: 11434, path: '/api/generate', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).response); }
        catch (e) { reject('Erreur parsing Ollama: ' + data.substring(0, 200)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(300000, () => req.destroy(new Error('Ollama timeout')));
    req.write(postData);
    req.end();
  });
}

function decodeHtmlEntities(str) {
  return str.replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}

async function lancerVeille() {
  console.log("📡 Récupération du flux RSS Hacker News...");
  const xml = fetchRSS(RSS_URL);
  if (!xml || xml.length < 100) { console.log("❌ Flux RSS vide."); return; }

  const allItems = xml.split('<item>').slice(1);
  console.log(`📊 ${allItems.length} articles au total. Filtrage par mot-clé AI...`);

  const aiItems = [];
  for (const item of allItems) {
    const titleMatch = item.match(/<title>(.*?)<\/title>/);
    const linkMatch = item.match(/<link>(.*?)<\/link>/);
    if (titleMatch && linkMatch && AI_KEYWORDS.test(titleMatch[1])) {
      aiItems.push({ title: decodeHtmlEntities(titleMatch[1]), link: linkMatch[1] });
    }
  }

  console.log(`🤖 ${aiItems.length} articles liés à l'IA trouvés.`);
  const top3 = aiItems.slice(0, 3);

  if (top3.length === 0) { console.log("⚠️ Aucun article IA trouvé."); return; }

  let articlesSummary = "";
  top3.forEach((a, i) => {
    articlesSummary += `\nArticle ${i + 1}: ${a.title} (Lien: ${a.link})`;
    console.log(`  ${i+1}. ${a.title}`);
  });

  console.log(`\n🧠 Analyse en cours par ${OLLAMA_MODEL}...`);
  const prompt = `Voici une liste d'articles d'actualité récents sur l'IA issus de Hacker News : ${articlesSummary}\n\nFais-moi un résumé concis en français de ces actualités, en dégageant la tendance principale. Sois direct et professionnel. Maximum 15 lignes.`;

  const analyse = await askOllama(prompt);

  const rapport = `==================================
✨ RAPPORT DE VEILLE ORBITAI ✨
==================================
Date: ${new Date().toLocaleString('fr-FR')}
Source: Hacker News (filtrage AI)
Modèle: ${OLLAMA_MODEL}
==================================

ARTICLES SÉLECTIONNÉS:
${top3.map((a, i) => `${i+1}. ${a.title}\n   ${a.link}`).join('\n')}

ANALYSE:
${analyse}

==================================`;

  console.log("\n" + rapport);
  fs.writeFileSync(EXPORT_FILE, rapport);
  console.log(`💾 Rapport sauvegardé : ${EXPORT_FILE}`);
}

lancerVeille().catch(err => console.error("❌ Erreur:", err));
