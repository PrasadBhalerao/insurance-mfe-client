import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';

/**
 * EventBusService handles cross-MFE communication via CustomEvents.
 *
 * Use case: When a user clicks "Pay Premium" in the Dashboard MFE,
 * a 'policy-selected' event is dispatched. This service listens for
 * that event, stores the selected policy, and navigates to the Payment MFE.
 */
@Injectable({ providedIn: 'root' })
export class EventBusService {
    constructor(private router: Router, private ngZone: NgZone) { }

    init(): void {
        window.addEventListener('policy-selected', (event: Event) => {
            const customEvent = event as CustomEvent;
            const policy = customEvent.detail;

            // Store selected policy for the Payment MFE to read
            localStorage.setItem('selected_policy', JSON.stringify(policy));

            // Navigate to the payment route inside Angular's zone
            this.ngZone.run(() => {
                this.router.navigate(['/payment']);
            });
        });
    }
}
