document.addEventListener("DOMContentLoaded", async () => {
  // 🔢 Initialisation des compteurs
  let ideasCount = 0;
  const ideasCountEl = document.getElementById("ideasCount");
  const modelNameEl = document.getElementById("modelName");
  const insightsList = document.getElementById("insightsList");
  const emptyState = document.getElementById("emptyState");

  // 🤖 Éléments du Chat IA
  const askAiBtn = document.getElementById("askAiBtn");
  const aiPrompt = document.getElementById("aiPrompt");
  const aiLoading = document.getElementById("aiLoading");
  const modelSelect = document.getElementById("modelSelect");

  // 📋 Charger la liste des modèles depuis le backend
  let currentModel = "llama3.2"; // fallback

  try {
    const resp = await fetch("http://127.0.0.1:3001/api/models");
    if (!resp.ok) throw new Error("Backend injoignable");

    const data = await resp.json();
    const models = data.models || [];

    // Trier par taille décroissante (petits modèles en premier = plus rapides)
    models.sort((a, b) => a.size - b.size);

    modelSelect.innerHTML = "";
    models.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.name;
      // Format: "llama3.2 (2.0 GB, llama)"
      const sizeStr = m.size > 0 ? `${(m.size / 1e9).toFixed(1)} GB` : "cloud";
      opt.textContent = `${m.name} (${sizeStr}, ${m.family})`;
      modelSelect.appendChild(opt);
    });

    // Sélectionner llama3.2 par défaut si présent, sinon le 1er
    const defaultModel = models.find(m => m.name === "llama3.2") || models[0];
    if (defaultModel) {
      modelSelect.value = defaultModel.name;
      currentModel = defaultModel.name;
      modelNameEl.textContent = defaultModel.name.split(":")[0]; // nom court
    }
  } catch (err) {
    console.warn("Impossible de charger les modèles:", err);
    modelSelect.innerHTML = `<option value="llama3.2">llama3.2 (fallback)</option>`;
    modelNameEl.textContent = "llama3.2";
  }

  // 🔄 Mettre à jour le modèle actif quand l'utilisateur change
  modelSelect.addEventListener("change", () => {
    currentModel = modelSelect.value;
    modelNameEl.textContent = currentModel.split(":")[0];
  });

  // 🚀 Gestion de l'envoi de prompt
  if (askAiBtn && aiPrompt) {
    askAiBtn.addEventListener("click", envoyerPrompt);

    // Permettre l'envoi avec la touche "Entrée"
    aiPrompt.addEventListener("keypress", (e) => {
      if (e.key === "Enter") envoyerPrompt();
    });
  }

  async function envoyerPrompt() {
    const promptText = aiPrompt.value.trim();
    if (!promptText) return;

    // 1. Afficher l'état de chargement
    aiLoading.style.display = "block";
    askAiBtn.disabled = true;
    aiPrompt.value = ""; // Vider le champ

    // 2. Afficher la question de l'utilisateur immédiatement
    ajouterMessage(`🗣️ Vous : ${promptText}`, "#ffffff");

    try {
      // 3. Appel au backend Node.js (qui appelle Ollama)
      const response = await fetch("http://127.0.0.1:3001/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          model: currentModel
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Erreur serveur inconnue.");

      // 4. Afficher la réponse de l'IA
      ajouterMessage(`🤖 IA (${currentModel.split(":")[0]}) : ${data.reply}`, "#eef4ff");

      // 5. Mettre à jour les statistiques en temps réel
      ideasCount++;
      ideasCountEl.textContent = ideasCount;

    } catch (error) {
      console.error(error);
      ajouterMessage(`❌ Erreur : ${error.message}`, "#ffe6e6");
    } finally {
      // 6. Cacher le chargement et réactiver le bouton
      aiLoading.style.display = "none";
      askAiBtn.disabled = false;
      aiPrompt.focus(); // Remettre le curseur dans le champ
    }
  }

  // 📝 Fonction utilitaire pour ajouter un message à la liste
  function ajouterMessage(texte, bgColor) {
    // Cacher l'empty state si présent
    if (emptyState) emptyState.style.display = "none";

    const li = document.createElement("li");
    li.textContent = texte;
    li.style.backgroundColor = bgColor;
    // On insère le nouveau message tout en haut de la liste
    insightsList.insertBefore(li, insightsList.firstChild);
  }
});

// 📥 Télécharger les données (local) — Sécurisé
window.downloadData = function() {
  const dataBlob = new Blob([
    `OrbitAI — Export\nDate: ${new Date().toISOString()}\n`
  ], { type: 'text/plain' });

  const url = URL.createObjectURL(dataBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orbitai_export_${Date.now()}.txt`;
  a.click();

  URL.revokeObjectURL(url);
};
