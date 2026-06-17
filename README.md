# OrbitAI — Veille IA 100% Locale

Dashboard web minimaliste pour interroger des modèles Ollama en local.  
Frontend HTML/JS vanilla + backend Node.js minimal (zéro dépendance).

## Architecture

```
navigateur ──fetch──▶ backend Node.js :3001 ──HTTP──▶ Ollama :11434
```

- **`dashboard.html`** — Interface : sélecteur de modèle, champ texte, historique des réponses, stats
- **`script.js`** — Logique frontend : charge les modèles via `GET /api/models`, envoie les prompts via `POST /api/analyze`
- **`server.js`** — Backend Node.js (stdlib uniquement, pas de npm) : relaye les requêtes vers Ollama `/api/generate`

## Prérequis

- [Ollama](https://ollama.com) installé et en cours d'exécution
- Au moins un modèle tiré (`ollama pull llama3.2`)
- Node.js ≥ 18

## Démarrage rapide

```bash
# 1. Lancer le backend
node server.js

# 2. Ouvrir le dashboard dans le navigateur
firefox dashboard.html   # ou chrome, etc.
```

Le backend écoute sur `http://127.0.0.1:3001`.

## Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/models` | Liste les modèles disponibles dans Ollama |
| `POST` | `/api/analyze` | Envoie un prompt au modèle choisi |

### POST /api/analyze

```json
{
  "prompt": "Résume l'actualité IA du jour",
  "model": "llama3.2"
}
```

Réponse :

```json
{
  "reply": "Voici un résumé de l'actualité IA..."
}
```

## Personnalisation

- Modifier le modèle par défaut dans `server.js` (ligne 4)
- Ajouter du style dans `dashboard.html` (variables CSS `:root`)
- Le sélecteur de modèle dans l'interface se peuple automatiquement depuis Ollama

## Licence

MIT — fais-en ce que tu veux.
