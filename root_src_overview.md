# Legacy Root Source Directory Map (`src/`)

This document maps out the legacy root `src/` directory at `/Users/thilak/Documents/Planless/Planless Repo /Planless-2.0/src`.

> [!WARNING]
> This folder is **deprecated**. Active development files are located in `apps/app/src/`.

---

## 📂 Root source tree structure

```
src/
├── App.tsx
├── index.css
├── main.tsx
├── components/
│   ├── MainApp.tsx
│   ├── OnboardingFlow.tsx
│   ├── SimulatorHomeBar.tsx
│   ├── SimulatorStatusBar.tsx
│   ├── WorkspaceFooter.tsx
│   └── WorkspaceHeader.tsx
├── core/
│   ├── hooks/
│   │   └── useSupabaseSync.ts
│   ├── theme/
│   │   └── index.ts
│   └── types/
│       ├── discovery.ts
│       └── index.ts
├── demo/
│   └── seedData/
│       └── index.ts
├── features/
│   ├── circles/
│   │   ├── screens/
│   │   │   ├── AddMembersScreen.tsx
│   │   │   ├── CircleChatScreen.tsx
│   │   │   ├── CircleDetailScreen.tsx
│   │   │   ├── CircleSettingsScreen.tsx
│   │   │   ├── CirclesScreen.tsx
│   │   │   ├── CreateCircleDetailsScreen.tsx
│   │   │   └── CreateCircleMembersScreen.tsx
│   │   └── state/
│   │       └── CirclesContext.tsx
│   ├── create/
│   │   ├── components/
│   │   │   ├── BrowseExperiencesStep.tsx
│   │   │   ├── CreatePlanCTAButton.tsx
│   │   │   ├── CustomDateTimeStep.tsx
│   │   │   ├── CustomExtraSettingsStep.tsx
│   │   │   ├── CustomLocationStep.tsx
│   │   │   ├── CustomNameStep.tsx
│   │   │   ├── ExtraSettingsStep.tsx
│   │   │   ├── InviteRecipientsStep.tsx
│   │   │   ├── PlanDetailsStep.tsx
│   │   │   ├── PlanPreviewStep.tsx
│   │   │   └── discovery/
│   │   │       ├── DiningCard.tsx
│   │   │       ├── DiscoveryCarousel.tsx
│   │   │       ├── DiscoverySection.tsx
│   │   │       ├── GenericDiscoveryCard.tsx
│   │   │       ├── HeroBanner.tsx
│   │   │       ├── MoviePosterCard.tsx
│   │   │       └── SportsCard.tsx
│   │   └── screens/
│   │       └── CreatePlanScreen.tsx
│   ├── home/
│   │   └── screens/
│   │       └── HomeScreen.tsx
│   ├── plans/
│   │   ├── screens/
│   │   │   └── PlansScreen.tsx
│   │   └── state/
│   │       └── PlansContext.tsx
│   ├── profile/
│   │   ├── screens/
│   │   │   └── ProfileScreen.tsx
│   │   └── state/
│   │       └── ProfileContext.tsx
│   └── wallet/
│       ├── screens/
│       │   ├── TransactionHistoryScreen.tsx
│       │   └── WalletScreen.tsx
│       └── state/
│           └── WalletContext.tsx
├── lib/
│   ├── db.ts
│   └── mappers.ts
├── services/
│   └── discoveryService.ts
└── shared/
    ├── components/
    │   └── Icons.tsx
    └── modals/
        ├── DbExplorerModal.tsx
        ├── DepositCashModal.tsx
        ├── DetailedPlanModal.tsx
        ├── NotificationsTrayModal.tsx
        ├── PaymentConfirmationModal.tsx
        ├── ReservationSuccessModal.tsx
        └── StoryRecapModal.tsx
```
