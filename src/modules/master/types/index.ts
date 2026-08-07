export interface Category {
  id: number;
  product_category: string;
  product_category_image: string | null;
  product_sort: string | number;
  product_category_status: string;
}

export interface CategoryListResponse {
  productCategoryList: Category[];
}

export interface SubCategory {
  id: number;
  product_category_id: string | number;
  product_category?: string; // Mapped parent category name
  product_sub_category: string;
  product_sub_category_image: string | null;
  product_sub_category_status: string;
}

export interface SubCategoryListResponse {
  productSubCategoryList: SubCategory[];
}

export interface Brand {
  id: number;
  brands_name: string;
  brands_image?: string | null;
  brands_status: string;
  brands_sort?: string | number;
}

export interface BrandListResponse {
  brands: Brand[];
}

export interface Product {
  id: number;
  products_catg_id: string | number;
  products_sub_catg_id: string | number;
  product_category?: string; // Resolved name
  product_sub_category?: string; // Resolved name
  products_code?: string | number | null;
  products_brand: string;
  products_thickness: string;
  products_unit: string;
  products_size1: string;
  products_size2: string;
  products_size_unit: string;
  products_size_sum?: string | number | null;
  products_rate: string | number;
  product_status: string;
  products_image: string | null;
}

export interface ProductListResponse {
  products: Product[];
}
