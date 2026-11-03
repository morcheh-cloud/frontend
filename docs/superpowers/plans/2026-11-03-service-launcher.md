# Service Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** صفحهٔ `/services` در پنل که جای گوگل‌شیت سرویس‌های وب تیم را می‌گیرد: دسته‌بندی با درگ، کاشی و جدول، چند اکانت، پسورد امن با لاگ، favicon خودکار، و سیستم دسترسی فعلی.

**Architecture:** بک‌اند منبع جدید `app` را کنار `server` و `storage` به `access_grants` اضافه می‌کند و API زیر `/apps` می‌دهد؛ پسورد فقط از endpoint جدای reveal و با ثبت لاگ در همان تراکنش بیرون می‌آید. فرانت یک صفحهٔ client-side است که کل لیست را با `useApps` می‌گیرد، سمت کلاینت فیلتر می‌کند و چیدمان را با به‌روزرسانی خوش‌بینانه می‌فرستد.

**Tech Stack:** Go 1.27، Huma v2، sqlc، goose، PostgreSQL 18 · Next.js 16، React 19، TanStack Query، nuqs، Base UI، `@dnd-kit` (وابستگی جدید).

**Spec:** `docs/superpowers/specs/2026-11-03-service-launcher-design.md`

## Global Constraints

- پسورد هرگز در پاسخ لیست، لاگ سرور، URL، `localStorage`/IndexedDB یا کش TanStack با عمر طولانی نمی‌آید.
- Viewer از هیچ راهی به یوزر یا پسورد نمی‌رسد، از جمله با `q`.
- هر reveal دقیقاً یک ردیف لاگ در همان تراکنش دارد؛ لاگ نشد = پسورد نده.
- درگ تنها راه جابه‌جایی نیست: منوی `Move to category` و کیبورد هم کار می‌کنند.
- آدرس غیر `http`/`https` نه ذخیره می‌شود و نه روی لینک می‌نشیند.
- نام در کد `app`، در UI و مسیر فرانت «Services». نام‌های systemd (`ServicesActionsProvider`، `useServices`، slug راهنمای `services`) دست نمی‌خورند.
- دسترسی: Viewer = سرویس، لینک، یادداشت · Operator = + یوزر و reveal · Engineer = + ویرایش · Owner = + حذف، مدیریت دسترسی، لاگ. دسته‌ها و ترتیب = Engineer روی کل workspace.
- قواعد فرانت از `CLAUDE.md`: بدون SSR داده، فقط `lucide-react`، کلاس‌های منطقی، UI انگلیسی LTR، تم روشن، بدون کارت آمار، `useOpen` برای هر لایه، لمس حداقل ۴۴px، `SecretInput` برای پسورد، `src/lib/services.ts` فقط با `pnpm gen:api`.
- `Cache-Control: no-store` روی reveal.
- **گیت:** دو ریپوی جدا (`frontend`، `../backend`)، هر کدام روی برنچ `feat/service-launcher`. روی `main` commit نزن. قدم‌های Commit فقط با اجازهٔ کاربر اجرا می‌شوند؛ پیام با `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` تمام می‌شود.

### روال تست مرورگر (تسک‌های فرانت)

پروژه test runner جاوااسکریپت ندارد و این فیچر هم اضافه نمی‌کند: هر تسک فرانت با `rtk proxy pnpm lint`، `pnpm build` و چک مرورگری تأیید می‌شود. برای نوشتن روی دیتا: دیتابیس scratch + بک‌اند روی `:8081` + Chrome headless با `--host-resolver-rules="MAP localhost:8080 127.0.0.1:8081"` و درایو با CDP (بخش Browser testing در `CLAUDE.md`). برای منوهای Base UI کلیک واقعی با `Input.dispatchMouseEvent`. رمز ادمین dev در auto-memory `dev-panel-admin-login` است و وارد گیت نمی‌شود.

## Review Focus

1. **رها کردن درگ کاشی‌ای که لینک است:** کاشی نباید بعد از درگ سرویس را باز کند. (چک در تسک ۱۱)
2. **باز کردن سرویس از ⌘K:** مسیر فعلی `pick()` ناوبری را روی `popstate` می‌برد و مرورگر popup را می‌بندد؛ باید هم‌زمان با کلیک باز شود. (چک در تسک ۱۳)
3. **کپی پسورد بعد از reveal ناهمگام:** در Safari/iOS gesture از دست می‌رود و روی پنل HTTP اصلاً `navigator.clipboard` نیست؛ کاربر باید یا کپی شدن را ببیند یا خود مقدار را. (چک در تسک ۱۰)
4. **آدرس‌هایی که آدم‌ها واقعاً می‌نویسند:** `localhost:9000`، `10.0.0.5:9000` باید کار کنند؛ `javascript:alert(1)` و `user:pass@host` نباید. (تست در تسک ۲)
5. **favicon پس‌زمینه:** عکس آپلودی یا آیکون انتخابی را هرگز عوض نمی‌کند. (تست در تسک ۶)

## تصمیم‌های سازنده که از متن spec فاصله دارند

- لوگو در جدول جدای `app_logos` است نه داخل `apps`، تا `SELECT` لیست سبک بماند و fetch پس‌زمینه نتواند ردیف آپلود را بازنویسی کند.
- Provider لایه‌ها `AppActionsProvider` نام دارد نه `ServicesActionsProvider`، چون آن نام برای systemd گرفته شده.
- `q` در API فقط اسم، آدرس و یادداشت را می‌گردد، نه یوزر؛ وگرنه برای Viewer اوراکل می‌شود.
- آدرس حاوی `user:pass@` رد می‌شود چون آدرس را Viewer هم می‌بیند.

## نقشهٔ فایل‌ها

**بک‌اند (`../backend`)**

| فایل | مسئولیت |
|---|---|
| `migrations/20261103120000_create_apps.sql` | جدول‌ها و `access_grants.app_id` |
| `queries/apps.sql` (جدید)، `queries/auth.sql` | کوئری‌های sqlc |
| `internal/auth/auth.go` | `Access.Apps`، `AppLevel` |
| `internal/api/policy.go`، `authz.go`، `auth.go`، `admin.go`، `workspaces.go` | سیم‌کشی دسترسی |
| `internal/api/apps_model.go` (جدید) | توابع خالص: `normalizeAddress`، `toApp`، `categoriesFor` |
| `internal/api/apps.go` (جدید) | CRUD و لیست |
| `internal/api/app_categories.go` (جدید) | دسته‌ها و چیدمان |
| `internal/api/app_secrets.go` (جدید) | reveal و activity |
| `internal/api/app_logos.go` (جدید) | لوگو و refetch |
| `internal/appicon/` (جدید) | گرفتن favicon با سقف‌ها، sniff تصویر |
| `internal/api/integration_test.go` (جدید) | harness تست با دیتابیس |

**فرانت (`src/app/(panel)/services/`)**

| فایل | مسئولیت |
|---|---|
| `page.tsx`، `layout.tsx` | صفحه و Provider |
| `api.ts` | کلیدها، query و mutationها |
| `components/meta.tsx` | پالت، آیکون‌ها، `AppLogo`، `useAppFilters`، `suggestName`، `safeHref` |
| `components/permissions.ts` | `useAppCan`، `useAppLayoutCan` |
| `components/app-actions.tsx` | `AppActionsProvider` / `useAppActions`، همهٔ لایه‌ها |
| `components/app-form.tsx`، `accounts-editor.tsx`، `logo-picker.tsx` | فرم سرویس |
| `components/app-menu.tsx` | `useAppMenu`، منوی دسکتاپ و sheet |
| `components/app-details.tsx`، `secret.tsx` | Details، Activity، reveal و کپی |
| `components/category-rail.tsx`، `category-dialog.tsx` | ریل و مدیریت دسته |
| `components/apps-view.tsx`، `apps-desktop.tsx`، `tile-view.tsx`، `table-view.tsx`، `apps-mobile.tsx` | نماها |
| `components/layout-dnd.tsx` | درگ |
| `src/app/help/content/service-launcher.tsx` | راهنما |

