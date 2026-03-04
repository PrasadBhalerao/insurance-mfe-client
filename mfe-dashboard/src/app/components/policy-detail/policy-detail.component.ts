import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Policy } from '@shared/models/policy.model';
import { PolicyService } from '../../services/policy.service';

@Component({
    selector: 'app-policy-detail',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './policy-detail.component.html',
    styleUrls: ['./policy-detail.component.scss'],
})
export class PolicyDetailComponent implements OnInit {
    policy: Policy | null = null;

    constructor(
        private route: ActivatedRoute,
        private policyService: PolicyService
    ) { }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.policy = this.policyService.getPolicyById(id);
        }
    }

    /**
     * Cross-MFE Communication:
     * Dispatches a CustomEvent so the Container navigates to Payment MFE.
     */
    payPremium(): void {
        if (this.policy) {
            window.dispatchEvent(
                new CustomEvent('policy-selected', { detail: this.policy })
            );
        }
    }
}
