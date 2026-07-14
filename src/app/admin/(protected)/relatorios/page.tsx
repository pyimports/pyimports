import type { Metadata } from "next";
import {
  getSalesReportAdmin, getProductAndCategorySalesAdmin, getCustomerReportAdmin,
  getCouponReportAdmin, getOperationalReportAdmin, type OperationalReportAdmin,
} from "@/lib/db/reports";
import {
  mockSalesReport, mockProductSales, mockCategorySales,
  mockCustomerReport, mockCouponReport, mockOperationalReport,
} from "@/data/mock-reports";
import { RelatoriosClient } from "./RelatoriosClient";
import type { SalesReport, ProductSalesData, CategorySalesData, CustomerReportData, CouponReportData } from "@/types";

export const metadata: Metadata = { title: "Relatórios" };

export default async function RelatoriosPage() {
  let salesReport: SalesReport;
  let productSales: ProductSalesData[];
  let categorySales: CategorySalesData[];
  let customerReport: CustomerReportData[];
  let couponReport: CouponReportData[];
  let operationalReport: OperationalReportAdmin;

  try {
    const [sales, productsAndCategories, customers, coupons, operational] = await Promise.all([
      getSalesReportAdmin(),
      getProductAndCategorySalesAdmin(),
      getCustomerReportAdmin(),
      getCouponReportAdmin(),
      getOperationalReportAdmin(),
    ]);
    salesReport = sales;
    productSales = productsAndCategories.products;
    categorySales = productsAndCategories.categories;
    customerReport = customers;
    couponReport = coupons;
    operationalReport = operational;
  } catch {
    salesReport = mockSalesReport;
    productSales = mockProductSales;
    categorySales = mockCategorySales;
    customerReport = mockCustomerReport;
    couponReport = mockCouponReport;
    operationalReport = {
      paid_orders: mockOperationalReport.paid_orders.map((o) => ({
        id: o.id, order_number: o.order_number, customer_name: o.customer_name, total: o.total,
      })),
      items_to_separate: mockOperationalReport.items_to_separate,
    };
  }

  return (
    <RelatoriosClient
      salesReport={salesReport}
      productSales={productSales}
      categorySales={categorySales}
      customerReport={customerReport}
      couponReport={couponReport}
      operationalReport={operationalReport}
    />
  );
}
