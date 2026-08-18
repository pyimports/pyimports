import type { Metadata } from "next";
import { listCustomerReviewsAdmin } from "@/lib/actions/customer-reviews";
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

  return (
    <div className="p-6">
      <AvaliacoesAdminClient initialReviews={reviews} />
    </div>
  );
}
