import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderByIdAdmin } from "@/lib/db/orders";
import { getOrderById } from "@/data/mock-orders";
import { PedidoClient } from "./PedidoClient";
import type { AdminOrder } from "@/lib/db/orders";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const o = await getOrderByIdAdmin(id);
    return { title: o ? `Pedido ${o.order_number}` : "Pedido" };
  } catch {
    const o = getOrderById(id);
    return { title: o ? `Pedido ${o.order_number}` : "Pedido" };
  }
}

export default async function PedidoDetailPage({ params }: Props) {
  const { id } = await params;

  let order: AdminOrder | null = null;

  try {
    order = await getOrderByIdAdmin(id);
  } catch {
    const mock = getOrderById(id);
    if (mock) {
      order = {
        ...mock,
        customer_id: mock.customer_id ?? "",
        item_count: mock.items?.length ?? 0,
      };
    }
  }

  if (!order) notFound();

  return <PedidoClient order={order} />;
}
