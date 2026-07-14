import type { Metadata } from "next";
import { getAllCustomersAdmin } from "@/lib/db/customers";
import { mockCustomers } from "@/data/mock-customers";
import { ClientesClient } from "./ClientesClient";
import type { Customer } from "@/types";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage() {
  let customers: Customer[];

  try {
    customers = await getAllCustomersAdmin();
  } catch {
    customers = mockCustomers;
  }

  return <ClientesClient initialCustomers={customers} />;
}
