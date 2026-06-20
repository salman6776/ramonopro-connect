import { createServerFn } from "@tanstack/react-start";

// Groq API — ultra-rapide (Whisper + Llama 3.3)
const GROQ_BASE = "https://api.groq.com/openai/v1";

/**
 * Transcrit une note vocale en texte FR via Whisper Large v3 (Groq).
 * Accepte un fichier audio encodé en base64.
 */
export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((d: { audioBase64: string; mimeType: string }) => {
    if (!d.audioBase64 || typeof d.audioBase64 !== "string") throw new Error("Audio manquant");
    if (d.audioBase64.length > 25_000_000) throw new Error("Fichier audio trop volumineux (max ~18 Mo)");
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY manquante");

    const binary = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
    const blob = new Blob([binary], { type: data.mimeType || "audio/webm" });

    const form = new FormData();
    form.append("file", blob, "note.webm");
    form.append("model", "whisper-large-v3");
    form.append("language", "fr");
    form.append("response_format", "json");
    form.append(
      "prompt",
      "Transcription d'une note vocale d'un ramoneur professionnel français. Vocabulaire métier: conduit, tubage, vacuité, ramonage, tirage, fumisterie, DTU 24.1, gaz, fioul, bois, granulés, anomalie, encrassement, créosote."
    );

    const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Groq transcription échouée (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as { text: string };
    return { text: (json.text ?? "").trim() };
  });

/**
 * Génère des recommandations professionnelles à partir des notes brutes
 * de l'intervention, en français, conformes au DTU 24.1 / arrêté du 23/02/2009.
 */
export const generateRecommendations = createServerFn({ method: "POST" })
  .inputValidator((d: {
    notes: string;
    installationType: string;
    conduitState: string;
    cleaningDone: boolean;
    vacuityTest: boolean;
  }) => d)
  .handler(async ({ data }) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY manquante");

    const system = `Tu es un expert ramoneur français certifié, spécialiste de la réglementation (DTU 24.1, arrêté du 23 février 2009, Code général des collectivités territoriales).
Tu rédiges des recommandations claires, professionnelles, conformes à la réglementation française, destinées à figurer sur un certificat de ramonage remis au client.
Règles strictes:
- Français impeccable, ton professionnel mais accessible
- 2 à 4 phrases maximum, formulées au présent
- Cite la fréquence légale si pertinent (bois/granulés: 2 ramonages/an dont 1 en période de chauffe ; gaz/fioul: 1 ramonage/an)
- Si anomalie: indique l'action à entreprendre sans alarmer inutilement
- Aucune phrase d'introduction type "Voici les recommandations". Donne directement le texte.`;

    const user = `Synthétise les recommandations finales à partir de cette intervention :
- Type d'installation : ${data.installationType}
- État du conduit : ${data.conduitState}
- Nettoyage effectué : ${data.cleaningDone ? "oui" : "non"}
- Test de vacuité : ${data.vacuityTest ? "réussi" : "échec / non réalisé"}
- Notes du technicien : ${data.notes || "(aucune)"}

Rédige uniquement les recommandations destinées au client.`;

    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Groq Llama échoué (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return { text: (json.choices?.[0]?.message?.content ?? "").trim() };
  });

/**
 * Transforme des notes brutes (souvent dictées) en observations
 * professionnelles courtes destinées au dossier interne.
 */
export const improveNotes = createServerFn({ method: "POST" })
  .inputValidator((d: { notes: string }) => {
    if (!d.notes || !d.notes.trim()) throw new Error("Notes vides");
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("GROQ_API_KEY manquante");

    const system = `Tu es l'assistant d'un ramoneur professionnel français.
Tu reçois des notes brutes (souvent dictées, télégraphiques, fautes de frappe) et tu les reformules en observations techniques claires et professionnelles.
Règles strictes :
- Français impeccable, vocabulaire métier (conduit, tubage, vacuité, créosote, tirage, fumisterie…)
- 1 à 3 phrases au présent, factuelles
- Conserve TOUTES les informations techniques (type d'appareil, état, anomalie, mesures)
- Aucune phrase d'introduction. Donne directement le texte reformulé.`;

    const res = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Notes brutes : ${data.notes}` },
        ],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Groq Llama échoué (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    return { text: (json.choices?.[0]?.message?.content ?? "").trim() };
  });
