"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/cart-store";

// Mantém o percentual do seguro do carrinho (client-side) sincronizado com o
// que está configurado no admin — sem isso, o carrinho ficaria preso no
// valor padrão do primeiro carregamento da página.
export function CartSettingsSync({ insurancePercentage }: { insurancePercentage: number }) {
  useEffect(() => {
    useCartStore.getState().setInsurancePercentage(insurancePercentage);
  }, [insurancePercentage]);

  return null;
}
