# Insurance MFE Client Application

A **Micro-Frontend (MFE)** application for an insurance company built with **Angular 18**, **Webpack 5 Module Federation**, and **SCSS**. Users can view their insurance policies, check coverage details, and pay premiums — all across independently deployable micro-frontends.

---

## Table of Contents

1. [High-Level Design](#high-level-design)
   - [Architecture Overview](#1-architecture-overview)
   - [Technology Stack](#2-technology-stack)
   - [Module Federation Configuration](#3-module-federation-configuration)
   - [Cross-Cutting Concerns](#4-cross-cutting-concerns)
   - [Data Model](#5-data-model)
   - [Routing](#6-routing)
2. [Implementation Details](#implementation-details)
3. [Project Structure](#project-structure)
4. [Local Deployment Steps](#local-deployment-steps)

---

# High-Level Design

## 1. Architecture Overview

The application follows a **Micro-Frontend** architecture using **Webpack 5 Module Federation**. Three independently deployable Angular applications compose the system:

| Application | Port | Role | Description |
|---|---|---|---|
| **Container** | 4200 | Host Shell | Main entry point, navigation, routing, orchestration |
| **MFE Dashboard** | 4201 | Remote MFE | Insurance policy viewing and management |
| **MFE Payment** | 4202 | Remote MFE | Premium payment processing and history |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONTAINER (Host) :4200                      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Navbar Component  [ Home | Dashboard | Payment | History ] │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                      Router Outlet                         │  │
│  │                                                            │  │
│  │  ┌─────────────────────┐    ┌──────────────────────────┐  │  │
│  │  │  MFE Dashboard      │    │  MFE Payment             │  │  │
│  │  │  :4201               │    │  :4202                    │  │  │
│  │  │                     │    │                          │  │  │
│  │  │  ● Policy List      │    │  ● Payment Form          │  │  │
│  │  │    (filter, browse) │    │    (select, pay)         │  │  │
│  │  │  ● Policy Detail    │    │  ● Payment History       │  │  │
│  │  │    (view, pay btn)  │    │    (transaction table)   │  │  │
│  │  │                     │    │  ● [Web Worker]          │  │  │
│  │  │                     │    │    (premium calculation)  │  │  │
│  │  └─────────────────────┘    └──────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │         EventBus Service (CustomEvent on window)           │  │
│  │    ← Cross-MFE Communication: Dashboard → Container →      │  │
│  │      Payment via 'policy-selected' event + localStorage    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │               localStorage (Client Storage)                │  │
│  │  insurance_policies │ insurance_payments │ selected_policy  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| Angular | 18.2 | Frontend framework (standalone components) |
| TypeScript | 5.4 | Type-safe development |
| Webpack | 5 | Bundling (via Angular CLI + ngx-build-plus) |
| Module Federation | Webpack 5 built-in | Micro-frontend runtime integration |
| SCSS (Sass) | 1.70+ | CSS pre-processor |
| localStorage | Browser API | Client-side data persistence (no backend) |
| Web Workers | Browser API | Background thread computation |
| ngx-build-plus | 18 | Custom webpack config support for Angular CLI |

---

## 3. Module Federation Configuration

### How It Works

Module Federation allows each MFE to be built separately and loaded **at runtime** by the container. The container's Angular Router lazily loads MFE routes when the user navigates.

### Container (Host) — `container/webpack.config.js`

```javascript
new ModuleFederationPlugin({
  remotes: {
    mfeDashboard: 'mfeDashboard@http://localhost:4201/remoteEntry.js',
    mfePayment:   'mfePayment@http://localhost:4202/remoteEntry.js',
  },
  shared: { '@angular/core': { singleton: true }, /* ... */ },
})
```

The container **does not bundle** the MFE code. It fetches `remoteEntry.js` from each MFE at runtime and lazily loads their routes:

```typescript
// container/src/app/app.routes.ts
{
  path: 'dashboard',
  loadChildren: () => import('mfeDashboard/routes').then(m => m.DASHBOARD_ROUTES),
},
{
  path: 'payment',
  loadChildren: () => import('mfePayment/routes').then(m => m.PAYMENT_ROUTES),
}
```

### MFE Dashboard (Remote) — `mfe-dashboard/webpack.config.js`

```javascript
new ModuleFederationPlugin({
  name: 'mfeDashboard',
  filename: 'remoteEntry.js',
  exposes: { './routes': './src/app/app.routes.ts' },
  shared: { '@angular/core': { singleton: true }, /* ... */ },
})
```

### MFE Payment (Remote) — `mfe-payment/webpack.config.js`

```javascript
new ModuleFederationPlugin({
  name: 'mfePayment',
  filename: 'remoteEntry.js',
  exposes: { './routes': './src/app/app.routes.ts' },
  shared: { '@angular/core': { singleton: true }, /* ... */ },
})
```

### Shared Dependencies (Singleton)

All three apps share Angular core packages as **singletons** to avoid duplicate framework loading:

`@angular/core`, `@angular/common`, `@angular/router`, `@angular/forms`, `@angular/platform-browser`, `@angular/animations`, `rxjs`

### Async Bootstrap Pattern

Each app uses the pattern `main.ts → import('./bootstrap')` to ensure Module Federation initializes shared dependencies before Angular bootstraps:

```typescript
// main.ts (all 3 apps)
import('./bootstrap').catch(err => console.error(err));
```

---

## 4. Cross-Cutting Concerns

### 4.1 Webpack Bundling (Module Federation)

**Requirement**: *Use webpack for bundling*

Each MFE is bundled independently using **Webpack 5** via `ngx-build-plus` (which allows custom webpack config on top of Angular CLI). Module Federation enables:

- **Runtime integration**: MFEs are loaded on-demand when the user navigates
- **Independent deployment**: Each MFE can be built and deployed separately
- **Shared dependencies**: Angular framework is loaded once and shared across all MFEs
- **No rebuild needed**: Updating one MFE doesn't require rebuilding others

**Key files**:
- `container/webpack.config.js` — Host configuration with `remotes`
- `mfe-dashboard/webpack.config.js` — Remote with `exposes` for routes
- `mfe-payment/webpack.config.js` — Remote with `exposes` for routes

---

### 4.2 CSS Pre-processor (SCSS)

**Requirement**: *Use any CSS pre-processor*

**SCSS (Sass)** is used across all three applications:

- **Shared design tokens**: `shared/styles/_variables.scss` defines colors, spacing, shadows, border radii
- **Shared mixins**: `shared/styles/_mixins.scss` provides reusable patterns (`@mixin card`, `@mixin btn`, `@mixin badge`, `@mixin responsive`)
- **Include paths**: Each project's `angular.json` configures `stylePreprocessorOptions.includePaths: ["../shared/styles"]` so components can `@use 'variables' as *` without relative paths
- **Component-scoped styles**: Every Angular component has its own `.scss` file for encapsulated styling

Example from a component:
```scss
// mfe-dashboard/src/app/components/policy-list/policy-list.component.scss
@use 'variables' as *;

.policy-list {
  max-width: 1200px;
  margin: 0 auto;

  .policy-card {
    background: $card-bg;
    border-radius: $radius-md;
    box-shadow: $shadow-sm;
    // ...
  }
}
```

---

### 4.3 Web Worker (Payment MFE)

**Requirement**: *Add a web worker for any task in one of the MFE*

**Location**: `mfe-payment/src/app/workers/premium-calculator.worker.ts`

**Use Case**: Premium calculation is offloaded to a **Web Worker** to keep the UI thread responsive. The worker performs risk-adjusted calculations simulating actuarial computation.

#### Data Flow

```
┌─────────────────────┐     postMessage()      ┌────────────────────────────┐
│  PaymentForm         │ ────────────────────► │  Web Worker                 │
│  Component           │                        │  (Background Thread)        │
│                     │                        │                             │
│  {baseAmount,       │                        │  1. Apply risk factor       │
│   policyType,       │                        │  2. Apply tenure discount   │
│   tenure}           │                        │  3. Calculate GST (18%)     │
│                     │ ◄──────────────────── │  4. Return breakdown        │
│  Updates UI with    │     onmessage()        │                             │
│  calculation result │                        │  Simulates heavy CPU work   │
└─────────────────────┘                        └────────────────────────────┘
```

#### Calculation Logic

| Step | Description | Example |
|---|---|---|
| Risk Factor | Varies by policy type: health=1.15, auto=1.20, home=1.05, life=1.25 | ₹1200 × 1.15 = ₹1380 |
| Tenure Discount | 12mo: 5%, 24mo: 10%, 36mo: 15% | ₹1380 × 0.05 = ₹69 discount |
| GST | 18% on (adjusted − discount) | (₹1380 − ₹69) × 0.18 = ₹236 |
| Total | Adjusted − discount + tax | ₹1311 + ₹236 = ₹1547 |

#### Implementation

```typescript
// payment-form.component.ts — Creating the worker
this.worker = new Worker(
  new URL('../../workers/premium-calculator.worker', import.meta.url)
);
this.worker.postMessage({ baseAmount, policyType, tenure: 12 });
this.worker.onmessage = ({ data }) => {
  this.calculationResult = data; // PremiumCalculation object
};
```

**Configuration**: A separate `tsconfig.worker.json` targets `webworker` lib instead of `dom`.

---

### 4.4 Cross-MFE Communication

**Requirement**: *Implement across MFE communication for any one use case of data sharing between the MFEs or the container application*

**Mechanism**: `CustomEvent` API on the `window` object + `localStorage` for data transfer

**Use Case**: When a user clicks **"Pay Premium"** on a policy in the **Dashboard MFE**, the selected policy data flows to the **Payment MFE** which pre-fills the payment form.

#### Communication Flow

```
┌──────────────────┐  CustomEvent           ┌──────────────────┐  navigate()       ┌──────────────────┐
│  Dashboard MFE   │  'policy-selected'     │  Container       │  /payment          │  Payment MFE     │
│                  │  ───────────────────►  │                  │  ───────────────►  │                  │
│  PolicyList      │  { detail: policy }    │  EventBus        │  + localStorage    │  PaymentForm     │
│  Component       │                        │  Service         │  .setItem()        │  Component       │
│                  │                        │                  │                    │                  │
│  User clicks     │                        │  Listens on      │                    │  Reads policy    │
│  "Pay Premium"   │                        │  window for      │                    │  from localStorage│
│  button          │                        │  the event       │                    │  on ngOnInit()   │
└──────────────────┘                        └──────────────────┘                    └──────────────────┘
```

#### Implementation

**Step 1 — Dashboard MFE dispatches event** (`mfe-dashboard/src/app/components/policy-list/policy-list.component.ts`):
```typescript
payPremium(policy: Policy): void {
  window.dispatchEvent(
    new CustomEvent('policy-selected', { detail: policy })
  );
}
```

**Step 2 — Container EventBusService listens and routes** (`container/src/app/services/event-bus.service.ts`):
```typescript
window.addEventListener('policy-selected', (event: Event) => {
  const policy = (event as CustomEvent).detail;
  localStorage.setItem('selected_policy', JSON.stringify(policy));
  this.ngZone.run(() => this.router.navigate(['/payment']));
});
```

**Step 3 — Payment MFE reads selected policy** (`mfe-payment/src/app/components/payment-form/payment-form.component.ts`):
```typescript
ngOnInit(): void {
  const stored = localStorage.getItem('selected_policy');
  if (stored) {
    this.selectedPolicy = JSON.parse(stored);
    localStorage.removeItem('selected_policy');
    this.calculatePremium(); // Triggers Web Worker
  }
}
```

---

## 5. Data Model

### Policy

| Field | Type | Description |
|---|---|---|
| id | string | Unique identifier |
| policyNumber | string | Display policy number (e.g., POL-2025-001) |
| holderName | string | Policy holder name |
| type | enum | `health` · `life` · `auto` · `home` |
| status | enum | `active` · `expired` · `pending` |
| coverageAmount | number | Total coverage amount (₹) |
| premiumAmount | number | Annual premium (₹) |
| startDate | string | Policy start date (YYYY-MM-DD) |
| endDate | string | Policy end date (YYYY-MM-DD) |
| description | string | Human-readable description |

### Payment

| Field | Type | Description |
|---|---|---|
| id | string | Unique identifier |
| policyId | string | Foreign key to Policy |
| policyNumber | string | Display reference |
| amount | number | Payment amount (₹) |
| date | string | Payment date (YYYY-MM-DD) |
| status | enum | `completed` · `pending` · `failed` |
| method | enum | `credit_card` · `debit_card` · `bank_transfer` |
| transactionId | string | Unique transaction reference |

### Client Storage (localStorage)

| Key | Content | Used By |
|---|---|---|
| `insurance_policies` | JSON array of Policy objects | Dashboard MFE, Payment MFE |
| `insurance_payments` | JSON array of Payment objects | Payment MFE |
| `selected_policy` | Single Policy JSON (transient) | Cross-MFE communication |

Mock data is seeded on first load via `shared/data/seed-data.ts` → `initializeSeedData()` called in the Container's `AppComponent.ngOnInit()`.

---

## 6. Routing

| Path | Loaded From | Component | Description |
|---|---|---|---|
| `/` | Container | `HomeComponent` | Landing page with feature cards |
| `/dashboard` | MFE Dashboard (remote) | `PolicyListComponent` | Policy grid with status filters |
| `/dashboard/policy/:id` | MFE Dashboard (remote) | `PolicyDetailComponent` | Single policy detail view |
| `/payment` | MFE Payment (remote) | `PaymentFormComponent` | Premium calculation + payment flow |
| `/payment/history` | MFE Payment (remote) | `PaymentHistoryComponent` | Transaction history table |

---

# Implementation Details

## Container App (Port 4200)

The **host shell** provides:
- **Navbar** — persistent navigation across all MFEs
- **Home page** — landing page with quick links to Dashboard and Payment
- **Router** — lazily loads MFE routes via Module Federation `loadChildren`
- **EventBusService** — listens for `CustomEvent` from MFEs and orchestrates navigation
- **Seed data** — initializes mock policies and payments in `localStorage` on first load

## MFE Dashboard (Port 4201)

Handles **insurance policy management**:
- **PolicyListComponent** — displays all policies in a responsive card grid, filterable by status (`all`, `active`, `expired`, `pending`). Each active policy has a **"Pay Premium"** button that dispatches `CustomEvent` for cross-MFE communication.
- **PolicyDetailComponent** — shows full policy details with coverage amount, dates, and a payment action.
- **PolicyService** — reads policy data from `localStorage`.

## MFE Payment (Port 4202)

Handles **premium payment** and **history**:
- **PaymentFormComponent** — policy selection → Web Worker premium calculation → payment method selection → payment processing. Reads `selected_policy` from `localStorage` when navigated via cross-MFE communication.
- **PaymentHistoryComponent** — table of all past transactions with status badges.
- **PaymentService** — reads/writes payment data to `localStorage`.
- **Web Worker** (`premium-calculator.worker.ts`) — performs risk-adjusted premium calculation in a background thread.

---

# Project Structure

```
insurance-mfe-client/
├── shared/                                   # Shared code across all MFEs
│   ├── models/
│   │   ├── policy.model.ts                  # Policy interface
│   │   └── payment.model.ts                 # Payment & PremiumCalculation interfaces
│   ├── data/
│   │   └── seed-data.ts                     # Mock data + localStorage seeding
│   └── styles/
│       ├── _variables.scss                  # SCSS design tokens (colors, spacing)
│       └── _mixins.scss                     # SCSS reusable mixins
│
├── container/                                # HOST SHELL (port 4200)
│   ├── src/
│   │   ├── main.ts                          # Async bootstrap entry
│   │   ├── bootstrap.ts                     # Angular bootstrapApplication
│   │   ├── index.html                       # HTML shell
│   │   ├── styles.scss                      # Global styles
│   │   ├── decl.d.ts                        # Module declarations for remotes
│   │   └── app/
│   │       ├── app.component.ts/html/scss   # Root component
│   │       ├── app.routes.ts                # Routes (lazy-loads MFEs)
│   │       ├── app.config.ts                # App providers
│   │       ├── components/
│   │       │   ├── home/                    # Landing page
│   │       │   └── navbar/                  # Top navigation bar
│   │       └── services/
│   │           └── event-bus.service.ts      # Cross-MFE event listener
│   ├── webpack.config.js                     # Module Federation HOST config
│   ├── angular.json                          # Angular CLI config
│   ├── tsconfig.json / tsconfig.app.json
│   └── package.json
│
├── mfe-dashboard/                            # DASHBOARD MFE (port 4201)
│   ├── src/
│   │   ├── main.ts / bootstrap.ts
│   │   ├── styles.scss
│   │   └── app/
│   │       ├── app.component.ts/html/scss
│   │       ├── app.routes.ts                # EXPOSED via Module Federation
│   │       ├── app.config.ts
│   │       ├── components/
│   │       │   ├── policy-list/             # Policy grid + filters + "Pay Premium" btn
│   │       │   └── policy-detail/           # Single policy view
│   │       └── services/
│   │           └── policy.service.ts         # Reads from localStorage
│   ├── webpack.config.js                     # Module Federation REMOTE config
│   ├── angular.json
│   ├── tsconfig.json / tsconfig.app.json
│   └── package.json
│
├── mfe-payment/                              # PAYMENT MFE (port 4202)
│   ├── src/
│   │   ├── main.ts / bootstrap.ts
│   │   ├── styles.scss
│   │   └── app/
│   │       ├── app.component.ts/html/scss
│   │       ├── app.routes.ts                # EXPOSED via Module Federation
│   │       ├── app.config.ts
│   │       ├── components/
│   │       │   ├── payment-form/            # Payment flow + Web Worker integration
│   │       │   └── payment-history/         # Transaction history table
│   │       ├── workers/
│   │       │   └── premium-calculator.worker.ts  # ⚡ WEB WORKER
│   │       └── services/
│   │           └── payment.service.ts        # Reads/writes localStorage
│   ├── webpack.config.js                     # Module Federation REMOTE config
│   ├── angular.json
│   ├── tsconfig.json / tsconfig.app.json
│   ├── tsconfig.worker.json                  # Worker-specific TS config
│   └── package.json
│
├── docs/
│   └── HLD.md                               # Standalone HLD document
├── package.json                              # Root scripts (install:all, start:all)
└── README.md                                 # This file
```

---

# Local Deployment Steps

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x

## Step 1: Clone and install

```bash
git clone <repository-url>
cd insurance-mfe-client

# Install root dependencies (concurrently)
npm install

# Install all 3 app dependencies
npm run install:all
```

## Step 2: Start the applications

### Option A — All at once (recommended)

```bash
npm run start:all
```

### Option B — Individually (3 separate terminals)

```bash
# Terminal 1: Dashboard MFE
npm run start:dashboard

# Terminal 2: Payment MFE
npm run start:payment

# Terminal 3: Container (start AFTER remotes are running)
npm run start:container
```

> **Important**: The MFE remotes (Dashboard & Payment) must be running before the Container starts. The container loads `remoteEntry.js` from each MFE at runtime.

## Step 3: Open in browser

Navigate to **http://localhost:4200**

| URL | What you'll see |
|---|---|
| http://localhost:4200 | Full app (Container + MFEs) |
| http://localhost:4201 | Dashboard MFE standalone |
| http://localhost:4202 | Payment MFE standalone |

## Available Scripts

| Script | Description |
|---|---|
| `npm run install:all` | Install dependencies for all 3 apps |
| `npm run start:all` | Start all 3 apps concurrently |
| `npm run start:container` | Start Container (host) on port 4200 |
| `npm run start:dashboard` | Start Dashboard MFE on port 4201 |
| `npm run start:payment` | Start Payment MFE on port 4202 |
| `npm run build:all` | Production build all 3 apps |
