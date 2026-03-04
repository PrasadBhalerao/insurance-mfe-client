import { Injectable } from '@angular/core';
import { Payment } from '@shared/models/payment.model';
import { Policy } from '@shared/models/policy.model';

@Injectable({ providedIn: 'root' })
export class PaymentService {
    getPayments(): Payment[] {
        const data = localStorage.getItem('insurance_payments');
        return data ? JSON.parse(data) : [];
    }

    addPayment(payment: Payment): void {
        const payments = this.getPayments();
        payments.push(payment);
        localStorage.setItem('insurance_payments', JSON.stringify(payments));
    }

    getActivePolicies(): Policy[] {
        const data = localStorage.getItem('insurance_policies');
        const policies: Policy[] = data ? JSON.parse(data) : [];
        return policies.filter((p) => p.status === 'active');
    }
}
