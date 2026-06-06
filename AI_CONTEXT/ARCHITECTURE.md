Supabase is source of truth.

UUIDs are used for:
- relationships
- joins
- foreign keys
- mutations

Text IDs are used only for:
- sharing
- public references
- debugging

No hardcoded production data.

No duplicate business logic.

No feature may introduce a second source of truth.

Database state always wins over local state.