import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  useActiveCategories, 
  useActiveSubCategoriesByCategory, 
  useBrandsList, 
  useCreateProductMutation 
} from "../hooks/use-master";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { useWebHaptics } from "web-haptics/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CreateCaterogy from "./CreateCatagory";
import CreateSubCaterogy from "./CreateSubCatagory";
import CreateBrand from "./CreateBrand";

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

export function AddProductPage() {
  const { trigger } = useWebHaptics();
  const createMutation = useCreateProductMutation();

  // Dialog States
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // React Query Fetches
  const { data: categories = [], refetch: refetchCategories } = useActiveCategories();
  const { data: subcategories = [], refetch: refetchSubCategories } = useActiveSubCategoriesByCategory(categoryId);
  const { data: brands = [], refetch: refetchBrands } = useBrandsList();

  useEffect(() => {
    if (categoryId) {
      refetchSubCategories();
    }
  }, [categoryId, refetchSubCategories]);

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
      } else {
        setSizeSum("");
      }
    }
  }, [sizeUnit, length, breadth]);

  // Validations
  const validateOnlyDigits = (val: string) => /^\d*$/.test(val);
  const validateDecimal = (val: string) => /^\d*\.?\d{0,2}$/.test(val);

  // Dialog Callbacks
  const populateCategoryName = async () => {
    setShowCategoryModal(false);
    await refetchCategories();
  };

  const populateCategorySub = async () => {
    setShowSubCategoryModal(false);
    if (categoryId) {
      await refetchSubCategories();
    }
  };

  const populateBrand = async () => {
    setShowBrandModal(false);
    await refetchBrands();
  };

  const openSubCategoryModal = () => {
    trigger("light");
    if (!categoryId) {
      alert("Please select a Category first.");
      return;
    }
    localStorage.setItem("products_catg_id", categoryId);
    setShowSubCategoryModal(true);
  };

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
    if (selectedFile) {
      formData.append("products_image", selectedFile);
    }

    createMutation.mutate(formData);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 w-full max-w-7xl mx-auto pb-24 md:pb-6 animate-fade-in duration-300">
      <div className="flex items-center gap-3 bg-panel border border-border/80 p-4 rounded-2xl shadow-xs">
        <Button asChild variant="outline" size="icon" className="rounded-full h-9 w-9 cursor-pointer">
          <Link to="/products" onClick={() => trigger("light")}>
            <ArrowLeft className="size-5 text-text-muted" />
          </Link>
        </Button>
        <h2 className="text-text text-lg font-extrabold tracking-tight">Create Product</h2>
      </div>

      <Card className="bg-panel border border-border/80 shadow-sm rounded-2xl pt-0">
        <CardContent className="p-5 md:p-6">
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
                <div className="flex gap-2">
                  <Select value={categoryId} onValueChange={(val) => { setCategoryId(val); setSubCategoryId(""); }}>
                    <SelectTrigger className="flex-1 bg-background border-border rounded-xl h-10">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border rounded-xl">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)} className="text-xs font-semibold rounded-lg cursor-pointer">
                          {cat.product_category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => { trigger("light"); setShowCategoryModal(true); }}
                    className="rounded-xl size-10 border border-border shrink-0 cursor-pointer"
                  >
                    <Plus className="size-4 text-text-muted" />
                  </Button>
                </div>
              </div>

              {/* Sub-category */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Sub Category *</Label>
                <div className="flex gap-2">
                  <Select value={subCategoryId} onValueChange={setSubCategoryId} disabled={!categoryId}>
                    <SelectTrigger className="flex-1 bg-background border-border rounded-xl h-10">
                      <SelectValue placeholder={categoryId ? "Select Sub Category" : "Choose Category First"} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border rounded-xl">
                      {subcategories.map((sub) => (
                        <SelectItem key={sub.id} value={String(sub.id)} className="text-xs font-semibold rounded-lg cursor-pointer">
                          {sub.product_sub_category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={openSubCategoryModal}
                    disabled={!categoryId}
                    className="rounded-xl size-10 border border-border shrink-0 cursor-pointer"
                  >
                    <Plus className="size-4 text-text-muted" />
                  </Button>
                </div>
              </div>

              {/* Brand */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-bold text-text-muted uppercase tracking-wider">Brand</Label>
                <div className="flex gap-2">
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger className="flex-1 bg-background border-border rounded-xl h-10">
                      <SelectValue placeholder="Select Brand" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border rounded-xl">
                      {brands.map((b) => (
                        <SelectItem key={b.brands_name} value={b.brands_name} className="text-xs font-semibold rounded-lg cursor-pointer">
                          {b.brands_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => { trigger("light"); setShowBrandModal(true); }}
                    className="rounded-xl size-10 border border-border shrink-0 cursor-pointer"
                  >
                    <Plus className="size-4 text-text-muted" />
                  </Button>
                </div>
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
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="w-full bg-background border-border rounded-xl h-10">
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border rounded-xl">
                    {unitOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs font-semibold rounded-lg cursor-pointer">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select value={sizeUnit} onValueChange={setSizeUnit}>
                  <SelectTrigger className="w-full bg-background border-border rounded-xl h-10">
                    <SelectValue placeholder="Select Size Unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border rounded-xl">
                    {sizeUnitOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs font-semibold rounded-lg cursor-pointer">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

              {/* Product Image */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="image" className="text-xs font-bold text-text-muted uppercase tracking-wider">Product Image</Label>
                <Input
                  id="image"
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="bg-background border-border rounded-xl cursor-pointer py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border/40">
              <Button asChild variant="outline" className="rounded-xl font-bold text-xs cursor-pointer">
                <Link to="/products" onClick={() => trigger("light")}>
                  Cancel
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !categoryId || !subCategoryId || !rate}
                className="rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer shadow-sm"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Product"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Inline Creation Dialog Modals */}
      <CreateCaterogy 
        open={showCategoryModal} 
        onClick={() => setShowCategoryModal(false)} 
        populateCategoryName={populateCategoryName} 
      />
      <CreateSubCaterogy 
        open={showSubCategoryModal} 
        onClick={() => setShowSubCategoryModal(false)} 
        populateCategorySub={populateCategorySub} 
      />
      <CreateBrand 
        open={showBrandModal} 
        onClick={() => setShowBrandModal(false)} 
        populateBrand={populateBrand} 
      />
    </div>
  );
}
