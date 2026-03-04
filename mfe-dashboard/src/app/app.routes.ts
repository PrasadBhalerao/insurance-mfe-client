import { Routes } from '@angular/router';
import { PolicyListComponent } from './components/policy-list/policy-list.component';
import { PolicyDetailComponent } from './components/policy-detail/policy-detail.component';

export const DASHBOARD_ROUTES: Routes = [
    { path: '', component: PolicyListComponent },
    { path: 'policy/:id', component: PolicyDetailComponent },
];
