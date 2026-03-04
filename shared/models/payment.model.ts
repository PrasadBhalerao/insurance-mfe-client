export interface Payment {
    id: string;
    policyId: string;
    policyNumber: string;
    amount: number;
    date: string;
    status: 'completed' | 'pending' | 'failed';
    method: 'credit_card' | 'debit_card' | 'bank_transfer';
    transactionId: string;
}

export interface PremiumCalculation {
    baseAmount: number;
    riskFactor: number;
    discount: number;
    tax: number;
    totalAmount: number;
    monthlyAmount: number;
    breakdown: { label: string; amount: number }[];
}
