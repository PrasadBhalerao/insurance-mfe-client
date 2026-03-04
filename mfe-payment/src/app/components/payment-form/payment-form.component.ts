import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Policy } from '@shared/models/policy.model';
import { Payment, PremiumCalculation } from '@shared/models/payment.model';
import { PaymentService } from '../../services/payment.service';

@Component({
    selector: 'app-payment-form',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './payment-form.component.html',
    styleUrls: ['./payment-form.component.scss'],
})
export class PaymentFormComponent implements OnInit, OnDestroy {
    selectedPolicy: Policy | null = null;
    policies: Policy[] = [];
    paymentMethod = 'credit_card';
    calculationResult: PremiumCalculation | null = null;
    isCalculating = false;
    isProcessing = false;
    paymentSuccess = false;
    private worker: Worker | null = null;

    constructor(
        private paymentService: PaymentService,
        private ngZone: NgZone
    ) { }

    ngOnInit(): void {
        this.policies = this.paymentService.getActivePolicies();

        // Check if a policy was selected from Dashboard MFE (cross-MFE communication)
        const stored = localStorage.getItem('selected_policy');
        if (stored) {
            this.selectedPolicy = JSON.parse(stored);
            localStorage.removeItem('selected_policy');
            if (this.selectedPolicy) {
                this.calculatePremium();
            }
        }

        // Listen for live policy selection events
        window.addEventListener('policy-selected', this.onPolicySelected);
    }

    ngOnDestroy(): void {
        window.removeEventListener('policy-selected', this.onPolicySelected);
        if (this.worker) {
            this.worker.terminate();
        }
    }

    /**
     * Cross-MFE Communication: Listens for policy-selected event
     * from the Dashboard MFE (dispatched via CustomEvent).
     */
    private onPolicySelected = (event: Event): void => {
        const customEvent = event as CustomEvent;
        this.ngZone.run(() => {
            this.selectedPolicy = customEvent.detail;
            this.paymentSuccess = false;
            this.calculatePremium();
        });
    };

    selectPolicy(policy: Policy): void {
        this.selectedPolicy = policy;
        this.paymentSuccess = false;
        this.calculatePremium();
    }

    clearSelection(): void {
        this.selectedPolicy = null;
        this.calculationResult = null;
        this.paymentSuccess = false;
    }

    /**
     * Web Worker: Offloads premium calculation to a background thread.
     * The worker applies risk factors, tenure discounts, and GST.
     */
    calculatePremium(): void {
        if (!this.selectedPolicy) return;
        this.isCalculating = true;
        this.calculationResult = null;

        if (typeof Worker !== 'undefined') {
            if (this.worker) {
                this.worker.terminate();
            }
            // Create inline blob worker to avoid cross-origin issues in Module Federation
            try {
                this.worker = this.createBlobWorker();
            } catch (err) {
                console.warn('Worker creation failed, falling back to main-thread calculation', err);
                // Fallback: run calculation on main thread to avoid indefinite spinner
                const result = this.computePremiumSync(
                    this.selectedPolicy.premiumAmount,
                    this.selectedPolicy.type,
                    12
                );
                this.ngZone.run(() => {
                    this.calculationResult = result;
                    this.isCalculating = false;
                });
                return;
            }

            // Safety timeout in case worker fails silently
            const timeout = setTimeout(() => {
                console.error('Premium worker timed out');
                if (this.worker) {
                    this.worker.terminate();
                    this.worker = null;
                }
                this.ngZone.run(() => {
                    this.isCalculating = false;
                });
            }, 8000);

            this.worker.onmessage = ({ data }) => {
                clearTimeout(timeout);
                this.ngZone.run(() => {
                    this.calculationResult = data;
                    this.isCalculating = false;
                });
                if (this.worker) {
                    this.worker.terminate();
                    this.worker = null;
                }
            };

            this.worker.onerror = (error) => {
                clearTimeout(timeout);
                console.error('Worker error:', error);
                if (this.worker) {
                    this.worker.terminate();
                    this.worker = null;
                }
                this.ngZone.run(() => {
                    this.isCalculating = false;
                });
            };

            this.worker.postMessage({
                baseAmount: this.selectedPolicy.premiumAmount,
                policyType: this.selectedPolicy.type,
                tenure: 12,
            });
        } else {
            // Fallback if Web Workers are not supported
            this.isCalculating = false;
        }
    }

