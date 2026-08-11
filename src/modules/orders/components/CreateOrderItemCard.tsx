import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { CreateOrderItemInput } from "../types";

interface CreateOrderItemCardProps {
  item: CreateOrderItemInput;
  index: number;
  canRemove: boolean;
  showDetails: boolean;
  onToggleDetails: (index: number) => void;
  onOpenProductDialog: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onInputChange: (
    index: number,
    field: keyof CreateOrderItemInput,
    value: string,
  ) => void;
  setQuantityRef: (index: number, element: HTMLInputElement | null) => void;
}

function getProductSpecs(item: CreateOrderItemInput) {
  return [
    { label: "Category", val: item.orders_sub_catg_id },
    { label: "Sub Category", val: item.orders_sub_sub_catg_id },
    { label: "Brand", val: item.orders_sub_brand },
    {
      label: "Thickness",
      val: item.orders_sub_thickness ? `${item.orders_sub_thickness} MM` : "",
    },
    { label: "Unit", val: item.orders_sub_unit },
    {
      label: "Size",
      val: item.orders_sub_size1
        ? item.orders_sub_size2 && Number(item.orders_sub_size2) > 0
          ? `${item.orders_sub_size1}x${item.orders_sub_size2} ${item.orders_sub_size_unit || ""}`
          : `${item.orders_sub_size1} ${item.orders_sub_size_unit || ""}`
        : "",
    },
  ];
}

export function CreateOrderItemCard({
  item,
  index,
  canRemove,
  showDetails,
  onToggleDetails,
  onOpenProductDialog,
  onRemoveItem,
  onInputChange,
  setQuantityRef,
}: CreateOrderItemCardProps) {
  const productSpecs = getProductSpecs(item);

  return (
    <Card className="bg-panel border border-border/80 shadow-xs hover:shadow-sm hover:border-border-hover rounded-2xl overflow-hidden transition-all pt-0">
      <CardContent className="p-4 flex flex-col gap-3">
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
              onClick={() => onOpenProductDialog(index)}
              className="flex-1 bg-background border border-primary/20 hover:border-primary/50 focus:border-primary/80 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none cursor-pointer placeholder:text-primary/75 text-primary transition-all text-center"
            />

            {canRemove && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="rounded-xl h-[42px] w-[42px] cursor-pointer"
                onClick={() => onRemoveItem(index)}
              >
                <Trash2 className="size-4.5" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Design No"
              value={item.orders_sub_design_no}
              onChange={(event) =>
                onInputChange(index, "orders_sub_design_no", event.target.value)
              }
              className="w-full bg-background border border-border focus:border-primary/80 rounded-xl px-3 py-2.5 text-sm font-medium outline-none"
            />
            <input
              ref={(element) => setQuantityRef(index, element)}
              placeholder="Quantity"
              required
              value={item.orders_sub_quantity}
              inputMode="numeric"
              pattern="[0-9]*"
              onChange={(event) => {
                const val = event.target.value;
                if (/^\d*$/.test(val)) {
                  onInputChange(index, "orders_sub_quantity", val);
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
                onClick={() => onToggleDetails(index)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-border bg-background rounded-xl text-text-muted hover:text-text cursor-pointer transition-all"
              >
                <span className="text-xs font-semibold">
                  {showDetails ? "Hide Product Specs" : "Show Product Specs"}
                </span>
                {showDetails ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>

              {showDetails && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/20 border border-border/50 rounded-xl animate-in duration-200">
                  {productSpecs.map((spec) => (
                    <div key={spec.label} className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">
                        {spec.label}
                      </span>
                      <span className="text-xs font-bold text-text">
                        {spec.val || "-"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto scrollbar-thin">
          <div className="flex items-center gap-3.5 min-w-[1000px] py-1">
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
                onClick={() => onOpenProductDialog(index)}
                className="w-full bg-background border border-primary/20 hover:border-primary/50 text-center font-bold text-xs text-primary rounded-xl px-3 py-2.5 cursor-pointer placeholder:text-primary outline-none focus:ring-1 focus:ring-primary/45 transition-all"
              />
            </div>

            <div className="grid grid-cols-8 gap-2.5 flex-1">
              {[
                { placeholder: "Category", val: item.orders_sub_catg_id },
                {
                  placeholder: "Sub Category",
                  val: item.orders_sub_sub_catg_id,
                },
                { placeholder: "Brand", val: item.orders_sub_brand },
                {
                  placeholder: "Thickness",
                  val: item.orders_sub_thickness
                    ? `${item.orders_sub_thickness} MM`
                    : "",
                },
                { placeholder: "Unit", val: item.orders_sub_unit },
                { placeholder: "Length", val: item.orders_sub_size1 },
                { placeholder: "Breadth", val: item.orders_sub_size2 },
                { placeholder: "Size Unit", val: item.orders_sub_size_unit },
              ].map((meta) => (
                <input
                  key={meta.placeholder}
                  type="text"
                  placeholder={meta.placeholder}
                  value={meta.val || ""}
                  disabled
                  className="w-full bg-muted/40 border border-border/40 text-text-muted rounded-xl px-2 py-2.5 text-xs text-center font-semibold select-none"
                />
              ))}
            </div>

            <div className="w-[110px] shrink-0">
              <input
                placeholder="Design No"
                value={item.orders_sub_design_no}
                onChange={(event) =>
                  onInputChange(
                    index,
                    "orders_sub_design_no",
                    event.target.value,
                  )
                }
                className="w-full bg-background border border-border focus:border-primary/80 focus:ring-1 focus:ring-primary/45 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none text-text text-center transition-all"
              />
            </div>

            <div className="w-[90px] shrink-0">
              <input
                ref={(element) => setQuantityRef(index, element)}
                placeholder="Quantity"
                required
                value={item.orders_sub_quantity}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(event) => {
                  const val = event.target.value;
                  if (/^\d*$/.test(val)) {
                    onInputChange(index, "orders_sub_quantity", val);
                  }
                }}
                maxLength={6}
                className="w-full bg-background border border-border focus:border-primary/80 focus:ring-1 focus:ring-primary/45 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-text text-center transition-all"
              />
            </div>

            {canRemove && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full hover:bg-rose-500/10 hover:text-rose-600 h-9 w-9 cursor-pointer shrink-0"
                onClick={() => onRemoveItem(index)}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
