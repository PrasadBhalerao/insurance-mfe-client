export interface Policy {
    id: string;
    policyNumber: string;
    holderName: string;
    type: 'health' | 'life' | 'auto' | 'home';
    status: 'active' | 'expired' | 'pending';
    coverageAmount: number;
    premiumAmount: number;
    startDate: string;
    endDate: string;
    description: string;
}
