import React from "react";
import {
  useOrderDetail,
  useUsersList,
  useProductsList,
} from "../hooks/use-create-order";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  ArrowLeft,
  Calendar,
  User,
  ShoppingBag,
  Layers,
  Sparkles,
  Info,
  CalendarDays,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileSpreadsheet,
} from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import { Link } from "react-router-dom";
import { formatOrderDate } from "../utils/date";

interface ViewOrderDetailsProps {
  orderId: string;
}

export default function ViewOrderDetails({ orderId }: ViewOrderDetailsProps) {
  const { trigger } = useWebHaptics();

  // Parallel Query Fetching
  const { data: orderData, isLoading: isLoadingOrder } =
    useOrderDetail(orderId);
  const { data: users = [], isLoading: isLoadingUsers } = useUsersList();
  const { data: products = [], isLoading: isLoadingProducts } =
    useProductsList();

  if (isLoadingOrder || isLoadingUsers || isLoadingProducts) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3">
        <Spinner className="size-8 text-primary" />
        <span className="text-sm font-semibold text-text-muted animate-pulse">
          Retrieving order details...
        </span>
      </div>
    );
  }

  if (!orderData || !orderData.order) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-center p-6">
        <span className="text-4xl">⚠️</span>
        <h3 className="text-text font-extrabold text-base">Order Not Found</h3>
        <p className="text-xs text-text-muted max-w-xs">
          The order with ID #{orderId} could not be retrieved. It may have been
          archived or deleted.
        </p>
        <Link to="/" className="mt-4">
          <Button
            variant="outline"
            className="rounded-xl px-5 py-2.5 font-bold text-xs"
          >
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const order = orderData.order;
  const items = orderData.orderSub || [];
  const customerName =
    users.find((u) => String(u.id) === String(order.orders_user_id))
      ?.full_name || "Unknown Customer";

  const getProductCategory = (item: any) => {
    const prod = products.find(
      (p) => String(p.id) === String(item.orders_sub_product_id),
    );
    return prod?.product_category || item.orders_sub_catg_id || "Category N/A";
  };

  const getProductSubCategory = (item: any) => {
    const prod = products.find(
      (p) => String(p.id) === String(item.orders_sub_product_id),
    );
    return (
      prod?.product_sub_category ||
      item.orders_sub_sub_catg_id ||
      "SubCategory N/A"
    );
  };

  // Status Badge classes helper
  const getStatusBadge = (status: string) => {
    const s = status || "Pending";
    let badgeClasses =
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
    let Icon = HelpCircle;

    if (
      s.toLowerCase().includes("complete") ||
      s.toLowerCase().includes("deliver")
    ) {
      badgeClasses =
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
      Icon = CheckCircle2;
    } else if (s.toLowerCase().includes("cancel")) {
      badgeClasses =
        "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
      Icon = XCircle;
    } else if (
      s.toLowerCase().includes("progress") ||
      s.toLowerCase().includes("process")
    ) {
      badgeClasses =
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
      Icon = Sparkles;
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${badgeClasses}`}
      >
        <Icon className="size-3.5 shrink-0" />
        {s}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Card */}
      <div className="flex items-center justify-between bg-panel border border-border/80 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/" className="cursor-pointer">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-9 w-9 border-border bg-background hover:bg-muted"
              onClick={() => trigger("light")}
            >
              <ArrowLeft className="size-5 text-text-muted" />
            </Button>
          </Link>
          <div className="flex flex-col">
            <h2 className="text-text text-lg font-extrabold tracking-tight">
              Order #{order.orders_no || order.id}
            </h2>
            <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider mt-0.5">
              Operations Details View
            </span>
          </div>
        </div>

        <div>{getStatusBadge(order.orders_status)}</div>
      </div>

      {/* Grid Layout: Metadata & Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Info */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="bg-panel border border-border/80 shadow-sm rounded-2xl pt-0 overflow-hidden relative">
            {/* Sleek Gradient accent border */}
            <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-500 to-indigo-500" />

            <CardContent className="p-5 md:p-6 flex flex-col gap-6">
              <h3 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-2 border-b border-border/60 pb-3">
                <Info className="size-4.5 text-primary" />
                Order Parameters
              </h3>

              {/* Customer */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <User className="size-3.5 text-primary" />
                  Client Account
                </span>
                <span className="text-sm font-extrabold text-text bg-background border border-border/60 rounded-xl px-3.5 py-2.5">
                  {customerName}
                </span>
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-primary" />
                  Submission Date
                </span>
                <span className="text-sm font-extrabold text-text bg-background border border-border/60 rounded-xl px-3.5 py-2.5">
                  {formatOrderDate(order.orders_date) || "N/A"}
                </span>
              </div>

              {/* Year */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" />
                  Financial Year
                </span>
                <span className="text-sm font-extrabold text-text bg-background border border-border/60 rounded-xl px-3.5 py-2.5">
                  {order.orders_year || "N/A"}
                </span>
              </div>

              {/* Actions Footer inside card */}
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/40">
                <Link to={`/quotes/create/${order.id}`} className="w-full">
                  <Button className="w-full rounded-xl py-2 font-bold text-xs gap-1.5">
                    <FileSpreadsheet className="size-4" />
                    Generate Quote
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Ordered Items Details */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="bg-panel border border-border/80 shadow-sm rounded-2xl pt-0 overflow-hidden">
            <CardContent className="p-5 md:p-6 flex flex-col gap-5">
              <h3 className="text-sm font-extrabold text-text uppercase tracking-wider flex items-center gap-2 border-b border-border/60 pb-3 justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingBag className="size-4.5 text-primary" />
                  Ordered Line Items
                </span>
                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0">
                  {items.length} {items.length === 1 ? "Item" : "Items"}
                </span>
              </h3>

              {/* List of items */}
              <div className="flex flex-col gap-4">
                {items.map((item: any, index: number) => (
                  <div
                    key={item.id || index}
                    className="group border border-border/60 hover:border-border rounded-2xl p-4 bg-background/50 hover:bg-muted/15 transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Item indicator number */}
                    <span className="absolute top-3 right-4 text-[10px] font-black text-text-muted opacity-45 group-hover:text-primary group-hover:opacity-100 transition-all uppercase tracking-wider">
                      Item #{index + 1}
                    </span>

                    <div className="flex flex-col gap-4">
                      {/* Brand and category */}
                      <div className="flex flex-wrap gap-2 items-center pr-12">
                        <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                          {item.orders_sub_brand || "Brand N/A"}
                        </span>
                        <span className="text-xs font-extrabold text-text">
                          {getProductSubCategory(item)}
                        </span>
                        <span className="text-text-muted text-xs font-semibold">
                          ({getProductCategory(item)})
                        </span>
                      </div>

                      {/* Line Item Specs Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-panel/30 border border-border/40 rounded-xl p-3">
                        {/* Design No */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                            Design No
                          </span>
                          <span className="text-xs font-extrabold text-text">
                            {item.orders_sub_design_no || "—"}
                          </span>
                        </div>

                        {/* Thickness */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                            Thickness
                          </span>
                          <span className="text-xs font-extrabold text-text">
                            {item.orders_sub_thickness
                              ? `${item.orders_sub_thickness} MM`
                              : "—"}
                          </span>
                        </div>

                        {/* Size */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                            Dimensions
                          </span>
                          <span className="text-xs font-extrabold text-text">
                            {item.orders_sub_size1 && item.orders_sub_size2
                               ? `${item.orders_sub_size1}x${item.orders_sub_size2} ${item.orders_sub_size_unit || ""}`
                               : item.orders_sub_size1
                               ? `${item.orders_sub_size1} ${item.orders_sub_size_unit || ""}`
                               : "—"}
                          </span>
                        </div>

                        {/* Unit */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
                            Packing Unit
                          </span>
                          <span className="text-xs font-extrabold text-text uppercase">
                            {item.orders_sub_unit || "—"}
                          </span>
                        </div>
                      </div>

                      {/* Quantity & Summary */}
                      <div className="flex justify-between items-center border-t border-border/40 pt-3">
                        <span className="text-xs font-semibold text-text-muted">
                          Quantity Ordered
                        </span>
                        <div className="flex items-baseline gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-xl border border-emerald-500/15">
                          <span className="text-sm font-black tracking-tight">
                            {item.orders_sub_quantity}
                          </span>
                          <span className="text-[10px] font-bold uppercase">
                            {item.orders_sub_unit || "units"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {items.length === 0 && (
                  <div className="text-center py-8 text-xs font-bold text-text-muted">
                    No items belong to this order.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
