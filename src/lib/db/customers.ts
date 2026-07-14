import { createServiceClient } from "@/lib/supabase/server";
import type { Customer, CustomerNote, OrderStatus } from "@/types";
import type { DbCustomer, DbCustomerNote } from "@/types/database.types";

function toCustomerNote(row: DbCustomerNote): CustomerNote {
  return {
    id: row.id,
    customer_id: row.customer_id,
    note: row.note,
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

function toCustomer(row: DbCustomer, notes?: DbCustomerNote[]): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    cpf_cnpj: row.cpf_cnpj ?? undefined,
    street: row.street,
    number: row.number,
    complement: row.complement ?? undefined,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    zip_code: row.zip_code,
    is_vip: row.is_vip,
    vip_marked_at: row.vip_marked_at ?? undefined,
    total_orders: row.total_orders,
    total_spent: Number(row.total_spent),
    average_ticket: Number(row.average_ticket),
    first_order_at: row.first_order_at ?? undefined,
    last_order_at: row.last_order_at ?? undefined,
    notes: notes?.map(toCustomerNote),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getAllCustomersAdmin(): Promise<Customer[]> {
  const service = createServiceClient();

  const { data, error } = await service
    .from("customers")
    .select("*")
    .order("total_spent", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => toCustomer(row as DbCustomer));
}

export async function getCustomerByIdAdmin(id: string): Promise<Customer | null> {
  const service = createServiceClient();

  const [{ data: customer, error }, { data: notes, error: notesError }] = await Promise.all([
    service.from("customers").select("*").eq("id", id).maybeSingle(),
    service
      .from("customer_notes")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (error) throw error;
  if (!customer) return null;
  if (notesError) throw notesError;

  return toCustomer(customer as DbCustomer, (notes ?? []) as DbCustomerNote[]);
}

export interface CustomerOrderSummary {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  status: OrderStatus;
}

export async function getOrdersByCustomerAdmin(customerId: string): Promise<CustomerOrderSummary[]> {
  const service = createServiceClient();

  const { data, error } = await service
    .from("orders")
    .select("id, order_number, created_at, total, status")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    created_at: o.created_at,
    total: Number(o.total),
    status: o.status as OrderStatus,
  }));
}

export interface CustomerCouponSummary {
  id: string;
  code: string;
  is_active: boolean;
}

export async function getClientCouponsAdmin(customerId: string): Promise<CustomerCouponSummary[]> {
  const service = createServiceClient();

  const { data, error } = await service
    .from("coupons")
    .select("id, code, is_active")
    .eq("customer_specific_id", customerId);

  if (error) throw error;

  return data ?? [];
}
