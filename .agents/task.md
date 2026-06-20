# Remove Award Contact Flow Tasks

- `[x]` CARD FOOTER: Remove "Award deal" / "Award Contract" button from `components/buyer/VendorCard.tsx`.
- `[x]` GRID PASS: Remove `onAward` parameter and prop from `components/buyer/VendorResultsGrid.tsx`.
- `[x]` MODAL AWARD: Remove the "Award Contract" action from the `VendorProfileModal` header in `app/dashboard/page.tsx`.
- `[x]` STATE REMOVAL: Remove `feedbackModal`, `feedbackRating`, `feedbackNotes`, `handleAward`, and `saveAwardRating` from `app/dashboard/page.tsx`.
- `[x]` LEGACY CLEANUP: Delete unused legacy components `components/BuyerSearch.tsx`, `components/VendorCard.tsx`, and `components/VendorResultsGrid.tsx`.
- `[x]` VERIFICATION: Compile the Next.js app to ensure zero typecheck and build errors.
