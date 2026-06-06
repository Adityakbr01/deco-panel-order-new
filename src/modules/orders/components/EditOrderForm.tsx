import React, { useEffect, useRef, useState } from "react";
import {
  useUsersList,
  useProductsList,
  useOrderDetail,
  useUpdateOrderMutation,
} from "../hooks/use-create-order";
import { CreateOrderItemInput, OrderProduct } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar as CalendarIcon,
  User,
  ArrowLeft,
  ShoppingBag,
  Loader2,
  Search,
  X,
  Check,
} from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import SelectProductDialog from "./SelectProductDialog";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatOrderDate } from "../utils/date";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "sonner";
import DeleteConfirmationDialog from "./DeleteConfirmationDialog";

interface EditOrderFormProps {
  orderId: string;
}

function pickFirstPresent(...values: unknown[]) {
  return values.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
  );
}

function getProductCategoryId(product?: OrderProduct) {
  return (
    pickFirstPresent(
      product?.products_catg_id,
      product?.product_catg_id,
      product?.products_category_id,
      product?.product_category_id,
      product?.category_id,
      product?.catg_id,
    ) ?? ""
  );
}

function getProductSubCategoryId(product?: OrderProduct) {
  return (
    pickFirstPresent(
      product?.products_sub_catg_id,
      product?.product_sub_catg_id,
      product?.products_sub_category_id,
      product?.product_sub_category_id,
      product?.sub_category_id,
      product?.sub_catg_id,
    ) ?? ""
  );
}

