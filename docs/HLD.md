# High-Level Design Document

## Insurance MFE Client Application

---

## 1. Architecture Overview

This application follows a **Micro-Frontend (MFE)** architecture using **Webpack 5 Module Federation**. The system is composed of three independently deployable Angular applications:

| Application | Port | Role | Description |
|---|---|---|---|
| **Container** | 4200 | Host Shell | Main entry point, navigation, routing, orchestration |
| **MFE Dashboard** | 4201 | Remote MFE | Insurance policy viewing and management |
| **MFE Payment** | 4202 | Remote MFE | Premium payment processing and history |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTAINER (Host) :4200                    │
│  ┌──────────┐  ┌──────────────────────────────────────────┐ │
│  │  Navbar   │  │              Router Outlet               │ │
│  │ Component │  │                                          │ │
│  └──────────┘  │  ┌──────────────┐  ┌──────────────────┐  │ │
│                │  │ MFE Dashboard │  │   MFE Payment    │  │ │
│                │  │    :4201      │  │     :4202        │  │ │
│                │  │              │  │                  │  │ │
│                │  │ Policy List   │  │ Payment Form     │  │ │
│                │  │ Policy Detail │  │ Payment History  │  │ │
│                │  │              │  │ [Web Worker]     │  │ │
│                │  └──────────────┘  └──────────────────┘  │ │
│                └──────────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            EventBus Service (CustomEvents)           │    │
│  │     Cross-MFE Communication via window events        │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              localStorage (Client Storage)           │    │
│  │    insurance_policies | insurance_payments           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Technology | Version | Purpose |
|---|---|---|
| Angular | 18.2 | Frontend framework (standalone components) |
| TypeScript | 5.4 | Type-safe development |
| Webpack | 5 | Bundling (via Angular CLI + ngx-build-plus) |
| Module Federation | Webpack 5 built-in | Micro-frontend integration |
| SCSS (Sass) | 1.70+ | CSS pre-processor |
| localStorage | Browser API | Client-side data persistence |
| Web Workers | Browser API | Background computation |
| ngx-build-plus | 18 | Custom webpack config for Angular |

---

## 3. Module Federation Configuration

### Container (Host)
```javascript
// Loads remote MFEs at runtime
remotes: {
  mfeDashboard: 'mfeDashboard@http://localhost:4201/remoteEntry.js',
  mfePayment: 'mfePayment@http://localhost:4202/remoteEntry.js',
}
```

### MFE Dashboard (Remote)
```javascript
// Exposes routes for the container to load
name: 'mfeDashboard',
filename: 'remoteEntry.js',
exposes: { './routes': './src/app/app.routes.ts' }
```

### MFE Payment (Remote)
```javascript
name: 'mfePayment',
filename: 'remoteEntry.js',
exposes: { './routes': './src/app/app.routes.ts' }
```

### Shared Dependencies (Singleton)
All three applications share Angular core packages as singletons to avoid duplicate framework loading:
- `@angular/core`, `@angular/common`, `@angular/router`, `@angular/forms`
- `@angular/platform-browser`, `@angular/animations`, `rxjs`

---

## 4. Cross-Cutting Concerns

### 4.1 Webpack Bundling (Module Federation)

Each MFE is bundled independently using Webpack 5 via `ngx-build-plus`. Module Federation enables:
- **Runtime integration**: MFEs are loaded on-demand when the user navigates
- **Independent deployment**: Each MFE can be built and deployed separately
- **Shared dependencies**: Angular framework is loaded once and shared
- **Async bootstrap**: `main.ts` → dynamic `import('./bootstrap')` pattern ensures proper module federation initialization

### 4.2 SCSS Pre-processor

- **Shared variables**: `shared/styles/_variables.scss` defines the design system tokens (colors, spacing, shadows)
- **Shared mixins**: `shared/styles/_mixins.scss` provides reusable style patterns
- **Include paths**: Each project's `angular.json` configures `stylePreprocessorOptions.includePaths` to resolve shared styles
- **Component styles**: Each component has scoped `.scss` files using `@use 'variables' as *`

### 4.3 Web Worker (Payment MFE)

**Location**: `mfe-payment/src/app/workers/premium-calculator.worker.ts`