---

## بخش اول: بک‌اند

همهٔ فرمان‌ها از `../backend` اجرا می‌شوند.

### Task 1: جدول‌ها و سیم‌کشی دسترسی

**Files:**
- Create: `migrations/20261103120000_create_apps.sql`
- Modify: `queries/auth.sql`, `internal/auth/auth.go`, `internal/auth/auth_test.go`, `internal/api/policy.go`, `internal/api/policy_test.go`, `internal/api/authz.go`, `internal/api/auth.go`, `internal/api/admin.go`, `internal/api/workspaces.go`, `internal/api/storages.go:631`, `internal/api/servers.go:764`

**Interfaces:**
- Produces: `func (a *Access) AppLevel(workspace, app uuid.UUID) Level` · `func onApp(l auth.Level) policy` · `kindApp` · `grantCreator(ctx, q, p, ws, server, storage, app *uuid.UUID)` · `scope.apps` · sqlc: `GetAppWorkspace`, `ListAppWorkspaces`, `ListWorkspaceApps`, `MoveAppsToWorkspace` · `GrantSpec.AppID` · `MyAccess.Apps`

- [ ] **Step 1: برنچ `feat/service-launcher` را در `../backend` بساز و migration را بنویس**

جدول‌ها:

- `app_categories`: `id`، `workspace_id` FK CASCADE، `name` (۱ تا ۶۴)، `color`، `position int`، زمان‌ها. `UNIQUE (workspace_id, lower(name))`.
- `apps`: `id`، `workspace_id` FK، `category_id` FK `ON DELETE SET NULL`، `name`، `address`، `note`، `color`، `critical bool`، `position int`، `logo_kind CHECK IN ('auto','upload','icon') DEFAULT 'auto'`، `logo_icon text NOT NULL DEFAULT ''`، زمان‌ها. اسم سرویس unique نیست.
- `app_logos`: `app_id` FK CASCADE، `source CHECK IN ('favicon','upload')`، `content_type`، `data bytea`، `updated_at`، `PRIMARY KEY (app_id, source)`.
- `app_accounts`: `id`، `app_id` FK CASCADE، `label`، `username`، `password_enc bytea NULL`، `position int`.
- `app_secret_views`: `id`، `app_id` FK CASCADE، `account_id` FK `SET NULL`، `account_label`، `user_id` FK `SET NULL`، `user_name`، `ip`، `created_at`.
- `access_grants`: ستون `app_id` FK CASCADE؛ CHECK می‌شود `num_nonnulls(workspace_id, server_id, storage_id, app_id) = 1`؛ `access_grants_key` با `app_id` دوباره ساخته می‌شود؛ ایندکس روی `app_id`. بخش down همهٔ این‌ها را برمی‌گرداند.

- [ ] **Step 2: کوئری‌ها را بنویس و `make migrate-up` و `make sqlc` را اجرا کن**

در `queries/auth.sql`: شمارش `apps` در `ListWorkspaces` و `CountWorkspaceResources`؛ `ListGrants` با join و `app_name` و narg `app_id`؛ `FindGrant` و `UpsertGrant` (ستون‌ها و لیست `ON CONFLICT`)؛ `GetAppWorkspace`؛ `ListAppWorkspaces(@ids)`؛ `ListWorkspaceApps`؛ `MoveAppsToWorkspace` که `category_id = NULL` می‌گذارد.

Expected: `go build ./...` فقط به خاطر ستون‌های جدید در `UpsertGrant` خطا می‌دهد و Step 3 درستش می‌کند.

- [ ] **Step 3: تست‌های شکست‌خورنده را بنویس**

```go
// internal/auth/auth_test.go
func TestAppLevel(t *testing.T) {
	// grant روی workspace = Viewer و روی app = Engineer → AppLevel(ws, app) == Engineer
	// فقط grant روی workspace = Operator → AppLevel(ws, anyApp) == Operator
	// فقط grant روی app دیگر → AppLevel(ws, thisApp) == NoAccess
	// Admin → Owner
}
func TestHighestCountsApps(t *testing.T) {
	// فقط Owner روی یک app → Highest() == Owner
}
```

و در `policy_test.go` مورد `kindApp` را به switch تست `TestEveryOperationHasAPolicy` و `{accountId}`، `{categoryId}` را به `NewReplacer` تست signed-out اضافه کن.

- [ ] **Step 4: اجرا کن و شکست را ببین**

Run: `go test ./internal/auth ./internal/api`
Expected: FAIL با `AppLevel undefined`.

- [ ] **Step 5: پیاده‌سازی**

- `internal/auth/auth.go`: `Access.Apps`؛ شاخهٔ `g.AppID` در `NewAccess`؛ `AppLevel` هم‌الگوی `StorageLevel`؛ حلقهٔ Apps در `Highest()`.
- `policy.go`، `authz.go`: `kindApp` در noun map و `check()` با `GetAppWorkspace` و `acc.AppLevel`؛ `scope.apps` در `p.scope()`؛ پارامتر `app` در `grantCreator` و به‌روزرسانی دو caller فعلی با `nil`؛ متن خطای `createTarget` سرویس‌ها را هم بگوید.
- `auth.go`: `MyAccess.Apps []ResourceAccess` و هندلر `get-my-access`.
- `admin.go`: `GrantSpec.AppID`؛ `params()` شمارش چهارتایی و متن خطا.
- `workspaces.go`: `PanelWorkspace.AppCount`؛ `visibleWorkspaces` با `ListAppWorkspaces` تا کسی که فقط به یک سرویس دسترسی دارد workspace را Partial ببیند؛ `WorkspaceDetail.Apps []WorkspaceApp{ID, Name, Address}`؛ `WorkspaceAssignBody.AppIDs` با `MoveAppsToWorkspace`؛ `PanelGrant.AppID/AppName`؛ `GrantListInput.AppID`؛ `ownsTarget` با `app`؛ پیام 409 در `delete-workspace` شامل تعداد سرویس‌ها.

- [ ] **Step 6: اجرا کن و قبولی را ببین**

Run: `go vet ./... && go test ./...`
Expected: PASS. (`TestEveryOperationHasAPolicy` هنوز endpoint جدیدی نمی‌بیند.)

- [ ] **Step 7: Commit**

```bash
git add migrations queries internal
git commit -m "feat(apps): add tables and wire apps into the access system"
```

### Task 2: توابع خالص مدل

**Files:**
- Create: `internal/api/apps_model.go`, `internal/api/apps_model_test.go`

**Interfaces:**
- Produces:
  - `func normalizeAddress(raw string) (string, error)`
  - `type App struct{ID string; WorkspaceID string; CategoryID *string; Name, Address, Note, Color string; Critical bool; Position int32; LogoKind, LogoIcon string; LogoURL *string; Accounts []AppAccount; CreatedAt, UpdatedAt time.Time}` با JSON به snake_case
  - `type AppAccount struct{ID, Label, Username string; HasPassword bool}`
  - `type logoStamp struct{Source string; UpdatedAt time.Time}`
  - `func toApp(row sqlc.App, accounts []sqlc.AppAccount, logos []logoStamp, level auth.Level) App`
  - `func categoriesFor(acc *auth.Access, ws uuid.UUID, cats []sqlc.AppCategory, apps []sqlc.App) []sqlc.AppCategory`
  - `var appColors = []string{"slate","red","orange","amber","green","teal","blue","indigo","violet","pink"}`

