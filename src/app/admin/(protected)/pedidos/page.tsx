import type { Metadata } from "next";
import { getAllOrdersAdmin } from "@/lib/db/orders";
import { mockOrders } from "@/data/mock-orders";
import { PedidosClient } from "./PedidosClient";
import type { AdminOrder } from "@/lib/db/orders";

export const metadata: Metadata = { title: "Pedidos" };

function mockToAdminOrders(): AdminOrder[] {
  return mockOrders.map((o) => ({
    ...o,
    customer_id: o.customer_id ?? "",
    item_count: o.items?.length ?? 0,
  }));
}

export default async function PedidosPage() {
  let orders: AdminOrder[];

  try {
    orders = await getAllOrdersAdmin();
  } catch {
    orders = mockToAdminOrders();
  }

  return <PedidosClient initialOrders={orders} />;
}
