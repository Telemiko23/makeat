# 0009. Debug-signed builds through the internal alpha

- Status: accepted
- Date: 2026-10-22
- Owner: tech-lead
- Approved by: Liran, 2026-10-22 (decision card on the onboarding PR; privacy-risk acceptance)

## Context
0005 accepted debug-key signing only "while the app stores no personal data". From the onboarding (0007) the app stores a household profile on the device, including allergies and children's ages. The debug key is public, so anyone could sign an APK that installs as an update over ours and reads that data, provided they get the user to install it.

## Decision
- Internal alpha (v0.1) builds stay signed with the debug key.
- This holds only while every install is a team device, the repository and its releases stay private, and profile data never leaves the device.
- A project keystore kept in CI secrets is required before any of these changes, and in any case before the closed beta (v0.2).
- This amends the signing consequence of 0005; the rest of 0005 is unchanged.

## Alternatives rejected
- Project keystore now: needs Liran to add CI secrets by hand for a risk that only exists if he installs an APK from someone else.

## Consequences
- Testers outside the team must wait for the keystore switch.
- The release checklist for v0.2 must include the keystore switch, and installs signed with the debug key will need a clean reinstall (Android rejects an update signed with a different key).
