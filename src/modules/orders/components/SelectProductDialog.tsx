import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, X, Package, ShieldCheck } from "lucide-react";
import { OrderProduct } from "../types";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useWebHaptics } from "web-haptics/react";

interface SelectProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: OrderProduct[];
  isLoading: boolean;
  onSelect: (product: OrderProduct) => void;
}

export default function SelectProductDialog({
  open,
  onOpenChange,
  products,
  isLoading,
  onSelect,
}: SelectProductDialogProps) {
  const { trigger } = useWebHaptics();
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter((product) => {
    const code = product.products_code ?? product.product_code ?? product.productCode ?? "";
    const searchString = `${code} ${product.product_category} ${product.product_sub_category} ${product.products_brand} ${product.products_thickness} ${product.products_size1} ${product.products_size2}`.toLowerCase();
    return searchString.includes(search.toLowerCase());
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full h-[80vh] flex flex-col p-0 overflow-hidden bg-popover border border-border rounded-2xl shadow-xl animate-in duration-200">
        <DialogHeader className="p-4 border-b border-border bg-muted/20">
          <DialogTitle className="text-base font-bold text-text flex items-center gap-2">
            <Package className="size-5 text-primary" />
            Select Product
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select a product from the list to add to your order.
          </DialogDescription>
        </DialogHeader>

        {/* Search Header */}
        <div className="p-4 border-b border-border/60 bg-muted/5 relative">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 size-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by Code, Category, Brand, Size, Thickness..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background border border-border focus:border-primary/80 focus:ring-1 focus:ring-primary/45 rounded-xl pl-10 pr-10 py-2.5 text-sm font-medium outline-none transition-all placeholder:text-text-muted"
          />
          {search && (
            <button
              onClick={() => {
                trigger("light");
                setSearch("");
              }}
              className="absolute right-7 top-1/2 -translate-y-1/2 text-text-muted hover:text-text rounded-full p-0.5 hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Products List Area */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Spinner className="size-8 text-primary" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid gap-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    trigger("light");
                    onSelect(product);
                  }}
                  className="p-3 bg-panel border border-border/80 hover:border-primary/40 hover:bg-primary/[0.01] rounded-xl cursor-pointer transition-all flex flex-col gap-2 group active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-sm text-text group-hover:text-primary transition-colors">
                        {product.product_sub_category}
                      </span>
                      <span className="text-xs text-text-muted font-medium">
                        Category: {product.product_category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {(product.products_code || product.product_code || product.productCode) && (
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15">
                          Code: {product.products_code ?? product.product_code ?? product.productCode}
                        </span>
                      )}
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-text-muted">
                        ID: {product.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 items-center mt-1">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10">
                      Brand: {product.products_brand}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10">
                      {product.products_thickness} MM
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10">
                      {product.products_size1 && product.products_size2 && Number(product.products_size2) > 0
                        ? `${product.products_size1}x${product.products_size2} ${product.products_size_unit || ""}`
                        : product.products_size1
                        ? `${product.products_size1} ${product.products_size_unit || ""}`
                        : product.products_size_unit}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 ml-auto">
                      Unit: {product.products_unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-2 text-text-muted">
              <span className="text-3xl">🔍</span>
              <p className="font-bold text-text/80">No products found</p>
              <p className="text-xs max-w-xs">
                Try adjusting your search filters to find what you are looking for.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              trigger("light");
              onOpenChange(false);
            }}
            className="cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