export default function EditOrderForm({ orderId }: EditOrderFormProps) {
  const { trigger } = useWebHaptics();
  const quantityRefs = useRef<(HTMLInputElement | null)[]>([]);

  // React Query Hooks
  const { data: orderData, isLoading: isLoadingOrder } = useOrderDetail(orderId);
  const { data: users = [], isLoading: isLoadingUsers } = useUsersList();
  const { data: products = [], isLoading: isLoadingProducts } = useProductsList();
  const updateOrderMutation = useUpdateOrderMutation();

  // Dialog State
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);

  // Accordion Details State for Mobile View
  const [showDetails, setShowDetails] = useState<Record<number, boolean>>({});

  // Dropdown States for Customer Select
  const [openUserDropdown, setOpenUserDropdown] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close customer select dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenUserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to convert yyyy-mm-dd string to local Date object timezone-safe
  const getDateObject = (dateStr: string) => {
    if (!dateStr) return undefined;
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper to format local Date object to yyyy-mm-dd string timezone-safe
  const formatDateToString = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper to format date string to human-readable string
  const getDisplayDateString = (dateStr: string) => {
    return formatOrderDate(dateStr) || "Select date";
  };

  // Master Order State
  const [userId, setUserId] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  // Order Items State
  const [items, setItems] = useState<CreateOrderItemInput[]>([]);

  // Deletion confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [indexToDelete, setIndexToDelete] = useState<number | null>(null);

  // Sync state when orderData and products load
  useEffect(() => {
    if (orderData && products.length > 0) {
      setUserId(String(orderData.order?.orders_user_id || ""));
      setOrderDate(orderData.order?.orders_date || "");
      setOrderStatus(orderData.order?.orders_status || "");

      if (orderData.orderSub && orderData.orderSub.length > 0) {
        const formattedSub = orderData.orderSub.map((sub: any) => {
          const prod = products.find((p) => String(p.id) === String(sub.orders_sub_product_id));
          const catgId = pickFirstPresent(
            sub.orders_sub_catg_id,
            getProductCategoryId(prod),
            prod?.product_category,
            "",
          );
          let subCatgId = pickFirstPresent(
            sub.orders_sub_sub_catg_id,
            getProductSubCategoryId(prod),
            prod?.product_sub_category,
            "",
          );

          if (
            prod?.product_sub_category === "Commercial Plywood" ||
            String(subCatgId) === "Commercial Plywood"
          ) {
            subCatgId = catgId;
          }

          return {
            id: sub.id ?? sub.orders_sub_id ?? "",
            orders_sub_product_id: sub.orders_sub_product_id || "",
            orders_sub_design_no: sub.orders_sub_design_no || "",
            orders_sub_catg_id: catgId || "",
            orders_sub_sub_catg_id: subCatgId || "",
            orders_sub_brand: sub.orders_sub_brand || prod?.products_brand || "",
            orders_sub_thickness: sub.orders_sub_thickness || prod?.products_thickness || "",
            orders_sub_unit: sub.orders_sub_unit || prod?.products_unit || "",
            orders_sub_size1: sub.orders_sub_size1 || prod?.products_size1 || "",
            orders_sub_size2: sub.orders_sub_size2 || prod?.products_size2 || "",
            orders_sub_size_unit: sub.orders_sub_size_unit || prod?.products_size_unit || "",
            orders_sub_quantity: sub.orders_sub_quantity || "",
          };
        });
        setItems(formattedSub);
      }
    }
  }, [orderData, products]);

  const handleInputChange = (index: number, field: keyof CreateOrderItemInput, value: string) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    setItems(updatedItems);
  };

  const addItem = () => {
    trigger("light");
    setItems([
      ...items,
      {
        id: "",
        orders_sub_product_id: "",
        orders_sub_design_no: "",
        orders_sub_catg_id: "",
        orders_sub_sub_catg_id: "",
        orders_sub_brand: "",
        orders_sub_thickness: "",
        orders_sub_unit: "",
        orders_sub_size1: "",
        orders_sub_size2: "",
        orders_sub_size_unit: "",
        orders_sub_quantity: "",
      },
    ]);
  };

  const removeItem = (index: number) => {
    trigger("light");
    setIndexToDelete(index);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (indexToDelete === null) return;

    trigger("medium");
    const itemToRemove = items[indexToDelete];

    if (itemToRemove && itemToRemove.id) {
      try {
        await api.delete(`/web-delete-order-sub-by-Id/${itemToRemove.id}`);
        toast.success("Item deleted successfully");
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to delete item from database");
        setIndexToDelete(null);
        setDeleteConfirmOpen(false);
        return;
      }
    }

    setItems(items.filter((_, i) => i !== indexToDelete));
    const updatedVisibility = { ...showDetails };
    delete updatedVisibility[indexToDelete];
    setShowDetails(updatedVisibility);

    setIndexToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const toggleDetails = (index: number) => {
    trigger("light");
    setShowDetails((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleOpenProductDialog = (index: number) => {
    trigger("light");
    setActiveEditIndex(index);
    setOpenProductDialog(true);
  };

  const handleSelectProduct = (product: OrderProduct) => {
    if (activeEditIndex !== null) {
      const catgId = getProductCategoryId(product);
      let subCatgId = getProductSubCategoryId(product);

      if (
        product.product_sub_category === "Commercial Plywood" ||
        String(subCatgId) === "Commercial Plywood"
      ) {
        subCatgId = catgId;
      }

      const updatedItems = [...items];
      updatedItems[activeEditIndex] = {
        ...updatedItems[activeEditIndex],
        orders_sub_product_id: product.id,
        orders_sub_design_no: updatedItems[activeEditIndex].orders_sub_design_no || "",
        orders_sub_catg_id: catgId,
        orders_sub_sub_catg_id: subCatgId,
        orders_sub_brand: product.products_brand,
        orders_sub_thickness: product.products_thickness,
        orders_sub_unit: product.products_unit,
        orders_sub_size1: product.products_size1,
        orders_sub_size2: product.products_size2,
        orders_sub_size_unit: product.products_size_unit,
        orders_sub_quantity: updatedItems[activeEditIndex].orders_sub_quantity || "",
      };
      setItems(updatedItems);
      setTimeout(() => {
        if (quantityRefs.current[activeEditIndex]) {
          quantityRefs.current[activeEditIndex]?.focus();
        }
      }, 50);
    }
    setOpenProductDialog(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trigger("heavy");

    const orderSubData = items.map((item) => {
      return {
        id: item.id ? String(item.id) : null,
        orders_sub_product_id: String(item.orders_sub_product_id),
        orders_sub_quantity: String(item.orders_sub_quantity),
        orders_sub_design_no: item.orders_sub_design_no || "",
      };
    });

    const payload = {
      orders_user_id: userId ? Number(userId) : 1,
      orders_date: orderDate,
      orders_status: orderStatus,
      orders_count: String(orderSubData.length),
      orders_no: orderData?.order?.orders_no ?? "",
      order_sub_data: orderSubData,
    };

    updateOrderMutation.mutate({ id: orderId, data: payload });
  };

  const isFormValid = () => {
    return (
      userId &&
      orderDate &&
      items.every((item) => item.orders_sub_quantity && item.orders_sub_product_id) &&
      items.length > 0
    );
  };

  const isAddMoreDisabled = () => {
    return items.some((item) => item.orders_sub_product_id === "");
  };

  if (isLoadingOrder || isLoadingUsers || isLoadingProducts || !orderDate) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3">
        <Spinner className="size-8 text-primary" />
        <span className="text-sm font-semibold text-text-muted animate-pulse">
          Loading order details...
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Card */}
      <div className="flex items-center gap-3 bg-panel border border-border/80 p-4 rounded-2xl shadow-xs">
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
        <h2 className="text-text text-lg font-extrabold tracking-tight">
          Edit Order #{orderId}
        </h2>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-6">
        {/* Core Details Grid */}
        <Card className="bg-panel border border-border/80 shadow-sm rounded-2xl relative overflow-visible z-30 pt-0">
          <CardContent className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Custom User/Customer Selection */}
            <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 select-none">
                <User className="size-3.5 text-primary" />
                Select Customer
              </label>
              
              <button
                type="button"
                onClick={() => {
                  trigger("light");
                  setOpenUserDropdown(!openUserDropdown);
                }}
                className="w-full bg-background border border-border hover:border-border-hover focus:border-primary/80 focus:ring-1 focus:ring-primary/45 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none transition-all cursor-pointer text-left flex items-center justify-between text-text"
              >
                <span className={userId ? "text-text" : "text-text-muted font-normal"}>
                  {users.find((u) => String(u.id) === String(userId))?.full_name || "Select Customer Profile..."}
                </span>
                <ChevronDown className={`size-4 text-text-muted transition-transform duration-200 ${openUserDropdown ? "rotate-180 text-primary" : ""}`} />
              </button>

              {openUserDropdown && (
                <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-popover border border-border rounded-xl shadow-lg z-50 flex flex-col overflow-hidden max-h-60 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="p-2 border-b border-border/60 bg-muted/10 relative flex items-center">
                    <Search className="absolute left-4 size-3.5 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search customer..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full bg-background border border-border/80 rounded-lg pl-8 pr-8 py-1.5 text-xs font-medium outline-none focus:border-primary/50 transition-all placeholder:text-text-muted text-text"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {userSearch && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          trigger("light");
                          setUserSearch("");
                        }}
                        className="absolute right-4 text-text-muted hover:text-text rounded-full p-0.5 hover:bg-muted transition-colors cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  <div className="overflow-y-auto p-1 scrollbar-thin max-h-40">
                    {users.filter((u) => u.full_name.toLowerCase().includes(userSearch.toLowerCase())).length > 0 ? (
                      users
                        .filter((u) => u.full_name.toLowerCase().includes(userSearch.toLowerCase()))
                        .map((user) => {
                          const isSelected = String(user.id) === String(userId);
                          return (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => {
                                trigger("light");
                                setUserId(String(user.id));
                                setOpenUserDropdown(false);
                                setUserSearch("");
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "text-text hover:bg-primary/5"
                              }`}
                            >
                              <span>{user.full_name}</span>
                              {isSelected && <Check className="size-3.5 text-primary-foreground" />}
                            </button>
                          );
                        })
                    ) : (
                      <div className="py-6 text-center text-xs text-text-muted font-medium">
                        No customers found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Popover Date Picker */}
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 select-none">
                <CalendarIcon className="size-3.5 text-primary" />
                Order Date
              </label>
              
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    onClick={() => trigger("light")}
                    className="w-full bg-background border border-border hover:border-border-hover focus:border-primary/80 focus:ring-1 focus:ring-primary/45 rounded-xl px-3.5 py-2.5 text-sm font-semibold outline-none transition-all cursor-pointer text-left flex items-center justify-between text-text"
                  >
                    <span>{getDisplayDateString(orderDate)}</span>
                    <CalendarIcon className="size-4 text-text-muted" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-50 bg-popover border border-border rounded-2xl shadow-xl" align="start">
                  <Calendar
                    mode="single"
                    selected={getDateObject(orderDate)}
                    onSelect={(date) => {
                      if (date) {
                        trigger("medium");
                        setOrderDate(formatDateToString(date));
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Order Status Selection */}
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5 select-none">
                <ShoppingBag className="size-3.5 text-primary" />
                Order Status
              </label>
              
              <Select
                value={orderStatus}
                onValueChange={(val) => {
                  trigger("light");
                  setOrderStatus(val);
                }}
              >
                <SelectTrigger className="w-full bg-background border border-border hover:border-border-hover focus:border-primary/80 focus:ring-1 focus:ring-primary/45 rounded-xl h-[42px] px-3.5 text-sm font-semibold text-text">
                  <SelectValue placeholder="Select Status..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border rounded-xl z-50">
                  <SelectItem value="Order" className="text-xs font-semibold rounded-lg cursor-pointer">
                    Order
                  </SelectItem>
                  <SelectItem value="Cancel" className="text-xs font-semibold rounded-lg cursor-pointer">
                    Cancel
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Order Items Header */}
        <div className="flex items-center justify-between mt-2">
          <h3 className="text-base font-extrabold text-text flex items-center gap-2">
            <ShoppingBag className="size-5 text-primary" />
            Order Items ({items.length})
          </h3>
        </div>

        {/* Items List Wrapper */}
        <div className="flex flex-col gap-4">
          {items.map((item, index) => (
            <Card
              key={index}
              className="bg-panel border border-border/80 shadow-xs hover:shadow-sm hover:border-border-hover rounded-2xl overflow-hidden transition-all pt-0"
            >
              <CardContent className="p-4 flex flex-col gap-3">
                {/* Mobile View */}
                <div className="md:hidden flex flex-col gap-3.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Select Product..."
                      readOnly
                      value={
                        item.orders_sub_product_id
                          ? `Product ID: ${item.orders_sub_product_id}`
                          : ""
                      }
                      onClick={() => handleOpenProductDialog(index)}
                      className="flex-1 bg-background border border-primary/20 hover:border-primary/50 focus:border-primary/80 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none cursor-pointer placeholder:text-primary/75 text-primary transition-all text-center"
                    />

                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="rounded-xl h-[42px] w-[42px] cursor-pointer"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="size-4.5" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      placeholder="Design No"
                      value={item.orders_sub_design_no}
                      onChange={(e) => handleInputChange(index, "orders_sub_design_no", e.target.value)}
                      className="w-full bg-background border border-border focus:border-primary/80 rounded-xl px-3 py-2.5 text-sm font-medium outline-none"
                    />
                    <input
                      ref={(el) => {
                        quantityRefs.current[index] = el;
                      }}
                      placeholder="Quantity"
                      required
                      value={item.orders_sub_quantity}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*$/.test(val)) {
                          handleInputChange(index, "orders_sub_quantity", val);
                        }
                      }}
                      maxLength={6}
                      className="w-full bg-background border border-border focus:border-primary/80 rounded-xl px-3 py-2.5 text-sm font-medium outline-none"
                    />
                  </div>

                  {item.orders_sub_product_id && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => toggleDetails(index)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-border bg-background rounded-xl text-text-muted hover:text-text cursor-pointer transition-all"
                      >
                        <span className="text-xs font-semibold">
                          {showDetails[index] ? "Hide Product Specs" : "Show Product Specs"}
                        </span>
                        {showDetails[index] ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </Button>

                      {showDetails[index] && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/20 border border-border/50 rounded-xl animate-in duration-200">
                          {[
                            { label: "Category", val: item.orders_sub_catg_id },
                            { label: "Sub Category", val: item.orders_sub_sub_catg_id },
                            { label: "Brand", val: item.orders_sub_brand },
                            { label: "Thickness", val: item.orders_sub_thickness ? `${item.orders_sub_thickness} MM` : "" },
                            { label: "Unit", val: item.orders_sub_unit },
                            { label: "Size", val: item.orders_sub_size1 ? `${item.orders_sub_size1}x${item.orders_sub_size2} ${item.orders_sub_size_unit}` : "" },
                          ].map((spec, sIdx) => (
                            <div key={sIdx} className="flex flex-col gap-0.5">
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">
                                {spec.label}
                              </span>
                              <span className="text-xs font-bold text-text">
                                {spec.val || "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto scrollbar-thin">
                  <div className="flex items-center gap-3.5 min-w-[1000px] py-1">
                    {/* Select Product Trigger */}
                    <div className="w-[140px] shrink-0">
                      <input
                        type="text"
                        placeholder="Select..."
                        readOnly
                        value={
                          item.orders_sub_product_id
                            ? `ID: ${item.orders_sub_product_id}`
                            : ""
                        }
                        onClick={() => handleOpenProductDialog(index)}
                        className="w-full bg-background border border-primary/20 hover:border-primary/50 text-center font-bold text-xs text-primary rounded-xl px-3 py-2.5 cursor-pointer placeholder:text-primary outline-none focus:ring-1 focus:ring-primary/45 transition-all"
                      />
                    </div>

                    {/* Metadata Read-only Cards */}
                    <div className="grid grid-cols-8 gap-2.5 flex-1">
                      {[
                        { placeholder: "Category", val: item.orders_sub_catg_id },
                        { placeholder: "Sub Category", val: item.orders_sub_sub_catg_id },
                        { placeholder: "Brand", val: item.orders_sub_brand },
                        { placeholder: "Thickness", val: item.orders_sub_thickness ? `${item.orders_sub_thickness} MM` : "" },
                        { placeholder: "Unit", val: item.orders_sub_unit },
                        { placeholder: "Length", val: item.orders_sub_size1 },
                        { placeholder: "Breadth", val: item.orders_sub_size2 },
                        { placeholder: "Size Unit", val: item.orders_sub_size_unit },
                      ].map((meta, mIdx) => (
                        <input
                          key={mIdx}
                          type="text"
                          placeholder={meta.placeholder}
                          value={meta.val || ""}
                          disabled
                          className="w-full bg-muted/40 border border-border/40 text-text-muted rounded-xl px-2 py-2.5 text-xs text-center font-semibold select-none"
                        />
                      ))}
                    </div>

                    {/* Editable Design No */}
                    <div className="w-[110px] shrink-0">
                      <input
                        placeholder="Design No"
                        value={item.orders_sub_design_no}
                        onChange={(e) => handleInputChange(index, "orders_sub_design_no", e.target.value)}
                        className="w-full bg-background border border-border focus:border-primary/80 focus:ring-1 focus:ring-primary/45 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none text-text text-center transition-all"
                      />
                    </div>

                    <div className="w-[90px] shrink-0">
                      <input
                        ref={(el) => {
                          quantityRefs.current[index] = el;
                        }}
                        placeholder="Quantity"
                        required
                        value={item.orders_sub_quantity}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d*$/.test(val)) {
                            handleInputChange(index, "orders_sub_quantity", val);
                          }
                        }}
                        maxLength={6}
                        className="w-full bg-background border border-border focus:border-primary/80 focus:ring-1 focus:ring-primary/45 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-text text-center transition-all"
                      />
                    </div>

                    {/* Remove Action */}
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="rounded-full hover:bg-rose-500/10 hover:text-rose-600 h-9 w-9 cursor-pointer shrink-0"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between mt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isAddMoreDisabled()}
            onClick={addItem}
            className={`rounded-xl px-4 py-2.5 font-bold text-xs gap-1.5 cursor-pointer shadow-xs ${
              isAddMoreDisabled()
                ? "bg-muted text-text-muted border-border cursor-not-allowed"
                : "bg-background border-border hover:bg-muted"
            }`}
          >
            <Plus className="size-4" /> Add Item
          </Button>

          <div className="flex items-center gap-3">
            <Link to="/">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl px-5 py-2.5 font-bold text-xs cursor-pointer"
                onClick={() => trigger("light")}
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={!isFormValid() || updateOrderMutation.isPending}
              className={`rounded-xl px-6 py-2.5 font-bold text-xs shadow-sm cursor-pointer ${
                !isFormValid() || updateOrderMutation.isPending
                  ? "bg-muted text-text-muted border-border cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/95"
              }`}
            >
              {updateOrderMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Order"
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Select Product Dialog Box */}
      <SelectProductDialog
        open={openProductDialog}
        onOpenChange={setOpenProductDialog}
        products={products}
        isLoading={isLoadingProducts}
        onSelect={handleSelectProduct}
      />

      {/* Delete Confirmation Dialog Box */}
      <DeleteConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
