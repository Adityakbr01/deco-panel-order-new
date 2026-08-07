import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  useProductDetail, 
  useActiveCategories, 
  useActiveSubCategoriesByCategory, 
  useCategoryDetail,
  useSubCategoryDetail,
  useBrandsList, 
  useUpdateProductMutation 
} from "../hooks/use-master";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const unitOptions = [
  { value: "Nos", label: "Nos" },
  { value: "Mtr", label: "Mtr" },
  { value: "Kg", label: "Kg" },
  { value: "MM", label: "MM" },
];

const sizeUnitOptions = [
  { value: "PCS", label: "PCS" },
  { value: "Metres", label: "Metres" },
  { value: "ML", label: "ML" },
  { value: "KG", label: "KG" },
  { value: "LT", label: "LT" },
  { value: "Nos", label: "Nos" },
  { value: "Inch", label: "Inch" },
  { value: "Feet", label: "Feet" },
];

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

export function EditProductPage() {
  const { id } = useParams();
  const { trigger } = useWebHaptics();
  const { data: product, isLoading: isLoadingProduct } = useProductDetail(id);
  const updateMutation = useUpdateProductMutation(id);

  // Form Fields State
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");
  const [productCode, setProductCode] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [thickness, setThickness] = useState("");
  const [unit, setUnit] = useState("");
  const [length, setLength] = useState("");
  const [breadth, setBreadth] = useState("");
  const [sizeUnit, setSizeUnit] = useState("");
  const [sizeSum, setSizeSum] = useState("");
  const [rate, setRate] = useState("");
  const [status, setStatus] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // React Query Fetches
  const { data: categories = [], isLoading: isLoadingCategories } = useActiveCategories();
  const { data: subcategories = [] } = useActiveSubCategoriesByCategory(categoryId);
  const { data: categoryDetail } = useCategoryDetail(categoryId);
  const { data: subCategoryDetail } = useSubCategoryDetail(subCategoryId);
  const { data: brands = [], isLoading: isLoadingBrands } = useBrandsList();
  const selectedCategoryOption = useMemo(
    () => categories.find((category) => String(category.id) === categoryId),
    [categories, categoryId],
  );
  const selectedSubCategoryOption = useMemo(
    () => subcategories.find((subcategory) => String(subcategory.id) === subCategoryId),
    [subcategories, subCategoryId],
  );
  const selectedBrandOption = useMemo(
    () => brands.find((brand) => brand.brands_name === selectedBrand),
    [brands, selectedBrand],
  );
  const selectedCategoryLabel =
    selectedCategoryOption?.product_category ||
    categoryDetail?.product_category ||
    (categoryId ? `Category #${categoryId}` : "");
  const selectedSubCategoryLabel =
    selectedSubCategoryOption?.product_sub_category ||
    subCategoryDetail?.product_sub_category ||
    (subCategoryId ? `Sub Category #${subCategoryId}` : "");

  // Sync loaded product data to state
  useEffect(() => {
    if (product) {
      // Defensively locate the product fields (handling name variations and type conversions)
      const p = product;
      const catgId = p.products_catg_id ?? (p as any).product_category_id ?? (p as any).category_id;
      const subCatgId = p.products_sub_catg_id ?? (p as any).product_sub_category_id ?? (p as any).sub_category_id;
      const productCode = p.products_code ?? (p as any).product_code ?? (p as any).productCode ?? "";
      const brand = p.products_brand ?? (p as any).brand_name ?? (p as any).brands_name ?? "";
      const thickness = p.products_thickness ?? "";
      const unit = p.products_unit ?? "";
      const size1 = p.products_size1 !== undefined && p.products_size1 !== null ? String(p.products_size1) : "";
      const size2 = p.products_size2 !== undefined && p.products_size2 !== null ? String(p.products_size2) : "";
      const sizeUnit = p.products_size_unit ?? "";
      const sizeSum = p.products_size_sum !== undefined && p.products_size_sum !== null ? String(p.products_size_sum) : "";
      const rate = p.products_rate !== undefined && p.products_rate !== null ? String(p.products_rate) : "0.00";
      const status = p.product_status ?? (p as any).products_status ?? "Active";

      setCategoryId(catgId !== undefined && catgId !== null ? String(catgId) : "");
      setSubCategoryId(subCatgId !== undefined && subCatgId !== null ? String(subCatgId) : "");
      setProductCode(productCode !== undefined && productCode !== null ? String(productCode) : "");
      setSelectedBrand(brand);
      setThickness(thickness);
      setUnit(unit);
      setLength(size1);
      setBreadth(size2);
      setSizeUnit(sizeUnit);
      setSizeSum(sizeSum);
      setRate(rate);
      setStatus(status);
    }
  }, [product]);

  // Auto-calculate Products Size Sum: 1 if Metres/KG/Nos, else length * breadth
  useEffect(() => {
    const u = (sizeUnit || "").toUpperCase().trim();
    if (u === "METRES" || u === "METERS" || u === "MTR" || u === "KG" || u === "NOS") {
      setSizeSum("1");
    } else {
      const l = parseFloat(length);
      const b = parseFloat(breadth);
      if (!isNaN(l) && !isNaN(b)) {
        setSizeSum(String(l * b));
      }
    }
  }, [sizeUnit, length, breadth]);

  // Validations
  const validateOnlyDigits = (val: string) => /^\d*$/.test(val);
  const validateDecimal = (val: string) => /^\d*\.?\d{0,2}$/.test(val);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !subCategoryId || !rate) return;
    trigger("heavy");

    const formData = new FormData();
    formData.append("products_code", productCode.trim());
    formData.append("products_catg_id", categoryId);
    formData.append("products_sub_catg_id", subCategoryId);
    formData.append("products_brand", selectedBrand);
    formData.append("products_thickness", thickness);
    formData.append("products_unit", unit);
    formData.append("products_size1", length);
    formData.append("products_size2", breadth);
    formData.append("products_size_unit", sizeUnit);
    formData.append("products_size_sum", sizeSum);
    formData.append("products_rate", rate);
    formData.append("product_status", status);
    if (selectedFile) {
      formData.append("products_image", selectedFile);
    }

    updateMutation.mutate(formData);
  };

  if (isLoadingProduct) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 animate-fade-in">
        <Loader2 className="size-8 text-primary animate-spin" />
        <span className="text-sm font-semibold text-text-muted animate-pulse">Loading product details...</span>
      </div>
    );
  }

  const imageUrl = product?.products_image
    ? `https://decopanel.in/storage/app/public/allimages/${product.products_image}`
    : "https://decopanel.in/storage/app/public/no_image.jpg";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-7xl mx-auto pb-24 md:pb-6 animate-fade-in duration-300">
      <div className="flex items-center gap-3 bg-panel border border-border/80 p-4 rounded-2xl shadow-xs">
        <Button asChild variant="outline" size="icon" className="rounded-full h-9 w-9 cursor-pointer">
          <Link to="/products" onClick={() => trigger("light")}>
            <ArrowLeft className="size-5 text-text-muted" />
          </Link>
        </Button>
        <h2 className="text-text text-lg font-extrabold tracking-tight">Edit Product</h2>
      </div>

      <Card className="bg-panel border border-border/80 shadow-sm rounded-2xl overflow-hidden pt-0">
        <CardContent className="p-5 md:p-6 flex flex-col gap-6">
          {imageUrl && (
            <div className="flex items-center gap-4 p-3 bg-muted/20 border border-border/40 rounded-xl w-fit">
              <img
                src={imageUrl}
                alt="Product image"
                className="w-24 h-24 object-cover rounded-lg border border-border/60 shadow-xs"
                loading="lazy"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Current Image</span>
                <span className="text-xs font-semibold text-text/80 truncate max-w-xs">{product?.products_image || "no_image.jpg"}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {/* Product Code */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="products-code" className="text-xs font-bold text-text-muted uppercase tracking-wider">Product Code</Label>
                <Input
                  id="products-code"
                  type="text"
                  maxLength={50}
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="e.g. DP-1001"
                  className="bg-background border-border rounded-xl"
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Category *</Label>
                <NativeSelect
                  value={categoryId}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    setSubCategoryId("");
                  }}
                  disabled={isLoadingCategories}
                  className="w-full"
                >
                  <NativeSelectOption value="" disabled>
                    Select Category
                  </NativeSelectOption>
                  {categoryId && !selectedCategoryOption && (
                    <NativeSelectOption value={categoryId}>{selectedCategoryLabel}</NativeSelectOption>
                  )}
                  {categories.map((cat) => (
                    <NativeSelectOption key={cat.id} value={String(cat.id)}>
                      {cat.product_category}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              {/* Sub-category */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Sub Category *</Label>
                <NativeSelect
                  value={subCategoryId}
                  onChange={(event) => setSubCategoryId(event.target.value)}
                  disabled={!categoryId}
                  className="w-full"
                >
                  <NativeSelectOption value="" disabled>
                    {categoryId ? "Select Sub Category" : "Choose Category First"}
                  </NativeSelectOption>
                  {subCategoryId && !selectedSubCategoryOption && (
                    <NativeSelectOption value={subCategoryId}>{selectedSubCategoryLabel}</NativeSelectOption>
                  )}
                  {subcategories.map((sub) => (
                    <NativeSelectOption key={sub.id} value={String(sub.id)}>
                      {sub.product_sub_category}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              {/* Brand */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Brand</Label>
                <NativeSelect
                  value={selectedBrand}
                  onChange={(event) => setSelectedBrand(event.target.value)}
                  disabled={isLoadingBrands}
                  className="w-full"
                >
                  <NativeSelectOption value="">Select Brand</NativeSelectOption>
                  {selectedBrand && !selectedBrandOption && (
                    <NativeSelectOption value={selectedBrand}>{selectedBrand}</NativeSelectOption>
                  )}
                  {brands.map((brand) => (
                    <NativeSelectOption key={brand.brands_name} value={brand.brands_name}>
                      {brand.brands_name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {/* Thickness */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="thickness" className="text-xs font-bold text-text-muted uppercase tracking-wider">Thickness</Label>
                <Input
                  id="thickness"
                  type="text"
                  maxLength={6}
                  value={thickness}
                  onChange={(e) => {
                    if (validateDecimal(e.target.value)) setThickness(e.target.value);
                  }}
                  placeholder="e.g. 18"
                  className="bg-background border-border rounded-xl"
                />
              </div>

              {/* Thickness Unit */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Unit</Label>
                <NativeSelect value={unit} onChange={(event) => setUnit(event.target.value)} className="w-full">
                  <NativeSelectOption value="">Select Unit</NativeSelectOption>
                  {unitOptions.map((opt) => (
                    <NativeSelectOption key={opt.value} value={opt.value}>
                      {opt.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              {/* Length */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="length" className="text-xs font-bold text-text-muted uppercase tracking-wider">Length (Size 1)</Label>
                <Input
                  id="length"
                  type="text"
                  maxLength={6}
                  value={length}
                  onChange={(e) => {
                    if (validateDecimal(e.target.value)) setLength(e.target.value);
                  }}
                  placeholder="e.g. 8"
                  className="bg-background border-border rounded-xl"
                />
              </div>

              {/* Breadth */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="breadth" className="text-xs font-bold text-text-muted uppercase tracking-wider">Breadth (Size 2)</Label>
                <Input
                  id="breadth"
                  type="text"
                  maxLength={6}
                  value={breadth}
                  onChange={(e) => {
                    if (validateDecimal(e.target.value)) setBreadth(e.target.value);
                  }}
                  placeholder="e.g. 4"
                  className="bg-background border-border rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {/* Size Unit */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Size Unit</Label>
                <NativeSelect value={sizeUnit} onChange={(event) => setSizeUnit(event.target.value)} className="w-full">
                  <NativeSelectOption value="">Select Size Unit</NativeSelectOption>
                  {sizeUnitOptions.map((opt) => (
                    <NativeSelectOption key={opt.value} value={opt.value}>
                      {opt.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>

              {/* Products Size Sum */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="products-size-sum" className="text-xs font-bold text-text-muted uppercase tracking-wider">Products Size Sum</Label>
                <Input
                  id="products-size-sum"
                  type="text"
                  maxLength={10}
                  value={sizeSum}
                  onChange={(e) => {
                    if (validateDecimal(e.target.value)) setSizeSum(e.target.value);
                  }}
                  placeholder="e.g. 32"
                  className="bg-background border-border rounded-xl"
                />
              </div>

              {/* Rate */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rate" className="text-xs font-bold text-text-muted uppercase tracking-wider">Rate *</Label>
                <Input
                  id="rate"
                  required
                  type="text"
                  maxLength={6}
                  value={rate}
                  onChange={(e) => {
                    if (validateDecimal(e.target.value)) setRate(e.target.value);
                  }}
                  placeholder="e.g. 240.50"
                  className="bg-background border-border rounded-xl"
                />
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Status</Label>
                <NativeSelect value={status} onChange={(event) => setStatus(event.target.value)} className="w-full">
                  <NativeSelectOption value="" disabled>
                    Select Status
                  </NativeSelectOption>
                  {statusOptions.map((opt) => (
                    <NativeSelectOption key={opt.value} value={opt.value}>
                      {opt.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="image" className="text-xs font-bold text-text-muted uppercase tracking-wider">Change Product Image (Optional)</Label>
              <Input
                id="image"
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="bg-background border-border rounded-xl cursor-pointer py-1.5 text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border/40">
              <Button asChild variant="outline" className="rounded-xl font-bold text-xs cursor-pointer">
                <Link to="/products" onClick={() => trigger("light")}>
                  Cancel
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !categoryId || !subCategoryId || !rate}
                className="rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer shadow-sm"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Product"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
