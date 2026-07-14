"use client";

import React, { useState } from "react";
import { ProductCard } from "@/components/public/ProductCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Tabs } from "@/components/common/Tabs";
import type { Category, Product } from "@/types";

interface ProductShowcaseProps {
  products: Product[];
  filterCategories: Category[];
}

const TODOS = "todos";

export const ProductShowcase = ({ products, filterCategories }: ProductShowcaseProps) => {
  const [active, setActive] = useState(TODOS);

  const visible =
    active === TODOS ? products : products.filter((p) => p.category_id === active);

  return (
    <div>
      {filterCategories.length > 0 && (
        <div className="mb-8">
          <Tabs
            variant="pills"
            value={active}
            onChange={setActive}
            tabs={[
              { value: TODOS, label: "TODOS" },
              ...filterCategories.map((c) => ({ value: c.id, label: c.name.toUpperCase() })),
            ]}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <EmptyState
          title="Sem produtos disponíveis"
          description="Novos produtos serão adicionados em breve."
        />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
