import type { Metadata } from "next";
import { Star, Package } from "lucide-react";
import { Container } from "@/components/common/SectionHeader";
import { Badge } from "@/components/common/Badge";
import { StarRatingDisplay } from "@/components/common/StarRating";
import { ReviewSubmitForm } from "@/components/public/ReviewSubmitForm";
import { ReviewCardImages } from "@/components/public/ReviewCardImages";
import { getApprovedCustomerReviews } from "@/lib/db/customer-reviews";
import { formatDateShort } from "@/lib/formatters";
import { maskNameDisplay } from "@/lib/mask";

export const metadata: Metadata = { title: "Avaliações" };

export default async function AvaliacoesPage() {
  const { reviews, averageRating, totalCount, starCounts } = await getApprovedCustomerReviews();

  return (
    <div className="py-12">
      <Container size="sm">
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-dark-text mb-2">
            Avaliações dos clientes
          </h1>
          <p className="text-muted max-w-md mx-auto">
            Avaliações reais, enviadas por quem já comprou com a gente.
          </p>
        </div>

        <div className="space-y-6">
          {totalCount > 0 && (
            <div className="bg-dark-surface rounded-2xl border border-dark-border p-6 flex flex-col sm:flex-row items-center gap-6">
              <div className="text-center flex-shrink-0">
                <p className="text-4xl font-bold text-dark-text">{averageRating.toFixed(1)}</p>
                <StarRatingDisplay rating={averageRating} size={16} className="justify-center mt-1" />
                <p className="text-xs text-muted mt-1">
                  {totalCount} avaliaç{totalCount !== 1 ? "ões" : "ão"}
                </p>
              </div>
              <div className="flex-1 w-full space-y-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = starCounts[star - 1];
                  const pct = totalCount > 0 ? (count / totalCount) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2 text-xs text-muted">
                      <span className="w-3">{star}</span>
                      <Star size={11} className="fill-accent text-accent flex-shrink-0" />
                      <div className="flex-1 h-1.5 bg-dark-alt rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {reviews.length === 0 && (
            <div className="bg-dark-surface rounded-2xl border border-dark-border p-10 text-center text-muted text-sm">
              Ainda não temos avaliações publicadas. Seja o primeiro a avaliar sua compra!
            </div>
          )}

          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-dark-surface rounded-2xl border border-dark-border p-5 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-dark-text">
                      {maskNameDisplay(review.customer_name)}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{formatDateShort(review.created_at)}</p>
                  </div>
                  <StarRatingDisplay rating={review.rating} size={14} />
                </div>

                {review.recommends ? (
                  <Badge label="Recomenda" variant="success" size="sm" />
                ) : (
                  <Badge label="Não recomenda" variant="danger" size="sm" />
                )}

                <div className="flex items-start gap-2 text-xs text-muted">
                  <Package size={13} className="flex-shrink-0 mt-0.5" />
                  <span>{review.products.map((p) => `${p.name} (x${p.quantity})`).join(", ")}</span>
                </div>

                <p className="text-xs text-muted">
                  Comprou dia {formatDateShort(review.purchase_date)} · Chegou dia{" "}
                  {formatDateShort(review.delivery_date)}
                </p>

                <p className="text-sm text-dark-text leading-relaxed">{review.description}</p>

                <ReviewCardImages images={review.images} />
              </div>
            ))}
          </div>

          {/* Enviar avaliação — sempre abaixo da lista, no PC e no mobile */}
          <ReviewSubmitForm />
        </div>
      </Container>
    </div>
  );
}
