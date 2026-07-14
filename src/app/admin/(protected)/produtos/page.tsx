import type { Metadata } from "next";
import { getAllProductsAdmin, getLeafCategoriesForSelect } from "@/lib/db/admin";
import { ProdutosClient } from "./ProdutosClient";

export const metadata: Metadata = { title: "Produtos" };

export default async function ProdutosAdminPage() {
  const [products, categoryOptions] = await Promise.all([
    getAllProductsAdmin(),
    getLeafCategoriesForSelect(),
  ]);

  return (
    <ProdutosClient
      initialProducts={products}
      categoryOptions={categoryOptions}
    />
  );
}
