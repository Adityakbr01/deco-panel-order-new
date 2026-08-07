import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsersList, useProductsList } from "@/modules/orders/hooks/use-create-order";
import { useQuotationDetail, useUpdateQuotationMutation } from "../hooks/use-quotes";
import SelectProductDialog from "@/modules/orders/components/SelectProductDialog";
import { OrderProduct } from "@/modules/orders/types";
import { ArrowLeft, User, Calendar, Plus, Trash2, Edit3, Settings } from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";
import { formatQuotationDate } from "../utils/date";

interface EditQuotePageProps {
  quoteId: string;
}

function normalizeQuotationStatus(status: unknown): string {
  if (!status) return "Quotation";
  const str = String(status).trim();
  if (str.toUpperCase().includes("CANCEL")) return "Cancel";
  return "Quotation";
}

export function EditQuotePage({ quoteId }: EditQuotePageProps) {
  const navigate = useNavigate();
  const { trigger } = useWebHaptics();

  // Queries
  const { data: quoteData, isLoading: isLoadingQuote } = useQuotationDetail(quoteId);
  const { data: users = [], isLoading: isLoadingUsers } = useUsersList();
  const { data: products = [], isLoading: isLoadingProducts } = useProductsList();

  // Mutations
  const updateMutation = useUpdateQuotationMutation();

  // Form State
  const [quotation, setQuotation] = useState({
    order_user_id: "",
    quotation_date: "",
    quotation_status: "Quotation",
    quotation_count: 0,
    quotation_remarks: "",
    quotation_delivery: "",
    quotation_shipping: "",
  });

  const [items, setItems] = useState<Array<{
    quotation_sub_product_id: string | number;
    quotation_sub_quantity: string | number;
    quotation_sub_rate: string | number;
    quotation_sub_design_no: string;
    id?: number | string;
  }>>([
    {
      quotation_sub_product_id: "",
      quotation_sub_quantity: "",
      quotation_sub_rate: "",
      quotation_sub_design_no: "",
    },
  ]);

  // Dialog State
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // Sync state when quoteData loads (only once on initial load per quoteId)
  const hasLoadedRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (quoteData && hasLoadedRef.current !== quoteId) {
      hasLoadedRef.current = quoteId;

      const qObj = Array.isArray(quoteData?.quotation)
        ? quoteData.quotation[0]
        : quoteData?.quotation || (quoteData as any)?.data?.quotation || (Array.isArray(quoteData) ? quoteData[0] : quoteData);

      const rawStatus =
        qObj?.quotation_status ??
        qObj?.status ??
        qObj?.orders_status ??
        (quoteData as any)?.quotation_status;

      const statusVal = normalizeQuotationStatus(rawStatus);

      setQuotation({
        order_user_id: String(qObj?.order_user_id || qObj?.orders_user_id || ""),
        quotation_date: qObj?.quotation_date || "",
        quotation_status: statusVal,
        quotation_count: qObj?.quotation_count || 0,
        quotation_remarks: qObj?.quotation_remarks || "",
        quotation_delivery: qObj?.quotation_delivery || "",
        quotation_shipping: qObj?.quotation_shipping || "",
      });

      const subItems = quoteData.quotationSub || (quoteData as any)?.data?.quotationSub || [];
      if (subItems && subItems.length > 0) {
        const formattedSub = subItems.map((sub: any) => {
          const prodCode = sub.quotation_sub_product_code;
          const rawId = sub.quotation_sub_product_id || sub.orders_sub_product_id || sub.product_id || sub.products_id || "";

          const matchingProd = products.find(
            (p) => (prodCode && p.products_code === prodCode) || String(p.id) === String(rawId)
          );

          const realProdId = matchingProd ? String(matchingProd.id) : String(rawId);
          const qty = String(sub.quotation_sub_quantity || sub.orders_sub_quantity || sub.quantity || "");
          const rate = String(sub.quotation_sub_rate || sub.orders_sub_rate || sub.rate || "");
          const design = String(sub.quotation_sub_design_no || sub.orders_sub_design_no || sub.design_no || "");

          return {
            id: sub.id ? String(sub.id) : undefined,
            rawSub: sub,
            selectedProduct: matchingProd,
            quotation_sub_product_id: realProdId,
            orders_sub_product_id: realProdId,
            product_id: realProdId,
            quotation_sub_quantity: qty,
            orders_sub_quantity: qty,
            quotation_sub_rate: rate,
            orders_sub_rate: rate,
            quotation_sub_design_no: design,
            orders_sub_design_no: design,
            quotation_sub_thickness: sub.quotation_sub_thickness || matchingProd?.products_thickness || "",
            quotation_sub_size1: sub.quotation_sub_size1 || matchingProd?.products_size1 || "",
            quotation_sub_size2: sub.quotation_sub_size2 || matchingProd?.products_size2 || "",
            quotation_sub_size_unit: sub.quotation_sub_size_unit || matchingProd?.products_size_unit || "",
            quotation_sub_brand: sub.quotation_sub_brand || matchingProd?.products_brand || "",
            product_category: sub.product_category || matchingProd?.product_category || "",
            product_sub_category: sub.product_sub_category || matchingProd?.product_sub_category || "",
          };
        });
        setItems(formattedSub);
      }
    }
  }, [quoteData, quoteId, products]);

  const handleOpenProductDialog = (index: number) => {
    trigger("light");
    setActiveItemIndex(index);
    setProductDialogOpen(true);
  };

  const handleProductSelect = (product: OrderProduct) => {
    if (activeItemIndex === null) return;
    trigger("medium");
    const newProdId = String(product.id);

    setItems((prev) =>
      prev.map((item, idx) =>
        idx === activeItemIndex
          ? {
              ...item,
              selectedProduct: product,
              quotation_sub_product_id: newProdId,
              orders_sub_product_id: newProdId,
              product_id: newProdId,
              products_id: newProdId,
              quotation_sub_catg_id: product.products_catg_id,
              orders_sub_catg_id: product.products_catg_id,
              quotation_sub_sub_catg_id: product.products_sub_catg_id,
              orders_sub_sub_catg_id: product.products_sub_catg_id,
              quotation_sub_brand: product.products_brand,
              orders_sub_brand: product.products_brand,
              quotation_sub_thickness: product.products_thickness,
              orders_sub_thickness: product.products_thickness,
              quotation_sub_unit: product.products_unit,
              orders_sub_unit: product.products_unit,
              quotation_sub_size1: product.products_size1,
              orders_sub_size1: product.products_size1,
              quotation_sub_size2: product.products_size2,
              orders_sub_size2: product.products_size2,
              quotation_sub_size_unit: product.products_size_unit,
              orders_sub_size_unit: product.products_size_unit,
              quotation_sub_size_sum: product.products_size_sum,
              orders_sub_size_sum: product.products_size_sum,
            }
          : item
      )
    );
    setProductDialogOpen(false);
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const updated: any = { ...item, [field]: value };
        if (field === "quotation_sub_quantity") updated.orders_sub_quantity = value;
        if (field === "quotation_sub_rate") updated.orders_sub_rate = value;
        if (field === "quotation_sub_design_no") updated.orders_sub_design_no = value;
        return updated;
      })
    );
  };

  const handleAddItem = () => {
    trigger("light");
    setItems((prev) => [
      ...prev,
      {
        quotation_sub_product_id: "",
        orders_sub_product_id: "",
        product_id: "",
        quotation_sub_quantity: "",
        orders_sub_quantity: "",
        quotation_sub_rate: "",
        orders_sub_rate: "",
        quotation_sub_design_no: "",
        orders_sub_design_no: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    trigger("medium");
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const getProductLabel = (item: any) => {
    if (!item) return "Click to Select Product...";
    if (item.selectedProduct) {
      const p = item.selectedProduct;
      return `${p.product_sub_category || ""} (Category: ${p.product_category || ""}) - Brand: ${p.products_brand || "N/A"} (${p.products_thickness || ""}MM, ${p.products_size1 || ""}x${p.products_size2 || ""})`;
    }

    const prodId = item.quotation_sub_product_id || item.orders_sub_product_id || item.product_id;
    const prodCode = item.rawSub?.quotation_sub_product_code || item.quotation_sub_product_code;

    const prodByCode = products.find((p) => prodCode && p.products_code === prodCode);
    if (prodByCode) {
      return `${prodByCode.product_sub_category || ""} (Category: ${prodByCode.product_category || ""}) - Brand: ${prodByCode.products_brand || "N/A"} (${prodByCode.products_thickness || ""}MM, ${prodByCode.products_size1 || ""}x${prodByCode.products_size2 || ""})`;
    }

    const prodById = products.find((p) => String(p.id) === String(prodId));
    if (prodById) {
      return `${prodById.product_sub_category || ""} (Category: ${prodById.product_category || ""}) - Brand: ${prodById.products_brand || "N/A"} (${prodById.products_thickness || ""}MM, ${prodById.products_size1 || ""}x${prodById.products_size2 || ""})`;
    }

    const catg = item.product_category || item.rawSub?.product_category || "";
    const subCatg = item.product_sub_category || item.rawSub?.product_sub_category || "";
    const brand = item.quotation_sub_brand || item.rawSub?.quotation_sub_brand || "N/A";
    const thick = item.quotation_sub_thickness || item.rawSub?.quotation_sub_thickness || "";
    const s1 = item.quotation_sub_size1 || item.rawSub?.quotation_sub_size1 || "";
    const s2 = item.quotation_sub_size2 || item.rawSub?.quotation_sub_size2 || "";

    if (subCatg || thick) {
      return `${subCatg} (Category: ${catg}) - Brand: ${brand} (${thick}MM, ${s1}x${s2})`;
    }

    return prodId ? `Product #${prodId} (Click to change)` : "Click to Select Product...";
  };

  const handleInputChange = (field: string, value: string) => {
    setQuotation((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trigger("heavy");

    // Validations
    if (items.some((item) => !item.quotation_sub_product_id || !item.quotation_sub_quantity || !item.quotation_sub_rate)) {
      toast.error("Please fill out all product, quantity, and rate fields.");
      return;
    }

    const quotationSubData = items.map((item: any) => {
      const rawId = item.id ? Number(item.id) : null;
      const numProdId = Number(item.quotation_sub_product_id || item.orders_sub_product_id || item.product_id || 0);
      const numQty = Number(item.quotation_sub_quantity || item.orders_sub_quantity || 0);
      const numRate = Number(item.quotation_sub_rate || item.orders_sub_rate || 0);
      const strDesign = String(item.quotation_sub_design_no || item.orders_sub_design_no || "");

      const prod = item.selectedProduct || products.find((p) => Number(p.id) === numProdId);

      return {
        id: rawId,
        quotation_sub_product_id: numProdId,
        orders_sub_product_id: numProdId,
        product_id: numProdId,
        products_id: numProdId,
        quotation_sub_quantity: numQty,
        orders_sub_quantity: numQty,
        quantity: numQty,
        quotation_sub_rate: numRate,
        orders_sub_rate: numRate,
        rate: numRate,
        quotation_sub_design_no: strDesign,
        orders_sub_design_no: strDesign,
        design_no: strDesign,

        // Snapshot fields
        quotation_sub_catg_id: prod?.products_catg_id ? Number(prod.products_catg_id) : (item.quotation_sub_catg_id ? Number(item.quotation_sub_catg_id) : null),
        orders_sub_catg_id: prod?.products_catg_id ? Number(prod.products_catg_id) : (item.orders_sub_catg_id ? Number(item.orders_sub_catg_id) : null),

        quotation_sub_sub_catg_id: prod?.products_sub_catg_id ? Number(prod.products_sub_catg_id) : (item.quotation_sub_sub_catg_id ? Number(item.quotation_sub_sub_catg_id) : null),
        orders_sub_sub_catg_id: prod?.products_sub_catg_id ? Number(prod.products_sub_catg_id) : (item.orders_sub_sub_catg_id ? Number(item.orders_sub_sub_catg_id) : null),

        quotation_sub_brand: prod?.products_brand || item.quotation_sub_brand || "",
        orders_sub_brand: prod?.products_brand || item.orders_sub_brand || "",

        quotation_sub_thickness: prod?.products_thickness || item.quotation_sub_thickness || "",
        orders_sub_thickness: prod?.products_thickness || item.orders_sub_thickness || "",

        quotation_sub_unit: prod?.products_unit || item.quotation_sub_unit || "",
        orders_sub_unit: prod?.products_unit || item.orders_sub_unit || "",

        quotation_sub_size1: prod?.products_size1 ? Number(prod.products_size1) : (item.quotation_sub_size1 ? Number(item.quotation_sub_size1) : null),
        orders_sub_size1: prod?.products_size1 ? Number(prod.products_size1) : (item.orders_sub_size1 ? Number(item.orders_sub_size1) : null),

        quotation_sub_size2: prod?.products_size2 ? Number(prod.products_size2) : (item.quotation_sub_size2 ? Number(item.quotation_sub_size2) : null),
        orders_sub_size2: prod?.products_size2 ? Number(prod.products_size2) : (item.orders_sub_size2 ? Number(item.orders_sub_size2) : null),

        quotation_sub_size_unit: prod?.products_size_unit || item.quotation_sub_size_unit || "",
        orders_sub_size_unit: prod?.products_size_unit || item.orders_sub_size_unit || "",

        quotation_sub_size_sum: prod?.products_size_sum ? String(prod.products_size_sum) : (item.quotation_sub_size_sum ? String(item.quotation_sub_size_sum) : "1"),
        orders_sub_size_sum: prod?.products_size_sum ? String(prod.products_size_sum) : (item.orders_sub_size_sum ? String(item.orders_sub_size_sum) : "1"),
      };
    });

    const finalStatus = normalizeQuotationStatus(quotation.quotation_status);

    updateMutation.mutate(
      {
        id: quoteId,
        payload: {
          quotation_status: finalStatus,
          quotation_sub_data: quotationSubData,
          order_sub_data: quotationSubData,
          quotation_count: quotationSubData.length,
          orders_count: quotationSubData.length,
          quotation_remarks: quotation.quotation_remarks,
          quotation_delivery: quotation.quotation_delivery,
          quotation_shipping: quotation.quotation_shipping,
        },
      },
      {
        onSuccess: (res) => {
          if (res.code === 200) {
            toast.success("Quotation updated successfully!");
            navigate("/quotes");
          } else {
            toast.error(res.msg || "Failed to update quotation");
          }
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Error updating quotation");
        },
      }
    );
  };

  if (isLoadingQuote || isLoadingUsers || isLoadingProducts) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner className="size-8 text-primary animate-spin" />
        <p className="text-xs text-text-muted font-bold animate-pulse">Retrieving quotation details...</p>
      </div>
    );
  }

  const selectedCustomerName =
    users.find((u) => String(u.id) === String(quotation.order_user_id))?.full_name ||
    users.find((u) => String(u.id) === String(quotation.order_user_id))?.user_name ||
    "Unknown Customer";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-7xl mx-auto pb-24 md:pb-6 animate-fade-in duration-300">
      <div className="flex items-center gap-3">
        <Link to="/quotes">
          <Button variant="ghost" size="icon" className="rounded-full bg-panel border border-border/80 text-text hover:text-primary hover:bg-primary/5 cursor-pointer">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <PageHeader title="Edit Quotation" subtitle={`Modifying proposal details for Quote #${quoteId}`} />
      </div>

      <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-6">
        {/* Main Details and Status */}
        <Card className="bg-panel border border-border/80 shadow-sm rounded-2xl relative pt-0">
          <CardContent className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 select-none">
                <User className="size-3.5 text-primary" />
                Customer
              </label>
              <Input
                value={selectedCustomerName}
                readOnly
                className="bg-muted/10 border-border/80 cursor-not-allowed font-semibold text-text"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 select-none">
                <Calendar className="size-3.5 text-primary" />
                Date
              </label>
              <Input
                value={formatQuotationDate(quotation.quotation_date)}
                readOnly
                className="bg-muted/10 border-border/80 cursor-not-allowed font-semibold text-text"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 select-none">
                <Settings className="size-3.5 text-primary" />
                Status *
              </label>
              <Select
                value={quotation.quotation_status || "Quotation"}
                onValueChange={(val) => handleInputChange("quotation_status", val)}
              >
                <SelectTrigger className="w-full bg-background border border-border hover:border-border-hover focus:border-primary/80 rounded-xl px-3 py-2 text-sm font-semibold outline-none text-text">
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border rounded-xl shadow-md z-50">
                  <SelectItem value="Quotation" className="cursor-pointer font-semibold hover:bg-primary/5">Quotation</SelectItem>
                  <SelectItem value="Cancel" className="cursor-pointer font-semibold hover:bg-primary/5 text-rose-500">Cancel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Remarks, Delivery, and Shipping Addresses */}
        <Card className="bg-panel border border-border/80 shadow-sm rounded-2xl relative pt-0">
          <CardContent className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider select-none">
                Remark
              </label>
              <Textarea
                value={quotation.quotation_remarks}
                onChange={(e) => handleInputChange("quotation_remarks", e.target.value)}
                maxLength={200}
                placeholder="Enter remarks..."
                className="border-border hover:border-border-hover focus:border-primary/80 rounded-xl px-3 py-2 text-sm font-semibold outline-none text-text bg-background min-h-[80px] resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider select-none">
                Delivery Address
              </label>
              <Textarea
                value={quotation.quotation_delivery}
                onChange={(e) => handleInputChange("quotation_delivery", e.target.value)}
                maxLength={200}
                placeholder="Delivery instructions..."
                className="border-border hover:border-border-hover focus:border-primary/80 rounded-xl px-3 py-2 text-sm font-semibold outline-none text-text bg-background min-h-[80px] resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider select-none">
                Billing Address
              </label>
              <Textarea
                value={quotation.quotation_shipping}
                onChange={(e) => handleInputChange("quotation_shipping", e.target.value)}
                maxLength={200}
                placeholder="Billing instructions..."
                className="border-border hover:border-border-hover focus:border-primary/80 rounded-xl px-3 py-2 text-sm font-semibold outline-none text-text bg-background min-h-[80px] resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Item Rows heading */}
        <div className="flex items-center justify-between mt-2">
          <h3 className="text-base font-extrabold text-text flex items-center gap-2">
            📋 Quotation Items ({items.length})
          </h3>
          <Button
            type="button"
            onClick={handleAddItem}
            className="cursor-pointer text-xs font-bold gap-1 rounded-xl"
            variant="outline"
            size="sm"
          >
            <Plus className="size-3.5" /> Add Row
          </Button>
        </div>

        {/* Dynamic sub items editing */}
        <div className="flex flex-col gap-4">
          {items.map((item, index) => (
            <Card key={index} className="bg-panel border border-border/80 hover:border-border-hover shadow-xs rounded-2xl overflow-hidden pt-0 transition-all">
              <CardContent className="p-4 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  
                  {/* Product Field */}
                  <div className="md:col-span-5 flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center justify-between">
                      <span>Product *</span>
                      <span className="text-[10px] text-primary">Row {index + 1}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleOpenProductDialog(index)}
                      className="w-full min-h-12 bg-background border border-border hover:border-border-hover focus:border-primary/80 focus:ring-1 focus:ring-primary/45 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none transition-all cursor-pointer text-left flex items-start text-text"
                    >
                      <span
                        className={`leading-5 overflow-hidden break-words [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] ${
                          item.quotation_sub_product_id || item.selectedProduct || item.rawSub
                            ? "text-text"
                            : "text-text-muted font-normal"
                        }`}
                      >
                        {getProductLabel(item)}
                      </span>
                    </button>
                  </div>

                  {/* Quantity */}
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                      Quantity *
                    </label>
                    <Input
                      type="text"
                      placeholder="Qty"
                      required
                      value={item.quotation_sub_quantity}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          handleItemChange(index, "quotation_sub_quantity", val);
                        }
                      }}
                      className="border-border hover:border-border-hover focus:border-primary/80 rounded-xl px-3 py-2 text-sm font-semibold outline-none text-text bg-background"
                    />
                  </div>

                  {/* Rate */}
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                      Rate *
                    </label>
                    <Input
                      type="text"
                      placeholder="Rate"
                      required
                      value={item.quotation_sub_rate}
                      inputMode="decimal"
                      pattern="[0-9]*\.?[0-9]*"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val)) {
                          handleItemChange(index, "quotation_sub_rate", val);
                        }
                      }}
                      className="border-border hover:border-border-hover focus:border-primary/80 rounded-xl px-3 py-2 text-sm font-semibold outline-none text-text bg-background"
                    />
                  </div>

                  {/* Design No */}
                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                      Design No
                    </label>
                    <Input
                      placeholder="Design #"
                      value={item.quotation_sub_design_no}
                      onChange={(e) => handleItemChange(index, "quotation_sub_design_no", e.target.value)}
                      className="border-border hover:border-border-hover focus:border-primary/80 rounded-xl px-3 py-2 text-sm font-semibold outline-none text-text bg-background"
                    />
                  </div>

                  {/* Row actions */}
                  {items.length > 1 && (
                    <div className="md:col-span-1 flex items-center justify-end md:justify-center md:h-16 pt-2 md:pt-4">
                      <Button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        variant="ghost"
                        size="icon"
                        className="text-text-muted hover:text-rose-500 hover:bg-rose-500/5 rounded-full cursor-pointer transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}

                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Form controls */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <Link to="/quotes">
            <Button type="button" variant="outline" className="px-6 rounded-xl cursor-pointer">
              Back to List
            </Button>
          </Link>
          <Button
            type="submit"
            className="px-6 rounded-xl cursor-pointer"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Updating Proposal..." : "Update Quotation"}
          </Button>
        </div>
      </form>

      {/* Select Product Dialog */}
      <SelectProductDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        products={products}
        isLoading={isLoadingProducts}
        onSelect={handleProductSelect}
      />
    </div>
  );
}