- [ ] **Step 1: تست‌ها را بنویس**

```go
func TestNormalizeAddress(t *testing.T) {
	ok := map[string]string{
		"portainer.acme.ir":          "https://portainer.acme.ir",
		"localhost:9000":             "https://localhost:9000",
		"10.0.0.5:9000/ui":           "https://10.0.0.5:9000/ui",
		"  http://grafana.local/ ":   "http://grafana.local/",
		"HTTPS://minio.acme.ir":      "https://minio.acme.ir",
	}
	bad := []string{
		"", "   ", "javascript:alert(1)", "data:text/html,x", "mailto:a@b.c",
		"ftp://host", "file:///etc/passwd", "https://", "http://user:pass@host",
		"user:pass@host", "https://exa mple.com",
	}
}
func TestToAppHidesAccountsFromViewer(t *testing.T) {
	// level=Viewer → Accounts خالی است، حتی با ورودی دو اکانت
}
func TestToAppNeverSerializesPassword(t *testing.T) {
	// level=Owner → json.Marshal حاوی bytes و متن password_enc نیست؛ username و has_password هست
}
func TestToAppLogoURL(t *testing.T) {
	// kind=upload + stamp upload → "/apps/{id}/logo?v=<unix of upload>"
	// kind=auto + stamp favicon → همان الگو با زمان favicon
	// kind=auto بدون stamp → nil · kind=icon با stamp → nil · kind=upload فقط با stamp favicon → nil
}
func TestCategoriesFor(t *testing.T) {
	// whole-workspace Viewer → همهٔ دسته‌ها، حتی خالی
	// can_create (Engineer روی workspace) → همه
	// Engineer روی یک app در این ws → همه
	// Viewer روی یک app در c1 → فقط c1
	// Operator روی app بی‌دسته → هیچ
}
```

- [ ] **Step 2: اجرا کن و شکست را ببین**

Run: `go test ./internal/api -run 'NormalizeAddress|ToApp|CategoriesFor'`
Expected: FAIL با `undefined: normalizeAddress`.

- [ ] **Step 3: پیاده‌سازی**

الگوریتم `normalizeAddress`: trim؛ خالی رد. اگر `://` ندارد: اگر با `^[a-zA-Z][a-zA-Z0-9+.-]*:` می‌خورد و بخش بعد از `:` با رقم شروع نمی‌شود (پس `localhost:9000` رد نمی‌شود) رد کن؛ وگرنه `https://` را جلو بگذار. بعد `url.Parse`؛ scheme با حروف کوچک فقط `http`/`https`؛ host اجباری؛ `u.User != nil` رد با پیامی که می‌گوید یوزر و پسورد را در اکانت بنویس.

- [ ] **Step 4: اجرا کن و قبولی را ببین**

Run: `go test ./internal/api -run 'NormalizeAddress|ToApp|CategoriesFor'`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal/api/apps_model.go internal/api/apps_model_test.go
git commit -m "feat(apps): add address validation and response shaping"
```

### Task 3: harness تست با دیتابیس و CRUD سرویس

**Files:**
- Create: `internal/api/integration_test.go`, `internal/api/apps.go`, `internal/api/apps_integration_test.go`, `queries/apps.sql`
- Modify: `Makefile`, `internal/api/api.go`, `internal/api/policy.go`

**Interfaces:**
- Consumes: Task 1، Task 2
- Produces:
  - `func registerApps(api huma.API, h *appHandler)` · `func newAppHandler(q *sqlc.Queries, db *pgxpool.Pool, box *secrets.Box, a *authz) *appHandler`
  - Operationها (tag `apps`): `list-apps`، `create-app`، `get-app`، `update-app`، `delete-app`
  - harness: `newEnv(t) *env` · `(*env).user(t, role string) *client` · `(*env).workspace(t) uuid.UUID` · `type grantTarget struct{Workspace, App *uuid.UUID}` · `(*env).grant(t, c *client, level string, target grantTarget)` · `(*client).do(t, method, path string, body any, workspace *uuid.UUID) *httptest.ResponseRecorder`

- [ ] **Step 1: target مکیفایل و harness را بنویس**

```make
TEST_DATABASE_URL ?= postgres://morcheh:morcheh@localhost:5433/morcheh_test?sslmode=disable
test-integration:
	docker compose exec -T postgres psql -U morcheh -d morcheh -c 'DROP DATABASE IF EXISTS morcheh_test' -c 'CREATE DATABASE morcheh_test'
	go tool goose -dir migrations postgres "$(TEST_DATABASE_URL)" up
	MORCHEH_TEST_DATABASE_URL="$(TEST_DATABASE_URL)" go test ./internal/api -run Integration -count=1
