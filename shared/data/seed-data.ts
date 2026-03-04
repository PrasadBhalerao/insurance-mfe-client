import { Policy } from '../models/policy.model';
import { Payment } from '../models/payment.model';

export const SEED_POLICIES: Policy[] = [
    {
        id: 'p1',
        policyNumber: 'POL-2025-001',
        holderName: 'John Smith',
        type: 'health',
        status: 'active',
        coverageAmount: 500000,
        premiumAmount: 1200,
        startDate: '2025-01-15',
        endDate: '2026-01-14',
        description: 'Comprehensive Health Insurance - Family Plan',
    },
    {
        id: 'p2',
        policyNumber: 'POL-2025-002',
        holderName: 'John Smith',
        type: 'auto',
        status: 'active',
        coverageAmount: 200000,
        premiumAmount: 800,
        startDate: '2025-03-01',
        endDate: '2026-02-28',
        description: 'Auto Insurance - Full Coverage',
    },
    {
        id: 'p3',
        policyNumber: 'POL-2025-003',
        holderName: 'John Smith',
        type: 'home',
        status: 'active',
        coverageAmount: 1000000,
        premiumAmount: 2500,
        startDate: '2025-06-01',
        endDate: '2026-05-31',
        description: 'Home Insurance - Premium Plan',
    },
    {
        id: 'p4',
        policyNumber: 'POL-2024-004',
        holderName: 'John Smith',
        type: 'life',
        status: 'expired',
        coverageAmount: 2000000,
        premiumAmount: 3500,
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        description: 'Term Life Insurance - 20 Year Plan',
    },
    {
        id: 'p5',
        policyNumber: 'POL-2025-005',
        holderName: 'John Smith',
        type: 'health',
        status: 'pending',
        coverageAmount: 300000,
        premiumAmount: 900,
        startDate: '2025-04-01',
        endDate: '2026-03-31',
        description: 'Health Insurance - Individual Plan',
    },
];

export const SEED_PAYMENTS: Payment[] = [
    {
        id: 'pay1',
        policyId: 'p1',
        policyNumber: 'POL-2025-001',
        amount: 1200,
        date: '2025-01-15',
        status: 'completed',
        method: 'credit_card',
        transactionId: 'TXN-20250115-001',
    },
    {
        id: 'pay2',
        policyId: 'p2',
        policyNumber: 'POL-2025-002',
        amount: 800,
        date: '2025-03-01',
        status: 'completed',
        method: 'bank_transfer',
        transactionId: 'TXN-20250301-001',
    },
    {
        id: 'pay3',
        policyId: 'p3',
        policyNumber: 'POL-2025-003',
        amount: 2500,
        date: '2025-06-01',
        status: 'completed',
        method: 'debit_card',
        transactionId: 'TXN-20250601-001',
    },
    {
        id: 'pay4',
        policyId: 'p1',
        policyNumber: 'POL-2025-001',
        amount: 1200,
        date: '2025-07-15',
        status: 'pending',
        method: 'credit_card',
        transactionId: 'TXN-20250715-001',
    },
];

export function initializeSeedData(): void {
    if (!localStorage.getItem('insurance_policies')) {
        localStorage.setItem('insurance_policies', JSON.stringify(SEED_POLICIES));
    }
    if (!localStorage.getItem('insurance_payments')) {
        localStorage.setItem('insurance_payments', JSON.stringify(SEED_PAYMENTS));
    }
}
