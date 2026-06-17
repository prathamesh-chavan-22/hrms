export type PlanId = "starter" | "plus" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  currency: string;
  maxEmployees: number;
  features: string[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "Perfect for small teams just getting started.",
    price: 0,
    currency: "INR",
    maxEmployees: 5,
    features: [
      "Up to 5 employees",
      "Leave management",
      "Holiday calendar",
      "GPS attendance",
      "Company branding",
      "Rule-based chatbot",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    description: "For growing teams that need more power.",
    price: 499,
    currency: "INR",
    maxEmployees: 25,
    highlight: true,
    features: [
      "Up to 25 employees",
      "Everything in Starter",
      "Advanced leave policies",
      "Attendance reports",
      "Custom leave types",
      "Priority support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    description: "Enterprise-grade HRMS for large organisations.",
    price: 1299,
    currency: "INR",
    maxEmployees: 100,
    features: [
      "Up to 100 employees",
      "Everything in Plus",
      "Advanced analytics",
      "Custom chatbot intents",
      "Dedicated onboarding",
      "SLA support",
    ],
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function getEmployeeCap(plan: PlanId): number {
  return getPlan(plan).maxEmployees;
}

export function canAddEmployee(plan: PlanId, currentCount: number): boolean {
  return currentCount < getEmployeeCap(plan);
}

export function formatPrice(plan: Plan): string {
  if (plan.price === 0) return "Free";
  return `₹${plan.price.toLocaleString("en-IN")}/mo`;
}
