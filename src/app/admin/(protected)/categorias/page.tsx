import type { Metadata } from "next";
import { getAllCategoriesAdmin, getParentCategoriesForSelect } from "@/lib/db/admin";
import { CategoriasClient } from "./CategoriasClient";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriasAdminPage() {
  const [categories, parentOptions] = await Promise.all([
    getAllCategoriesAdmin(),
    getParentCategoriesForSelect(),
  ]);

  return <CategoriasClient initialCategories={categories} parentOptions={parentOptions} />;
}
