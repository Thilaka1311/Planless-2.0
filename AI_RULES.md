# AI_RULES.md

This file contains strict architectural and aesthetic guidelines for AI agents working on the Planless codebase.

## 1. Do NOT Redesign the UI
- The current visual identity, color scheme, padding, typography, and motion animations must be preserved at all times.
- This is a premium, cinematic product. Do not introduce generic, simple MVP aesthetics.
- Preserve all existing animations, transitions, and gesture-based interactions.

## 2. Maintain Single Source of Truth for State
- Do NOT duplicate plan logic, join logic, or user states across components.
- State must only be managed within centralized stores in `src/features/*/state/` (e.g., `plansStore.ts`, `homeFeedStore.ts`).
- UI components (inside `components/` folders) should ONLY handle rendering and consume state from hooks. No complex business logic should live in `.tsx` components.

## 3. Adhere to the Feature-Based Architecture
- `/core`: Global styles, themes, and fundamental utilities.
- `/features`: Self-contained feature modules (Home, Plans, Create, Circles, Wallet, Profile). Each feature must have its own `components/`, `screens/`, `hooks/`, `services/`, `state/`, and `types/`.
- `/shared`: Reusable components (buttons, modals, cards) that are entirely agnostic of business logic.
- `/backend`: Supabase integration, auth logic, and API calls.
- `/demo`: Seed data and the demonstration state engine.

## 4. The Home Feed vs. Plans Hub Rule
- **Home Feed**: The exclusive source of discovery. It displays all joinable, active plans. 
- **Plans Hub**: A lightweight tracker. It only displays plans that the user has already joined or is hosting.
- Never duplicate accepted plans into the Home Feed, and never preload unaccepted plans into the Plans Hub.

## 5. Prevent Data Duplication
- When joining a plan, ensure the user is not added multiple times.
- Always perform deduping based on `user_id` rather than generic string matching.
- Always utilize the centralized state actions (e.g., `joinPlan(planId)`) instead of manually manipulating local component arrays.

## 6. Safe Refactoring
- Avoid rewriting working features unnecessarily. Refactors should focus on extracting logic into hooks/stores, not altering functional behavior.
- Ensure Vite HMR continues to function. Check for circular dependencies when refactoring.
