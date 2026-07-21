import { createServerFn } from "@tanstack/react-start";

const SB_URL = "https://esdeyidgtbfandpxtqpr.supabase.co";
// Publishable (anon) key — safe to hardcode; RLS enforced via user JWT below.
const SB_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZGV5aWRndGJmYW5kcHh0cXByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjYyODEsImV4cCI6MjA5NzE0MjI4MX0.u59bnf0VaC1AM_nqiWFcy0ChxvNJipAb_RuglP3AoGA";

const FREE_PREVIEW_LIMIT = 3;

/* ── Types ──────────────────────────────────────────────── */

export interface FormData {
  access_token: string; // JWT du user connecté (auth Supabase)
  user_id: string;
  client_name: string;
  client_phone?: string;
  client_address?: string;
  client_email?: string;
  installation_type: string;
  conduit_state: string;
  conduit_count?: number;
  conduit_material?: string;
  cleaning_done: boolean;
  vacuity_test: boolean;
  recommendations?: string;
  notes?: string;
  signature_base64?: string;
  photo_urls?: string[];
}

export class SubscriptionRequiredError extends Error {
  code = "SUBSCRIPTION_REQUIRED" as const;
  constructor(message = "Essai gratuit épuisé. Passez Pro pour continuer.") {
    super(message);
  }
}

/* ── Supabase REST helpers (JWT utilisateur → RLS appliquée) ─ */

function sbHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    apikey: SB_ANON,
  };
}

async function sbGet(token: string, table: string, query: string, extraHeaders: Record<string, string> = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    headers: { ...sbHeaders(token), Accept: "application/json", ...extraHeaders },
  });
  if (!r.ok) throw new Error(`Supabase GET ${table}: ${r.status} ${await r.text()}`);
  return r;
}

async function sbPost<T = Record<string, unknown>>(token: string, table: string, body: unknown, single = true): Promise<T> {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      ...sbHeaders(token),
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase POST ${table}: ${r.status} ${await r.text()}`);
  const json = await r.json();
  return single ? json[0] : json;
}

async function uploadPdfToStorage(token: string, pdfBytes: Uint8Array, path: string): Promise<string> {
  const upRes = await fetch(`${SB_URL}/storage/v1/object/certificates/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SB_ANON,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: pdfBytes.buffer as ArrayBuffer,
  });
  if (!upRes.ok) {
    // Non bloquant : on retourne le PDF au client même sans stockage.
    console.warn("PDF storage failed:", upRes.status, await upRes.text());
    return "";
  }
  return `${SB_URL}/storage/v1/object/public/certificates/${path}`;
}

/* ── Image → base64 (safe for large files) ─────────────── */

