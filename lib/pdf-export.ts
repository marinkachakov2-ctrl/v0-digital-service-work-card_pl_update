"use client";

import { jsPDF } from "jspdf";

// Types for job card data
export interface PDFJobCardData {
  // Header
  orderNumber: string;
  jobCardNumber: string;
  jobType: "warranty" | "repair" | "internal";
  date: string;
  
  // Technicians
  technicians: string[];
  leadTechnician?: string;
  
  // Machine/Client
  machineOwner: string;
  billingEntity: string;
  location: string;
  machineModel: string;
  serialNo: string;
  engineSN: string;
  engineHours: string;
  previousEngineHours?: number | null;
  
  // Diagnostics
  reasonCode: string;
  defectCode: string;
  description: string;
  faultDate: string;
  repairStart: string;
  repairEnd: string;
  
  // Parts
  parts: Array<{
    partNo: string;
    description: string;
    qty: number;
    price: number;
  }>;
  
  // Labor
  laborItems: Array<{
    operationName: string;
    techCount: number;
    price: number;
    notes: string;
  }>;
  
  // Totals
  partsTotal: number;
  laborTotal: number;
  vat: number;
  grandTotal: number;
  
  // Photos
  photoUrls: string[];
  engineHoursPhotoUrl?: string | null;
  
  // Signatures
  customerSignature?: string | null;
  customerName?: string;
  technicianSignature?: string | null;
  technicianName?: string;
  
  // Timer
  totalWorkTime?: string;
}

// Megatron brand colors
const COLORS = {
  primary: [30, 64, 175] as [number, number, number], // Blue
  secondary: [100, 116, 139] as [number, number, number], // Slate
  success: [16, 185, 129] as [number, number, number], // Emerald
  warning: [245, 158, 11] as [number, number, number], // Amber
  dark: [15, 23, 42] as [number, number, number], // Slate-900
  text: [30, 41, 59] as [number, number, number], // Slate-800
  muted: [100, 116, 139] as [number, number, number], // Slate-500
  border: [226, 232, 240] as [number, number, number], // Slate-200
  white: [255, 255, 255] as [number, number, number],
};

/**
 * Generate a professional PDF service report for a Job Card
 */
