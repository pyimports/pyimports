import { create } from "zustand";

interface ToastState {
  id: number;
  message: string | null;
  show: (message: string) => void;
}

// `id` incrementa a cada show() para o Toast reiniciar a animação/timer
// mesmo quando o mesmo produto é adicionado duas vezes seguidas.
export const useToastStore = create<ToastState>((set, get) => ({
  id: 0,
  message: null,
  show: (message) => set({ message, id: get().id + 1 }),
}));