async function toBase64(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const mime = r.headers.get("content-type") ?? "image/jpeg";
    let binary = "";
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return `data:${mime};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

/* ── HTML builder ───────────────────────────────────────── */

function buildHtml(params: {
  data: FormData;
  certNumber: string;
  isTest: boolean;
  profile: Record<string, unknown>;
  photoBlocks: string;
}) {
  const { data: d, certNumber, isTest, profile, photoBlocks } = params;

  const now = new Date();
  const dateFr = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const installationLabels: Record<string, string> = {
    gaz: "Chaudière / appareil à gaz",
    fioul: "Chaudière fioul",
    bois: "Insert / poêle à bois",
    granulés: "Poêle à granulés",
  };
  const conduitLabels: Record<string, string> = {
    bon: "Conforme — aucune anomalie constatée",
    anomalie_mineure: "Anomalie mineure — surveillance recommandée",
    anomalie_majeure: "ANOMALIE MAJEURE — intervention urgente requise",
  };
  const materialLabels: Record<string, string> = {
    maconne: "Maçonné (briques / boisseaux)",
    metallique: "Métallique",
    tubage_inox: "Tubage inox",
    autre: "Autre",
  };

  const isSolidFuel = d.installation_type === "bois" || d.installation_type === "granulés";
  const periodicity = isSolidFuel
    ? "2 ramonages par an, dont 1 pendant la période de chauffe (bois / granulés)"
    : "1 ramonage par an (gaz / fioul)";
  const nextInterval = isSolidFuel ? 6 : 12;
  const nextDate = new Date(now);
  nextDate.setMonth(nextDate.getMonth() + nextInterval);
  const nextDateFr = nextDate.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const C = "#1a3557";
  const companyName = (profile.company_name as string) || "Entreprise de Ramonage";
  const companyAddress = (profile.address as string) || "";
  const companyPhone = (profile.phone as string) || "";
  const companyEmail = (profile.email as string) || "";
  const companySiret = (profile.siret as string) || "";
  const companyInsurance = (profile.insurance as string) || "";
  const techName = (profile.full_name as string) || "";

  const conduitOk = d.conduit_state === "bon";
  const conduitMajeur = d.conduit_state === "anomalie_majeure";
  const conduitCount = d.conduit_count && d.conduit_count > 0 ? d.conduit_count : 1;
  const conduitMat = materialLabels[d.conduit_material || "maconne"] || "Maçonné";

  const chk = (ok: boolean, label: string, okBadge = "RÉALISÉ", koBadge = "NON RÉALISÉ") => `
    <tr>
      <td style="width:20px;padding:4px 6px 4px 0;vertical-align:middle;">
        <span style="font-size:13pt;font-weight:900;color:${ok ? "#16a34a" : "#dc2626"};">${ok ? "&#10003;" : "&#10007;"}</span>
      </td>
      <td style="padding:4px 8px 4px 0;font-size:9.5pt;color:#111;vertical-align:middle;">${label}</td>
      <td style="text-align:right;vertical-align:middle;padding:4px 0;">
        <span style="background:${ok ? "#f0fdf4" : "#fef2f2"};border:1px solid ${ok ? "#86efac" : "#fca5a5"};
          border-radius:3px;padding:2px 8px;font-size:8pt;font-weight:700;color:${ok ? "#15803d" : "#b91c1c"};">
          ${ok ? okBadge : koBadge}
        </span>
      </td>
    </tr>`;

  const sectionHead = (num: string, txt: string) => `
    <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <tr>
        <td style="background:${C};color:#fff;font-size:9pt;font-weight:700;
          padding:6px 12px;letter-spacing:.4px;text-transform:uppercase;">
          <span style="opacity:.7;margin-right:8px;">${num}</span>${txt}
        </td>
      </tr>
    </table>`;

  const lbl = (t: string) =>
    `<div style="font-size:7pt;color:#777;text-transform:uppercase;letter-spacing:.3px;font-weight:700;">${t}</div>`;
  const val = (t: string, extra = "") =>
    `<div style="font-size:10pt;font-weight:600;color:#111;margin-top:1px;${extra}">${t}</div>`;

  const testBanner = isTest
    ? `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
        <tr>
          <td style="background:#fef3c7;border:2px solid #f59e0b;border-radius:5px;
            padding:8px 14px;text-align:center;font-size:10pt;font-weight:800;
            color:#92400e;letter-spacing:.6px;">
            &#9888;&nbsp;DOCUMENT DE PRÉVISUALISATION — NON CONTRACTUEL
          </td>
        </tr>
      </table>`
    : `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
        <tr>
          <td style="background:#ecfdf5;border:1.5px solid #10b981;border-radius:5px;
            padding:7px 14px;text-align:center;font-size:9.5pt;font-weight:800;
            color:#065f46;letter-spacing:.6px;">
            &#10003;&nbsp;CERTIFICAT OFFICIEL — VALEUR CONTRACTUELLE
          </td>
        </tr>
      </table>`;


  const conduitAlert = !conduitOk
    ? `<table style="width:100%;border-collapse:collapse;margin:8px 0;">
        <tr>
          <td style="padding:9px 14px;font-size:9pt;font-weight:700;
            ${conduitMajeur
              ? "background:#fef2f2;border:1.5px solid #ef4444;color:#991b1b;"
              : "background:#fffbeb;border:1.5px solid #f59e0b;color:#92400e;"}
            border-radius:4px;">
            &#9888;&nbsp;${conduitLabels[d.conduit_state] ?? d.conduit_state}
          </td>
        </tr>
      </table>`
    : "";

  const signatureCell = d.signature_base64
    ? `<img src="${d.signature_base64}" style="max-height:55px;max-width:190px;display:block;margin:6px auto;" />`
    : `<div style="height:48px;"></div>`;

  const notesBlock = d.notes
    ? `<tr><td colspan="3" style="padding:8px 12px 10px;border-top:1px solid #e2e8f0;">
        ${lbl("Observations techniques")}
        <div style="background:#f8fafc;border:1px solid #dde6f0;border-radius:3px;
          padding:7px 10px;font-size:9pt;color:#374151;line-height:1.55;margin-top:3px;">${d.notes}</div>
      </td></tr>`
    : "";

  const recoBlock = d.recommendations
    ? `<tr><td colspan="3" style="padding:8px 12px 10px;border-top:1px solid #e2e8f0;">
        ${lbl("Recommandations au client")}
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-left:3px solid #f59e0b;
          border-radius:3px;padding:7px 10px;font-size:9pt;color:#374151;line-height:1.55;margin-top:3px;">
          ${d.recommendations}
        </div>
      </td></tr>`
    : "";

  const photosSection = photoBlocks
    ? `${sectionHead("6", "Photos de l'intervention")}
      <table style="width:100%;border-collapse:collapse;border:1px solid #ccd8e6;border-top:none;">
        <tr><td style="padding:10px;">
          <table style="width:100%;border-collapse:collapse;"><tr>${photoBlocks}</tr></table>
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Certificat de Ramonage ${certNumber}</title>
<style>
  @page { size: A4; margin: 10mm 12mm 12mm 12mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; color: #111; background: #fff; margin: 0; padding: 0; }
  table { border-collapse: collapse; }
  td, th { vertical-align: top; padding: 0; }
  .photo-img { width: 100%; height: 100px; object-fit: cover; border: 1px solid #dde6f0; border-radius: 3px; display: block; }
  .box { border: 1px solid #ccd8e6; border-top: none; }
</style>
</head>
<body>

${isTest ? `<div style="position:fixed;top:46%;left:50%;
  transform:translate(-50%,-50%) rotate(-38deg);
  font-size:68pt;font-weight:900;color:rgba(180,30,30,0.055);
  white-space:nowrap;letter-spacing:8px;
  font-family:Arial,sans-serif;z-index:0;">ESSAI GRATUIT</div>` : ""}

<table style="width:100%;border:2.5px solid ${C};border-collapse:collapse;">
<tr><td style="padding:12px 14px 14px;">

${testBanner}

<table style="width:100%;">
  <tr>
    <td style="width:62%;vertical-align:top;padding-right:16px;">
      <div style="font-size:17pt;font-weight:900;color:${C};line-height:1.1;letter-spacing:-.3px;">${companyName}</div>
      <div style="font-size:8pt;color:#555;line-height:1.7;margin-top:5px;">
        ${companyAddress ? `${companyAddress}<br/>` : ""}
        ${companyPhone ? `Tél&nbsp;: ${companyPhone}${companyEmail ? "&nbsp;&nbsp;&middot;&nbsp;&nbsp;" : "<br/>"}` : ""}
        ${companyEmail ? `${companyEmail}<br/>` : ""}
        ${companySiret ? `SIRET&nbsp;: <strong>${companySiret}</strong>` : ""}
        ${companyInsurance ? `<br/>Assurance RC Pro&nbsp;: ${companyInsurance}` : ""}
      </div>
    </td>
    <td style="width:38%;vertical-align:top;text-align:right;">
      <table style="width:100%;">
        <tr><td style="background:${C};color:#fff;padding:10px 18px 9px;border-radius:5px;
          text-align:center;font-size:14pt;font-weight:900;letter-spacing:.4px;line-height:1.25;">
          CERTIFICAT<br/>DE RAMONAGE
        </td></tr>
        <tr><td style="padding-top:7px;text-align:center;font-size:8.5pt;color:#555;line-height:1.7;">
          N°&nbsp;<strong style="font-size:9.5pt;color:${C};">${certNumber}</strong><br/>
          Émis le&nbsp;<strong>${dateFr}</strong>
        </td></tr>
      </table>
    </td>
  </tr>
</table>

<table style="width:100%;margin:10px 0 0;">
  <tr><td style="border-top:2.5px solid ${C};padding:0;font-size:0;">&nbsp;</td></tr>
</table>

<table style="width:100%;margin:0 0 8px;">
  <tr><td style="background:#e8eef6;border-bottom:2px solid ${C};padding:6px 0;text-align:center;
    font-size:10.5pt;font-weight:900;color:${C};letter-spacing:2px;text-transform:uppercase;">
    Attestation d'entretien et de ramonage
  </td></tr>
</table>

<table style="width:100%;">
  <tr>
    <td style="width:50%;vertical-align:top;padding-right:5px;">
      ${sectionHead("1", "Client")}
      <table style="width:100%;" class="box"><tr><td style="padding:9px 11px;">
        ${lbl("Nom complet")}${val(d.client_name, "margin-bottom:6px;")}
        ${lbl("Téléphone")}${val(d.client_phone || "—", "margin-bottom:6px;")}
        ${lbl("Email")}<div style="font-size:9pt;font-weight:600;color:#111;margin-top:1px;">${d.client_email || "—"}</div>
      </td></tr></table>
    </td>
    <td style="width:50%;vertical-align:top;padding-left:5px;">
      ${sectionHead("2", "Logement / lieu d'intervention")}
      <table style="width:100%;" class="box"><tr><td style="padding:9px 11px;">
        ${lbl("Adresse d'intervention")}${val(d.client_address || "—", "margin-bottom:6px;min-height:22px;")}
        ${lbl("Date d'intervention")}${val(dateFr)}
      </td></tr></table>
    </td>
  </tr>
</table>

${sectionHead("3", "Identification du conduit ramoné")}
<table style="width:100%;" class="box"><tr><td style="padding:10px 12px;">
  <table style="width:100%;">
    <tr>
      <td style="width:33%;padding-right:8px;">
        ${lbl("Combustible / appareil")}${val(installationLabels[d.installation_type] || d.installation_type)}
      </td>
      <td style="width:33%;padding:0 8px;">
        ${lbl("Nombre de conduits")}${val(String(conduitCount))}
      </td>
      <td style="width:34%;padding-left:8px;">
        ${lbl("Matériau du conduit")}${val(conduitMat)}
      </td>
    </tr>
  </table>
</td></tr></table>

${sectionHead("4", "Opérations réalisées")}
<table style="width:100%;" class="box">
  <tr>
    <td style="width:50%;padding:10px 12px;vertical-align:top;border-right:1px solid #e2e8f0;">
      <table style="width:100%;">
        ${chk(d.cleaning_done, "Ramonage mécanique sur toute la longueur du conduit")}
        ${chk(d.vacuity_test, "Vérification de la vacuité du conduit", "RÉUSSI", "NON RÉALISÉ")}
      </table>
    </td>
    <td style="width:50%;padding:10px 12px;vertical-align:top;">
      <table style="width:100%;">
        ${chk(true, "Contrôle visuel du foyer et des accessoires")}
        ${chk(!conduitMajeur, "Conformité réglementaire (DTU 24.1)", "CONFORME", "NON CONFORME")}
      </table>
    </td>
  </tr>
</table>

${conduitAlert}

${sectionHead("5", "Résultat du contrôle & recommandations")}
<table style="width:100%;" class="box">
  <tr><td style="padding:10px 12px;">
    ${lbl("État général du conduit")}
    <div style="font-size:11pt;font-weight:700;margin-top:3px;
      color:${conduitOk ? "#15803d" : conduitMajeur ? "#b91c1c" : "#92400e"};">
      ${conduitOk ? "&#10003;&nbsp;" : "&#9888;&nbsp;"}${conduitLabels[d.conduit_state] || d.conduit_state}
    </div>
    <div style="margin-top:8px;">${lbl("Prochain ramonage recommandé")}${val(nextDateFr)}</div>
  </td></tr>
  ${notesBlock}
  ${recoBlock}
</table>

${photosSection}

${sectionHead("7", "Attestation du professionnel")}
<table style="width:100%;" class="box">
  <tr>
    <td style="width:36%;padding:11px 12px;vertical-align:top;border-right:1px solid #e2e8f0;">
      ${lbl("Technicien qualifié")}
      <div style="font-size:12pt;font-weight:800;color:${C};margin:4px 0 5px;">${techName || "—"}</div>
      <div style="font-size:8.5pt;color:#444;line-height:1.6;">${companyName}</div>
      ${companySiret ? `<div style="font-size:7.5pt;color:#888;margin-top:3px;">SIRET&nbsp;: ${companySiret}</div>` : ""}
      <div style="margin-top:8px;">${lbl("Fait le")}</div>
      <div style="font-size:9.5pt;font-weight:600;color:#111;margin-top:2px;">${dateFr}</div>
    </td>
    <td style="width:36%;padding:11px 12px;vertical-align:top;border-right:1px solid #e2e8f0;">
      ${lbl("Signature du technicien")}
      <table style="width:100%;margin-top:6px;"><tr>
        <td style="border:1.5px dashed #94a3b8;border-radius:5px;padding:10px;text-align:center;height:72px;vertical-align:middle;">
          ${signatureCell}
          <div style="font-size:7pt;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;margin-top:4px;">Signature</div>
        </td>
      </tr></table>
    </td>
    <td style="width:28%;padding:11px 12px;vertical-align:top;text-align:center;">
      ${lbl("Cachet professionnel")}
      <table style="width:100%;margin-top:6px;"><tr>
        <td style="border:2px solid ${C};border-radius:5px;padding:12px 8px;text-align:center;">
          <div style="font-size:8.5pt;font-weight:800;color:${C};text-transform:uppercase;letter-spacing:.5px;
            line-height:1.4;border-bottom:1px solid #b0bfcf;padding-bottom:8px;margin-bottom:8px;">
            Intervenant<br/>qualifié
          </div>
          <div style="font-size:7.5pt;color:#444;line-height:1.6;">
            NF DTU 24.1<br/>
            Arrêté 27/06/2023<br/>
            <strong style="color:${C};">${dateFr}</strong>
          </div>
        </td>
      </tr></table>
    </td>
  </tr>
</table>

<table style="width:100%;margin-top:10px;border-top:2px solid ${C};">
  <tr>
    <td style="padding:8px 0 0;font-size:7.5pt;color:#555;line-height:1.6;">
      <strong style="color:${C};">Mentions légales &amp; obligations du client&nbsp;:</strong><br/>
      Certificat établi conformément au <strong>DTU&nbsp;24.1</strong> et à l'<strong>arrêté du 27&nbsp;juin&nbsp;2023</strong>
      relatif à l'entretien des conduits de fumée. Périodicité légale&nbsp;: <strong>${periodicity}</strong>
      (art.&nbsp;L.&nbsp;2213-26 CGCT). Ce document doit être <strong>conservé pendant 2&nbsp;ans</strong>
      et remis à l'assureur en cas de sinistre. Le non-respect de l'obligation de ramonage peut entraîner
      le refus de prise en charge par l'assurance habitation.
    </td>
  </tr>
  <tr>
    <td style="padding-top:6px;text-align:right;font-size:7pt;color:#888;">
      Généré le ${dateFr} &middot; Réf.&nbsp;<strong>${certNumber}</strong>
      ${isTest ? `&middot; <strong style="color:#b91c1c;">PRÉVISUALISATION — NON OFFICIEL</strong>` : ""}
    </td>
  </tr>
</table>

</td></tr>
</table>

</body>
</html>`;
}

/* ── DocRaptor call ──────────────────────────────────────── */

async function callDocRaptor(html: string, opts: { test: boolean; name: string }): Promise<{ pdfBytes: Uint8Array; pdfBase64: string }> {
  // Hack officiel DocRaptor : la clé publique "YOUR_API_KEY_HERE" fonctionne
  // en illimité tant que test:true. On l'utilise systématiquement pour les
  // previews — la valeur de PDF_API_KEY ne peut plus casser la génération.
  const key = opts.test
    ? "YOUR_API_KEY_HERE"
    : (process.env.PDF_API_KEY || process.env.DOCRAPTOR_API_KEY || "");

  if (!opts.test && !key) {
    throw new Error(
      "Génération officielle indisponible : clé DocRaptor manquante. Mettez à jour le secret PDF_API_KEY.",
    );
  }

  const res = await fetch("https://docraptor.com/docs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(key + ":")}`,
    },
    body: JSON.stringify({
      doc: {
        test: opts.test,
        type: "pdf",
        document_content: html,
        name: opts.name,
        prince_options: { media: "print" },
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error(`[DocRaptor] mode=${opts.test ? "test" : "official"} status=${res.status} body=${txt.slice(0, 400)}`);
    if (!opts.test && res.status === 401) {
      throw new Error("Clé DocRaptor invalide pour le mode officiel. Vérifiez PDF_API_KEY.");
    }
    throw new Error(`DocRaptor (${res.status}) : ${txt.slice(0, 300)}`);
  }

  const pdfBytes = new Uint8Array(await res.arrayBuffer());
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < pdfBytes.length; i += CHUNK) {
    binary += String.fromCharCode(...pdfBytes.subarray(i, i + CHUNK));
  }
  return { pdfBytes, pdfBase64: btoa(binary) };
}

/* ── Certificate number ──────────────────────────────────── */

async function nextCertNumber(token: string, userId: string): Promise<string> {
  try {
    const r = await sbGet(token, "certificates", `select=id`, { Prefer: "count=exact", Range: "0-0" });
    const range = r.headers.get("content-range") ?? "0-0/0";
    const total = parseInt(range.split("/")[1] ?? "0", 10) || 0;
    return `CERT-${new Date().getFullYear()}-${String(total + 1).padStart(4, "0")}`;
  } catch {
    return `CERT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  }
  void userId;
}

/* ── Helper: photos → HTML blocks ───────────────────────── */

async function buildPhotoBlocksSafe(urls?: string[]): Promise<string> {
  if (!urls || urls.length === 0) return "";
  const items = await Promise.all(
    urls.map(async (url, i) => {
      const b64 = await toBase64(url);
      if (!b64) return "";
      return `<td style="width:25%;padding:3px;vertical-align:top;"><img class="photo-img" src="${b64}" alt="Photo ${i + 1}" /><div style="font-size:7pt;color:#94a3b8;text-align:center;margin-top:3px;">Photo ${i + 1}</div></td>`;
    })
  );
  return items.filter(Boolean).join("");
}

/* ── Coeur partagé ──────────────────────────────────────── */

async function runPipeline(data: FormData, isTest: boolean) {
  const token = data.access_token;
  if (!token) throw new Error("Session expirée. Reconnectez-vous.");
  if (!data.user_id) throw new Error("Utilisateur inconnu.");

  // 1. Profil du technicien
  let profile: Record<string, unknown> = {};
  try {
    const r = await sbGet(token, "profiles", `id=eq.${data.user_id}&limit=1`);
    const arr = (await r.json()) as Record<string, unknown>[];
    profile = arr[0] ?? {};
  } catch (e) {
    console.warn("Profile fetch failed:", e);
  }

  // 2. Créer client
  const client = await sbPost<{ id: string }>(token, "clients", {
    user_id: data.user_id,
    full_name: data.client_name,
    phone: data.client_phone || null,
    address: data.client_address || null,
    email: data.client_email || null,
  });

  // 3. Créer intervention
  const now = new Date().toISOString();
  const intervention = await sbPost<{ id: string }>(token, "interventions", {
    user_id: data.user_id,
    client_id: client.id,
    intervention_date: now,
    installation_type: data.installation_type,
    conduit_state: data.conduit_state,
    cleaning_done: data.cleaning_done,
    vacuity_test: data.vacuity_test,
    notes: data.notes || null,
    photos_urls: data.photo_urls?.length ? data.photo_urls : null,
  });

  // 4. HTML + PDF
  const photoBlocks = await buildPhotoBlocksSafe(data.photo_urls);
  const certNumber = await nextCertNumber(token, data.user_id);
  const html = buildHtml({ data, certNumber, isTest, profile, photoBlocks });
  const suffix = isTest ? "preview" : "official";
  const { pdfBytes, pdfBase64 } = await callDocRaptor(html, { test: isTest, name: `${certNumber}-${suffix}` });

  // 5. Storage (best-effort)
  const storagePath = `${data.user_id}/${certNumber}-${suffix}.pdf`;
  const pdfUrl = await uploadPdfToStorage(token, pdfBytes, storagePath);

  // 6. Certificat en base
  await sbPost(token, "certificates", {
    intervention_id: intervention.id,
    pdf_url: pdfUrl || `local:${certNumber}`,
  }).catch((e) => console.warn("cert insert:", e));

  // 7. Rappel 11 mois
  const reminderDate = new Date(now);
  reminderDate.setMonth(reminderDate.getMonth() + 11);
  await sbPost(token, "reminders", {
    intervention_id: intervention.id,
    client_id: client.id,
    scheduled_date: reminderDate.toISOString(),
    status: "scheduled",
  }).catch((e) => console.warn("reminder insert:", e));

  // 8. Facture (seulement en officiel)
  if (!isTest) {
    await sbPost(token, "invoices", {
      intervention_id: intervention.id,
      amount: (profile.default_price as number) || 80,
      status: "pending",
    }).catch((e) => console.warn("invoice insert:", e));
  }

  return { pdfBase64, pdfUrl, certNumber, interventionId: intervention.id };
}

async function hasActiveSubscription(token: string, userId: string): Promise<boolean> {
  try {
    const r = await sbGet(token, "subscriptions", `user_id=eq.${userId}&status=eq.active&limit=1&select=id`);
    const arr = (await r.json()) as unknown[];
    return arr.length > 0;
  } catch {
    return false;
  }
}

async function countPreviewsUsed(token: string, userId: string): Promise<number> {
  try {
    const r = await sbGet(
      token,
      "certificates",
      `select=id,pdf_url,intervention_id,interventions!inner(user_id)&interventions.user_id=eq.${userId}&pdf_url=like.*preview*`,
      { Prefer: "count=exact", Range: "0-0" }
    );
    const range = r.headers.get("content-range") ?? "0-0/0";
    return parseInt(range.split("/")[1] ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

/* ══════════════════════════════════════════════════════════
   generateCertificatePdf — unifié : preview illimité (3 gratuits)
   puis blocage vers abonnement
══════════════════════════════════════════════════════════ */

export const generateCertificatePdf = createServerFn({ method: "POST" })
  .inputValidator((d: FormData) => {
    if (!d.client_name?.trim()) throw new Error("Nom du client requis");
    if (!d.user_id) throw new Error("user_id requis");
    if (!d.access_token) throw new Error("access_token requis");
    return d;
  })
  .handler(async ({ data }) => {
    const isSubscribed = await hasActiveSubscription(data.access_token, data.user_id);

    if (isSubscribed) {
      const result = await runPipeline(data, false);
      return { ...result, mode: "official" as const, previewsRemaining: null as number | null };
    }

    const used = await countPreviewsUsed(data.access_token, data.user_id);
    if (used >= FREE_PREVIEW_LIMIT) {
      throw new SubscriptionRequiredError(
        `Vous avez utilisé vos ${FREE_PREVIEW_LIMIT} certificats d'essai gratuits. Passez Pro pour continuer.`,
      );
    }

    const result = await runPipeline(data, true);
    return {
      ...result,
      mode: "preview" as const,
      previewsRemaining: Math.max(0, FREE_PREVIEW_LIMIT - used - 1),
    };
  });

/* ── Alias de compatibilité (demo.tsx) ──────────────────── */

export const generatePreviewPdf = createServerFn({ method: "POST" })
  .inputValidator((d: FormData) => {
    if (!d.client_name?.trim()) throw new Error("Nom du client requis");
    if (!d.user_id) throw new Error("user_id requis");
    if (!d.access_token) throw new Error("access_token requis");
    return d;
  })
  .handler(async ({ data }) => runPipeline(data, true));

export const generateOfficialPdf = generateCertificatePdf;
