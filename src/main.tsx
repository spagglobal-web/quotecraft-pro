import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./styles.css";

import AppLayout from "@/pages/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import QuotationsList from "@/pages/QuotationsList";
import QuotationNew from "@/pages/QuotationNew";
import QuotationView from "@/pages/QuotationView";
import BillsList from "@/pages/BillsList";
import BillNew from "@/pages/BillNew";
import BillView from "@/pages/BillView";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/quotations" element={<QuotationsList />} />
              <Route path="/quotations/new" element={<QuotationNew />} />
              <Route path="/quotations/:id" element={<QuotationView />} />
              <Route path="/bills" element={<BillsList />} />
              <Route path="/bills/new" element={<BillNew />} />
              <Route path="/bills/:id" element={<BillView />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
