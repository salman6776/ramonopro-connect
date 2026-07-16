import { createServerFn } from "@tanstack/react-start";

const DOCRAPTOR_KEY = process.env.DOCRAPTOR_API_KEY;
const SB_URL = "https://esdeyidgtbfandpxtqpr.supabase.co";
const SB_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY as string;

/* ── Types ──────────────────────────────────────────────── */

export interface FormData {
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

/* ── Supabase helpers (service role, bypass RLS) ─────────── */

async function sbGet(table: string, query: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, {
    headers: { Authorization: `Bearer ${SB_KEY()}`, apikey: SB_KEY(), Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`Supabase GET ${table}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function sbPost(table: string, body: unknown, options: { single?: boolean } = {}) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SB_KEY()}`,
      apikey: SB_KEY(),
      "Content-Type": "application/json",
      Prefer: options.single ? "return=representation" : "return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Supabase POST ${table}: ${r.status} ${await r.text()}`);
  const json = await r.json();
  return options.single ? json[0] : json;
}

/* ── Image → base64 (safe for large files) ─────────────── */

async function toBase64(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const mime = r.headers.get("content-type") ?? "image/jpeg";
    // Chunked encoding — avoids call-stack overflow with large images
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

  const now     = new Date();
  const dateFr  = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const nextYearFr = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
    .toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  const installationLabels: Record<string, string> = {
    gaz:      "Appareil à gaz",
    fioul:    "Chaudière fioul",
    bois:     "Insert / Poêle à bois",
    granulés: "Poêle à granulés",
  };
  const conduitLabels: Record<string, string> = {
    bon:              "Conforme — aucune anomalie",
    anomalie_mineure: "Anomalie mineure détectée",
    anomalie_majeure: "ANOMALIE MAJEURE — Intervention urgente requise",
  };

  const C  = "#1a3557";
  const companyName    = (profile.company_name as string) || "Entreprise de Ramonage";
  const companyAddress = (profile.address      as string) || "";
  const companyPhone   = (profile.phone        as string) || "";
  const companyEmail   = (profile.email        as string) || "";
  const companySiret   = (profile.siret        as string) || "";
  const techName       = (profile.full_name    as string) || "";

  const conduitOk     = d.conduit_state === "bon";
  const conduitMajeur = d.conduit_state === "anomalie_majeure";

  const chkOk = (label: string, badge: string) =>
    `<tr>
      <td style="width:22px;padding:3px 5px 3px 0;vertical-align:middle;">
        <span style="font-size:13pt;font-weight:900;color:#16a34a;">&#10003;</span>
      </td>
      <td style="padding:3px 8px 3px 0;font-size:9.5pt;color:#111;vertical-align:middle;">${label}</td>
      <td style="text-align:right;vertical-align:middle;padding:3px 0;">
        <span style="background:#f0fdf4;border:1px solid #86efac;border-radius:3px;padding:2px 8px;font-size:8pt;font-weight:700;color:#15803d;">${badge}</span>
      </td>
    </tr>`;

  const chkKo = (label: string, badge: string) =>
    `<tr>
      <td style="width:22px;padding:3px 5px 3px 0;vertical-align:middle;">
        <span style="font-size:13pt;font-weight:900;color:#dc2626;">&#10007;</span>
      </td>
      <td style="padding:3px 8px 3px 0;font-size:9.5pt;color:#111;vertical-align:middle;">${label}</td>
      <td style="text-align:right;vertical-align:middle;padding:3px 0;">
        <span style="background:#fef2f2;border:1px solid #fca5a5;border-radius:3px;padding:2px 8px;font-size:8pt;font-weight:700;color:#b91c1c;">${badge}</span>
      </td>
    </tr>`;

  const chkRow = (ok: boolean, label: string, badgeOk: string, badgeKo: string) =>
    ok ? chkOk(label, badgeOk) : chkKo(label, badgeKo);

  const sHead = (txt: string) =>
    `<table style="width:100%;border-collapse:collapse;margin-bottom:0;">
      <tr>
        <td style="background:${C};color:#fff;font-size:8.5pt;font-weight:700;
          padding:5px 11px;letter-spacing:.5px;text-transform:uppercase;">
          ${txt}
        </td>
      </tr>
    </table>`;

  const lbl = (t: string) =>
    `<span style="font-size:7pt;color:#777;text-transform:uppercase;letter-spacing:.3px;font-weight:700;">${t}</span>`;

  const val = (t: string, extra = "") =>
    `<div style="font-size:10pt;font-weight:600;color:#111;margin-top:1px;${extra}">${t}</div>`;

  const testBanner = isTest
    ? `<table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <tr>
          <td style="background:#fef3c7;border:2px solid #f59e0b;border-radius:5px;
            padding:9px 16px;text-align:center;font-size:10.5pt;font-weight:800;
            color:#92400e;letter-spacing:.8px;">
            &#9888;&nbsp;&nbsp;DOCUMENT DE PR&#201;VISUALISATION &mdash; NON CONTRACTUEL
          </td>
        </tr>
      </table>`
    : "";

  const conduitAlert = !conduitOk
    ? `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">
        <tr>
          <td style="padding:9px 14px;font-size:9pt;font-weight:700;
            ${conduitMajeur
              ? "background:#fef2f2;border:1.5px solid #ef4444;color:#991b1b;"
              : "background:#fffbeb;border:1.5px solid #f59e0b;color:#92400e;"}
            border-radius:4px;">
            &#9888;&nbsp;&nbsp;${conduitLabels[d.conduit_state] ?? d.conduit_state}
          </td>
        </tr>
      </table>`
    : "";

  const signatureCell = d.signature_base64
    ? `<img src="${d.signature_base64}" style="max-height:55px;max-width:190px;display:block;margin:6px auto;" />`
    : `<div style="height:48px;"></div>`;

  const notesBlock = d.notes
    ? `<tr>
        <td colspan="3" style="padding:8px 0 0 0;">
          <div style="border-top:1px solid #dde6f0;margin-bottom:7px;"></div>
          ${lbl("Observations techniques")}
          <div style="background:#f8fafc;border:1px solid #dde6f0;border-radius:3px;
            padding:7px 10px;font-size:9pt;color:#374151;line-height:1.55;margin-top:3px;">
            ${d.notes}
          </div>
        </td>
      </tr>`
    : "";

  const recoBlock = d.recommendations
    ? `<tr>
        <td colspan="3" style="padding:8px 0 0 0;">
          <div style="border-top:1px solid #dde6f0;margin-bottom:7px;"></div>
          ${lbl("Recommandations")}
          <div style="background:#fffbeb;border:1px solid #fcd34d;border-left:3px solid #f59e0b;
            border-radius:3px;padding:7px 10px;font-size:9pt;color:#374151;line-height:1.55;margin-top:3px;">
            ${d.recommendations}
          </div>
        </td>
      </tr>`
    : "";

  const photosSection = photoBlocks
    ? `${sHead("Photos de l'intervention")}
      <table style="width:100%;border-collapse:collapse;border:1px solid #ccd8e6;
        border-top:none;margin-bottom:10px;">
        <tr>
          <td style="padding:10px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr>${photoBlocks}</tr>
            </table>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Certificat de Ramonage ${certNumber}</title>
<style>
  @page { size: A4; margin: 12mm 13mm 14mm 13mm; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9.5pt;
    color: #111;
    background: #fff;
    margin: 0;
    padding: 0;
  }
  table { border-collapse: collapse; }
  td, th { vertical-align: top; padding: 0; }
  .photo-img {
    width: 100%;
    height: 110px;
    object-fit: cover;
    border: 1px solid #dde6f0;
    border-radius: 3px;
    display: block;
  }
</style>
</head>
<body>

<!-- WATERMARK -->
${isTest ? `<div style="position:fixed;top:46%;left:50%;
  transform:translate(-50%,-50%) rotate(-38deg);
  font-size:68pt;font-weight:900;
  color:rgba(180,30,30,0.055);
  white-space:nowrap;letter-spacing:8px;
  font-family:Arial,sans-serif;z-index:0;">ESSAI GRATUIT</div>` : ""}

<!-- PAGE WRAPPER -->
<table style="width:100%;border:2.5px solid ${C};border-collapse:collapse;">
<tr><td style="padding:12px 14px 14px;">

${testBanner}

<!-- ══ EN-TÊTE ══ -->
<table style="width:100%;margin-bottom:0;">
  <tr>
    <td style="width:62%;vertical-align:top;padding-right:16px;">
      <div style="font-size:18pt;font-weight:900;color:${C};line-height:1.1;letter-spacing:-.3px;">
        ${companyName}
      </div>
      <div style="font-size:8pt;color:#555;line-height:1.8;margin-top:5px;">
        ${companyAddress ? `${companyAddress}<br/>` : ""}
        ${companyPhone   ? `T&#233;l&nbsp;: ${companyPhone}${companyEmail ? "&nbsp;&nbsp;&nbsp;" : "<br/>"}` : ""}
        ${companyEmail   ? `${companyEmail}<br/>` : ""}
        ${companySiret   ? `SIRET&nbsp;: <strong>${companySiret}</strong>` : ""}
      </div>
    </td>
    <td style="width:38%;vertical-align:top;text-align:right;">
      <table style="width:100%;">
        <tr>
          <td style="background:${C};color:#fff;padding:9px 18px 8px;
            border-radius:5px;text-align:center;
            font-size:14.5pt;font-weight:900;letter-spacing:.4px;line-height:1.25;">
            CERTIFICAT<br/>DE RAMONAGE
          </td>
        </tr>
        <tr>
          <td style="padding-top:7px;text-align:center;font-size:8.5pt;color:#555;line-height:1.7;">
            N°&nbsp;<strong style="font-size:9.5pt;color:${C};">${certNumber}</strong><br/>
            &#201;mis le&nbsp;<strong>${dateFr}</strong>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- SEPARATEUR -->
<table style="width:100%;margin:10px 0 0;">
  <tr>
    <td style="border-top:2.5px solid ${C};padding:0;font-size:0;">&nbsp;</td>
  </tr>
</table>

<!-- BANDEAU TITRE -->
<table style="width:100%;margin:0 0 11px;">
  <tr>
    <td style="background:#e8eef6;border-top:none;border-bottom:2px solid ${C};
      padding:6px 0;text-align:center;
      font-size:10.5pt;font-weight:900;color:${C};
      letter-spacing:2.5px;text-transform:uppercase;">
      Attestation d'entretien et de ramonage
    </td>
  </tr>
</table>

<!-- ══ CLIENT + INSTALLATION (2 colonnes) ══ -->
<table style="width:100%;margin-bottom:10px;">
  <tr>
    <!-- COLONNE CLIENT -->
    <td style="width:50%;vertical-align:top;padding-right:6px;">
      ${sHead("Informations client")}
      <table style="width:100%;border:1px solid #ccd8e6;border-top:none;border-collapse:collapse;">
        <tr>
          <td style="padding:9px 11px 8px;">
            ${lbl("Nom complet")}
            ${val(d.client_name, "margin-bottom:7px;")}
            ${lbl("Adresse d'intervention")}
            ${val(d.client_address || "—", "margin-bottom:7px;")}
            <table style="width:100%;">
              <tr>
                <td style="width:50%;padding-right:8px;">
                  ${lbl("T&#233;l&#233;phone")}
                  ${val(d.client_phone || "—")}
                </td>
                <td style="width:50%;">
                  ${lbl("Email")}
                  <div style="font-size:8.5pt;font-weight:600;color:#111;margin-top:1px;">
                    ${d.client_email || "—"}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>

    <!-- COLONNE INSTALLATION -->
    <td style="width:50%;vertical-align:top;padding-left:6px;">
      ${sHead("Installation &amp; conduit")}
      <table style="width:100%;border:1px solid #ccd8e6;border-top:none;border-collapse:collapse;">
        <tr>
          <td style="padding:9px 11px 8px;">
            ${lbl("Type d'appareil")}
            ${val(installationLabels[d.installation_type] || d.installation_type, "margin-bottom:7px;")}
            ${lbl("&#201;tat du conduit fum&#233;e")}
            <div style="font-size:10pt;font-weight:700;margin-top:2px;margin-bottom:7px;
              color:${conduitOk ? "#15803d" : conduitMajeur ? "#b91c1c" : "#92400e"};">
              ${conduitOk ? "&#10003;&nbsp;" : "&#9888;&nbsp;"}${conduitLabels[d.conduit_state] || d.conduit_state}
            </div>
            ${lbl("Prochain ramonage recommand&#233;")}
            ${val(nextYearFr)}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

${conduitAlert}

<!-- ══ OPÉRATIONS RÉALISÉES ══ -->
${sHead("Op&#233;rations r&#233;alis&#233;es")}
<table style="width:100%;border:1px solid #ccd8e6;border-top:none;border-collapse:collapse;margin-bottom:10px;">
  <tr>
    <!-- COLONNE GAUCHE -->
    <td style="width:50%;padding:10px 12px;vertical-align:top;border-right:1px solid #e2e8f0;">
      <table style="width:100%;">
        ${chkRow(d.cleaning_done, "Ramonage &amp; nettoyage du conduit", "R&#201;ALIS&#201;", "NON R&#201;ALIS&#201;")}
        ${chkRow(d.vacuity_test,  "Test de vacuit&#233; du conduit",     "R&#201;USSI",   "NON R&#201;ALIS&#201;")}
      </table>
    </td>
    <!-- COLONNE DROITE -->
    <td style="width:50%;padding:10px 12px;vertical-align:top;">
      <table style="width:100%;">
        ${chkOk("V&#233;rification visuelle du foyer", "R&#201;ALIS&#201;")}
        ${chkRow(
          !conduitMajeur,
          "Conformit&#233; r&#233;glementaire",
          "CONFORME",
          "NON CONFORME"
        )}
      </table>
    </td>
  </tr>
  ${notesBlock}
  ${recoBlock}
</table>

${photosSection}

<!-- ══ SIGNATURE + CACHET ══ -->
${sHead("Attestation du professionnel")}
<table style="width:100%;border:1px solid #ccd8e6;border-top:none;border-collapse:collapse;margin-bottom:10px;">
  <tr>
    <!-- INFOS TECHNICIEN -->
    <td style="width:36%;padding:11px 12px;vertical-align:top;border-right:1px solid #e2e8f0;">
      ${lbl("Technicien agr&#233;&#233;")}
      <div style="font-size:12pt;font-weight:800;color:${C};margin:4px 0 5px;">${techName || "—"}</div>
      <div style="font-size:8.5pt;color:#444;line-height:1.6;">${companyName}</div>
      ${companySiret
        ? `<div style="font-size:7.5pt;color:#888;margin-top:3px;">SIRET&nbsp;: ${companySiret}</div>`
        : ""}
      <div style="margin-top:8px;">${lbl("Date d'intervention")}</div>
      <div style="font-size:9.5pt;font-weight:600;color:#111;margin-top:2px;">${dateFr}</div>
    </td>

    <!-- ZONE SIGNATURE -->
    <td style="width:36%;padding:11px 12px;vertical-align:top;border-right:1px solid #e2e8f0;">
      ${lbl("Signature du technicien")}
      <table style="width:100%;margin-top:6px;">
        <tr>
          <td style="border:1.5px dashed #94a3b8;border-radius:5px;
            padding:10px;text-align:center;height:72px;vertical-align:middle;">
            ${signatureCell}
            <div style="font-size:7pt;color:#94a3b8;text-transform:uppercase;
              letter-spacing:.4px;margin-top:4px;">Signature</div>
          </td>
        </tr>
      </table>
    </td>

    <!-- CACHET OFFICIEL -->
    <td style="width:28%;padding:11px 12px;vertical-align:top;text-align:center;">
      ${lbl("Cachet professionnel")}
      <table style="width:100%;margin-top:6px;">
        <tr>
          <td style="border:2px solid ${C};border-radius:5px;
            padding:12px 8px;text-align:center;">
            <div style="font-size:8.5pt;font-weight:800;color:${C};
              text-transform:uppercase;letter-spacing:.5px;line-height:1.4;
              border-bottom:1px solid #b0bfcf;padding-bottom:8px;margin-bottom:8px;">
              Intervenant<br/>qualifi&#233;
            </div>
            <div style="font-size:7.5pt;color:#444;line-height:1.6;">
              NF DTU 24.1<br/>
              Arr&#234;t&#233; 23/02/2009<br/>
              <strong style="color:${C};">${dateFr}</strong>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- ══ PIED DE PAGE LÉGAL ══ -->
<table style="width:100%;border-top:2px solid ${C};margin-top:8px;">
  <tr>
    <td style="padding-top:8px;width:72%;padding-right:14px;
      font-size:7pt;color:#666;line-height:1.6;vertical-align:top;">
      <strong>R&#233;f&#233;rences r&#233;glementaires&nbsp;:</strong>
      Ce document est &#233;tabli conform&#233;ment au <strong>DTU&nbsp;24.1</strong> et &#224; l'arr&#234;t&#233; du 23&nbsp;f&#233;vrier&nbsp;2009
      (JO&nbsp;03/04/2009) relatif aux r&#232;gles de s&#233;curit&#233; applicables aux installations de chauffage.
      Ramonage obligatoire&nbsp;: <strong>1&nbsp;fois/an</strong> (gaz, fioul) &middot;
      <strong>2&nbsp;fois/an dont 1 en p&#233;riode de chauffe</strong> (bois, granul&#233;s)
      &mdash; art.&nbsp;L.&nbsp;111-8 CCH.
      Le non-respect peut entra&#238;ner le refus de remboursement de sinistre par l'assureur.
    </td>
    <td style="padding-top:8px;width:28%;text-align:right;vertical-align:bottom;
      font-size:7pt;color:#888;line-height:1.6;">
      G&#233;n&#233;r&#233; le ${dateFr}<br/>
      R&#233;f.&nbsp;: <strong>${certNumber}</strong>
      ${isTest
        ? `<br/><strong style="color:#b91c1c;font-size:7.5pt;">PR&#201;VISUALISATION &mdash; NON OFFICIEL</strong>`
        : ""}
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
  if (!DOCRAPTOR_KEY) throw new Error("DOCRAPTOR_API_KEY non configurée côté serveur.");

  const res = await fetch("https://docraptor.com/docs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(DOCRAPTOR_KEY + ":")}`,
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
    throw new Error(`DocRaptor erreur (${res.status}): ${txt.slice(0, 500)}`);
  }

  const pdfBytes = new Uint8Array(await res.arrayBuffer());

  // Convert to base64 safely (chunked to avoid stack overflow)
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < pdfBytes.length; i += CHUNK) {
    binary += String.fromCharCode(...pdfBytes.subarray(i, i + CHUNK));
  }
  const pdfBase64 = btoa(binary);

  return { pdfBytes, pdfBase64 };
}

/* ── Upload PDF to Supabase Storage ─────────────────────── */

async function uploadPdfToStorage(pdfBytes: Uint8Array, path: string): Promise<string> {
  const upRes = await fetch(`${SB_URL}/storage/v1/object/certificates/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SB_KEY()}`,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: pdfBytes.buffer as ArrayBuffer,
  });
  if (!upRes.ok) {
    const err = await upRes.text();
    throw new Error(`Stockage PDF échoué (${upRes.status}): ${err}`);
  }
  return `${SB_URL}/storage/v1/object/public/certificates/${path}`;
}

/* ── Certificate number ──────────────────────────────────── */

async function nextCertNumber(userId: string): Promise<string> {
  const r = await fetch(
    `${SB_URL}/rest/v1/certificates?user_id=eq.${userId}&select=id`,
    { headers: { Authorization: `Bearer ${SB_KEY()}`, apikey: SB_KEY(), Prefer: "count=exact" } }
  );
  const range = r.headers.get("content-range") ?? "0-0/0";
  const total = parseInt(range.split("/")[1] ?? "0", 10) || 0;
  return `CERT-${new Date().getFullYear()}-${String(total + 1).padStart(4, "0")}`;
}

/* ══════════════════════════════════════════════════════════
   generatePreviewPdf — essai gratuit (DocRaptor test:true)
   Fait TOUT côté serveur : client, intervention, cert, reminder
══════════════════════════════════════════════════════════ */

export const generatePreviewPdf = createServerFn({ method: "POST" })
  .inputValidator((d: FormData) => {
    if (!d.client_name?.trim()) throw new Error("Nom du client requis");
    if (!d.user_id) throw new Error("user_id requis");
    return d;
  })
  .handler(async ({ data }) => {
    const sbKey = SB_KEY();
    if (!sbKey) throw new Error("Clé Supabase serveur manquante.");

    // 1. Récupérer le profil du technicien
    const profiles: Record<string, unknown>[] = await sbGet("profiles", `id=eq.${data.user_id}&limit=1`);
    const profile = profiles[0] ?? {};

    // 2. Créer le client
    const client = await sbPost("clients", {
      user_id: data.user_id,
      full_name: data.client_name,
      phone: data.client_phone || null,
      address: data.client_address || null,
      email: data.client_email || null,
    }, { single: true });

    // 3. Créer l'intervention
    const now = new Date().toISOString();
    const intervention = await sbPost("interventions", {
      user_id: data.user_id,
      client_id: client.id,
      intervention_date: now,
      installation_type: data.installation_type,
      conduit_state: data.conduit_state,
      cleaning_done: data.cleaning_done,
      vacuity_test: data.vacuity_test,
      notes: data.notes || null,
      photos_urls: data.photo_urls?.length ? data.photo_urls : null,
    }, { single: true });

    // 4. Construire le HTML (photos en base64)
    const photoBlocks = await buildPhotoBlocksSafe(data.photo_urls);
    const certNumber = await nextCertNumber(data.user_id);
    const html = buildHtml({ data, certNumber, isTest: true, profile, photoBlocks });

    // 5. Appel DocRaptor
    const { pdfBytes, pdfBase64 } = await callDocRaptor(html, {
      test: true,
      name: `${certNumber}-preview`,
    });

    // 6. Stocker le PDF
    const storagePath = `${data.user_id}/${certNumber}-preview.pdf`;
    const pdfUrl = await uploadPdfToStorage(pdfBytes, storagePath);

    // 7. Enregistrer certificat (pas de user_id dans la table)
    await sbPost("certificates", {
      intervention_id: intervention.id,
      pdf_url: pdfUrl,
    });

    // 8. Créer rappel (11 mois) — colonne scheduled_date, status "scheduled"
    const reminderDate = new Date(now);
    reminderDate.setMonth(reminderDate.getMonth() + 11);
    await sbPost("reminders", {
      intervention_id: intervention.id,
      client_id: client.id,
      scheduled_date: reminderDate.toISOString(),
      status: "scheduled",
    });

    return { pdfBase64, pdfUrl, certNumber, interventionId: intervention.id };
  });

/* ══════════════════════════════════════════════════════════
   generateOfficialPdf — abonné payant (DocRaptor test:false)
   Vérifie l'abonnement, fait TOUT côté serveur
══════════════════════════════════════════════════════════ */

export const generateOfficialPdf = createServerFn({ method: "POST" })
  .inputValidator((d: FormData) => {
    if (!d.client_name?.trim()) throw new Error("Nom du client requis");
    if (!d.user_id) throw new Error("user_id requis");
    return d;
  })
  .handler(async ({ data }) => {
    const sbKey = SB_KEY();
    if (!sbKey) throw new Error("Clé Supabase serveur manquante.");

    // 1. Vérifier abonnement actif
    const subs: unknown[] = await sbGet("subscriptions", `user_id=eq.${data.user_id}&status=eq.active&limit=1`);
    if (!subs || subs.length === 0) {
      throw new Error("Abonnement actif requis pour générer un certificat officiel. Souscrivez sur la page d'abonnement.");
    }

    // 2. Récupérer le profil du technicien
    const profiles: Record<string, unknown>[] = await sbGet("profiles", `id=eq.${data.user_id}&limit=1`);
    const profile = profiles[0] ?? {};

    // 3. Créer le client (full_name = vrai nom de colonne)
    const client = await sbPost("clients", {
      user_id: data.user_id,
      full_name: data.client_name,
      phone: data.client_phone || null,
      address: data.client_address || null,
      email: data.client_email || null,
    }, { single: true });

    // 4. Créer l'intervention (photos_urls, pas photos; pas de recommendations)
    const now = new Date().toISOString();
    const intervention = await sbPost("interventions", {
      user_id: data.user_id,
      client_id: client.id,
      intervention_date: now,
      installation_type: data.installation_type,
      conduit_state: data.conduit_state,
      cleaning_done: data.cleaning_done,
      vacuity_test: data.vacuity_test,
      notes: data.notes || null,
      photos_urls: data.photo_urls?.length ? data.photo_urls : null,
    }, { single: true });

    // 5. Construire le HTML
    const photoBlocks = await buildPhotoBlocksSafe(data.photo_urls);
    const certNumber = await nextCertNumber(data.user_id);
    const html = buildHtml({ data, certNumber, isTest: false, profile, photoBlocks });

    // 6. Appel DocRaptor (production, sans filigrane)
    const { pdfBytes, pdfBase64 } = await callDocRaptor(html, {
      test: false,
      name: `${certNumber}-official`,
    });

    // 7. Stocker le PDF
    const storagePath = `${data.user_id}/${certNumber}-official.pdf`;
    const pdfUrl = await uploadPdfToStorage(pdfBytes, storagePath);

    // 8. Enregistrer certificat (pas de user_id dans la table)
    await sbPost("certificates", {
      intervention_id: intervention.id,
      pdf_url: pdfUrl,
    });

    // 9. Créer rappel (11 mois) — scheduled_date, status "scheduled"
    const reminderDate = new Date(now);
    reminderDate.setMonth(reminderDate.getMonth() + 11);
    await sbPost("reminders", {
      intervention_id: intervention.id,
      client_id: client.id,
      scheduled_date: reminderDate.toISOString(),
      status: "scheduled",
    });

    // 10. Créer facture (pas de invoice_number dans la table)
    await sbPost("invoices", {
      intervention_id: intervention.id,
      amount: (profile.default_price as number) || 80,
      status: "pending",
    }).catch(() => {});

    return { pdfBase64, pdfUrl, certNumber, interventionId: intervention.id };
  });

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
