import { getLeafCategoriesForSelect } from "@/lib/db/admin";
import { getProductDataForDuplication } from "@/lib/actions/products";
import { NovoProdutoForm } from "./NovoProdutoForm";

interface Props {
  searchParams: Promise<{ duplicate?: string }>;
}

export default async function NovoProdutoPage({ searchParams }: Props) {
  const { duplicate } = await searchParams;

  const [categoryOptions, duplicateFrom] = await Promise.all([
    getLeafCategoriesForSelect(),
    duplicate ? getProductDataForDuplication(duplicate) : Promise.resolve(null),
  ]);

  return (
    <NovoProdutoForm
      categoryOptions={categoryOptions}
      duplicateFrom={duplicateFrom}
      duplicateFromId={duplicate}
    />
  );
}