```

`newEnv` وقتی `MORCHEH_TEST_DATABASE_URL` خالی است `t.Skip` می‌کند، پس `go test ./...` بدون دیتابیس سبز می‌ماند. روتر واقعی با `build(cfg, db, &cache.Cache{}, box, jobs.New(sqlc.New(db)))` و `box` با کلید تصادفی. کاربر با `CreateUser`، سشن با `auth.NewToken` + `CreateSession`، کوکی `morcheh_session`. هر تست workspace و کاربر تازه با پسوند تصادفی می‌سازد و چیزی پاک نمی‌کند. چون `a.accessOf` دسترسی را کش می‌کند، grant را قبل از اولین درخواست آن کاربر بده یا از API با ادمین.

- [ ] **Step 2: تست‌های شکست‌خورنده را بنویس**

همه با پیشوند `TestIntegrationApps`:

- `ViewerSeesNoCredentials`: Viewer روی workspace؛ `GET /apps` ۲۰۰، `items[0].address` هست، `accounts` خالی؛ بدنهٔ خام شامل یوزرنیم نیست.
- `QDoesNotMatchUsername`: Viewer با `q=<username>` صفر نتیجه می‌گیرد و با `q=<name>` یکی.
- `ListNeverHasPassword`: Owner؛ بدنهٔ خام `GET /apps` و `GET /apps/{id}` شامل متن پسورد نیست و `has_password: true` دارد.
- `PerServiceVisibility`: Viewer روی فقط app1 از دو سرویس؛ لیست فقط app1 را دارد؛ `GET /apps/{app2}` ۴۰۴؛ `categories` فقط دستهٔ app1.
- `CreateMakesOwner`: member با `can_create` می‌سازد؛ `DELETE` او موفق است؛ Viewer روی workspace می‌گیرد ۴۰۳ برای `POST /apps`.
- `LevelsEnforced`: Operator روی `PATCH` ۴۰۳؛ Engineer روی `PATCH` ۲۰۰ و روی `DELETE` ۴۰۳؛ Owner روی `DELETE` ۲۰۴.
- `RejectsBadAddress`: `POST` با `javascript:alert(1)` ۴۲۲ با `location` برابر `body.address`؛ `PATCH` هم همین.
- `AccountsReplace`: `PATCH` با `[{id:A, label:"x"}, {username:"new", password:"p"}]`: اکانت حذف‌نشده پسوردش را نگه می‌دارد، `id` نیامده حذف می‌شود، ترتیب آرایه = `position`؛ `id` ناشناس ۴۲۲؛ `remove_password` پسورد را پاک می‌کند.
- `CategoryMustBeInWorkspace`: `category_id` از workspace دیگر ۴۲۲؛ `""` بی‌دسته می‌کند؛ عوض کردن دسته سرویس را آخر دستهٔ جدید می‌برد.
- `WorkspaceDeleteAndMove`: حذف workspace با سرویس ۴۰۹؛ `assign-workspace` با `app_ids` سرویس را منتقل و `category_id` را `null` می‌کند؛ بعد حذف موفق است.

- [ ] **Step 3: اجرا کن و شکست را ببین**

Run: `make test-integration`
Expected: FAIL با ۴۰۴ روی `/apps`.

- [ ] **Step 4: پیاده‌سازی**

- سیاست‌ها: `list-apps` و `create-app` مثل `list-storages` و `create-storage`؛ `get-app` برابر `onApp(Viewer)`؛ `update-app` برابر `onApp(Engineer)`؛ `delete-app` برابر `onApp(Owner)`.
- `GET /apps?q=`: خروجی `{items: []App, categories: []AppCategoryDTO}` محدود به `p.scope()` و workspace جاری؛ `q` با `ILIKE` فقط روی `name`، `address`، `note`. ترتیب: موقعیت دسته، `position`، `lower(name)`؛ بی‌دسته‌ها در آخر.
- `POST /apps` بدنه: `name` (۱ تا ۱۲۸)، `address`، `category_id?`، `note?` (تا ۴۰۰۰)، `color` (enum `appColors`، پیش‌فرض `slate`)، `critical`، `logo_kind?` (`auto|icon`)، `logo_icon?` (pattern `^[a-z0-9-]*$`، تا ۴۰)، `accounts?` (تا ۲۰). روند مثل `storages.go:598`: `createTarget`، تراکنش، درج، `grantCreator`، commit، `a.invalidate()`.
- `PATCH /apps/{id}`: فیلدها pointer؛ `category_id *string` بدون format؛ `logo_kind: "auto"` ردیف upload را پاک می‌کند؛ `logo_kind: "upload"` بدون ردیف upload ۴۲۲.
- `accounts` هر ورودی: `{id?, label, username, password?, remove_password?}` با سقف `label` ۶۴، `username` ۲۵۵، `password` ۴۰۹۶. ردیف کاملاً خالی ۴۲۲. پسورد خالی = نگه‌دار.
- دسته با `GetAppCategory` و مقایسهٔ `workspace_id` چک می‌شود.

- [ ] **Step 5: اجرا کن و قبولی را ببین**

Run: `make test-integration && go test ./...`
Expected: PASS، و `TestEveryOperationHasAPolicy` همهٔ Operationهای جدید را می‌پذیرد.

- [ ] **Step 6: Commit**

```bash
git add Makefile internal queries
git commit -m "feat(apps): add service CRUD with level-aware responses"
```

### Task 4: دسته‌ها و چیدمان

**Files:**
- Create: `internal/api/app_categories.go`, `internal/api/app_categories_integration_test.go`
- Modify: `internal/api/policy.go`, `internal/api/api.go`, `queries/apps.sql`

**Interfaces:**
- Consumes: `toApp`، `categoriesFor`، harness تسک ۳
- Produces (tag `apps`): `create-app-category` · `update-app-category` · `delete-app-category` · `set-apps-layout`، همه `onWorkspace(Engineer)`:
  - `POST /workspaces/{id}/app-categories` بدنه `{name, color}`
  - `PATCH|DELETE /workspaces/{id}/app-categories/{categoryId}`
  - `PUT /workspaces/{id}/apps/layout` بدنه `{categories: []string, groups: [{category_id: string|null, app_ids: []string}]}`؛ پاسخ همان شکل `GET /apps`

- [ ] **Step 1: تست‌های شکست‌خورنده را بنویس**

با پیشوند `TestIntegrationAppLayout`:

- `NeedsWholeWorkspaceEngineer`: Engineer روی یک سرویس ولی نه workspace → ۴۰۳ روی ساخت دسته و `PUT layout`.
- `CategoryNameUnique`: تکرار با حروف متفاوت ۴۲۲ با `location` برابر `body.name`.
- `DeleteKeepsServices`: حذف دسته سرویس را با `category_id: null` نگه می‌دارد.
- `LayoutReorders`: جابه‌جایی بین دسته‌ها و ترتیب دسته‌ها در پاسخ و `GET /apps` دیده می‌شود.
- `LayoutCannotTouchOtherWorkspace`: `app_id` از workspace دیگر بدون تغییر می‌ماند؛ `category_id` خارجی ۴۲۲ و هیچ تغییری نمی‌ماند (rollback).
- `LayoutIgnoresDeleted`: id سرویسی که حذف شده خطا نمی‌دهد.
- `CategoryPathChecksWorkspace`: `PATCH /workspaces/{w1}/app-categories/{catOfW2}` ۴۰۴.

- [ ] **Step 2: اجرا کن و شکست را ببین**

Run: `make test-integration`
Expected: FAIL با ۴۰۴ روی مسیرهای جدید.

- [ ] **Step 3: پیاده‌سازی**

کوئری‌ها همیشه `id AND workspace_id`. `set-apps-layout` در یک تراکنش، آپدیت‌ها با `WHERE workspace_id`. موقعیت = اندیس آرایه.

- [ ] **Step 4: اجرا کن و قبولی را ببین**

Run: `make test-integration`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal queries
git commit -m "feat(apps): add categories and layout saving"
```

### Task 5: reveal و لاگ

**Files:**
- Create: `internal/api/app_secrets.go`, `internal/api/app_secrets_integration_test.go`
- Modify: `internal/api/policy.go`, `internal/api/api.go`, `queries/apps.sql`

**Interfaces:**
- Produces: `reveal-app-account` = `POST /apps/{id}/accounts/{accountId}/reveal`، `onApp(Operator)`، پاسخ `{username, password}` · `list-app-activity` = `GET /apps/{id}/activity`، `onApp(Owner)`، پاسخ `{items: [{id, account_label, user_name, ip, created_at}]}` با ۲۰۰ ردیف آخر

- [ ] **Step 1: تست‌های شکست‌خورنده را بنویس**

با پیشوند `TestIntegrationReveal`:

- `ByLevel`: Viewer ۴۰۳؛ بدون دسترسی ۴۰۴؛ Operator ۲۰۰ با پسورد درست.
- `NoStore`: هدر `Cache-Control` برابر `no-store`.
- `LogsEveryCall`: دو فراخوانی = دو ردیف در activity با `user_name` و `account_label` درست و `ip` غیرخالی.
- `RefusedLeavesNoLog`: Viewer ۴۰۳ و هیچ ردیفی اضافه نمی‌شود.
- `CrossAppAccount404`: `accountId` متعلق به app دیگر ۴۰۴ و بدون ردیف لاگ.
- `NoPassword422`: اکانت بدون پسورد ۴۲۲ و بدون ردیف لاگ.
- `ActivityOwnerOnly`: Engineer ۴۰۳، Owner ۲۰۰.
- `SnapshotSurvivesAccountRemoval`: حذف اکانت، ردیف لاگ با همان `account_label` می‌ماند.
- `DeletedWithService`: حذف سرویس ردیف‌های لاگش را هم حذف می‌کند.

- [ ] **Step 2: اجرا کن و شکست را ببین**

Run: `make test-integration`
Expected: FAIL با ۴۰۴ روی reveal.

- [ ] **Step 3: پیاده‌سازی**

ترتیب ثابت داخل `a.inTx`: خواندن اکانت با `id AND app_id` → `Box.Open` → درج لاگ با `clientOf(ctx).ip` و نام کاربر → commit → برگرداندن مقدار. `account_label` برابر label یا در نبودش username. هدر مثل `credentials.go`.

- [ ] **Step 4: اجرا کن و قبولی را ببین**

