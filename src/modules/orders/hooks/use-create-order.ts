import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { OrderProduct, UserProfile, CreateOrderInput, CreateUserInput } from "../types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { withProductSizeUnit } from "@/utils/product";

function isOrderUpdateDebugEnabled() {
  return (
    typeof window !== "undefined" &&
    (import.meta.env.DEV || window.localStorage.getItem("debug_order_update") === "1")
  );
}

function getProductId(product: any) {
  return product?.id ?? product?.product_id ?? product?.products_id;
}

function pickFirstPresent(...values: unknown[]) {
  return values.find(
    (value) =>
      value !== undefined && value !== null && String(value).trim() !== "",
  );
}

function getProductCategoryId(product: any) {
  return pickFirstPresent(
    product?.products_catg_id,
    product?.product_catg_id,
    product?.products_cat_id,
    product?.product_cat_id,
    product?.products_category_id,
    product?.product_category_id,
    product?.category_id,
    product?.catg_id,
  );
}

function getProductSubCategoryId(product: any) {
  return pickFirstPresent(
    product?.products_sub_catg_id,
    product?.product_sub_catg_id,
    product?.products_sub_cat_id,
    product?.product_sub_cat_id,
    product?.products_sub_category_id,
    product?.product_sub_category_id,
    product?.sub_category_id,
    product?.sub_catg_id,
  );
}

function getCategoryId(category: any) {
  return pickFirstPresent(
    category?.id,
    category?.product_category_id,
    category?.category_id,
    category?.product_catg_id,
    category?.products_catg_id,
  );
}

function getSubCategoryParentId(subCategory: any) {
  return pickFirstPresent(
    subCategory?.product_category_id,
    subCategory?.products_catg_id,
    subCategory?.category_id,
    subCategory?.catg_id,
  );
}

function getSubCategoryId(subCategory: any) {
  return pickFirstPresent(
    subCategory?.id,
    subCategory?.product_sub_category_id,
    subCategory?.sub_category_id,
    subCategory?.products_sub_catg_id,
    subCategory?.product_sub_catg_id,
  );
}

function normalizeKey(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function extractList(data: any, keys: string[]) {
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  return Array.isArray(data) ? data : [];
}

function createProductIdLookups(categories: any[], subCategories: any[]) {
  const categoriesByName = new Map<string, unknown>();
  const subCategoriesByName = new Map<string, unknown>();
  const subCategoriesByNameAndCategory = new Map<string, unknown>();

  categories.forEach((category) => {
    const id = getCategoryId(category);
    const name = normalizeKey(category?.product_category ?? category?.category);
    if (name && id !== undefined) categoriesByName.set(name, id);
  });

  subCategories.forEach((subCategory) => {
    const id = getSubCategoryId(subCategory);
    const parentId =
      getSubCategoryParentId(subCategory) ??
      categoriesByName.get(normalizeKey(subCategory?.product_category));
    const name = normalizeKey(
      subCategory?.product_sub_category ?? subCategory?.sub_category,
    );

    if (!name || id === undefined) return;

    subCategoriesByName.set(name, id);
    if (parentId !== undefined) {
      subCategoriesByNameAndCategory.set(`${name}:${parentId}`, id);
    }
  });

  return { categoriesByName, subCategoriesByName, subCategoriesByNameAndCategory };
}

function resolveCategoryId(product: any, fallbackProduct: any, lookups?: ReturnType<typeof createProductIdLookups>) {
  const directId =
    getProductCategoryId(product) ??
    getProductCategoryId(fallbackProduct);

  if (directId !== undefined) return directId;

  return lookups?.categoriesByName.get(normalizeKey(product?.product_category));
}

function resolveSubCategoryId(
  product: any,
  fallbackProduct: any,
  categoryId: unknown,
  lookups?: ReturnType<typeof createProductIdLookups>,
) {
  const directId =
    getProductSubCategoryId(product) ??
    getProductSubCategoryId(fallbackProduct);

  if (directId !== undefined) return directId;

  const subCategoryName = normalizeKey(product?.product_sub_category);
  return (
    lookups?.subCategoriesByNameAndCategory.get(`${subCategoryName}:${categoryId}`) ??
    lookups?.subCategoriesByName.get(subCategoryName)
  );
}

function normalizeOrderProduct(
  product: OrderProduct,
  fallbackProduct?: any,
  lookups?: ReturnType<typeof createProductIdLookups>,
) {
  const mergedProduct = {
    ...(fallbackProduct || {}),
    ...product,
  };
  const normalizedProduct = withProductSizeUnit(mergedProduct);
  const categoryId = resolveCategoryId(product, fallbackProduct, lookups);
  const subCategoryId = resolveSubCategoryId(
    product,
    fallbackProduct,
    categoryId,
    lookups,
  );

  return {
    ...normalizedProduct,
    id: getProductId(normalizedProduct),
    products_catg_id: categoryId,
    products_sub_catg_id: subCategoryId,
  };
}

// Fetch users for dropdown
export function useUsersList() {
  return useQuery({
    queryKey: ["users-list"],
    queryFn: async () => {
      const response = await api.get<{ profile: UserProfile[] }>("/web-fetch-users");
      return response.data?.profile || [];
    },
  });
}

// Fetch products for order items selection
export function useProductsList() {
  return useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      const response = await api.get<{ products: OrderProduct[] }>("/web-fetch-product");
      const products = extractList(response.data, ["products", "productList", "productsList"]);
      let fallbackProductsById = new Map<string, any>();
      let productIdLookups: ReturnType<typeof createProductIdLookups> | undefined;

      if (
        products.some(
          (product) => !getProductCategoryId(product) || !getProductSubCategoryId(product),
        )
      ) {
        try {
          const fallbackResponse = await api.get<{ products: any[] }>("/web-fetch-product-list");
          fallbackProductsById = new Map(
            extractList(fallbackResponse.data, ["products", "productList", "productsList"])
              .map((product) => [String(getProductId(product) || ""), product] as [string, any])
              .filter(([productId]) => productId),
          );
        } catch (error) {
          if (isOrderUpdateDebugEnabled()) {
            console.warn("[Order Update Debug] Product id fallback fetch failed", error);
          }
        }
      }

      if (
        products.some((product) => {
          const fallbackProduct = fallbackProductsById.get(String(getProductId(product) || ""));
          return (
            !resolveCategoryId(product, fallbackProduct) ||
            !resolveSubCategoryId(product, fallbackProduct, resolveCategoryId(product, fallbackProduct))
          );
        })
      ) {
        try {
          const [categoriesResponse, subCategoriesResponse] = await Promise.all([
            api.get("/web-fetch-category-list"),
            api.get("/web-fetch-sub-category-list"),
          ]);

          productIdLookups = createProductIdLookups(
            extractList(categoriesResponse.data, [
              "productCategoryList",
              "productCategory",
              "categories",
              "category",
            ]),
            extractList(subCategoriesResponse.data, [
              "productSubCategoryList",
              "productSubCategory",
              "subCategories",
              "subCategory",
            ]),
          );
        } catch (error) {
          if (isOrderUpdateDebugEnabled()) {
            console.warn("[Order Update Debug] Product category lookup fetch failed", error);
          }
        }
      }

      return products.map((product) =>
        normalizeOrderProduct(
          product,
          fallbackProductsById.get(String(getProductId(product) || "")),
          productIdLookups,
        ),
      );
    },
  });
}

