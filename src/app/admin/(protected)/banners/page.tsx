import type { Metadata } from "next";
import { getAllBanners } from "@/lib/actions/banners";
import { getCategoriesForSelect, getProductsForSelect } from "@/lib/db/admin";
import { BannersClient } from "./BannersClient";
import type { HomeBanner } from "@/types";

export const metadata: Metadata = { title: "Banners — Admin" };

export default async function BannersPage() {
  let banners: HomeBanner[] = [];
  try {
    banners = await getAllBanners();
  } catch {
    banners = [];
  }

  const [categoryOptions, productOptions] = await Promise.all([
    getCategoriesForSelect(),
    getProductsForSelect(),
  ]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <BannersClient
        initialBanners={banners}
        categoryOptions={categoryOptions}
        productOptions={productOptions}
      />
    </div>
  );
}