**Use Case**: Premium calculation is offloaded to a Web Worker to keep the UI thread responsive.

**Flow**:
```
┌─────────────────┐     postMessage()     ┌──────────────────────┐
│  PaymentForm     │ ──────────────────► │  Web Worker           │
│  Component       │                      │  (Background Thread)  │
│                  │ ◄────────────────── │                        │
│  Updates UI      │     onmessage()     │  Premium Calculation   │
└─────────────────┘                      └──────────────────────┘
```

**Calculation Logic**:
1. Applies risk factor based on policy type (health: 1.15, auto: 1.20, etc.)
2. Applies tenure-based discount (12mo: 5%, 24mo: 10%, 36mo: 15%)
3. Calculates GST at 18%
4. Returns detailed breakdown and monthly equivalent

**Configuration**: Separate `tsconfig.worker.json` with `webworker` lib instead of `dom`.

### 4.4 Cross-MFE Communication

**Mechanism**: `CustomEvent` API on the `window` object

**Use Case**: When a user clicks "Pay Premium" on a policy in the Dashboard MFE, the payment flow starts in the Payment MFE.

**Data Flow**:
```
┌──────────────┐   CustomEvent         ┌──────────────┐   navigate()     ┌──────────────┐
│  Dashboard   │  'policy-selected'    │  Container   │  /payment        │  Payment     │
│  MFE         │ ───────────────────► │  EventBus    │ ───────────────► │  MFE         │
│              │   { detail: policy }  │  Service     │  + localStorage  │              │
│  Policy List │                       │              │                   │  Payment Form│
│  Pay Premium │                       │  Listens &   │                   │  Reads policy│
│  button      │                       │  Stores data │                   │  from storage│
└──────────────┘                       └──────────────┘                   └──────────────┘
```

**Implementation**:
1. **Dashboard MFE**: `window.dispatchEvent(new CustomEvent('policy-selected', { detail: policy }))`
2. **Container EventBusService**: Listens for the event, stores policy in `localStorage`, navigates to `/payment`
3. **Payment MFE**: Reads `selected_policy` from `localStorage` on init, pre-fills payment form

---

## 5. Data Model

### Policy
| Field | Type | Description |
|---|---|---|
| id | string | Unique identifier |
| policyNumber | string | Display policy number (e.g., POL-2025-001) |
| holderName | string | Policy holder name |
| type | enum | health, life, auto, home |
| status | enum | active, expired, pending |
| coverageAmount | number | Total coverage amount |
| premiumAmount | number | Annual premium |
| startDate | string | Policy start date |
| endDate | string | Policy end date |
| description | string | Human-readable description |

### Payment
| Field | Type | Description |
|---|---|---|
| id | string | Unique identifier |
| policyId | string | Foreign key to Policy |
| policyNumber | string | Display reference |
| amount | number | Payment amount |
| date | string | Payment date |
| status | enum | completed, pending, failed |
| method | enum | credit_card, debit_card, bank_transfer |
| transactionId | string | Unique transaction reference |

### Storage
- `localStorage['insurance_policies']` → JSON array of Policy objects
- `localStorage['insurance_payments']` → JSON array of Payment objects
- `localStorage['selected_policy']` → Transient policy for cross-MFE communication

---

## 6. Routing

| Path | Loaded From | Component |
|---|---|---|
| `/` | Container | HomeComponent |
| `/dashboard` | MFE Dashboard (remote) | PolicyListComponent |
| `/dashboard/policy/:id` | MFE Dashboard (remote) | PolicyDetailComponent |
| `/payment` | MFE Payment (remote) | PaymentFormComponent |
| `/payment/history` | MFE Payment (remote) | PaymentHistoryComponent |

---

## 7. Deployment Architecture

### Local Development
```bash
# Start all three apps concurrently
npm run start:all

# Or individually:
npm run start:dashboard  # http://localhost:4201
npm run start:payment    # http://localhost:4202
npm run start:container  # http://localhost:4200
```

### Production Deployment
Each MFE can be deployed independently to separate hosting services:
- Container → Netlify/Vercel (main domain)
- MFE Dashboard → Separate Netlify/Vercel deployment
- MFE Payment → Separate Netlify/Vercel deployment

Remote entry URLs in the container's webpack config would be updated to point to production URLs.
