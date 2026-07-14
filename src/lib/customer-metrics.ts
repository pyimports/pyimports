import type { Customer } from "@/types";

// Função pura (sem acesso a banco) — precisa viver fora de lib/db/customers.ts
// porque aquele arquivo importa createServiceClient (server-only, usa
// next/headers). Um Client Component importando qualquer coisa daquele
// arquivo puxa esse import server-only pro bundle do client e quebra o build.
export function computeCustomerMetrics(customers: Customer[]) {
  return {
    total_customers: customers.length,
    total_orders: customers.reduce((acc, c) => acc + c.total_orders, 0),
    total_revenue: customers.reduce((acc, c) => acc + c.total_spent, 0),
    vip_count: customers.filter((c) => c.is_vip).length,
  };
}
