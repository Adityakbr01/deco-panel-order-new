import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuotationViewDetail } from "../hooks/use-quotes";
import {
  ArrowLeft,
  Printer,
  PhoneCall,
  Truck,
  MapPin,
  Layers,
  FileText,
} from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import type { Quotation, QuotationSubItem } from "../types";
import { formatQuotationDate } from "../utils/date";

interface ViewQuotePageProps {
  quoteId: string;
}

function formatPrintDate(date: string) {
  return formatQuotationDate(date);
}

function getPrintSizeUnit(item: {
  quotation_sub_size_unit?: string;
  orders_sub_size_unit?: string;
  product_size_unit?: string;
  products_size_unit?: string;
}) {
  return (
    item.quotation_sub_size_unit ||
    item.orders_sub_size_unit ||
    item.product_size_unit ||
    item.products_size_unit ||
    ""
  );
}

function getItemAmount(item: any): number {
  if (item.quotation_sub_amount !== undefined && item.quotation_sub_amount !== null && Number(item.quotation_sub_amount) > 0) {
    return Number(item.quotation_sub_amount);
  }
  const qty = Number(item.quotation_sub_quantity) || 0;
  const rate = Number(item.quotation_sub_rate) || 0;
  const size1 = Number(item.quotation_sub_size1) || 0;
  const size2 = Number(item.quotation_sub_size2) || 0;
  const unit = (getPrintSizeUnit(item) || "").toUpperCase().trim();
  const isSingleUnit = unit === "METRES" || unit === "METERS" || unit === "MTR" || unit === "KG" || unit === "NOS";

  const rawSum = item.quotation_sub_size_sum || item.products_size_sum || item.size_sum;
  let sizeSum = 1;
  if (isSingleUnit) {
    sizeSum = 1;
  } else if (rawSum !== undefined && rawSum !== null && !isNaN(Number(rawSum)) && Number(rawSum) > 0) {
    sizeSum = Number(rawSum);
  } else if (size1 > 0 && size2 > 0) {
    sizeSum = size1 * size2;
  }

  return qty * sizeSum * rate;
}

function calculateTotalQuotationAmount(quoteData: any): number {
  if (!quoteData) return 0;
  const items = quoteData.quotationSub || [];
  const calculatedSum = items.reduce((sum: number, item: any) => sum + getItemAmount(item), 0);
  if (quoteData.quotationSubSum && Number(quoteData.quotationSubSum) > 0) {
    return Number(quoteData.quotationSubSum);
  }
  return calculatedSum;
}

function escapePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "");
}

function approximateTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.48;
}

