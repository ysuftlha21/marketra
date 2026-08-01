# Project context and feature readiness

Dashboard features resolve project state on the server through `resolveAuthenticatedProjectContext`.
The resolver derives the workspace from the authenticated membership, validates the active project
against that workspace, and normalizes product context, product analysis, markets, and ICP versions
into one read model. Client-provided workspace IDs are never accepted.

The active project is stored in the HTTP-only `marketra:active-project` cookie. The cookie contains a
slug, not a workspace or database identifier. Every read validates the slug against the authenticated
workspace; an invalid or stale cookie falls back to the most recently updated accessible project.

## Readiness rules

- Markets require a non-empty project name and product description. An ICP is optional.
- Company Discovery requires usable product context, a target market, and an approved ICP for that
  market. A newer draft does not hide an older approved ICP version. When the selected market has no
  ICP but the same project has an approved ICP for another market, owners and admins can create a
  separate country ICP through deterministic adaptation. The copy keeps reusable company, industry,
  buyer-role, technology, pain and value context, changes the country ownership explicitly, records
  its source in `user_edits`, and adds a country-review assumption. It never overwrites or silently
  reinterprets the source profile.
- Buyer Discovery requires a saved project company. It does not report an ICP error when the company
  prerequisite is missing.
- AI Outreach requires a saved buyer role or an existing draft context.
- Campaigns require an outreach draft. Mailbox connectivity is only a sending prerequisite and does
  not block draft preparation.
- Analytics always opens. With no discovery, buyer, or outreach activity it renders a zero state.

Repository or RLS failures map to `project_inaccessible`/`inaccessible`; they are never represented as
missing user data. Project, ICP, market, company, buyer, and outreach mutations revalidate the
dashboard layout so subsequent navigation and refresh use current readiness.

Country adaptation requires a successful market-analysis record for the target country so all
foreign-key and historical provenance remain correct. It invokes neither AI nor company-discovery
providers and consumes no provider quota. The actual provider call occurs only after the user
explicitly submits the discovery form.
