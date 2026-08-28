import { useEffect } from "react";
import { Layers, ArrowLeft, Printer } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { useQuotationViewDetail } from "../hooks/use-quotes";
import { formatQuotationDate } from "../utils/date";

function getItemAmount(item: any): number {
  if (item.quotation_sub_amount !== undefined && item.quotation_sub_amount !== null && Number(item.quotation_sub_amount) > 0) {
    return Number(item.quotation_sub_amount);
  }
  const qty = Number(item.quotation_sub_quantity) || 0;
  const rate = Number(item.quotation_sub_rate) || 0;
  const size1 = Number(item.quotation_sub_size1) || 0;
  const size2 = Number(item.quotation_sub_size2) || 0;
  const unit = (item.quotation_sub_size_unit || item.orders_sub_size_unit || item.products_size_unit || "").toUpperCase().trim();
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

export function QuotePrintPage({ quoteId }: { quoteId: string }) {
  const { data: quoteData, isLoading } = useQuotationViewDetail(quoteId);

  useEffect(() => {
    if (!quoteData) return;

    const timer = window.setTimeout(async () => {
      await document.fonts?.ready;
      window.requestAnimationFrame(() => window.print());
    }, 650);

    return () => window.clearTimeout(timer);
  }, [quoteData]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-white text-black">
        <Spinner className="size-8 animate-spin text-primary" />
        <p className="text-xs font-bold text-black/60 animate-pulse">
          Preparing document for print...
        </p>
      </div>
    );
  }

  if (!quoteData?.quotation) {
    return (
      <div className="min-h-dvh bg-white p-8 text-center font-bold text-rose-500">
        Quotation details could not be found or retrieved.
      </div>
    );
  }

  const q = quoteData.quotation;
  const items = quoteData.quotationSub || [];
  const totalAmount = calculateTotalQuotationAmount(quoteData);

  return (
    <div className="quote-print-page min-h-dvh w-full bg-white p-6 text-black font-sans print:min-h-0 print:p-0">
      <div className="mx-auto w-full max-w-5xl print:max-w-none">
        
        {/* Navigation / Control Header (Hidden when printing) */}
        <div className="mb-6 flex items-center justify-between border-b border-black/10 pb-4 print:hidden">
          <Button
            variant="outline"
            className="flex items-center gap-1.5 rounded-xl border border-black/20 text-black hover:bg-black/5 font-bold text-xs cursor-pointer"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                window.close();
              }
            }}
          >
            <ArrowLeft className="size-4" /> Back
          </Button>

          <Button
            className="flex items-center gap-1.5 rounded-xl bg-black text-white hover:bg-black/90 font-bold text-xs cursor-pointer"
            onClick={() => window.print()}
          >
            <Printer className="size-4" /> Print again
          </Button>
        </div>

        <div className="mb-6 flex items-start justify-between border-b border-black/20 pb-4">
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-black/60">
              Client / Customer
            </h2>
            <h1 className="mt-0.5 text-lg font-black text-black">{q.full_name}</h1>
          </div>

          <div className="flex gap-10 text-right">
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-black/60">
                Quote Number
              </h2>
              <span className="mt-0.5 block text-sm font-bold text-black">
                #{q.quotation_no}
              </span>
            </div>
            <div>
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-black/60">
                Proposal Date
              </h2>
              <span className="mt-0.5 block text-sm font-bold text-black">
                {formatQuotationDate(q.quotation_date)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1.5 border-b border-black/10 pb-1.5 text-xs font-bold uppercase tracking-wider">
            <Layers className="size-3.5" />
            <span>Proposed Items</span>
          </h3>

          <table className="w-full border-collapse text-left text-[11px] leading-relaxed">
            <thead>
              <tr className="border-b border-black/20 font-bold uppercase tracking-wide text-black/80">
                <th className="px-2 py-2 text-left">Item Details</th>
                <th className="px-2 py-2 text-center">Dimensions</th>
                <th className="px-2 py-2 text-right">Quantity</th>
                <th className="px-2 py-2 text-right">Rate</th>
                <th className="px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => {
                const rate = Number(item.quotation_sub_rate) || 0;
                const amount = getItemAmount(item);
                const size1 = Number(item.quotation_sub_size1) || 0;
                const size2 = Number(item.quotation_sub_size2) || 0;

                return (
                  <tr key={idx} className="border-b border-black/10">
                    <td className="px-2 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-bold">
                          {item.quotation_sub_thickness
                            ? `${item.quotation_sub_thickness}MM - `
                            : ""}
                          {item.product_category || ""} {item.product_sub_category || ""}
                        </span>
                        <span className="mt-0.5 text-[10px] text-black/60">
                          Brand: {item.quotation_sub_brand || "N/A"}
                          {item.quotation_sub_design_no
                            ? ` | Design: ${item.quotation_sub_design_no}`
                            : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {size1 > 0 && size2 > 0
                        ? `${size1} x ${size2}`
                        : size1 > 0
                        ? `${size1} ${item.quotation_sub_size_unit || ""}`
                        : "-"}
                    </td>
                    <td className="px-2 py-2.5 text-right font-medium">
                      {item.quotation_sub_quantity} {item.quotation_sub_unit || "PCS"}
                    </td>
                    <td className="px-2 py-2.5 text-right">Rs. {rate.toFixed(2)}</td>
                    <td className="px-2 py-2.5 text-right font-bold">
                      Rs. {amount.toFixed(2)}
                    </td>
                  </tr>
                );
              })}

              <tr className="border-t border-black/25 font-bold">
                <td className="px-2 py-3">Total Proposal Valuation</td>
                <td colSpan={4} className="px-2 py-3 text-right text-base font-black">
                  Rs. {totalAmount.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {(q.quotation_delivery || q.quotation_shipping || q.quotation_remarks) && (
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-black/10 pt-4 text-[10px] leading-relaxed">
            {q.quotation_delivery && (
              <div className="flex flex-col gap-1 rounded border border-black/15 p-2">
                <span className="font-bold uppercase tracking-wider text-black/75">
                  Delivery Address
                </span>
                <p className="whitespace-pre-wrap">{q.quotation_delivery}</p>
              </div>
            )}

            {q.quotation_shipping && (
              <div className="flex flex-col gap-1 rounded border border-black/15 p-2">
                <span className="font-bold uppercase tracking-wider text-black/75">
                  Billing Address
                </span>
                <p className="whitespace-pre-wrap">{q.quotation_shipping}</p>
              </div>
            )}

            {q.quotation_remarks && (
              <div className="col-span-2 mt-1 flex flex-col gap-0.5 rounded border border-black/10 p-2">
                <span className="font-bold uppercase tracking-wider text-black/75">
                  Remarks
                </span>
                <p className="whitespace-pre-wrap">{q.quotation_remarks}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .quote-print-page,
        .quote-print-page * {
          font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif !important;
        }

        @media print {
          aside,
          nav,
          header,
          button,
          footer,
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

          @page {
            size: auto;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  );
}