    private createBlobWorker(): Worker {
        // Inline worker code to avoid cross-origin issues
        const workerCode = `
            self.addEventListener('message', function(e) {
                const { baseAmount, policyType, tenure } = e.data;

                const riskFactors = {
                    health: 1.15,
                    auto: 1.2,
                    home: 1.05,
                    life: 1.25,
                };

                const riskFactor = riskFactors[policyType] || 1.0;
                const adjustedAmount = baseAmount * riskFactor;

                let discountRate = 0;
                if (tenure >= 36) {
                    discountRate = 0.15;
                } else if (tenure >= 24) {
                    discountRate = 0.1;
                } else if (tenure >= 12) {
                    discountRate = 0.05;
                }
                const discount = adjustedAmount * discountRate;

                const taxRate = 0.18;
                const taxableAmount = adjustedAmount - discount;
                const tax = taxableAmount * taxRate;

                const totalAmount = taxableAmount + tax;
                const monthlyAmount = totalAmount / (tenure || 12);

                const result = {
                    baseAmount: baseAmount,
                    riskFactor: riskFactor,
                    discount: Math.round(discount * 100) / 100,
                    tax: Math.round(tax * 100) / 100,
                    totalAmount: Math.round(totalAmount * 100) / 100,
                    monthlyAmount: Math.round(monthlyAmount * 100) / 100,
                    breakdown: [
                        { label: 'Base Premium', amount: baseAmount },
                        {
                            label: 'Risk Adjustment (' + policyType + ')',
                            amount: Math.round((adjustedAmount - baseAmount) * 100) / 100,
                        },
                        {
                            label: 'Tenure Discount (' + (discountRate * 100) + '%)',
                            amount: -Math.round(discount * 100) / 100,
                        },
                        {
                            label: 'GST (' + (taxRate * 100) + '%)',
                            amount: Math.round(tax * 100) / 100,
                        },
                        {
                            label: 'Total',
                            amount: Math.round(totalAmount * 100) / 100,
                        },
                    ],
                };

                // Simulate CPU-intensive computation
                const start = Date.now();
                while (Date.now() - start < 600) {
                    // Busy wait to simulate heavy calculation
                }

                self.postMessage(result);
            });
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        return new Worker(workerUrl);
    }

    private computePremiumSync(baseAmount: number, policyType: string, tenure: number) {
        const riskFactors: Record<string, number> = {
            health: 1.15,
            auto: 1.2,
            home: 1.05,
            life: 1.25,
        };

        const riskFactor = riskFactors[policyType] || 1.0;
        const adjustedAmount = baseAmount * riskFactor;

        let discountRate = 0;
        if (tenure >= 36) {
            discountRate = 0.15;
        } else if (tenure >= 24) {
            discountRate = 0.1;
        } else if (tenure >= 12) {
            discountRate = 0.05;
        }
        const discount = adjustedAmount * discountRate;

        const taxRate = 0.18;
        const taxableAmount = adjustedAmount - discount;
        const tax = taxableAmount * taxRate;

        const totalAmount = taxableAmount + tax;
        const monthlyAmount = totalAmount / (tenure || 12);

        return {
            baseAmount,
            riskFactor,
            discount: Math.round(discount * 100) / 100,
            tax: Math.round(tax * 100) / 100,
            totalAmount: Math.round(totalAmount * 100) / 100,
            monthlyAmount: Math.round(monthlyAmount * 100) / 100,
            breakdown: [
                { label: 'Base Premium', amount: baseAmount },
                { label: `Risk Adjustment (${policyType})`, amount: Math.round((adjustedAmount - baseAmount) * 100) / 100 },
                { label: `Tenure Discount (${discountRate * 100}%)`, amount: -Math.round(discount * 100) / 100 },
                { label: `GST (${taxRate * 100}%)`, amount: Math.round(tax * 100) / 100 },
                { label: 'Total', amount: Math.round(totalAmount * 100) / 100 },
            ],
        } as PremiumCalculation;
    }

    processPayment(): void {
        if (!this.selectedPolicy || !this.calculationResult) return;
        this.isProcessing = true;

        // Simulate async payment processing
        setTimeout(() => {
            const payment: Payment = {
                id: 'pay' + Date.now(),
                policyId: this.selectedPolicy!.id,
                policyNumber: this.selectedPolicy!.policyNumber,
                amount: this.calculationResult!.totalAmount,
                date: new Date().toISOString().split('T')[0],
                status: 'completed',
                method: this.paymentMethod as Payment['method'],
                transactionId: 'TXN-' + Date.now(),
            };
            this.paymentService.addPayment(payment);
            this.isProcessing = false;
            this.paymentSuccess = true;
        }, 1500);
    }
}