Run: `make test-integration`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add internal queries
git commit -m "feat(apps): add password reveal with an audit log"
```

### Task 6: favicon و لوگو

**Files:**
- Create: `internal/appicon/appicon.go`, `internal/appicon/appicon_test.go`, `internal/api/app_logos.go`, `internal/api/app_logos_integration_test.go`
- Modify: `internal/api/apps.go`, `internal/api/policy.go`, `internal/api/api.go`, `queries/apps.sql`, `go.mod`
- Docs: `../backend/CLAUDE.md`

**Interfaces:**
- Produces:
  - `package appicon`: `type Icon struct{ContentType string; Data []byte}` · `func Fetch(ctx context.Context, address string) (*Icon, error)` · `func Sniff(data []byte) (string, bool)` · `const MaxSize = 1 << 20`
  - `get-app-logo` = `GET /apps/{id}/logo` برابر `onApp(Viewer)` · `put-app-logo` = `PUT /apps/{id}/logo` برابر `onApp(Engineer)`، بدنهٔ خام، پاسخ `App` · `refetch-app-icon` = `POST /apps/{id}/refetch-icon` برابر `onApp(Engineer)`، پاسخ `App`

- [ ] **Step 1: تست‌های `appicon` را بنویس (با `httptest`، شامل سرور TLS)**

- `TestFetchLinkIcon`: `<link rel="icon" href="/a.png">` → PNG برمی‌گردد.
- `TestFetchPrefersAppleTouch`: هر دو هست → apple-touch-icon.
- `TestFetchFallsBackToFaviconIco`: صفحه بدون link، `/favicon.ico` با بایت‌های ICO.
- `TestFetchRelativeToFinalURL`: بعد از ریدایرکت، href نسبی نسبت به URL نهایی.
- `TestFetchSelfSignedOK`: `httptest.NewTLSServer` کار می‌کند.
- `TestFetchSendsNoCredentials`: سرور `Cookie` و `Authorization` خالی می‌بیند و متد `GET` است.
- `TestFetchRedirectLimit`: ۴ ریدایرکت خطا، ۳ تا اوکی.
- `TestFetchRefusesNonHTTPRedirect`: ریدایرکت به `file:///` خطا.
- `TestFetchSizeLimit`: تصویر بزرگ‌تر از ۱MB خطا.
- `TestFetchTimeout`: سرور کند با context کوتاه خطا.
- `TestFetchRejectsNonImage`: `text/html` برای آیکون، و `image/png` با بدنهٔ HTML، هر دو خطا.
- `TestFetchIgnoresDataHref`: `href="data:..."` نادیده گرفته می‌شود و می‌رود سراغ `/favicon.ico`.
- `TestSniff`: PNG، JPEG، GIF، WEBP، ICO و `<svg`، `<?xml…<svg` قبول؛ HTML و بایت تصادفی رد.

- [ ] **Step 2: اجرا کن و شکست را ببین**

Run: `go test ./internal/appicon`
Expected: FAIL با `undefined: Fetch`.

- [ ] **Step 3: `appicon` را پیاده کن**

`golang.org/x/net/html` مستقیم می‌شود (`go mod tidy`). `http.Client` اختصاصی با `Timeout: 5s`، `InsecureSkipVerify: true` با یک کامنت دلیل (پنل‌های داخلی و گواهی خودامضا، تصمیم spec)، `Jar: nil`، `CheckRedirect` با سقف ۳ و فقط `http`/`https`. خواندن همیشه با `io.LimitReader(MaxSize+1)`. نوع اعلام‌شده باید `image/*` باشد و بایت‌های sniff‌شده هم در allowlist. خطاها متن خارجی ندارند.

- [ ] **Step 4: اجرا کن و قبولی را ببین**

Run: `go test ./internal/appicon`
Expected: PASS.

- [ ] **Step 5: تست‌های یکپارچهٔ لوگو را بنویس**

با پیشوند `TestIntegrationLogo`:

این تست‌ها آدرس سرویس را یک `httptest.Server` واقعی می‌گذارند (آدرس خصوصی مجاز است) و seam جدایی لازم نیست.

- `BackgroundFetchKeepsUpload` (Review Focus 5): سرور favicon، آپلود PNG کاربر، `refetch-icon`؛ `GET logo` همان بایت‌های آپلود را می‌دهد و `logo_kind` هنوز `upload` است.
- `BackgroundFetchKeepsIcon`: `logo_kind: "icon"`، بعد `refetch-icon`؛ `logo_kind` و `logo_icon` بی‌تغییر.
- `FetchOnlyWhenAddressChanges`: شمارندهٔ درخواست سرور: بعد از `PATCH` اسم و ۲۰۰ms ثابت می‌ماند؛ بعد از `PATCH` به آدرس سرور دوم، آن سرور با polling تا ۵ ثانیه درخواست می‌گیرد.
- `UploadRejectsNonImage`: HTML ۴۲۲؛ بیشتر از ۱MB ۴۲۲ یا ۴۱۳.
- `SVGIsSandboxed`: `GET logo` برای SVG هدر `Content-Security-Policy: sandbox`، `X-Content-Type-Options: nosniff` و `image/svg+xml` دارد.
- `Levels`: Viewer `GET` ۲۰۰، `PUT` ۴۰۳؛ بی‌دسترسی ۴۰۴.
- `RefetchFailure`: سرور بسته‌شده → ۴۲۲ با پیام ثابت، بدنه شامل آدرس یا متن خطای داخلی نیست.
- `LogoURLChangesWithUpload`: `logo_url` بعد از آپلود جدید عوض می‌شود.

- [ ] **Step 6: endpointها و fetch پس‌زمینه را پیاده کن**

`go h.refreshIcon(appID, address)` با `context.WithTimeout(context.Background(), 20*time.Second)` بعد از commit در create و وقتی آدرس عوض شده؛ فقط `source=favicon` می‌نویسد و خطا فقط `slog.Warn` بدون آدرس. `GET logo`: منبع طبق `logo_kind`؛ `Cache-Control: private, max-age=86400`؛ نبود تصویر ۴۰۴. آپلود الگوی `storage_files.go:902` با `Sniff`؛ نوع ذخیره‌شده از sniff است نه هدر کاربر.

- [ ] **Step 7: کل تست‌ها را اجرا کن**

Run: `go vet ./... && go test ./... && make test-integration`
Expected: PASS.

- [ ] **Step 8: `CLAUDE.md` بک‌اند را به‌روز کن**

`kindApp`/`onApp`، جدول‌ها، اینکه credential اینجا از Operator است (فرق عمدی با سرور)، `make test-integration`.

- [ ] **Step 9: Commit**

```bash
git add go.mod go.sum internal queries CLAUDE.md
git commit -m "feat(apps): fetch favicons and serve service logos"
```

---

## بخش دوم: فرانت

بک‌اند باید روی `:8080` با migration جدید بالا باشد. برنچ `feat/service-launcher` را در `frontend` بساز.

### Task 7: دسترسی در UI

**Files:**
- Modify: `src/lib/services.ts` (generated)، `src/components/auth/level.ts`, `auth/auth.tsx`, `auth/local-data.ts`, `src/components/access/api.ts`, `targets.ts`, `access-draft.ts`, `grants.tsx`, `access-editor.tsx:404`, `src/app/(panel)/settings/api.ts:162`, `settings/workspaces/components/workspace-detail.tsx`, `workspaces-actions.tsx`, `workspaces-view.tsx`

**Interfaces:**
- Produces: `useAccess().appLevel(id: string, workspaceId: string): Level` · `appLevelHints` در `level.ts` · `TargetKind`/`ResourceKind` شامل `"app"` · `GrantScope.app_id`

- [ ] **Step 1: `pnpm gen:api` و برنچ**

Expected: `api.apps.listApps` و بقیه در `src/lib/services.ts` هست.

- [ ] **Step 2: سطح‌ها و دسترسی را اضافه کن**

`appLevelHints` صریح می‌گوید `Viewer: Sees the service, its link and note. No usernames or passwords.` و `Operator: Also sees usernames and can reveal passwords.`. در `useAccess`: map `app`، `appLevel`، و `highest` شامل apps.

