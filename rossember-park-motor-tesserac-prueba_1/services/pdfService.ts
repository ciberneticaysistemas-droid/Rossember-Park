import { jsPDF } from "jspdf";
import { VehicleType, ParkingRecord } from "../types";

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

const PRIMARY_COLOR = "#1e293b"; // Slate 800
const ACCENT_COLOR = "#2563eb"; // Blue 600

// Helper to draw header
const drawHeader = (doc: jsPDF, pageWidth: number) => {
  doc.setFillColor(PRIMARY_COLOR);
  doc.rect(0, 0, pageWidth, 40, "F");

  doc.setTextColor("#ffffff");
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Rossember Parking", 20, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Fundación Universidad de América", 20, 28);
  doc.text("NIT: 860.024.796-6", pageWidth - 20, 20, { align: "right" });
  doc.text("Ak. 1 #20-53, La Candelaria, Bogotá", pageWidth - 20, 28, { align: "right" });
};

export const generateInvoice = (data: InvoiceData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  drawHeader(doc, pageWidth);

  // -- Invoice Info --
  doc.setTextColor(PRIMARY_COLOR);
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
  doc.text(new Date(data.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 130, 115);

  doc.text("Salida:", 100, 122);
  doc.text(new Date(data.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 130, 122);

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
    doc.setTextColor(PRIMARY_COLOR);
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
  doc.text("Gracias por confiar en Rossember Parking. Este documento es un soporte de pago electrónico.", pageWidth / 2, footerY, { align: "center" });
  doc.text("Régimen simplificado. No somos grandes contribuyentes.", pageWidth / 2, footerY + 5, { align: "center" });

  // Save
  doc.save(`Factura_${data.plate}_${new Date().getTime()}.pdf`);
};

export const generateDailyReport = (records: ParkingRecord[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // 1. Filter Records for TODAY (Completed)
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).getTime();

  const dailyRecords = records.filter(r =>
    r.status === 'COMPLETED' &&
    r.exitTime &&
    r.exitTime >= startOfDay &&
    r.exitTime <= endOfDay
  );

  // 2. Calculate Stats
  let totalRevenue = 0;
  let revenueCar = 0;
  let revenueMoto = 0;
  let countCar = 0;
  let countMoto = 0;

  dailyRecords.forEach(r => {
    const cost = r.cost || 0;
    totalRevenue += cost;
    if (r.vehicleType === VehicleType.CAR) {
      revenueCar += cost;
      countCar++;
    } else {
      revenueMoto += cost;
      countMoto++;
    }
  });

  drawHeader(doc, pageWidth);

  // -- Title --
  doc.setTextColor(PRIMARY_COLOR);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("INFORME DIARIO DE GANANCIAS", 20, 60);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha de Cierre: ${today.toLocaleDateString('es-CO')}`, 20, 68);
  doc.text(`Generado: ${today.toLocaleTimeString('es-CO')}`, 20, 74);

  // -- Summary Cards (Visual Representation) --

  // Total Box
  doc.setFillColor(240, 253, 244); // Green 50
  doc.setDrawColor(22, 163, 74); // Green 600
  doc.roundedRect(20, 85, 50, 25, 3, 3, "FD");
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(9);
  doc.text("Total Recaudado", 25, 92);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`$${totalRevenue.toLocaleString()}`, 25, 102);

  // Cars Box
  doc.setFillColor(239, 246, 255); // Blue 50
  doc.setDrawColor(37, 99, 235); // Blue 600
  doc.roundedRect(80, 85, 50, 25, 3, 3, "FD");
  doc.setTextColor(37, 99, 235);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Autos (${countCar})`, 85, 92);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`$${revenueCar.toLocaleString()}`, 85, 102);

  // Motos Box
  doc.setFillColor(255, 247, 237); // Orange 50
  doc.setDrawColor(234, 88, 12); // Orange 600
  doc.roundedRect(140, 85, 50, 25, 3, 3, "FD");
  doc.setTextColor(234, 88, 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Motos (${countMoto})`, 145, 92);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`$${revenueMoto.toLocaleString()}`, 145, 102);


  // -- Transaction List Table --
  doc.setTextColor(PRIMARY_COLOR);
  let yPos = 130;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Detalle de Transacciones (Hoy)", 20, 125);

  // Table Headers
  doc.setFillColor(230, 230, 230);
  doc.rect(20, yPos, pageWidth - 40, 8, "F");
  doc.setFontSize(8);
  doc.text("Hora Salida", 22, yPos + 5);
  doc.text("Placa", 50, yPos + 5);
  doc.text("Tipo", 80, yPos + 5);
  doc.text("Pago", 110, yPos + 5);
  doc.text("Puesto", 150, yPos + 5);
  doc.text("Valor", pageWidth - 22, yPos + 5, { align: "right" });

  yPos += 14;
  doc.setFont("helvetica", "normal");

  dailyRecords.forEach((r, index) => {
    // Page break check
    if (yPos > doc.internal.pageSize.height - 20) {
      doc.addPage();
      yPos = 20;
    }

    const timeStr = new Date(r.exitTime!).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    doc.text(timeStr, 22, yPos);
    doc.text(r.plate, 50, yPos);
    doc.text(r.vehicleType, 80, yPos);
    doc.text(r.paymentMethod || "PSE", 110, yPos);
    doc.text(r.spotNumber || "-", 150, yPos);
    doc.text(`$${(r.cost || 0).toLocaleString()}`, pageWidth - 22, yPos, { align: "right" });

    // Light line
    doc.setDrawColor(240, 240, 240);
    doc.line(20, yPos + 2, pageWidth - 20, yPos + 2);

    yPos += 8;
  });

  if (dailyRecords.length === 0) {
    doc.text("No se han registrado salidas el día de hoy.", 20, yPos);
  }

  // Footer
  const footerY = doc.internal.pageSize.height - 15;
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Informe generado automáticamente por el sistema Rossember Parking.", pageWidth / 2, footerY, { align: "center" });

  doc.save(`Reporte_Diario_${today.toISOString().split('T')[0]}.pdf`);
};