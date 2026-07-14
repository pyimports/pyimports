import type { Metadata } from "next";
import { listCoupons } from "@/lib/actions/coupons";
import { CuponsClient } from "./CuponsClient";

export const metadata: Metadata = { title: "Cupons" };

export default async function CuponsPage() {
  const coupons = await listCoupons();
  return <CuponsClient initialCoupons={coupons} />;
}