- [ ] **Step 3: صفحه‌های دسترسی را سیم‌کشی کن**

`targets.ts`: آیتم‌های `w.apps` با کلید `app:${id}` و `detail` برابر آدرس. `access-draft.ts`: `keyOfGrant`، `specOf`. `grants.tsx`: `kindIcon` با `AppWindow`، `hintsFor`، `bodyOf`، `targetOf`، متن‌های «Can add servers, storage and services». placeholder جستجو در `access-editor.tsx`.

- [ ] **Step 4: صفحه‌های workspace را سیم‌کشی کن**

`workspace-detail.tsx`: ردیف سرویس‌ها، `everything` و `a.move` شامل `app_ids`؛ `MoveTarget` و متن‌های `workspaces-actions.tsx` و شمارش‌های `workspaces-view.tsx`؛ `useRefreshWorkspaces` کلید `["apps"]` را invalidate کند. `morcheh.services.view` به `PERSONAL` در `local-data.ts` اضافه شود.

- [ ] **Step 5: تأیید**

Run: `rtk proxy pnpm lint && pnpm build`
Expected: بدون خطا.

چک مرورگر روی scratch با سرویسی که با `curl` ساخته شده: در `/settings/members/[id]/access` سرویس با آدرس دیده می‌شود، راهنمای Viewer جملهٔ بالا را دارد، Save یک grant با `app_id` می‌سازد؛ صفحهٔ workspace تعداد و انتقال سرویس را نشان می‌دهد و عضوی که فقط یک سرویس دارد workspace را می‌بیند.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat(services): add services to the access screens"
```

### Task 8: صفحه و نماهای دسکتاپ (فقط خواندن)

**Files:**
- Create: `services/page.tsx`, `services/api.ts`, `components/meta.tsx`, `components/permissions.ts`, `components/apps-view.tsx`, `components/apps-desktop.tsx`, `components/category-rail.tsx`, `components/tile-view.tsx`, `components/table-view.tsx`
- Modify: `src/app/globals.css`, `src/components/panel/nav.ts:48`

**Interfaces:**
- Produces:
  - `api.ts`: `appKeys = {all: ["apps"]}` · `useApps(): UseQueryResult<{items: App[]; categories: AppCategory[]}>` · `useRefetchApps()`
  - `meta.tsx`: `appColors: Record<AppColor, {dot: string; tile: string; label: string}>` · `appIcons: Record<string, LucideIcon>` · `<AppLogo app size={36 | 28} />` · `useAppFilters(): {q, setQ, cat, setCat, critical, setCritical}` · `suggestName(address: string): string` · `safeHref(address: string): string | undefined` · `groupApps(items, categories): {category: AppCategory | null; apps: App[]}[]`
  - `permissions.ts`: `useAppCan(app): {reveal, edit, remove, manage, activity}` · `useAppLayoutCan(): boolean`

- [ ] **Step 1: توکن‌ها و پالت**

در `@theme` فایل `globals.css`، همه با کنتراست AA روی متن سفید:

```css
--color-svc-slate: #60646c; --color-svc-red: #ce2c31; --color-svc-orange: #cc4e00;
--color-svc-amber: #ab6400; --color-svc-green: #218358; --color-svc-teal: #008573;
--color-svc-blue: #0d74ce; --color-svc-indigo: #3a5bc7; --color-svc-violet: #6550b9;
--color-svc-pink: #c2298a;
```

نقشهٔ کلاس‌ها در `meta.tsx` لیترال (`bg-svc-red`...) تا Tailwind ببیندشان.

- [ ] **Step 2: `meta.tsx`، `api.ts`، `permissions.ts`**

`AppLogo`: `logo_kind === "icon"` و آیکون معلوم → آیکون سفید روی رنگ سرویس؛ `logo_url` → `<img src={API_URL + logo_url} draggable={false}>` و با `onError` برگشت به حرف؛ وگرنه حرف اول اسم روی رنگ سرویس. حدود ۳۰ آیکون lucide. `safeHref` فقط `http:` و `https:` را با `new URL` می‌پذیرد و بقیه `undefined` می‌شوند تا کاشی لینک نشود. `useAppFilters` با nuqs و `history: "replace"`؛ پارامترها `q`، `cat` (id، یا `none`)، `critical`. فیلتر سمت کلاینت روی اسم، آدرس، یادداشت، برچسب و یوزر داده‌ای که از سرور رسیده.

- [ ] **Step 3: صفحه و نماها**

`page.tsx` با `export const instant = false` و `<Suspense>`؛ `<PageHeader guide="service-launcher">`. `nav.ts`: `children` از `servicesItem` حذف. ریل، نوار ابزار یک‌خطی و دو نما طبق بخش «دسکتاپ» و ضمیمهٔ spec:

- ریل: All services، Critical، دسته‌ها با نقطه و تعداد، `Uncategorized` فقط اگر سرویس بی‌دسته هست، `New category` در تسک ۹ اضافه می‌شود.
- کاشی: `<a target="_blank" rel="noopener noreferrer">`، لوگوی ۳۶px، `rounded-2xl border-border shadow-sm hover:shadow-md`، نقطهٔ `bg-destructive` برای critical. عنوان دسته `font-label uppercase tracking-label`.
- جدول: لوگوی ۲۸px، آدرس `text-brand-strong` با آیکون `ExternalLink`، یوزر mono، چیپ `+2` برای چند اکانت، ستون Password و کپی‌ها تا تسک ۱۰ خالی.
- نما در `localStorage` کلید `morcheh.services.view` داخل `try/catch`؛ پیش‌فرض `tiles`. حالت خالی و حالت بدون نتیجهٔ جستجو. `Add service` و دکمهٔ حالت خالی در تسک ۹ وصل می‌شوند و تا آن موقع رندر نمی‌شوند.

- [ ] **Step 4: تأیید**

Run: `rtk proxy pnpm lint && pnpm build`
Expected: بدون خطا.

چک مرورگر روی scratch: لوگوی واقعی با کوکی لود می‌شود؛ رفرش `q` و `cat` را نگه می‌دارد؛ کاربر Viewer ستون یوزر خالی دارد؛ عوض کردن workspace لیست را عوض می‌کند؛ `http://x` روی لینک هست و داده‌ای با `javascript:` که مستقیم در DB گذاشته شود لینک نمی‌شود.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat(services): add the services page with tile and table views"
```

### Task 9: فرم، منو و دسته‌ها

**Files:**
- Create: `services/layout.tsx`, `components/app-actions.tsx`, `app-form.tsx`, `accounts-editor.tsx`, `logo-picker.tsx`, `app-menu.tsx`, `category-dialog.tsx`
- Modify: `services/api.ts`, `components/apps-desktop.tsx`, `tile-view.tsx`, `table-view.tsx`, `category-rail.tsx`

**Interfaces:**
- Consumes: تسک ۸
- Produces:
  - `useAppActions(): {add(categoryId?), edit(app), details(app, tab?), moveTo(app), remove(app), access(app), toggleCritical(app), addCategory(), editCategory(c), removeCategory(c)}`
  - `useAppMenu(app): MenuItem[][]` (مشترک منوی دسکتاپ و sheet موبایل)
  - `api.ts`: `useSaveApp`، `useDeleteApp`، `useCategoryMutations`، `useUploadLogo`، `useRefetchIcon`. نوشتن جواب مستقیم در کش `["apps"]`.

- [ ] **Step 1: mutationها و Provider**

بعد از ساخت یا تغییر آدرس یک‌بار بعد از حدود ۶ ثانیه `["apps"]` را invalidate کن تا favicon بیاید. `useIntent("add-service", ...)` در Provider. `layout.tsx` صفحه را در `AppActionsProvider` می‌پیچد. `Add service` و `New category` (با `useAppLayoutCan`) اینجا اضافه می‌شوند.

- [ ] **Step 2: فرم**

`ResponsiveDialog` به این ترتیب: آدرس (اول)، اسم، دسته، لوگو، رنگ، حیاتی، یادداشت، اکانت‌ها.

- `suggestName` فقط تا وقتی کاربر به اسم دست نزده: `portainer.acme.ir` → `Portainer`، `www.` رد می‌شود، IP → خالی. بدون درخواست شبکه.
- آدرس بدون scheme در blur با `https://` تکمیل می‌شود.
- placeholder یادداشت: `Everyone with access can read this. Don't put passwords here.`
- خطاها از `fieldErrors(err)`، پسورد با `SecretInput` و `load` که reveal است (و لاگ می‌شود)؛ خالی = نگه‌دار.
- `accounts-editor.tsx`: برچسب، یوزر، پسورد؛ بالا/پایین با دکمه؛ حذف؛ اکانت اول با نشان Default.
- `logo-picker.tsx`: Auto (با `Fetch again` فقط در حالت ویرایش)، Upload (اول سرویس ذخیره می‌شود بعد `PUT logo`)، Icon (گرید آیکون‌ها).
- `category_id` فقط از `categories` پاسخ لیست.

