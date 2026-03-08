import { jsPDF } from "jspdf";
import { VehicleType } from "../types";

interface InvoiceData {
  id: string;
  plate: string;
  ownerId?: string;
  vehicleType: VehicleType;
  entryTime: number;
  exitTime: number;
  durationStr: string;
  cost: number;
  paymentMethod: string;
  spotNumber?: string;
  isDisabled?: boolean;
}

export const generateInvoice = (data: InvoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // -- Colors --
  const primaryColor = "#1e293b"; // Slate 800
  const accentColor = "#2563eb"; // Blue 600

  // -- Header --
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");
  
  doc.setTextColor("#ffffff");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Rossember Park", 20, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Fundación Universidad de América", 20, 28);
  doc.text("NIT: 860.024.796-6", pageWidth - 20, 20, { align: "right" });
  doc.text("Ak. 1 #20-53, La Candelaria, Bogotá", pageWidth - 20, 28, { align: "right" });

  // -- Invoice Info --
  doc.setTextColor(primaryColor);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("FACTURA DE VENTA", 20, 60);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`No. Factura: ${data.id.substring(0, 8).toUpperCase()}`, 20, 70);
  doc.text(`Fecha Emisión: ${new Date(data.exitTime).toLocaleString('es-CO')}`, 20, 76);
  doc.text(`Estado: PAGADO (${data.paymentMethod})`, 20, 82);

  // -- Client & Vehicle Details Box --
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(20, 95, pageWidth - 40, 45, 3, 3, "FD");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Información del Cliente y Vehículo", 25, 105);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Column 1
  doc.text("Cédula / ID:", 25, 115);
  doc.setFont("helvetica", "bold");
  doc.text(data.ownerId || "No Registrado", 55, 115);

  doc.setFont("helvetica", "normal");
  doc.text("Placa:", 25, 122);
  doc.setFont("helvetica", "bold");
  doc.text(data.plate, 55, 122);
  
  doc.setFont("helvetica", "normal");
  doc.text("Tipo:", 25, 129);
  doc.text(data.vehicleType, 55, 129);

  // Column 2
  doc.text("Entrada:", 100, 115);
  doc.text(new Date(data.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 130, 115);
  
  doc.text("Salida:", 100, 122);
  doc.text(new Date(data.exitTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 130, 122);

  if (data.spotNumber) {
    doc.text("Puesto:", 160, 115);
    doc.text(data.spotNumber, 180, 115);
  }

  // -- Financial Table --
  let yPos = 160;
  
  // Table Header
  doc.setFillColor(240, 240, 240);
  doc.rect(20, yPos, pageWidth - 40, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Concepto", 25, yPos + 7);
  doc.text("Tiempo", 100, yPos + 7);
  doc.text("Valor", pageWidth - 25, yPos + 7, { align: "right" });
  
  yPos += 18;

  // Item
  doc.setFont("helvetica", "normal");
  doc.text(`Servicio de Parqueadero - ${data.vehicleType}`, 25, yPos);
  doc.text(data.durationStr, 100, yPos);
  
  // Calculate original price roughly for display (reverse engineering the discount if needed)
  let displayPrice = data.cost;
  if (data.isDisabled) {
    displayPrice = data.cost * 2; // Approximate original
  }
  
  doc.text(`$${displayPrice.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
  yPos += 10;

  // Discount Row if applicable
  if (data.isDisabled) {
    doc.setTextColor(22, 163, 74); // Green
    doc.text("Descuento Prioridad / Accesibilidad (50%)", 25, yPos);
    doc.text(`-$${(displayPrice - data.cost).toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });
    doc.setTextColor(primaryColor);
    yPos += 10;
  }

  // Divider
  doc.setDrawColor(0, 0, 0);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 15;

  // Total
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL PAGADO", 120, yPos);
  doc.text(`$${data.cost.toLocaleString()}`, pageWidth - 25, yPos, { align: "right" });

  // -- Footer --
  const footerY = doc.internal.pageSize.height - 30;
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("Gracias por confiar en Rossember Park. Este documento es un soporte de pago electrónico.", pageWidth / 2, footerY, { align: "center" });
  doc.text("Régimen simplificado. No somos grandes contribuyentes.", pageWidth / 2, footerY + 5, { align: "center" });

  // Save
  doc.save(`Factura_${data.plate}_${new Date().getTime()}.pdf`);
};