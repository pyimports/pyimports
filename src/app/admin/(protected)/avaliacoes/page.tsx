import type { Metadata } from "next";
import { listCustomerReviewsAdmin } from "@/lib/actions/customer-reviews";
import { getProductNameOptions } from "@/lib/db/admin";
import { AvaliacoesAdminClient } from "./AvaliacoesAdminClient";
import type { AdminCustomerReview } from "@/lib/actions/customer-reviews";

export const metadata: Metadata = { title: "Avaliações — Admin" };

export default async function AvaliacoesAdminPage() {
  let reviews: AdminCustomerReview[] = [];
  try {
    reviews = await listCustomerReviewsAdmin();
  } catch {
    reviews = [];
  }

  let productOptions: { value: string; label: string }[] = [];
  try {
    productOptions = await getProductNameOptions();
  } catch {
    productOptions = [];
  }

  return (
    <div className="p-6">
      <AvaliacoesAdminClient initialReviews={reviews} productOptions={productOptions} />
    </div>
  );
}