- [ ] **Step 3: منو و تأیید حذف**

ترتیب ⋯ طبق spec: Open، Details، Edit، Move to category، Mark as critical، Access، Remove؛ فیلتر با `useAppCan`. `Access` با `AccessLayer` و `ResourceAccess scope={{app_id}} kind="app" workspaceId`. `Remove` با `ConfirmDialog` که می‌گوید لاگ هم حذف می‌شود. `Move to category` لایهٔ انتخاب دسته با `Uncategorized`.

- [ ] **Step 4: مدیریت دسته**

`category-dialog.tsx` اسم و پالت رنگ؛ منوی ریل rename، رنگ، حذف. حذف می‌گوید سرویس‌ها بی‌دسته می‌شوند و حذف نمی‌شوند.

- [ ] **Step 5: تأیید**

Run: `rtk proxy pnpm lint && pnpm build`
Expected: بدون خطا.

چک مرورگر روی scratch: ساخت با `portainer.acme.ir` اسم `Portainer` و آدرس `https://` می‌دهد؛ `javascript:alert(1)` خطای کنار فیلد می‌دهد؛ ویرایش با پسورد خالی پسورد قبلی را نگه می‌دارد؛ آپلود PNG و انتخاب آیکون نمایش را عوض می‌کند؛ Engineer روی تک‌سرویس از `Move to category` می‌تواند دسته انتخاب کند ولی `New category` نمی‌بیند؛ Viewer فقط Open و Details را در منو دارد.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat(services): add service form, menu and category management"
```

### Task 10: پسورد، Details و لاگ

**Files:**
- Create: `components/secret.tsx`, `components/app-details.tsx`
- Modify: `services/api.ts`, `components/tile-view.tsx`, `table-view.tsx`, `app-actions.tsx`

**Interfaces:**
- Produces:
  - `useRevealPassword()` = `useMutation` با `gcTime: 0`
  - `<PasswordCell app account />` (چشم و کپی) · `<CopyPasswordButton app />` (در چند اکانتی منوی انتخاب) · `<CopyUsernameButton app />`
  - `copyLazy(load: () => Promise<string>): Promise<"copied" | "unavailable">`
  - `useAppActivity(id, enabled)`

- [ ] **Step 1: `copyLazy` را بنویس (Review Focus 3)**

```ts
// Safari drops the gesture across an await, so the promise goes in the item.
if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
  await navigator.clipboard.write([
    new ClipboardItem({
      "text/plain": load().then((v) => new Blob([v], { type: "text/plain" })),
    }),
  ])
  return "copied"
}
if (navigator.clipboard?.writeText) {
  await navigator.clipboard.writeText(await load())
  return "copied"
}
return "unavailable"
```

در `"unavailable"` مقدار reveal می‌شود، در جای خودش نمایش داده می‌شود و toast می‌گوید `Copying isn't available on this connection. The password is shown instead.`. خطای reveal (مثلاً ۴۰۳) toast خطا می‌دهد و هرگز «Copied» نمی‌گوید.

- [ ] **Step 2: Reveal در UI**

مقدار فقط در state کامپوننت؛ پنهان‌شدن خودکار بعد از ۳۰ ثانیه و هنگام unmount یا بستن لایه. reveal با mutation است نه query، پس refetch ردیف لاگ اضافه نمی‌کند. دکمه‌ها وقتی `has_password` نیست مخفی و برای Viewer اصلاً رندر نمی‌شوند. دکمه‌های داخل کاشی `preventDefault` و `stopPropagation` می‌کنند تا لینک باز نشود. لمس حداقل ۴۴px در موبایل.

- [ ] **Step 3: Details**

ساید‌شیت در دسکتاپ و باتم‌شیت در موبایل با `useOpen`؛ آدرس، همهٔ اکانت‌ها با `PasswordCell`، یادداشت، لینک `Access`، تب Activity فقط برای Owner با `useAppActivity`. سرویس را با id از کش دوباره پیدا می‌کند تا بعد از ویرایش تازه بماند؛ اگر حذف شد بسته می‌شود.

- [ ] **Step 4: تأیید**

Run: `rtk proxy pnpm lint && pnpm build`
Expected: بدون خطا.

چک مرورگر روی scratch:
- هر کلیک چشم یا کپی دقیقاً یک ردیف Activity می‌سازد؛ refetch پنجره ردیف نمی‌سازد.
- مقدار در `localStorage`، IndexedDB و کش `["apps"]` نیست (با `evaluate` جستجو کن) و در URL درخواست‌ها نیست.
- کپی متن درست را در clipboard می‌گذارد؛ کلیک کپی کاشی را باز نمی‌کند.
- با `Object.defineProperty(navigator, "clipboard", {value: undefined})` مقدار در جای خودش و toast بالا می‌آید.
- با پاسخ ۴۰۳ جعلی toast خطا می‌آید نه Copied.
- Viewer هیچ دکمهٔ پسوردی نمی‌بیند؛ تب Activity برای Engineer نیست.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat(services): add password reveal, details and activity"
```

### Task 11: درگ‌اند‌دراپ

**Files:**
- Create: `components/layout-dnd.tsx`
- Modify: `package.json`, `pnpm-lock.yaml`, `services/api.ts`, `components/apps-desktop.tsx`, `tile-view.tsx`, `table-view.tsx`, `category-rail.tsx`

**Interfaces:**
- Produces: `useSetLayout()` · `<LayoutDnd enabled>` · `useSortableApp(id)` · `useSortableCategory(id)`؛ شناسه‌ها با پیشوند `app:`، `cat:`، `rail:<id|none>`

- [ ] **Step 1: نصب**

Run: `pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

- [ ] **Step 2: `useSetLayout`**

`onMutate`: لغو queryهای `["apps"]`، snapshot، نوشتن چیدمان جدید در کش. `onError`: برگرداندن snapshot و toast. `onSuccess`: نوشتن جواب سرور. payload همیشه چیدمان کامل workspace است، حتی اگر فیلتر دسته فعال باشد.

- [ ] **Step 3: `LayoutDnd`**

