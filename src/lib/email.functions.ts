import { createServerFn } from "@tanstack/react-start";

/**
 * Envoie le certificat PDF au client par email via Resend.
 * Le PDF est fourni en base64 (généré côté navigateur).
 */
export const sendCertificateEmail = createServerFn({ method: "POST" })
  .inputValidator((d: {
    access_token: string;
    to: string;
    clientName: string;
    technicianName: string;
    interventionDate: string;
    installationType: string;
    pdfBase64: string;
    fileName: string;
  }) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.to)) throw new Error("Email invalide");
    if (!d.pdfBase64) throw new Error("PDF manquant");
    if (d.pdfBase64.length > 12_000_000) throw new Error("PDF trop volumineux");
    if (d.clientName.length > 200 || d.technicianName.length > 200 || d.installationType.length > 200) {
      throw new Error("Champs trop longs");
    }
    return d;
  })
  .handler(async ({ data }) => {
    const { verifyAccessToken } = await import("./auth.server");
    await verifyAccessToken(data.access_token);

    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY manquante");


    const dateFr = new Date(data.interventionDate).toLocaleDateString("fr-FR");

    const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="background:#1e3a8a;color:#fff;padding:24px;border-radius:12px 12px 0 0">
      <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">Ramono Pro</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px">Votre certificat de ramonage</div>
    </div>
    <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:0">
      <p style="margin:0 0 12px">Bonjour ${escapeHtml(data.clientName)},</p>
      <p style="margin:0 0 12px">Vous trouverez ci-joint votre certificat officiel de ramonage réalisé le <strong>${dateFr}</strong> sur votre installation <strong>${escapeHtml(data.installationType)}</strong>.</p>
      <p style="margin:0 0 12px">Ce document est conforme à la réglementation en vigueur (arrêté du 23 février 2009, DTU 24.1) et est à conserver pour votre assurance habitation.</p>
      <p style="margin:24px 0 0;color:#475569;font-size:14px">Bien cordialement,<br/><strong>${escapeHtml(data.technicianName)}</strong></p>
    </div>
    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">Certificat généré avec Ramono Pro</p>
  </div>
</body></html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Ramono Pro <onboarding@resend.dev>",
        to: [data.to],
        subject: `Votre certificat de ramonage — ${dateFr}`,
        html,
        attachments: [{ filename: data.fileName, content: data.pdfBase64 }],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Resend (${res.status}): ${t.slice(0, 250)}`);
    }
    return { ok: true };
  });

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
