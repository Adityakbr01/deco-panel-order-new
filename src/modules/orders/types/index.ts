export interface PendingOrder {
  id: number;
  full_name: string;
  orders_no: number;
  orders_date: string;
  orders_status: string;
}

export interface CategoryBanner {
  product_category: string;
  product_category_image: string;
}

export interface DashboardDataResponse {
  productsCount: number;
  ordersCount: number;
  usersCount: number;
  pendingOrder: PendingOrder[];
  categoryBanner: CategoryBanner[];
}

export interface OrderProduct {
  id: number;
  products_catg_id?: string | number;
  product_catg_id?: string | number;
  products_category_id?: string | number;
  product_category_id?: string | number;
  category_id?: string | number;
  catg_id?: string | number;
  products_sub_catg_id?: string | number;
  product_sub_catg_id?: string | number;
  products_sub_category_id?: string | number;
  product_sub_category_id?: string | number;
  sub_category_id?: string | number;
  sub_catg_id?: string | number;
  product_category: string;
  product_sub_category: string;
  products_brand: string;
  products_thickness: string;
  products_unit: string;
  products_size1: string;
  products_size2: string;
  products_size_unit: string;
  products_code?: string | number | null;
  product_code?: string | number | null;
  productCode?: string | number | null;
}

export interface UserProfile {
  id: number;
  full_name: string;
  user_name?: string;
  email?: string;
  mobile?: string;
}

export interface CreateUserInput {
  name: string;
  email?: string;
  mobile: string;
  address?: string;
  state?: string;
  pincode?: string;
  user_image?: File | null;
}

export interface CreateOrderItemInput {
  id?: string | number;
  orders_sub_product_id: string | number;
  orders_sub_design_no: string;
  orders_sub_catg_id: string | number;
  orders_sub_sub_catg_id: string | number;
  orders_sub_brand: string;
  orders_sub_thickness: string;
  orders_sub_unit: string;
  orders_sub_size1: string;
  orders_sub_size2: string;
  orders_sub_size_unit: string;
  orders_sub_quantity: string | number;
}

export interface CreateOrderInput {
  orders_user_id: string;
  orders_date: string;
  orders_year: string;
  orders_count: number;
  order_sub_data: CreateOrderItemInput[];
}