`DndContext` با `id` ثابت، `PointerSensor` با `distance: 6`، `TouchSensor` با `delay: 250, tolerance: 5`، `KeyboardSensor` با `sortableKeyboardCoordinates`. `enabled` برابر `useAppLayoutCan() && !q && !critical`؛ غیرفعال یعنی هیچ listener و هیچ نشانهٔ گرفتنی. جدول با دستگیرهٔ `GripVertical` در هاور؛ کاشی pointer روی کل کاشی ولی کلید فقط روی دستگیرهٔ قابل فوکوس تا Enter روی لینک همچنان باز کند. ردیف‌های ریل هم sortable (ترتیب دسته) و هم droppable (رها شدن = آخر آن دسته). دستهٔ خالی و گروه بی‌دسته هم هدف رها شدن‌اند.

جلوگیری از باز شدن بعد از درگ (Review Focus 1): کلیک‌گیری dnd-kit فقط propagation را می‌بندد، پس کاشی `onClickCapture` می‌گیرد که اگر درگی همین الان تمام شده `preventDefault` کند، و `draggable={false}` روی `<a>` و `<img>`.

- [ ] **Step 4: تأیید**

Run: `rtk proxy pnpm lint && pnpm build`
Expected: بدون خطا.

چک مرورگر با `Input.dispatchMouseEvent`:
- درگ کاشی به دستهٔ دیگر جابه‌جا می‌کند، بعد از reload می‌ماند، و **هیچ تب جدیدی باز نمی‌شود** (`Target.getTargets`).
- کلیک بدون حرکت همچنان تب جدید باز می‌کند.
- رها کردن روی ردیف ریل و روی دستهٔ خالی کار می‌کند؛ ترتیب دسته‌ها عوض می‌شود.
- Space، جهت‌ها، Space روی دستگیره سرویس را جابه‌جا می‌کند.
- با `q` یا Critical فعال درگ کار نمی‌کند؛ Engineer روی تک‌سرویس نمی‌تواند درگ کند.
- پاسخ ۵۰۰ جعلی چیدمان را برمی‌گرداند و toast می‌دهد.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src
git commit -m "feat(services): add drag and drop for services and categories"
```

### Task 12: موبایل

**Files:**
- Create: `components/apps-mobile.tsx`
- Modify: `components/apps-view.tsx`, `app-actions.tsx`, `app-menu.tsx`, `layout-dnd.tsx`

**Interfaces:**
- Consumes: `useAppMenu`، `useAppFilters`، `LayoutDnd`، `CopyPasswordButton`

- [ ] **Step 1: لیست موبایل**

`apps-view.tsx` با `useIsPhone()` بین دسکتاپ و موبایل انتخاب می‌کند. لیست تمام‌صفحه با safe-area، جستجو، ردیف چیپ‌های اسکرولی (All، Critical، دسته‌ها)، تپ = باز شدن، ⋯ = `BottomSheet` با همان `useAppMenu` و کپی یوزر/پسورد برای Operator+. لمس ۴۴px، `autofocus` فقط روی `(pointer: fine)`. `Add service` دکمهٔ header. لایه‌ها با `useOpen`؛ نوشتن URL از داخل sheet با `afterClose`.

- [ ] **Step 2: جابه‌جایی لمسی**

نگه‌داشتن انگشت با `TouchSensor`؛ `select-none` و `-webkit-touch-callout: none` روی ردیف؛ اسکرول عادی نباید درگ را شروع کند.

- [ ] **Step 3: تأیید**

Run: `rtk proxy pnpm lint && pnpm build`
Expected: بدون خطا.

چک با mobile emulation و `el.click()`: تپ تب جدید باز می‌کند؛ Back باتم‌شیت را می‌بندد نه صفحه را؛ چیپ‌ها فیلتر می‌کنند و بعد از Back می‌مانند؛ `Move to category` کار می‌کند؛ با `Input.dispatchTouchEvent` نگه‌داشتن جابه‌جا می‌کند و کشیدن سریع فقط اسکرول است.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat(services): add native phone view"
```

### Task 13: ⌘K

**Files:**
- Modify: `src/components/panel/command/commands.ts`, `command/command-palette.tsx`

**Interfaces:**
- Consumes: `useApps` · `safeHref`
- Produces: `Row.external?: string` · `Recent.kind` شامل `"app"` · action `action:add-service` با `queueIntent("add-service")`

- [ ] **Step 1: جستجو و Recent**

`useApps` فقط وقتی palette باز است. تطبیق روی اسم، آدرس، یادداشت. Recent `kind: "app"` با id و عنوان ذخیره می‌شود و فقط وقتی نمایش داده می‌شود که آن سرویس هنوز در `useApps` هست، پس دسترسی گرفته‌شده سرویس را در Recent نگه نمی‌دارد.

- [ ] **Step 2: باز کردن (Review Focus 2)**

در `pick()` اگر `external` دارد، `window.open(url, "_blank", "noopener,noreferrer")` هم‌زمان و قبل از `close()` صدا زده می‌شود و مسیر `popstate` را نمی‌رود. `url` از `safeHref` است.

- [ ] **Step 3: تأیید**

Run: `rtk proxy pnpm lint && pnpm build`
Expected: بدون خطا.

چک مرورگر: جستجوی `portainer` و Enter و کلیک هر دو تب جدید باز می‌کنند (بدون popup block، با `Target.getTargets`)؛ palette بسته می‌شود و Back صفحهٔ فعلی را نگه می‌دارد؛ `Add service` از صفحهٔ دیگر به `/services` می‌رود و فرم را باز می‌کند؛ Viewer با جستجوی یوزرنیم نتیجه نمی‌گیرد.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "feat(services): search and open services from the command palette"
```

### Task 14: راهنما، مستندات و چک نهایی

**Files:**
- Create: `src/app/help/content/service-launcher.tsx`
- Modify: `src/components/help/guides.ts`, `src/app/help/content/index.ts`, `src/app/help/content/access.tsx`, `CLAUDE.md`

- [ ] **Step 1: راهنما**

slug `service-launcher`، routes `["/services"]`، با بلوک‌های `prose.tsx`. بخش‌ها: افزودن سرویس، دسته‌ها و درگ، چند اکانت، سطح‌های دسترسی، کپی و لاگ پسورد، لوگو و favicon، ⌘K، رفع اشکال (favicon نیامد و `Fetch again`؛ دکمهٔ کپی روی HTTP؛ یوزر را نمی‌بینم = Viewer هستید). `Recommended`: برای کسی که فقط باید لینک را ببیند Viewer.

- [ ] **Step 2: راهنمای `access`**

سرویس‌ها را به خطوط ۲۵، ۹۵ (جدول سطح‌ها)، ۱۱۷، ۱۲۹، ۱۶۱، ۲۰۶، ۳۰۶–۳۲۵، ۴۲۲ اضافه کن، با جملهٔ صریح «پسورد از Operator شروع می‌شود» و فرق عمدی با سرور.

- [ ] **Step 3: `CLAUDE.md` فرانت**

بخش `/services` (ساختار، نام `App*`، keys، قاعدهٔ reveal با mutation، ID درگ)؛ استثنای رنگ در Design system: `--color-svc-*` فقط روی پس‌زمینهٔ لوگوی سرویس و نقطهٔ دسته؛ `@dnd-kit` در Stack.

- [ ] **Step 4: چک کامل**

Run: `rtk proxy pnpm lint && pnpm build`، و از `../backend`: `go vet ./... && go test ./... && make test-integration`
Expected: همه سبز.

گذر پایان‌به‌پایان در مرورگر با سه کاربر Viewer، Operator و Owner، معیار موفقیت spec: از صفحهٔ دیگر با ⌘K پیدا کن، باز کن، از صفحه پسورد را کپی کن. خطوط قرمز spec را یکی‌یکی علامت بزن. `pnpm dev` را نگاه کن تا خطای `usePathname` یا `instant` نباشد.

- [ ] **Step 5: Commit**

```bash
git add docs src CLAUDE.md
git commit -m "feat(services): add guide and project docs"
```
