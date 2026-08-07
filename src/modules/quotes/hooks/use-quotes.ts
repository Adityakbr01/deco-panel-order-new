import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Quotation, QuotationDetailResponse } from "../types";

// 1. Fetch Open (submitted) Quotations List
export function useOpenQuotesList() {
  return useQuery({
    queryKey: ["open-quotes-list"],
    queryFn: async () => {
      const response = await api.get<{ quotation: Quotation[] }>("/web-fetch-submit-quotation-list");
      return response.data?.quotation || [];
    },
  });
}

// 2. Fetch Processing Quotations List
export function useProcessingQuotesList() {
  return useQuery({
    queryKey: ["processing-quotes-list"],
    queryFn: async () => {
      const response = await api.get<{ quotation: Quotation[] }>("/web-fetch-submit-quotation-processing-list");
      return response.data?.quotation || [];
    },
  });
}

// 3. Fetch Completed/Cancel Quotations List
export function useCompletedQuotesList() {
  return useQuery({
    queryKey: ["completed-quotes-list"],
    queryFn: async () => {
      const response = await api.get<{ quotation: Quotation[] }>("/web-fetch-quotation-list");
      return response.data?.quotation || [];
    },
  });
}

// 4. Fetch Quotation Details for Editing
export function useQuotationDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: ["quotation-detail", id],
    queryFn: async () => {
      const response = await api.get<QuotationDetailResponse>(`/web-fetch-quotation-by-Id/${id}`);
      console.group("📥 [Quotation GET Fetch Debug - Edit Page]");
      console.log("Fetched Quote ID:", id);
      console.log("Backend Returned Quotation:", response.data?.quotation);
      console.log("Backend Returned QuotationSub Items:", response.data?.quotationSub);
      console.groupEnd();
      return response.data;
    },
    enabled: !!id,
  });
}

// 5. Fetch Quotation Details for Viewing/Printing
export function useQuotationViewDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: ["quotation-view-detail", id],
    queryFn: async () => {
      const response = await api.get<QuotationDetailResponse>(`/web-fetch-quotation-view-by-Id/${id}`);
      console.group("📥 [Quotation GET Fetch Debug - View Page]");
      console.log("Fetched Quote ID:", id);
      console.log("Backend Returned Quotation:", response.data?.quotation);
      console.log("Backend Returned QuotationSub Items:", response.data?.quotationSub);
      console.groupEnd();
      return response.data;
    },
    enabled: !!id,
  });
}

// 6. Mutate Open Quotation -> Convert to Processing
export function useProceedQuotationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | string) => {
      const response = await api.put<{ code: number; msg?: string; quotation: Quotation[] }>(`/web-update-proceed/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-quotes-list"] });
      queryClient.invalidateQueries({ queryKey: ["processing-quotes-list"] });
    },
  });
}

// 7. Mutate Processing Quotation -> Convert to Completed or Cancel
export function useCompleteQuotationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number | string; status: "Completed" | "Cancel" }) => {
      const response = await api.put<{ code: number; msg?: string; quotation: Quotation[] }>(
        `/web-update-quotation-completed/${id}`,
        { id, quotation_status: status }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processing-quotes-list"] });
      queryClient.invalidateQueries({ queryKey: ["completed-quotes-list"] });
    },
  });
}

// 8. Mutate Update Quotation Details (Edit Page)
export function useUpdateQuotationMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number | string; payload: any }) => {
      console.group("[Quotation Update Debug]");
      console.log("Updating Quotation ID:", id);
      console.log("Payload sent to API:", JSON.stringify(payload, null, 2));
      console.groupEnd();

      let response;
      try {
        response = await api.post<{ code: number; msg?: string }>(`/web-update-quotation/${id}?_method=PUT`, payload);
      } catch {
        response = await api.put<{ code: number; msg?: string }>(`/web-update-quotation/${id}`, payload);
      }

      console.group("[Quotation Update API Response]");
      console.log("Response:", response.data);
      console.groupEnd();

      if (typeof window !== "undefined") {
        (window as any).__lastQuotationUpdateDebug = {
          quoteId: id,
          payload,
          response: response.data,
          timestamp: new Date().toISOString(),
        };
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quotation-detail", String(variables.id)] });
      queryClient.invalidateQueries({ queryKey: ["quotation-detail", Number(variables.id)] });
      queryClient.invalidateQueries({ queryKey: ["quotation-view-detail", String(variables.id)] });
      queryClient.invalidateQueries({ queryKey: ["quotation-view-detail", Number(variables.id)] });
      queryClient.invalidateQueries({ queryKey: ["open-quotes-list"] });
      queryClient.invalidateQueries({ queryKey: ["processing-quotes-list"] });
      queryClient.invalidateQueries({ queryKey: ["completed-quotes-list"] });
    },
  });
}

// 9. Mutate Create Quotation Indirect (Add Page based on Order ID)
export function useCreateQuotationIndirectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: number | string; payload: any }) => {
      const response = await api.put<{ code: number; msg?: string }>(`/web-create-quotation-indirect/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-quotes-list"] });
    },
  });
}

// 10. Fetch Customer Last Paid Rate for Product
export function useFetchLastRateMutation() {
  return useMutation({
    mutationFn: async ({ userId, productId }: { userId: number | string; productId: number | string }) => {
      const response = await api.post<{ data: { quotation_sub_rate: number | null } }>(
        "/web-fetch-quotation-last-rate",
        {
          orders_user_id: userId,
          orders_sub_product_id: productId,
        }
      );
      return response.data?.data?.quotation_sub_rate ?? null;
    },
  });
}

// 11. Fetch Order details by ID (for creating quotation indirect)
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
