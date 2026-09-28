# Graph Report - kenji-knihovna  (2026-09-28)

## Corpus Check
- 74 files · ~236,208 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 17 file(s) not represented in the graph (top: (none) 12, .css 2, .lock 1)

## Summary
- 915 nodes · 1666 edges · 60 communities (40 shown, 20 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 115 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `167b89f5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- admin.js
- dashboard.js
- auth.js
- feed.js
- _ecomail.js
- nav.js
- build-legacy-uspechy.mjs
- kenji-ai.js
- settings.js
- Ecomail marketing integration handoff
- 20260823163000_admin_workspace.sql
- tour.js
- index.ts
- 20260822_free_community.sql
- slidy.js
- leaderboard.js
- notify.js
- presety.js
- build-course-content.mjs
- ecomail-send.js
- enrich-course-descriptions.mjs
- 20260910120000_email_marketing.sql
- package.json
- academy-gallery.js
- community-pinning.sql
- pwreset.js
- checkout-email.js
- Local-first deployment policy
- articles.js
- img-util.js
- 20260824090000_ai_user_quota.sql
- challenges.js
- 20260824150000_ai_lead_quota.sql
- public.create_post
- public.list_published_content
- courses.js
- 20260825120000_admin_add_user_and_webinar.sql
- 20260826120000_user_profile_sync.sql
- 20260826140000_xp_sync.sql
- Kenji AI Edge Function setup
- Kenji Knihovna — Jak to funguje
- public.next_webinar
- public.community_leaderboard
- public.my_presets
- public.my_presets
- public.my_presets
- quiz.js
- public.users
- KENJI KNIHOVNA — Kontext projektu pro Claude Code
- Komunitní příspěvky - nastavení Supabase
- Profily + Nastavení + Admin — Supabase
- SUPABASE_KUPONY.md
- _stripe.js

## God Nodes (most connected - your core abstractions)
1. `render()` - 27 edges
2. `esc()` - 24 edges
3. `email()` - 24 edges
4. `getSupabase()` - 17 edges
5. `esc()` - 17 edges
6. `rpc()` - 16 edges
7. `adoptSession()` - 16 edges
8. `n()` - 15 edges
9. `jget()` - 15 edges
10. `syncOnLoad()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Graphify-first codebase workflow` --semantically_similar_to--> `Graphify-first codebase workflow`  [INFERRED] [semantically similar]
  AGENTS.md → CLAUDE.md
- `toggle()` --indirect_call--> `key()`  [INFERRED]
  assets/nav.js → tools/build-legacy-uspechy.mjs
- `addCoupon()` --indirect_call--> `email()`  [INFERRED]
  assets/settings.js → netlify/functions/_ecomail.js
- `loadCoupons()` --indirect_call--> `email()`  [INFERRED]
  assets/settings.js → netlify/functions/_ecomail.js
- `loadUsers()` --indirect_call--> `email()`  [INFERRED]
  assets/settings.js → netlify/functions/_ecomail.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Production change controls** — deployment_policy_local_first_deployment, deployment_policy_monthly_batched_release, deployment_policy_explicit_external_authorization, email_marketing_handoff_ecomail_marketing [EXTRACTED 1.00]
- **User data and personalization pipeline** — supabase_setup_supabase_lead_and_progress, audit_lead_gate, nastaveni_community_profile, kenji_ai_setup_kenji_ai_edge_function [INFERRED 0.75]
- **Tier-aware platform experience** — stav_projektu_access_tiers, stav_projektu_capability_matrix, index_member_aware_upgrade_strip, academy_academy_offer [INFERRED 0.85]

## Communities (60 total, 20 thin omitted)

### Community 0 - "admin.js"
Cohesion: 0.07
Nodes (78): activeEmailSequence(), activeEmailStep(), adminEmailApi(), audienceLabel(), audienceTag(), blockButton(), boot(), campaignStatsLine() (+70 more)

### Community 1 - "dashboard.js"
Cohesion: 0.06
Nodes (73): activationPanel(), activationTasks(), addXp(), aiUrl(), article(), awardTaskXp(), bizGet(), bizSet() (+65 more)

### Community 2 - "auth.js"
Cohesion: 0.06
Nodes (67): adoptSession(), anonymousId(), applyGating(), bizComplete(), cleanAuthLocation(), currentCampaignUrl(), dismissPointsIntro(), doLogout() (+59 more)

### Community 3 - "feed.js"
Cohesion: 0.08
Nodes (60): avatar(), awardWeeklyChallengeXp(), bodyBlocks(), buildProfiles(), canAccessCategory(), categoryCount(), catTabs(), composer() (+52 more)

### Community 4 - "_ecomail.js"
Cohesion: 0.06
Nodes (52): E, handler(), status(), webhookUrl(), adminUser(), articleBlock(), articleEmailHtml(), articlePlainText() (+44 more)

### Community 5 - "nav.js"
Cohesion: 0.09
Nodes (31): dbGraphic(), getHistory(), getRead(), hasAcademyAccess(), initActionChecklists(), paint(), toggle(), initArticleTracking() (+23 more)

### Community 6 - "build-legacy-uspechy.mjs"
Cohesion: 0.07
Nodes (36): ref_node_assert, ref_node_fs, ref_node_path, ref_node_vm, ago(), data, localOrEmpty(), NOW (+28 more)

### Community 7 - "kenji-ai.js"
Cohesion: 0.14
Nodes (29): activeConvo(), anonymousId(), autosize(), closeDrawer(), esc(), fmt(), flushPara(), hideTyping() (+21 more)

### Community 8 - "settings.js"
Cohesion: 0.12
Nodes (22): addCoupon(), bizGet(), couponProductsFromForm(), emailApi(), esc(), freshSession(), getSB(), loadCoupons() (+14 more)

### Community 9 - "Ecomail marketing integration handoff"
Cohesion: 0.07
Nodes (29): Lifetime Academy offer, Kenji Academy sales page, People, tools, content, coupons, emailing and activity modules, Kenji Admin workspace, Creator business audit, Audit lead gate, Personalized growth simulation, Audience-first campaign sequencing (+21 more)

### Community 10 - "20260823163000_admin_workspace.sql"
Cohesion: 0.09
Nodes (12): analytics_events_anon_idx, analytics_events_created_idx, analytics_events_name_idx, analytics_events_user_idx, content_items_schedule_idx, public.analytics_events, public.content_items, public.is_admin() (+4 more)

### Community 11 - "tour.js"
Cohesion: 0.28
Nodes (19): cleanTourParams(), createUi(), currentState(), defaultState(), dots(), findTarget(), migrateCompletedTour(), move() (+11 more)

### Community 12 - "index.ts"
Cohesion: 0.14
Nodes (15): ref_https, AiContext, BLOCKER_LABELS, callProvider(), cleanList(), cleanText(), corsHeaders, EXPERIENCE_LABELS (+7 more)

### Community 13 - "20260822_free_community.sql"
Cohesion: 0.18
Nodes (13): public.add_comment(), public.can_access_community_category(), public.create_post(), public.legacy_post_pin_overrides, public.list_comments(), public.list_legacy_pin_overrides(), public.list_posts(), public.toggle_legacy_pin() (+5 more)

### Community 14 - "slidy.js"
Cohesion: 0.17
Nodes (14): ref_child_process, data, esc(), { execFileSync }, fs, htmlOnly, lines(), logoPath (+6 more)

### Community 15 - "leaderboard.js"
Cohesion: 0.35
Nodes (12): avatar(), currentUserRow(), esc(), fallbackRows(), get(), hydrate(), initial(), levelOf() (+4 more)

### Community 16 - "notify.js"
Cohesion: 0.36
Nodes (12): badgeHtml(), ensureInit(), fetchPosts(), jget(), jset(), lastSeen(), markSeen(), paint() (+4 more)

### Community 17 - "presety.js"
Cohesion: 0.32
Nodes (12): esc(), kb(), najdiSoubory(), prehravac(), renderError(), renderHost(), renderList(), stahni() (+4 more)

### Community 18 - "build-course-content.mjs"
Cohesion: 0.17
Nodes (8): ref_fs, ref_url, content, coursesJs, EXPORTS, idToSlug, ROOT, win

### Community 19 - "ecomail-send.js"
Cohesion: 0.17
Nodes (8): ref_os, args, E, ENV_FILE, file, fs, os, path

### Community 20 - "enrich-course-descriptions.mjs"
Cohesion: 0.17
Nodes (7): ref_path, EXPORTS, kenjiIntro, missing, NOTES, ROOT, used

### Community 21 - "20260910120000_email_marketing.sql"
Cohesion: 0.23
Nodes (8): email_delivery_email_idx, email_delivery_provider_event_idx, email_delivery_type_idx, public.admin_email_overview(), public.email_delivery_events, public.email_sequences, public.get_email_preferences(), public.users

### Community 22 - "package.json"
Cohesion: 0.20
Nodes (9): dependencies, stripe, description, engines, node, name, private, version (+1 more)

### Community 23 - "academy-gallery.js"
Cohesion: 0.31
Nodes (6): initDragScroll(), tick(), wrap(), move(), openLightbox(), showImage()

### Community 24 - "community-pinning.sql"
Cohesion: 0.25
Nodes (6): public.legacy_post_pin_overrides, public.list_posts(), public.toggle_pin_post(), public.post_comments, public.post_likes, public.posts

### Community 25 - "pwreset.js"
Cohesion: 0.46
Nodes (7): esc(), renderExpired(), renderForm(), start(), wireForm(), err(), save()

### Community 26 - "checkout-email.js"
Cohesion: 0.67
Nodes (3): handler(), json(), stripe

### Community 28 - "Local-first deployment policy"
Cohesion: 0.33
Nodes (7): Graphify-first codebase workflow, Codex repository instructions, Graphify-first codebase workflow, Claude repository instructions, Explicit authorization for external changes, Local-first deployment policy, Monthly batched production release

### Community 29 - "articles.js"
Cohesion: 0.33
Nodes (5): KENJI_ARTICLES, KENJI_CATEGORIES, KENJI_FREE_SLUGS, KENJI_PRESET_PROMO, KENJI_VIDEOS

### Community 30 - "img-util.js"
Cohesion: 0.60
Nodes (5): compress(), decode(), loadImage(), readAsDataURL(), toBlob()

### Community 31 - "20260824090000_ai_user_quota.sql"
Cohesion: 0.47
Nodes (4): auth.users, ai_question_usage_user_asked_idx, public.ai_question_usage, public.get_ai_question_quota()

### Community 32 - "challenges.js"
Cohesion: 0.80
Nodes (4): current(), isoWeek(), loadRemote(), weekKey()

### Community 35 - "public.create_post"
Cohesion: 0.50
Nodes (4): public.can_access_community_category(), public.create_post(), public.posts, public.users

### Community 36 - "public.list_published_content"
Cohesion: 0.60
Nodes (4): public.list_published_content(), public.next_webinar(), public.content_items, public.users

### Community 41 - "Kenji AI Edge Function setup"
Cohesion: 0.67
Nodes (3): Global AI usage limit, Kenji AI Edge Function setup, Groq with OpenRouter fallback

### Community 42 - "Kenji Knihovna — Jak to funguje"
Cohesion: 0.67
Nodes (3): Data-driven navigation, Kenji Knihovna — Jak to funguje, Soft JavaScript paywall

### Community 56 - "KENJI KNIHOVNA — Kontext projektu pro Claude Code"
Cohesion: 0.08
Nodes (24): Aktuální kategorie (7, definované v assets/articles.js), Barvy (CSS proměnné v assets/styles.css), BRAND GUIDE, CO JE HOTOVÉ, CO JE PROJEKT, CO TEĎ DĚLAT, DALŠÍ VELKÁ FÁZE — WEB APLIKACE, Data-driven navigace (DŮLEŽITÉ) (+16 more)

### Community 57 - "Komunitní příspěvky - nastavení Supabase"
Cohesion: 0.40
Nodes (4): Komunitní příspěvky - nastavení Supabase, Kontrolní scénáře, Nasazení, Ověření uživatele

### Community 58 - "Profily + Nastavení + Admin — Supabase"
Cohesion: 0.40
Nodes (4): 1) SQL — rozšíření users + role + funkce, 2) Úložiště na profilovky, Pozn., Profily + Nastavení + Admin — Supabase

### Community 60 - "_stripe.js"
Cohesion: 0.12
Nodes (13): handler(), json(), S, stripe, fallback(), handler(), redirect(), S (+5 more)

## Knowledge Gaps
- **121 isolated node(s):** `KENJI_CATEGORIES`, `KENJI_ARTICLES`, `KENJI_FREE_SLUGS`, `KENJI_VIDEOS`, `KENJI_PRESET_PROMO` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 265 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `email()` connect `feed.js` to `admin.js`, `settings.js`, `_ecomail.js`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `email()` (e.g. with `admin.js` and `loadFeed()`) actually correct?**
  _`email()` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `KENJI_CATEGORIES`, `KENJI_ARTICLES`, `KENJI_FREE_SLUGS` to the rest of the system?**
  _121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `admin.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06835290575127974 - nodes in this community are weakly interconnected._
- **Should `dashboard.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06329113924050633 - nodes in this community are weakly interconnected._
- **Should `auth.js` be split into smaller, more focused modules?**
  _Cohesion score 0.06468797564687975 - nodes in this community are weakly interconnected._
- **Should `feed.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0798611111111111 - nodes in this community are weakly interconnected._