import React from "react";
import { Truck } from "lucide-react";

export const ShippingNotice = () => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-sm font-medium text-dark-text">
      <Truck size={16} className="text-accent" />
      Envio
    </div>
    <p className="text-sm text-muted leading-relaxed">
      Enviamos pela <span className="text-dark-text font-medium">Shopee</span> para todo o Brasil.
      O frete fica em <span className="text-accent font-semibold">R$ 50,00</span>, combinado após o
      pedido.
    </p>
  </div>
);