function wrapPdfText(text: string, maxWidth: number, fontSize: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;

    if (approximateTextWidth(next, fontSize) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function createPdfBlob(pageStreams: string[]) {
  const pageWidth = 612;
  const pageHeight = 792;
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];
  const pageObjectIds: number[] = [];

  for (const stream of pageStreams) {
    const pageObjectId = objects.length + 1;
    const contentObjectId = pageObjectId + 1;
    pageObjectIds.push(pageObjectId);
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds
    .map((id) => `${id} 0 R`)
    .join(" ")}] /Count ${pageObjectIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function buildQuotationPdf(
  q: Quotation,
  items: QuotationSubItem[],
  totalAmount: number,
) {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 72;
  const contentWidth = 390;
  const contentLeft = (pageWidth - contentWidth) / 2;
  const contentRight = contentLeft + contentWidth;
  const columnX = [
    contentLeft,
    contentLeft + 205,
    contentLeft + 250,
    contentLeft + 300,
    contentLeft + 340,
    contentRight,
  ];
  const pageStreams: string[] = [];
  let commands: string[] = [];
  let y = pageHeight - 132;

  const add = (command: string) => commands.push(command);
  const addText = (
    text: unknown,
    x: number,
    textY: number,
    size = 8,
    font: "F1" | "F2" = "F1",
    align: "left" | "center" | "right" = "left",
  ) => {
    const value = escapePdfText(text);
    const width = approximateTextWidth(value, size);
    const textX =
      align === "center" ? x - width / 2 : align === "right" ? x - width : x;
    add(
      `BT /${font} ${size} Tf 1 0 0 1 ${textX.toFixed(2)} ${textY.toFixed(2)} Tm (${value}) Tj ET`,
    );
  };
  const line = (x1: number, y1: number, x2: number, y2: number) =>
    add(
      `${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
    );
  const rect = (x: number, rectY: number, width: number, height: number) =>
    add(
      `${x.toFixed(2)} ${rectY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`,
    );
  const fillRect = (x: number, rectY: number, width: number, height: number) =>
    add(
      `0.9 0.9 0.9 rg ${x.toFixed(2)} ${rectY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f 0 0 0 rg`,
    );
  const finishPage = () => {
    pageStreams.push(commands.join("\n"));
    commands = [];
  };
  const drawTableHeader = () => {
    const headerHeight = 26;
    fillRect(
      columnX[0],
      y - headerHeight,
      columnX[5] - columnX[0],
      headerHeight,
    );
    rect(columnX[0], y - headerHeight, columnX[5] - columnX[0], headerHeight);
    columnX.slice(1, 5).forEach((x) => line(x, y, x, y - headerHeight));
    addText("Item", columnX[0] + 6, y - 16, 8, "F2");
    addText("Size", columnX[1] + 6, y - 16, 8, "F2");
    addText(
      "Quantity",
      (columnX[2] + columnX[3]) / 2,
      y - 16,
      8,
      "F2",
      "center",
    );
    addText("Rate", columnX[3] + 6, y - 16, 8, "F2");
    addText("Amount", columnX[4] + 6, y - 16, 8, "F2");
    y -= headerHeight;
  };
  const newPage = () => {
    finishPage();
    y = pageHeight - margin;
    add("0.5 w");
    drawTableHeader();
  };

  add("0.5 w");
  addText("Client:", contentLeft, y, 8, "F2");
  addText(q.full_name, contentLeft, y - 14, 8);
  addText("Quote No:", pageWidth / 2, y, 8, "F2", "center");
  addText(q.quotation_no, pageWidth / 2, y - 14, 8, "F1", "center");
  addText("Quote Date:", contentRight, y, 8, "F2", "right");
  addText(
    formatPrintDate(q.quotation_date),
    contentRight,
    y - 14,
    8,
    "F1",
    "right",
  );
  y -= 38;
  line(contentLeft, y, contentRight, y);
  y -= 26;
  drawTableHeader();

  items.forEach((item) => {
    const size1 = Number(item.quotation_sub_size1) || 0;
    const size2 = Number(item.quotation_sub_size2) || 0;
    const rate = Number(item.quotation_sub_rate) || 0;
    const amount = getItemAmount(item);
    const thickness = item.quotation_sub_thickness
      ? `${item.quotation_sub_thickness}${item.quotation_sub_unit || ""}`
      : "";
    const sizeUnit = getPrintSizeUnit(item);
    const sizeLabel =
      size1 > 1 && size2 > 1
        ? `${size1}x${size2}${sizeUnit ? ` ${sizeUnit}` : ""}`
        : sizeUnit;
    const itemLines = [
      ...wrapPdfText(
        `${thickness} ${item.product_category || ""} ${item.product_sub_category || ""}`,
        columnX[1] - columnX[0] - 12,
        8,
      ),
      ...(item.quotation_sub_brand ? [String(item.quotation_sub_brand)] : []),
      ...(item.quotation_sub_design_no
        ? [String(item.quotation_sub_design_no)]
        : []),
    ];
    const rowHeight = Math.max(34, 12 * itemLines.length + 12);

    if (y - rowHeight < margin + 34) {
      newPage();
    }

    rect(columnX[0], y - rowHeight, columnX[5] - columnX[0], rowHeight);
    columnX.slice(1, 5).forEach((x) => line(x, y, x, y - rowHeight));
    itemLines.forEach((lineText, index) => {
      addText(lineText, columnX[0] + 6, y - 13 - index * 11, 8);
    });
    addText(sizeLabel, columnX[1] + 6, y - 19, 8);
    addText(
      item.quotation_sub_quantity,
      (columnX[2] + columnX[3]) / 2,
      y - 19,
      8,
      "F1",
      "center",
    );
    addText(rate.toFixed(2), columnX[3] + 6, y - 19, 8);
    addText(amount.toFixed(2), columnX[4] + 6, y - 19, 8);
    y -= rowHeight;
  });

  const totalRowHeight = 34;
  if (y - totalRowHeight < margin) {
    newPage();
  }
  rect(columnX[0], y - totalRowHeight, columnX[5] - columnX[0], totalRowHeight);
  line(columnX[1], y, columnX[1], y - totalRowHeight);
  line(columnX[2], y, columnX[2], y - totalRowHeight);
  addText("Billing on Address", columnX[0] + 10, y - 20, 8, "F2");
  addText("Total", columnX[1] + 10, y - 20, 8, "F2");
  addText(
    totalAmount.toFixed(2),
    (columnX[2] + columnX[5]) / 2,
    y - 20,
    9,
    "F2",
    "center",
  );
  finishPage();

  return createPdfBlob(pageStreams);
}

function printPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = url;

  iframe.onload = () => {
    window.setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  };

  document.body.appendChild(iframe);

  window.setTimeout(() => {
    iframe.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
}

export function ViewQuotePage({ quoteId }: ViewQuotePageProps) {
  const { trigger } = useWebHaptics();
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  // Dynamic Query Fetching
  const { data: quoteData, isLoading } = useQuotationViewDetail(quoteId);

  const handlePrint = () => {
    if (!quoteData?.quotation) return;

    trigger("medium");

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.print();
    } else {
      printPdfBlob(
        buildQuotationPdf(
          quoteData.quotation,
          quoteData.quotationSub || [],
          calculateTotalQuotationAmount(quoteData),
        ),
      );
    }
  };

  const handleWhatsAppShare = async () => {
    if (!quoteData?.quotation) return;
    trigger("medium");
    setWhatsappLoading(true);

    try {
      const q = quoteData.quotation;
      const message = `Quotation Details:\n\nClient: ${q.full_name || ""}\nQuotation No: ${q.quotation_no || ""}\nDate: ${formatQuotationDate(q.quotation_date)}\nTotal Amount: ₹${calculateTotalQuotationAmount(quoteData).toFixed(2)}\n\nThank you for choosing Deco Panel!`;
      const encodedMessage = encodeURIComponent(message);

      // Determine user agent for device specific link
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (isMobile) {
        if (navigator.share) {
          try {
            await navigator.share({
              title: `Quotation #${q.quotation_no}`,
              text: message,
            });
            setWhatsappLoading(false);
            return;
          } catch (e) {
            console.log(
              "Native share cancelled or failed, falling back to WhatsApp direct link...",
            );
          }
        }
        window.location.href = `whatsapp://send?text=${encodedMessage}`;
      } else {
        window.open(
          `https://web.whatsapp.com/send?text=${encodedMessage}`,
          "_blank",
        );
      }

      toast.success("WhatsApp sharing initiated");
    } catch (err) {
      console.error("WhatsApp share failed:", err);
      toast.error("Could not complete sharing action");
    } finally {
      setWhatsappLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner className="size-8 text-primary animate-spin" />
        <p className="text-xs text-text-muted font-bold animate-pulse">
          Loading proposal details...
        </p>
      </div>
    );
  }

  if (!quoteData || !quoteData.quotation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <span className="text-4xl">❌</span>
        <p className="text-sm font-extrabold text-text">Quotation Not Found</p>
        <Link to="/quotes">
          <Button variant="outline" className="rounded-xl cursor-pointer">
            Back to Quotations
          </Button>
        </Link>
      </div>
    );
  }

  const q = quoteData.quotation;
  const items = quoteData.quotationSub || [];
  const totalAmount = calculateTotalQuotationAmount(quoteData);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-5xl mx-auto pb-24 md:pb-6 animate-fade-in duration-300 print:p-0 print:m-0 print:w-full print:shadow-none print:border-none">
      {/* Header controls (hidden during print) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/40 pb-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link to="/quotes">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-panel border border-border/80 text-text hover:text-primary hover:bg-primary/5 cursor-pointer"
            >
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-text">
              Quotation Details
            </h1>
            <p className="text-xs font-semibold text-text-muted mt-0.5">
              Review, print or share proposal for Quote #{q.quotation_no}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            className="cursor-pointer text-xs font-bold gap-1.5 rounded-xl shrink-0"
            onClick={handlePrint}
          >
            <Printer className="size-4" /> Print Quotation
          </Button>

          <Button
            onClick={handleWhatsAppShare}
            className="cursor-pointer text-xs font-bold gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            disabled={whatsappLoading}
          >
            <PhoneCall className="size-4" />
            {whatsappLoading ? "Sharing..." : "WhatsApp Share"}
          </Button>
        </div>
      </div>

      {/* Main Invoice Card */}
      <Card className="quotation-screen-only bg-panel border border-border/80 shadow-md rounded-2xl overflow-hidden pt-0">
        <CardContent className="p-6 md:p-8 flex flex-col gap-8 print:p-0">
          {/* Top header stats */}
          <div className="flex flex-col md:flex-row justify-between gap-6 border-b border-border/40 pb-6 print:flex-row print:justify-between print:gap-4 print:pb-4 print:border-black/25">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider print:text-black">
                Client / Customer
              </span>
              <h2 className="text-lg font-black text-text print:text-black">
                {q.full_name}
              </h2>
            </div>

            <div className="grid grid-cols-2 md:flex md:items-center gap-6 md:gap-12 print:flex print:flex-row print:gap-12">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider text-right print:text-left print:text-black">
                  Quote Number
                </span>
                <span className="text-sm font-bold text-text text-right print:text-left print:text-black">
                  #{q.quotation_no}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider text-right print:text-left print:text-black">
                  Proposal Date
                </span>
                <span className="text-sm font-bold text-text text-right print:text-left print:text-black">
                  {formatQuotationDate(q.quotation_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-text flex items-center gap-1.5 uppercase tracking-wide border-b border-border/30 pb-2 print:text-black print:border-black/15">
              <Layers className="size-4 text-primary print:hidden" />
              <span>Proposed Items</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm print:text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] font-bold text-text-muted uppercase tracking-wider print:text-black print:border-black/20">
                    <th className="py-2.5 px-3">Item Details</th>
                    <th className="py-2.5 px-3 text-center">Dimensions</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const rate = Number(item.quotation_sub_rate) || 0;
                    const amount = getItemAmount(item);
                    const size1 = Number(item.quotation_sub_size1) || 0;
                    const size2 = Number(item.quotation_sub_size2) || 0;
                    const sizeUnit = item.quotation_sub_size_unit || "";
                    const sizeLabel =
                      size1 > 1 && size2 > 1
                        ? `${size1} x ${size2}${sizeUnit ? ` ${sizeUnit}` : ""}`
                        : sizeUnit || "-";

                    return (
                      <tr
                        key={idx}
                        className="border-b border-border/40 hover:bg-muted/10 print:border-black/10"
                      >
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-text print:text-black">
                              {item.quotation_sub_thickness
                                ? `${item.quotation_sub_thickness}${item.quotation_sub_unit || ""} — `
                                : ""}
                              {item.product_category || ""}{" "}
                              {item.product_sub_category || ""}
                            </span>
                            <span className="text-xs text-text-muted print:text-black mt-0.5">
                              {item.quotation_sub_brand || "N/A"}{" "}
                              {item.quotation_sub_design_no
                                ? `| Design: ${item.quotation_sub_design_no}`
                                : ""}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-text print:text-black">
                          {sizeLabel}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-text print:text-black">
                          {item.quotation_sub_quantity}
                          {/* {item.quotation_sub_unit || "PCS"} */}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-text print:text-black">
                          ₹{rate.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-text print:text-black">
                          ₹{amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals row */}
                  <tr className="border-t-2 border-border/60 bg-muted/20 font-bold print:border-black/30 print:bg-transparent">
                    <td className="py-3.5 px-3 print:text-black">
                      Subtotal / Proposal Valuation
                    </td>
                    <td
                      colSpan={4}
                      className="py-3.5 px-3 text-right text-lg text-primary print:text-black font-black"
                    >
                      ₹{totalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery & Shipping Info panels */}
          {(q.quotation_delivery ||
            q.quotation_shipping ||
            q.quotation_remarks) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 border-t border-border/30 pt-6 print:grid-cols-2 print:gap-4 print:border-black/15">
              {q.quotation_delivery && (
                <div className="flex flex-col gap-2 bg-muted/15 border border-border/60 p-4 rounded-xl print:bg-transparent print:border-black/20 print:p-2.5">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 print:text-black">
                    <Truck className="size-3.5 text-primary print:hidden" />
                    Delivery Address
                  </span>
                  <p className="text-xs font-semibold text-text leading-relaxed whitespace-pre-wrap print:text-black">
                    {q.quotation_delivery}
                  </p>
                </div>
              )}

              {q.quotation_shipping && (
                <div className="flex flex-col gap-2 bg-muted/15 border border-border/60 p-4 rounded-xl print:bg-transparent print:border-black/20 print:p-2.5">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 print:text-black">
                    <MapPin className="size-3.5 text-primary print:hidden" />
                    Billing Address
                  </span>
                  <p className="text-xs font-semibold text-text leading-relaxed whitespace-pre-wrap print:text-black">
                    {q.quotation_shipping}
                  </p>
                </div>
              )}

              {q.quotation_remarks && (
                <div className="md:col-span-2 flex flex-col gap-1.5 bg-primary/[0.02] border border-primary/10 p-4 rounded-xl print:border-black/10 print:p-2.5 print:bg-transparent">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 print:text-black">
                    <FileText className="size-3.5 print:hidden" />
                    Quotation Remarks
                  </span>
                  <p className="text-xs font-semibold text-text leading-relaxed whitespace-pre-wrap print:text-black">
                    {q.quotation_remarks}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="quotation-print-only print-container hidden bg-white text-black">
        <div className="grid grid-cols-3 gap-4 mb-6 border-b border-black pb-4">
          <div>
            <p className="font-semibold text-black">Client:</p>
            <p className="text-black">{q.full_name}</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-black">Quote No:</p>
            <p className="text-black">{q.quotation_no}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-black">Quote Date:</p>
            <p className="text-black">{formatPrintDate(q.quotation_date)}</p>
          </div>
        </div>

        <div className="mt-4">
          <table className="min-w-full table-auto border border-black">
            <thead className="bg-gray-200">
              <tr>
                <th className="text-left p-2 border border-black">Item</th>
                <th className="text-left p-2 border border-black">Size</th>
                <th className="text-center p-2 border border-black">
                  Quantity
                </th>
                <th className="text-left p-2 border border-black">Rate</th>
                <th className="text-left p-2 border border-black">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const size1 = Number(item.quotation_sub_size1) || 0;
                const size2 = Number(item.quotation_sub_size2) || 0;
                const rate = Number(item.quotation_sub_rate) || 0;
                const amount = getItemAmount(item);
                const thickness = item.quotation_sub_thickness
                  ? `${item.quotation_sub_thickness}${item.quotation_sub_unit || ""}`
                  : "";
                const sizeUnit = item.quotation_sub_size_unit || "";
                const sizeLabel =
                  size1 > 1 && size2 > 1
                    ? `${size1}x${size2}${sizeUnit ? ` ${sizeUnit}` : ""}`
                    : sizeUnit;

                return (
                  <tr key={index}>
                    <td className="p-2 border border-black">
                      {thickness} {item.product_category}{" "}
                      {item.product_sub_category}
                      <p className="text-sm text-black">
                        {item.quotation_sub_brand}
                        <br />
                        {item.quotation_sub_design_no}
                      </p>
                    </td>
                    <td className="p-2 border border-black">{sizeLabel}</td>
                    <td className="p-2 border border-black text-center">
                      {item.quotation_sub_quantity}
                    </td>
                    <td className="p-2 border border-black">
                      {rate.toFixed(2)}
                    </td>
                    <td className="p-2 border border-black">
                      {amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="p-4 border border-black font-semibold">
                  Billing on Address
                </td>
                <td className="p-2 border border-black font-bold">Total</td>
                <td
                  className="p-2 border border-black font-semibold text-center"
                  colSpan={3}
                >
                  {totalAmount.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {(q.quotation_shipping || q.quotation_delivery) && (
          <div className="mt-4 flex flex-row gap-4">
            <div className="h-20 border border-black bg-white w-1/2">
              <div className="w-full h-full p-2 text-sm text-black whitespace-pre-wrap">
                {q.quotation_delivery || ""}
              </div>
            </div>

            <div className="h-20 border border-black bg-white w-1/2">
              <div className="w-full h-full p-2 text-sm text-black whitespace-pre-wrap">
                {q.quotation_shipping || ""}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page {
            size: A5;
            margin: 0;
          }

          aside,
          nav,
          header,
          footer,
          button,
          .quotation-screen-only,
          .print-hidden {
            display: none !important;
          }

          html,
          body,
          #root {
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }

          .quotation-print-only {
            display: block !important;
            padding: 10mm !important;
          }

          .print-container {
            font-size: 12px;
            color: black;
          }

          .print-container p {
            margin: 0;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          table,
          th,
          td {
            border: 1px solid black;
          }

          th,
          td {
            padding: 8px;
            text-align: left;
          }

          thead {
            background-color: #f0f0f0;
          }

          tbody tr:nth-child(even),
          tbody tr:nth-child(odd) {
            background-color: white;
          }
        }
      `}</style>
    </div>
  );
}
