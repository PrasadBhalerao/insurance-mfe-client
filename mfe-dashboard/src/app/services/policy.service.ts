import { Injectable } from '@angular/core';
import { Policy } from '@shared/models/policy.model';

@Injectable({ providedIn: 'root' })
export class PolicyService {
    getPolicies(): Policy[] {
        const data = localStorage.getItem('insurance_policies');
        return data ? JSON.parse(data) : [];
    }

    getPolicyById(id: string): Policy | null {
        const policies = this.getPolicies();
        return policies.find((p) => p.id === id) || null;
    }

    getActivePolicies(): Policy[] {
        return this.getPolicies().filter((p) => p.status === 'active');
    }
}