// Fetch current year for order reference
export function useCurrentYear() {
  return useQuery({
    queryKey: ["current-year"],
    queryFn: async () => {
      const response = await api.get("/web-fetch-year");
      // Responds with res.data.year.current_year as in the old code
      return response.data?.year?.current_year || response.data?.year || "";
    },
  });
}

// Mutation to create customer inline from order form
export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("email", data.email || "");
      formData.append("mobile", data.mobile);
      if (data.address) formData.append("address", data.address);
      if (data.state) formData.append("state", data.state);
      if (data.pincode) formData.append("pincode", data.pincode);
      if (data.user_image) formData.append("user_image", data.user_image);

      const response = await api.post("/web-create-user", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.msg || "Customer created successfully");
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || "Failed to create customer";
      toast.error(errMsg);
    },
  });
}

// Mutation to create order
export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (data: CreateOrderInput) => {
      const response = await api.post("/web-create-order", data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.msg || "Order created successfully");
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      setTimeout(() => {
        navigate("/");
      }, 500);
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || "Failed to create order";
      toast.error(errMsg);
    },
  });
}

// Fetch single order details by ID
export function useOrderDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: ["order-by-id", id],
    queryFn: async () => {
      const response = await api.get<{ order: any; orderSub: any[] }>(`/web-fetch-order-by-Id/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

// Mutation to update/edit order
export function useUpdateOrderMutation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: any }) => {
      const response = await api.put<{ code: number; msg?: string }>(`/web-update-order/${id}`, data);
      if (typeof window !== "undefined") {
        const debugData = {
          ...((window as any).__lastOrderUpdateDebug || {}),
          response: response.data,
        };
        (window as any).__lastOrderUpdateDebug = debugData;

        if (isOrderUpdateDebugEnabled()) {
          console.groupCollapsed("[Order Update Debug] API response");
          console.log("Response:", response.data);
          console.log("Last debug object:", debugData);
          console.groupEnd();
        }
      }
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.msg || "Order updated successfully");
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["pending-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["order-by-id"] });
      setTimeout(() => {
        navigate("/");
      }, 500);
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || "Failed to update order";
      const errorMessage = error.response?.data?.message || "";
      const backendDiagnosis = errorMessage.includes("Attempt to assign property")
        ? "Laravel likely tried to update an order_sub row using an empty/nonexistent id. Add a create branch for order_sub_data rows where id is empty."
        : undefined;
      if (typeof window !== "undefined") {
        const debugData = {
          ...((window as any).__lastOrderUpdateDebug || {}),
          backendDiagnosis,
          error: error.response?.data || error.message || error,
        };
        (window as any).__lastOrderUpdateDebug = debugData;

        if (isOrderUpdateDebugEnabled()) {
          console.groupCollapsed("[Order Update Debug] API error");
          console.error("Error:", error.response?.data || error);
          console.log("Last debug object:", debugData);
          console.groupEnd();
        }
      }
      toast.error(errMsg);
    },
  });
}
