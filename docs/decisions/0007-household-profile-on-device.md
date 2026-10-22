# 0007. Household profile stays on the device

- Status: accepted
- Date: 2026-10-22
- Owner: tech-lead
- Approved by: not required; it collects less data than the plan allows and changes no cost, vendor or product direction.

## Context
Onboarding collects the household profile: members with children's ages and baby feeding stages, allergies, kashrut, diet, dislikes, appliances, chains and loyalty clubs. CLAUDE.md marks allergies and children's data as sensitive and asks for the minimum personal data. There are no user accounts yet, and nothing on a server needs the profile before the planner and the price quotes exist.

## Decision
- The profile is stored only on the device, in AsyncStorage under `makeat.household.v1`, as `{ version, household, completed }`. It is never sent anywhere.
- Loading fills fields added in later versions from the defaults. A changed meaning of an existing field gets a new `version` and a migration.
- The profile has no names: members are "adult", "child" or "baby" with an age.
- Syncing the profile to Supabase (0001) needs its own record first, covering consent, what is synced, row-level security and deletion.

## Alternatives rejected
- Store in Supabase now: needs accounts and a privacy design before there is any server feature that uses the data.
- Encrypted storage (SecureStore): meant for secrets with a small size limit; the profile is not a credential, and device encryption already protects app storage at rest.

## Consequences
- Reinstalling the app or changing phones loses the profile until sync exists.
- No privacy notice for server-side storage is needed yet; the onboarding screen tells users their details stay on the device, and that text must change when sync arrives.
