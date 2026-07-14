import React from "react";
import { CheckCircle2 } from "lucide-react";

interface Step {
  label: string;
  step: number;
}

const STEPS: Step[] = [
  { step: 1, label: "Carrinho" },
  { step: 2, label: "Checkout" },
  { step: 3, label: "Pagamento" },
  { step: 4, label: "Confirmado" },
];

interface CheckoutStepsProps {
  currentStep: number;
}

export const CheckoutSteps = ({ currentStep }: CheckoutStepsProps) => {
  return (
    <div className="flex items-center justify-center">
      {STEPS.map((s, i) => {
        const isCompleted = s.step < currentStep;
        const isCurrent = s.step === currentStep;

        return (
          <React.Fragment key={s.step}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                  isCompleted
                    ? "bg-success border-success text-white"
                    : isCurrent
                    ? "bg-accent/10 border-accent text-accent"
                    : "bg-dark-alt border-dark-border-light text-muted",
                ].join(" ")}
              >
                {isCompleted ? <CheckCircle2 size={16} /> : s.step}
              </div>
              <span
                className={[
                  "text-xs font-medium",
                  isCurrent ? "text-accent" : isCompleted ? "text-success" : "text-muted",
                ].join(" ")}
              >
                {s.label}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <div
                className={[
                  "h-0.5 w-12 mx-2 mb-4 transition-colors",
                  isCompleted ? "bg-success/40" : "bg-dark-border",
                ].join(" ")}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
