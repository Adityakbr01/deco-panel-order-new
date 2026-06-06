import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  useCreateOrderMutation,
  useCurrentYear,
  useProductsList,
  useUsersList,
} from "../hooks/use-create-order";
import type { CreateOrderItemInput, OrderProduct } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft, Loader2, Plus, ShoppingBag } from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import SelectProductDialog from "./SelectProductDialog";
import { CreateCustomerDialog } from "./CreateCustomerDialog";
import { CreateOrderItemCard } from "./CreateOrderItemCard";
import { CustomerSelect } from "./CustomerSelect";
import { OrderDatePicker } from "./OrderDatePicker";

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

function getTodayDateString() {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function getEmptyOrderItem(): CreateOrderItemInput {
  return {
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
  };
}

export default function CreateOrderForm() {
  const { trigger } = useWebHaptics();
  const quantityRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    data: users = [],
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useUsersList();
  const { data: products = [], isLoading: isLoadingProducts } =
    useProductsList();
  const { data: currentYear = "" } = useCurrentYear();
  const createOrderMutation = useCreateOrderMutation();

  const [userId, setUserId] = useState("");
  const [orderDate, setOrderDate] = useState(getTodayDateString());
  const [items, setItems] = useState<CreateOrderItemInput[]>([
    getEmptyOrderItem(),
  ]);
  const [showDetails, setShowDetails] = useState<Record<number, boolean>>({});
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [openCreateUserDialog, setOpenCreateUserDialog] = useState(false);
  const [activeEditIndex, setActiveEditIndex] = useState<number | null>(null);

  const handleInputChange = (
    index: number,
    field: keyof CreateOrderItemInput,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addItem = () => {
    trigger("light");
    setItems((prev) => [...prev, getEmptyOrderItem()]);
  };

  const removeItem = (index: number) => {
    trigger("medium");
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setShowDetails((prev) => {
      const updatedVisibility = { ...prev };
      delete updatedVisibility[index];
      return updatedVisibility;
    });
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

      setItems((prev) =>
        prev.map((item, index) =>
          index === activeEditIndex
            ? {
                orders_sub_product_id: product.id,
                orders_sub_design_no: item.orders_sub_design_no || "",
                orders_sub_catg_id: catgId,
                orders_sub_sub_catg_id: subCatgId,
                orders_sub_brand: product.products_brand,
                orders_sub_thickness: product.products_thickness,
                orders_sub_unit: product.products_unit,
                orders_sub_size1: product.products_size1,
                orders_sub_size2: product.products_size2,
                orders_sub_size_unit: product.products_size_unit,
                orders_sub_quantity: item.orders_sub_quantity || "",
              }
            : item,
        ),
      );

      window.setTimeout(() => {
        quantityRefs.current[activeEditIndex]?.focus();
      }, 50);
    }

    setOpenProductDialog(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    trigger("heavy");

    const mappedItems = items.map((item) => {
      const prod = products.find((p) => String(p.id) === String(item.orders_sub_product_id));
      const catgId = getProductCategoryId(prod) || item.orders_sub_catg_id;
      let subCatgId = getProductSubCategoryId(prod) || item.orders_sub_sub_catg_id;

      if (
        prod?.product_sub_category === "Commercial Plywood" ||
        subCatgId === "Commercial Plywood"
      ) {
        subCatgId = catgId;
      }

      return {
        ...item,
        orders_sub_catg_id: catgId,
        orders_sub_sub_catg_id: subCatgId,
      };
    });

    createOrderMutation.mutate({
      orders_user_id: userId,
      orders_year: currentYear,
      orders_date: orderDate,
      orders_count: mappedItems.length,
      order_sub_data: mappedItems,
    });
  };

  const isFormValid = () => {
    return (
      userId &&
      orderDate &&
      items.every(
        (item) => item.orders_sub_quantity && item.orders_sub_product_id,
      ) &&
      items.length > 0
    );
  };

  const isAddMoreDisabled = () => {
    return items.some((item) => item.orders_sub_product_id === "");
  };

  if (isLoadingUsers || isLoadingProducts) {
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
          Create New Order
        </h2>
      </div>

      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="flex flex-col gap-6"
      >
        <Card className="bg-panel border border-border/80 shadow-sm rounded-2xl relative overflow-visible z-30 pt-0">
          <CardContent className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <CustomerSelect
              users={users}
              userId={userId}
              onSelectUser={setUserId}
              onCreateCustomer={() => setOpenCreateUserDialog(true)}
              trigger={trigger}
            />
            <OrderDatePicker
              orderDate={orderDate}
              onOrderDateChange={setOrderDate}
              trigger={trigger}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mt-2">
          <h3 className="text-base font-extrabold text-text flex items-center gap-2">
            <ShoppingBag className="size-5 text-primary" />
            Order Items ({items.length})
          </h3>
        </div>

        <div className="flex flex-col gap-4">
          {items.map((item, index) => (
            <CreateOrderItemCard
              key={index}
              item={item}
              index={index}
              canRemove={items.length > 1}
              showDetails={!!showDetails[index]}
              onToggleDetails={toggleDetails}
              onOpenProductDialog={handleOpenProductDialog}
              onRemoveItem={removeItem}
              onInputChange={handleInputChange}
              setQuantityRef={(itemIndex, element) => {
                quantityRefs.current[itemIndex] = element;
              }}
            />
          ))}
        </div>

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

          <Button
            type="submit"
            disabled={!isFormValid() || createOrderMutation.isPending}
            className={`rounded-xl px-6 py-2.5 font-bold text-xs shadow-sm cursor-pointer ${
              !isFormValid() || createOrderMutation.isPending
                ? "bg-muted text-text-muted border-border cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/95"
            }`}
          >
            {createOrderMutation.isPending ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Order"
            )}
          </Button>
        </div>
      </form>

      <SelectProductDialog
        open={openProductDialog}
        onOpenChange={setOpenProductDialog}
        products={products}
        isLoading={isLoadingProducts}
        onSelect={handleSelectProduct}
      />

      <CreateCustomerDialog
        open={openCreateUserDialog}
        onOpenChange={setOpenCreateUserDialog}
        onCustomerCreated={setUserId}
        refetchUsers={refetchUsers}
        trigger={trigger}
      />
    </div>
  );
}
