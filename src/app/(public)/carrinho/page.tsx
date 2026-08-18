import type { Metadata } from "next";
import { CartSummary } from "@/components/public/CartSummary";
import { Container } from "@/components/common/SectionHeader";
import { hasActiveCoupon } from "@/lib/actions/coupons";

export const metadata: Metadata = { title: "Carrinho" };

export default async function CarrinhoPage() {
  const showCoupon = await hasActiveCoupon();

  return (
    <div className="py-12">
      <Container>
        <h1 className="text-2xl font-bold text-dark-text mb-8">Meu carrinho</h1>
        <CartSummary showCoupon={showCoupon} />
      </Container>
    </div>
  );
}
