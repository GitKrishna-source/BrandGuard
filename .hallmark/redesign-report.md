# Dusk redesign

Implemented the Dusk theme on the existing BrandGuard page and modal surfaces. The hero now combines a locally stored credited fog photograph with the working draft composer. The studio uses a bone document well beside slate review findings. Feature actions use ruled rows.

Preserved: 82/82 distinct handler expressions in the recorded baseline, preset values, form IDs, audit and API calls, role restrictions, review and export actions. No routes or component files were deleted.

Validation: TypeScript, production build, ESLint, desktop renders at 1280/1440/1920 and a 375px mobile render. Browser interaction checks passed for audit launch into role selection, closing the dialog, preset population, applying both sample fixes, and mobile overflow; zero page errors. Backend requests were not tested end to end.

Hallmark render result: 0 FAIL, 0 WARN, 3 waived layout/control findings. The compact headline and taller working form deliberately have different text bounds; workflow rows retain large clickable content areas. A duplicate waiver applied to the markup-free base stylesheet was rejected by the checker; its route-level waiver was accepted.

Review: performed in-thread. Confirmed the landscape crop, readable hero, composer alignment, mobile stacking, studio document contrast, and role selection dialog. No empty material slots remain. The existing fictional demo data and illustrative scores remain labelled as examples.

Copy tightened under the copy gates:
- Hero description: “Create boldly. Publish confidently. Give every draft a second pair of eyes for brand voice, facts, and the details that matter.” became “Review drafts for brand voice, facts, and the details that matter.”
- Studio heading: “Small edits. Big confidence.” now uses a single text colour.
- Feature and team descriptions were preserved, with sentence case, typographic apostrophes and arrow suffixes removed.
- Decorative orbit illustrations, browser traffic lights, section eyebrows, and the static demo badge were removed.

Photography: Luca Bravo, https://unsplash.com/photos/a-foggy-forest-with-a-sunset-in-the-background-oY8IrtfeYgQ. Saved locally and credited in the footer. Wikimedia returned HTTP 429 for the Hallmark library photograph, so this equivalent licensed landscape was used.

Optional material improvement: a brand-owned landscape may replace public/images/dusk-valley.jpg (2400px or wider, landscape orientation). No additional material is required.