export async function generateJobCardPDF(data: PDFJobCardData): Promise<void> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper functions
  const drawLine = (yPos: number, color = COLORS.border) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
  };

  const checkPageBreak = (neededSpace: number): number => {
    if (y + neededSpace > pageHeight - 20) {
      doc.addPage();
      y = margin;
    }
    return y;
  };

  // =====================
  // HEADER - Megatron Logo & Company Info
  // =====================
  
  // Blue header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, "F");
  
  // Company name
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("MEGATRON EAD", margin, 15);
  
  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Agricultural & Industrial Equipment Service", margin, 22);
  doc.text("ISO 9001:2015 Certified", margin, 28);
  
  // Document type badge
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(pageWidth - margin - 60, 8, 55, 20, 3, 3, "F");
  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("SERVICE REPORT", pageWidth - margin - 55, 18);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Digital Job Card", pageWidth - margin - 55, 24);

  y = 45;

  // =====================
  // DOCUMENT INFO BAR
  // =====================
  
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(margin, y, contentWidth, 18, "F");
  doc.setDrawColor(...COLORS.border);
  doc.rect(margin, y, contentWidth, 18, "S");
  
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  
  const colWidth = contentWidth / 4;
  
  // Order Number
  doc.text("Order No:", margin + 3, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(data.orderNumber || "Pending", margin + 3, y + 12);
  
  // Job Card Number
  doc.setFont("helvetica", "bold");
  doc.text("Job Card:", margin + colWidth + 3, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(data.jobCardNumber || "-", margin + colWidth + 3, y + 12);
  
  // Job Type
  doc.setFont("helvetica", "bold");
  doc.text("Type:", margin + colWidth * 2 + 3, y + 6);
  doc.setFont("helvetica", "normal");
  const typeLabels = { warranty: "Warranty", repair: "Repair", internal: "Internal" };
  doc.text(typeLabels[data.jobType] || "Repair", margin + colWidth * 2 + 3, y + 12);
  
  // Date
  doc.setFont("helvetica", "bold");
  doc.text("Date:", margin + colWidth * 3 + 3, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(data.date || new Date().toLocaleDateString("bg-BG"), margin + colWidth * 3 + 3, y + 12);

  y += 25;

  // =====================
  // MACHINE DATA GRID
  // =====================
  
  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("MACHINE & CLIENT INFORMATION", margin, y);
  y += 6;
  drawLine(y, COLORS.primary);
  y += 5;

  // Machine info grid
  const gridData = [
    ["Machine Owner", data.machineOwner || "-", "Machine Model", data.machineModel || "-"],
    ["Billing Entity", data.billingEntity || "-", "Serial No.", data.serialNo || "-"],
    ["Location", data.location || "-", "Engine S/N", data.engineSN || "-"],
    ["Engine Hours", data.engineHours || "-", "Previous Hours", data.previousEngineHours?.toString() || "-"],
  ];

  doc.setFontSize(8);
  const cellHeight = 8;
  const labelWidth = 30;
  const valueWidth = (contentWidth - labelWidth * 2) / 2;

  gridData.forEach((row) => {
    // First pair
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(row[0] + ":", margin, y);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.text(row[1], margin + labelWidth, y);
    
    // Second pair
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(row[2] + ":", margin + labelWidth + valueWidth + 5, y);
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.text(row[3], margin + labelWidth * 2 + valueWidth + 5, y);
    
    y += cellHeight;
  });

  y += 5;

  // =====================
  // TECHNICIANS
  // =====================
  
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Assigned Technicians:", margin, y);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  const techList = data.technicians.filter(t => t).join(", ") || "Not assigned";
  doc.text(techList, margin + 35, y);
  
  if (data.leadTechnician) {
    doc.text("(Lead: " + data.leadTechnician + ")", margin + 35 + doc.getTextWidth(techList) + 5, y);
  }
  
  if (data.totalWorkTime) {
    doc.setTextColor(...COLORS.muted);
    doc.text("Total Work Time:", pageWidth - margin - 50, y);
    doc.setTextColor(...COLORS.success);
    doc.setFont("helvetica", "bold");
    doc.text(data.totalWorkTime, pageWidth - margin - 20, y);
  }

  y += 10;

  // =====================
  // FAILURE DESCRIPTION (Large section)
  // =====================
  
  checkPageBreak(60);
  
  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FAILURE DIAGNOSIS & REPAIR DETAILS", margin, y);
  y += 6;
  drawLine(y, COLORS.primary);
  y += 5;

  // Diagnosis codes
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.text("Reason Code:", margin, y);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.text(data.reasonCode || "-", margin + 25, y);
  
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.text("Defect Code:", margin + 60, y);
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.text(data.defectCode || "-", margin + 85, y);
  
  y += 8;

  // Date/Time info
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.text("Fault Date:", margin, y);
  doc.setTextColor(...COLORS.text);
  doc.text(data.faultDate || "-", margin + 22, y);
  
  doc.setTextColor(...COLORS.muted);
  doc.text("Repair Start:", margin + 50, y);
  doc.setTextColor(...COLORS.text);
  doc.text(data.repairStart || "-", margin + 72, y);
  
  doc.setTextColor(...COLORS.muted);
  doc.text("Repair End:", margin + 105, y);
  doc.setTextColor(...COLORS.text);
  doc.text(data.repairEnd || "-", margin + 125, y);

  y += 8;

  // Description box
  doc.setFillColor(248, 250, 252);
  const descriptionHeight = Math.max(25, Math.min(50, (data.description?.length || 0) / 3));
  doc.roundedRect(margin, y, contentWidth, descriptionHeight, 2, 2, "F");
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(margin, y, contentWidth, descriptionHeight, 2, 2, "S");
  
  doc.setTextColor(...COLORS.text);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  // Word wrap description
  const descLines = doc.splitTextToSize(data.description || "No description provided.", contentWidth - 6);
  doc.text(descLines, margin + 3, y + 5);

  y += descriptionHeight + 8;

  // =====================
  // PARTS TABLE
  // =====================
  
  if (data.parts.length > 0) {
    checkPageBreak(40);
    
    doc.setTextColor(...COLORS.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PARTS USED", margin, y);
    y += 6;
    drawLine(y, COLORS.primary);
    y += 5;

    // Table header
    doc.setFillColor(...COLORS.dark);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    
    doc.text("Part No.", margin + 2, y + 5);
    doc.text("Description", margin + 35, y + 5);
    doc.text("Qty", margin + 120, y + 5);
    doc.text("Price", margin + 135, y + 5);
    doc.text("Total", margin + 155, y + 5);
    
    y += 7;

    // Table rows
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "normal");
    
    data.parts.forEach((part, index) => {
      checkPageBreak(8);
      
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6, "F");
      }
      
      doc.text(part.partNo || "-", margin + 2, y + 4);
      doc.text((part.description || "-").substring(0, 40), margin + 35, y + 4);
      doc.text(part.qty.toString(), margin + 120, y + 4);
      doc.text(part.price.toFixed(2), margin + 135, y + 4);
      doc.text((part.qty * part.price).toFixed(2), margin + 155, y + 4);
      
      y += 6;
    });

    // Parts subtotal
    doc.setFont("helvetica", "bold");
    doc.text("Parts Subtotal:", margin + 120, y + 4);
    doc.text(data.partsTotal.toFixed(2) + " lv.", margin + 155, y + 4);
    y += 10;
  }

  // =====================
  // LABOR TABLE
  // =====================
  
  if (data.laborItems.length > 0) {
    checkPageBreak(40);
    
    doc.setTextColor(...COLORS.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("LABOR / SERVICES", margin, y);
    y += 6;
    drawLine(y, COLORS.primary);
    y += 5;

    // Table header
    doc.setFillColor(...COLORS.dark);
    doc.rect(margin, y, contentWidth, 7, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    
    doc.text("Operation", margin + 2, y + 5);
    doc.text("Techs", margin + 100, y + 5);
    doc.text("Price", margin + 120, y + 5);
    doc.text("Notes", margin + 145, y + 5);
    
    y += 7;

    // Table rows
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "normal");
    
    data.laborItems.forEach((item, index) => {
      checkPageBreak(8);
      
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 6, "F");
      }
      
      doc.text((item.operationName || "-").substring(0, 50), margin + 2, y + 4);
      doc.text(item.techCount.toString(), margin + 100, y + 4);
      doc.text(item.price.toFixed(2), margin + 120, y + 4);
      doc.text((item.notes || "-").substring(0, 20), margin + 145, y + 4);
      
      y += 6;
    });

    // Labor subtotal
    doc.setFont("helvetica", "bold");
    doc.text("Labor Subtotal:", margin + 100, y + 4);
    doc.text(data.laborTotal.toFixed(2) + " lv.", margin + 145, y + 4);
    y += 10;
  }

  // =====================
  // TOTALS BOX
  // =====================
  
  checkPageBreak(30);
  
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(pageWidth - margin - 70, y, 70, 28, 2, 2, "F");
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(pageWidth - margin - 70, y, 70, 28, 2, 2, "S");
  
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Subtotal:", pageWidth - margin - 65, y + 6);
  doc.text("VAT (20%):", pageWidth - margin - 65, y + 12);
  
  doc.setTextColor(...COLORS.text);
  doc.text((data.partsTotal + data.laborTotal).toFixed(2) + " lv.", pageWidth - margin - 20, y + 6);
  doc.text(data.vat.toFixed(2) + " lv.", pageWidth - margin - 20, y + 12);
  
  drawLine(y + 16, COLORS.border);
  
  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("GRAND TOTAL:", pageWidth - margin - 65, y + 24);
  doc.text(data.grandTotal.toFixed(2) + " lv.", pageWidth - margin - 20, y + 24);

  y += 40;

  // =====================
  // PHOTO GALLERY
  // =====================
  
  const allPhotos = [...(data.photoUrls || [])];
  if (data.engineHoursPhotoUrl) {
    allPhotos.push(data.engineHoursPhotoUrl);
  }

  if (allPhotos.length > 0) {
    checkPageBreak(50);
    
    doc.setTextColor(...COLORS.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PHOTO DOCUMENTATION", margin, y);
    y += 6;
    drawLine(y, COLORS.primary);
    y += 8;

    // Load and add images
    const photoSize = 40;
    const photosPerRow = 4;
    const photoSpacing = (contentWidth - photoSize * photosPerRow) / (photosPerRow - 1);

    for (let i = 0; i < allPhotos.length; i++) {
      const col = i % photosPerRow;
      const row = Math.floor(i / photosPerRow);
      
      if (col === 0 && row > 0) {
        y += photoSize + 8;
        checkPageBreak(photoSize + 10);
      }

      const x = margin + col * (photoSize + photoSpacing);
      
      // Draw placeholder box for photos
      doc.setFillColor(240, 240, 240);
      doc.roundedRect(x, y, photoSize, photoSize, 2, 2, "F");
      doc.setDrawColor(...COLORS.border);
      doc.roundedRect(x, y, photoSize, photoSize, 2, 2, "S");
      
      // Try to add the actual image
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = allPhotos[i];
        
        // Note: In a real implementation, you'd need to await image loading
        // For now, we'll show a placeholder with the URL
        doc.setTextColor(...COLORS.muted);
        doc.setFontSize(6);
        const label = i === allPhotos.length - 1 && data.engineHoursPhotoUrl ? "Engine Hours" : `Photo ${i + 1}`;
        doc.text(label, x + 2, y + photoSize - 2);
      } catch {
        // Fallback to placeholder
      }
    }

    y += photoSize + 15;
  }

  // =====================
  // SIGNATURES SECTION
  // =====================
  
  checkPageBreak(50);
  
  doc.setTextColor(...COLORS.primary);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SIGNATURES & AUTHORIZATION", margin, y);
  y += 6;
  drawLine(y, COLORS.primary);
  y += 10;

  const sigWidth = (contentWidth - 20) / 2;

  // Customer signature box
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(margin, y, sigWidth, 35, 2, 2, "S");
  
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Customer Signature", margin + 3, y + 5);
  
  if (data.customerSignature) {
    try {
      doc.addImage(data.customerSignature, "PNG", margin + 5, y + 8, sigWidth - 10, 18);
    } catch {
      // Signature couldn't be added
    }
  }
  
  if (data.customerName) {
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.text(data.customerName, margin + 3, y + 32);
  }

  // Technician signature box
  doc.setDrawColor(...COLORS.border);
  doc.roundedRect(margin + sigWidth + 20, y, sigWidth, 35, 2, 2, "S");
  
  doc.setTextColor(...COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.text("Technician Signature", margin + sigWidth + 23, y + 5);
  
  if (data.technicianSignature) {
    try {
      doc.addImage(data.technicianSignature, "PNG", margin + sigWidth + 25, y + 8, sigWidth - 10, 18);
    } catch {
      // Signature couldn't be added
    }
  }
  
  if (data.technicianName) {
    doc.setTextColor(...COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.text(data.technicianName, margin + sigWidth + 23, y + 32);
  }

  y += 45;

  // =====================
  // FOOTER
  // =====================
  
  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Footer line
    doc.setDrawColor(...COLORS.border);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Footer text
    doc.setTextColor(...COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Megatron EAD | Agricultural & Industrial Equipment Service | Tel: +359 2 XXX XXXX | service@megatron.bg", margin, pageHeight - 10);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
    
    // Generated timestamp
    doc.text(`Generated: ${new Date().toLocaleString("bg-BG")}`, pageWidth - margin - 60, pageHeight - 6);
  }

  // Save the PDF
  const filename = `JobCard_${data.jobCardNumber || "DRAFT"}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
