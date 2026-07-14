import type { Metadata } from "next";
import { getAllReviewsAdmin } from "@/lib/actions/reviews";
import { getProductsForSelect } from "@/lib/db/admin";
import { FeedbacksClient } from "./FeedbacksClient";
import type { Review } from "@/types";

export const metadata: Metadata = { title: "Feedbacks — Admin" };

export default async function FeedbacksPage() {
  let reviews: Review[] = [];
  try {
    reviews = await getAllReviewsAdmin();
  } catch {
    reviews = [];
  }

  const productOptions = await getProductsForSelect();

  return (
    <div className="p-6">
      <FeedbacksClient initialReviews={reviews} productOptions={productOptions} />
    </div>
  );
}
