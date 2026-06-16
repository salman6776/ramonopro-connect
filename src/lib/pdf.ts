import { jsPDF } from "jspdf";
import logo from "@/assets/logo.png";

export interface CertificateData {
  intervention_date: string;
  client_name: string;
  client_address: string;
  client_phone?: string;
  installation_type: string;
  conduit_state: string;
  cleaning_done: boolean;
  recommendations?: string;
  technician_name?: string;
  company_name?: string;
}

const BLUE: [number, number, number] = [30, 58, 138];
const ORANGE: [number, number, number] = [249, 115, 22];

async function loadLogo(): Promise<string> {
  const res = await fetch(logo);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

export async function generateCertificatePDF(d: CertificateData): Promise<jsPDF> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const logoData = await loadLogo();

  // Header bar
  pdf.setFillColor(...BLUE);
  pdf.rect(0, 0, 210, 35, "F");
  pdf.setFillColor(...ORANGE);
  pdf.rect(0, 35, 210, 2, "F");

  pdf.addImage(logoData, "PNG", 10, 5, 25, 25);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("CERTIFICAT DE RAMONAGE", 40, 18);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("Document officiel — RamonoPro", 40, 26);

  pdf.setTextColor(20, 20, 20);
  let y = 50;

  // Date
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  const dateFmt = new Date(d.intervention_date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  pdf.text(`Émis le ${dateFmt}`, 200, y, { align: "right" });
  y += 12;

  const section = (title: string) => {
    pdf.setFillColor(...BLUE);
    pdf.rect(10, y - 5, 4, 7, "F");
    pdf.setTextColor(...BLUE);
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, 18, y);
    y += 8;
  };
  const line = (label: string, value: string) => {
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text(label.toUpperCase(), 18, y);
    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(11);
    pdf.text(value || "—", 70, y);
    y += 7;
  };

  section("Informations Client");
  line("Nom", d.client_name);
  line("Adresse", d.client_address);
  if (d.client_phone) line("Téléphone", d.client_phone);
  y += 5;

  section("Installation");
  line("Type", d.installation_type);
  line("État du conduit", d.conduit_state);
  line("Nettoyage effectué", d.cleaning_done ? "Oui ✓" : "Non");
  y += 5;

  if (d.recommendations) {
    section("Recommandations");
    pdf.setTextColor(20, 20, 20);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(d.recommendations, 175);
    pdf.text(lines, 18, y);
    y += lines.length * 5 + 5;
  }

  // Signature box
  y = Math.max(y, 220);
  pdf.setDrawColor(...BLUE);
  pdf.setLineWidth(0.5);
  pdf.rect(120, y, 75, 35);
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text("Signature électronique du ramoneur", 122, y + 5);
  pdf.setFontSize(11);
  pdf.setTextColor(...BLUE);
  pdf.setFont("helvetica", "italic");
  pdf.text(d.technician_name || "RamonoPro", 122, y + 20);
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.setFont("helvetica", "normal");
  pdf.text(d.company_name || "", 122, y + 28);

  // Footer
  pdf.setFillColor(...BLUE);
  pdf.rect(0, 285, 210, 12, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text("RamonoPro — Le logiciel des ramoneurs", 105, 292, { align: "center" });

  return pdf;
}

export interface InvoiceData {
  invoice_number: string;
  date: string;
  client_name: string;
  client_address: string;
  description: string;
  amount: number;
  status: string;
  company_name?: string;
}

export async function generateInvoicePDF(d: InvoiceData): Promise<jsPDF> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const logoData = await loadLogo();

  pdf.setFillColor(...BLUE);
  pdf.rect(0, 0, 210, 35, "F");
  pdf.setFillColor(...ORANGE);
  pdf.rect(0, 35, 210, 2, "F");
  pdf.addImage(logoData, "PNG", 10, 5, 25, 25);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("FACTURE", 40, 18);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`N° ${d.invoice_number}`, 40, 26);

  pdf.setTextColor(20, 20, 20);
  let y = 55;
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text("FACTURÉ À", 18, y);
  pdf.text("DATE", 130, y);
  y += 6;
  pdf.setTextColor(20, 20, 20);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text(d.client_name, 18, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(new Date(d.date).toLocaleDateString("fr-FR"), 130, y);
  y += 6;
  pdf.setFontSize(10);
  const addr = pdf.splitTextToSize(d.client_address, 100);
  pdf.text(addr, 18, y);
  y += addr.length * 5 + 15;

  // Table
  pdf.setFillColor(...BLUE);
  pdf.rect(10, y, 190, 9, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("DESCRIPTION", 14, y + 6);
  pdf.text("MONTANT", 196, y + 6, { align: "right" });
  y += 12;

  pdf.setTextColor(20, 20, 20);
  pdf.setFont("helvetica", "normal");
  pdf.text(d.description, 14, y + 5);
  pdf.text(`${d.amount.toFixed(2)} €`, 196, y + 5, { align: "right" });
  y += 12;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(10, y, 200, y);
  y += 8;

  // Total
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...BLUE);
  pdf.text("TOTAL TTC", 130, y);
  pdf.text(`${d.amount.toFixed(2)} €`, 196, y, { align: "right" });
  y += 15;

  // Status badge
  const isPaid = d.status === "payée" || d.status === "paid";
  pdf.setFillColor(...(isPaid ? ([34, 197, 94] as [number, number, number]) : ORANGE));
  pdf.roundedRect(18, y, 40, 9, 2, 2, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.text(isPaid ? "PAYÉE" : "EN ATTENTE", 38, y + 6, { align: "center" });

  pdf.setFillColor(...BLUE);
  pdf.rect(0, 285, 210, 12, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.text("RamonoPro — Merci de votre confiance", 105, 292, { align: "center" });

  return pdf;
}
