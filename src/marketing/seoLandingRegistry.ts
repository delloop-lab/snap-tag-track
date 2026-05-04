import type { SeoPageBody } from "./seoBodies/types";
import { receiptScannerAppBody } from "./seoBodies/receiptScannerApp";
import { warrantyTrackerBody } from "./seoBodies/warrantyTracker";
import { expenseTrackingWithoutBankBody } from "./seoBodies/expenseTrackingWithoutBank";
import { contractorExpenseTrackerBody } from "./seoBodies/contractorExpenseTracker";
import { householdSpendingTrackerBody } from "./seoBodies/householdSpendingTracker";
import { fuelFoodSpendingTrackerBody } from "./seoBodies/fuelFoodSpendingTracker";
import { howItWorksBody } from "./seoBodies/howItWorks";
import { pricingBody } from "./seoBodies/pricing";
import { useCasesBody } from "./seoBodies/useCases";
import { blogIndexBody } from "./seoBodies/blogIndex";

export const SEO_LANDING_BODIES: Record<string, SeoPageBody> = {
  "/receipt-scanner-app": receiptScannerAppBody,
  "/warranty-tracker": warrantyTrackerBody,
  "/expense-tracking-without-bank": expenseTrackingWithoutBankBody,
  "/contractor-expense-tracker": contractorExpenseTrackerBody,
  "/household-spending-tracker": householdSpendingTrackerBody,
  "/fuel-food-spending-tracker": fuelFoodSpendingTrackerBody,
  "/how-it-works": howItWorksBody,
  "/pricing": pricingBody,
  "/use-cases": useCasesBody,
  "/blog": blogIndexBody,
};

export function getSeoLandingBody(pathname: string): SeoPageBody | undefined {
  return SEO_LANDING_BODIES[pathname];
}
