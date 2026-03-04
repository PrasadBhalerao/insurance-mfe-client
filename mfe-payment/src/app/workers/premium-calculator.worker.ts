/// <reference lib="webworker" />

/**
 * Web Worker: Premium Calculator
 *
 * Offloads premium calculation to a separate thread to keep the UI responsive.
 * Calculates risk-adjusted premium with tenure discounts and GST.
 */

interface PremiumInput {
    baseAmount: number;
    policyType: string;
    tenure: number; // in months
}

interface PremiumResult {
    baseAmount: number;
    riskFactor: number;
    discount: number;
    tax: number;
    totalAmount: number;
    monthlyAmount: number;
    breakdown: { label: string; amount: number }[];
}

addEventListener('message', ({ data }: MessageEvent<PremiumInput>) => {
    const { baseAmount, policyType, tenure } = data;

    // Risk factor varies by policy type
    const riskFactors: Record<string, number> = {
        health: 1.15,
        auto: 1.2,
        home: 1.05,
        life: 1.25,
    };

    const riskFactor = riskFactors[policyType] || 1.0;
    const adjustedAmount = baseAmount * riskFactor;

    // Tenure-based discount
    let discountRate = 0;
    if (tenure >= 36) {
        discountRate = 0.15;
    } else if (tenure >= 24) {
        discountRate = 0.1;
    } else if (tenure >= 12) {
        discountRate = 0.05;
    }
    const discount = adjustedAmount * discountRate;

    // GST at 18%
    const taxRate = 0.18;
    const taxableAmount = adjustedAmount - discount;
    const tax = taxableAmount * taxRate;

    const totalAmount = taxableAmount + tax;
    const monthlyAmount = totalAmount / (tenure || 12);

    const result: PremiumResult = {
        baseAmount,
        riskFactor,
        discount: Math.round(discount * 100) / 100,
        tax: Math.round(tax * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        monthlyAmount: Math.round(monthlyAmount * 100) / 100,
        breakdown: [
            { label: 'Base Premium', amount: baseAmount },
            {
                label: `Risk Adjustment (${policyType})`,
                amount: Math.round((adjustedAmount - baseAmount) * 100) / 100,
            },
            {
                label: `Tenure Discount (${discountRate * 100}%)`,
                amount: -Math.round(discount * 100) / 100,
            },
            {
                label: `GST (${taxRate * 100}%)`,
                amount: Math.round(tax * 100) / 100,
            },
            {
                label: 'Total',
                amount: Math.round(totalAmount * 100) / 100,
            },
        ],
    };

    // Simulate CPU-intensive computation (e.g., actuarial models)
    const start = Date.now();
    while (Date.now() - start < 600) {
        // Busy wait to simulate heavy calculation
    }

    postMessage(result);
});
