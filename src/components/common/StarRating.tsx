import React from "react";
import { Star } from "lucide-react";

interface Props {
  rating: number; // aceita fração (ex.: 4.5)
  size?: number;
  className?: string;
}

// Exibição somente-leitura de nota em estrelas, com suporte a meia-estrela
// (recorta a estrela preenchida em 50% via overflow-hidden).
export const StarRatingDisplay = ({ rating, size = 14, className = "" }: Props) => (
  <div className={`flex items-center gap-0.5 ${className}`}>
    {[1, 2, 3, 4, 5].map((n) => {
      const fill = Math.min(Math.max(rating - (n - 1), 0), 1);
      return (
        <span key={n} className="relative inline-block flex-shrink-0" style={{ width: size, height: size }}>
          <Star size={size} className="absolute inset-0 text-dark-border" />
          {fill > 0 && (
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star size={size} className="fill-accent text-accent" />
            </span>
          )}
        </span>
      );
    })}
  </div>
);
