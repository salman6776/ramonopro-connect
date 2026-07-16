import { createServerFn } from "@tanstack/react-start";

// Groq API — ultra-rapide (Whisper + Llama 3.3)
const GROQ_BASE = "https://api.groq.com/openai/v1";
const TIMEOUT_MS = 20_000;

/** Classifie une erreur Groq et renvoie un message FR prêt à afficher. */
function groqError(status: number, body: string): Error {
  const b = body.toLowerCase();
  if (status === 401 || status === 403) return new Error("Clé IA invalide ou expirée. Contactez le support.");
  if (status === 429) return new Error("Limite IA atteinte — réessayez dans quelques secondes.");
  if (status === 402 || b.includes("insufficient_quota") || b.includes("quota")) {
    return new Error("Quota IA épuisé. Merci de contacter le support.");
  }
  if (status >= 500) return new Error("Le service IA est temporairement indisponible. Réessayez.");
  return new Error(`IA indisponible (${status}). Réessayez ou remplissez manuellement.`);
}

function wrapNetwork(err: unknown): Error {
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.name === "TimeoutError") {
      return new Error("L'IA met trop de temps à répondre. Réessayez.");
    }
    return err;
  }
  return new Error("Erreur réseau IA. Vérifiez votre connexion.");
}

/**
 * Transcrit une note vocale en texte FR via Whisper Large v3 (Groq).
 */
export const transcribeAudio = createServerFn({ method: "POST" })
  .inputValidator((d: { audioBase64: string; mimeType: string }) => {
    if (!d.audioBase64 || typeof d.audioBase64 !== "string") throw new Error("Audio manquant");
    if (d.audioBase64.length > 25_000_000) throw new Error("Fichier audio trop volumineux (max ~18 Mo)");
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("IA non configurée sur le serveur. Contactez le support.");

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

    try {
      const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("Groq transcription failed", res.status, t.slice(0, 300));
        throw groqError(res.status, t);
      }
      const json = (await res.json()) as { text: string };
      const text = (json.text ?? "").trim();
      if (!text) throw new Error("Aucun texte détecté dans l'enregistrement.");
      return { text };
    } catch (err) {
      throw wrapNetwork(err);
    }
  });

/**
 * Recommandations professionnelles conformes DTU 24.1 / arrêté 23/02/2009.
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
    if (!key) throw new Error("IA non configurée sur le serveur. Contactez le support.");

    const system = `Tu es un expert ramoneur français certifié, spécialiste de la réglementation (DTU 24.1, arrêté du 27 juin 2023, Code général des collectivités territoriales).
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

    try {
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
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("Groq chat failed", res.status, t.slice(0, 300));
        throw groqError(res.status, t);
      }
      const json = (await res.json()) as { choices: { message: { content: string } }[] };
      const text = (json.choices?.[0]?.message?.content ?? "").trim();
      if (!text) throw new Error("Réponse IA vide. Réessayez.");
      return { text };
    } catch (err) {
      throw wrapNetwork(err);
    }
  });

/**
 * Reformule des notes brutes en observations pro courtes.
 */
export const improveNotes = createServerFn({ method: "POST" })
  .inputValidator((d: { notes: string }) => {
    if (!d.notes || !d.notes.trim()) throw new Error("Notes vides");
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.GROQ_API_KEY;
    if (!key) throw new Error("IA non configurée sur le serveur. Contactez le support.");

    const system = `Tu es l'assistant d'un ramoneur professionnel français.
Tu reçois des notes brutes (souvent dictées, télégraphiques, fautes de frappe) et tu les reformules en observations techniques claires et professionnelles.
Règles strictes :
- Français impeccable, vocabulaire métier (conduit, tubage, vacuité, créosote, tirage, fumisterie…)
- 1 à 3 phrases au présent, factuelles
- Conserve TOUTES les informations techniques (type d'appareil, état, anomalie, mesures)
- Aucune phrase d'introduction. Donne directement le texte reformulé.`;

    try {
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
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("Groq improve failed", res.status, t.slice(0, 300));
        throw groqError(res.status, t);
      }
      const json = (await res.json()) as { choices: { message: { content: string } }[] };
      const text = (json.choices?.[0]?.message?.content ?? "").trim();
      if (!text) throw new Error("Réponse IA vide. Réessayez.");
      return { text };
    } catch (err) {
      throw wrapNetwork(err);
    }
  });
