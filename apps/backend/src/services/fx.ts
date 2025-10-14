import type { PrismaClient } from "@prisma/client";

export type FxSnapshot = {
  base: "USD";
  quote: "UAH";
  rate: number; // UAH per 1 USD
  asOf: Date;
  source: "MANUAL";
};
// Manual-only: return the most recent MANUAL rate. If none, throw.
export async function getDailyUsdToUah(prisma: PrismaClient): Promise<FxSnapshot> {
  const fx = await prisma.fxRate.findFirst({
    where: { base: "USD", quote: "UAH" },
    orderBy: [{ asOfDate: "desc" }, { id: "desc" }],
  });
  if (!fx) throw new Error("No manual FX rate set");
  return { base: "USD", quote: "UAH", rate: fx.rate, asOf: fx.asOfDate, source: "MANUAL" };
}

export function convertCentsUsdToUah(usdCents: number, rate: number): number {
  return Math.round((usdCents / 100) * rate * 100);
}
