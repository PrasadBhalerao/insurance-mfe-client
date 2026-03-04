import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Policy } from '@shared/models/policy.model';
import { PolicyService } from '../../services/policy.service';

@Component({
    selector: 'app-policy-list',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './policy-list.component.html',
    styleUrls: ['./policy-list.component.scss'],
})
export class PolicyListComponent implements OnInit {
    policies: Policy[] = [];
    filteredPolicies: Policy[] = [];
    activeFilter = 'all';

    constructor(private policyService: PolicyService) { }

    ngOnInit(): void {
        this.policies = this.policyService.getPolicies();
        this.filteredPolicies = [...this.policies];
    }

    filterPolicies(filter: string): void {
        this.activeFilter = filter;
        if (filter === 'all') {
            this.filteredPolicies = [...this.policies];
        } else {
            this.filteredPolicies = this.policies.filter((p) => p.status === filter);
        }
    }

    /**
     * Cross-MFE Communication:
     * Dispatches a CustomEvent with the selected policy data.
     * The Container's EventBusService listens for this event,
     * stores the policy, and navigates to the Payment MFE.
     */
    payPremium(policy: Policy): void {
        window.dispatchEvent(
            new CustomEvent('policy-selected', { detail: policy })
        );
    }
}
