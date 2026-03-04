import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Payment } from '@shared/models/payment.model';
import { PaymentService } from '../../services/payment.service';

@Component({
    selector: 'app-payment-history',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './payment-history.component.html',
    styleUrls: ['./payment-history.component.scss'],
})
export class PaymentHistoryComponent implements OnInit {
    payments: Payment[] = [];

    constructor(private paymentService: PaymentService) { }

    ngOnInit(): void {
        this.payments = this.paymentService.getPayments();
    }

    formatMethod(method: string): string {
        const methods: Record<string, string> = {
            credit_card: 'Credit Card',
            debit_card: 'Debit Card',
            bank_transfer: 'Bank Transfer',
        };
        return methods[method] || method;
    }
}
