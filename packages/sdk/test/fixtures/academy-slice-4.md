# Academy — Slice 4: Lesson player progress bar

**Status:** In progress  
**Module:** Academy / lesson player

## Goal

Ship a progress bar on the lesson player that reflects watch position and persists across sessions.

## Acceptance criteria

- AC 4.1: Progress bar must update as the user watches `apps/academy/components/LessonPlayer.tsx`
- AC 4.2: Cache invalidation must run when lesson metadata changes in `apps/academy/lib/lesson-cache.ts`
- AC 4.3: Public course detail should show resumed progress from `apps/academy/components/PublicCourseDetail.tsx`
- AC 4.4: API route `apps/academy/app/api/lessons/progress/route.ts` must persist progress per user

## Anchor files

- `LessonPlayer.tsx` — primary UI
- `apps/academy/lib/lesson-cache.ts` — cache layer

## Out of scope

- WaaP onboarding changes
- PSM matching flows
