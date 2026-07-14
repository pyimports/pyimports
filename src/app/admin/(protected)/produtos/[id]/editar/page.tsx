import { notFound } from "next/navigation";
import { getProductByIdAdmin, getLeafCategoriesForSelect } from "@/lib/db/admin";
import { EditarProdutoForm } from "./EditarProdutoForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarProdutoPage({ params }: Props) {
  const { id } = await params;

  const [product, categoryOptions] = await Promise.all([
    getProductByIdAdmin(id),
    getLeafCategoriesForSelect(),
  ]);

  if (!product) notFound();

  return <EditarProdutoForm product={product} categoryOptions={categoryOptions} />;
}
