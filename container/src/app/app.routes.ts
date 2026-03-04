import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';

export const APP_ROUTES: Routes = [
    {
        path: '',
        component: HomeComponent,
    },
    {
        path: 'dashboard',
        loadChildren: () =>
            import('mfeDashboard/routes').then((m) => m.DASHBOARD_ROUTES),
    },
    {
        path: 'payment',
        loadChildren: () =>
            import('mfePayment/routes').then((m) => m.PAYMENT_ROUTES),
    },
];
