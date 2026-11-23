# Server config editors (phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** UI editors for the Linux config files people edit most: `/etc/hosts`, DNS resolver, hostname + time zone + time sync, network interfaces (netplan / NetworkManager) and package repositories (apt / dnf / yum).

**Architecture:** Backend (`../backend`) gets a pure package `internal/sysconf` (parse ↔ print each file, text stays the truth: comments and unknown lines survive a round trip) and API files `internal/api/sysconf*.go` built on one shared write path `h.configChange` (revision check → snapshot → write → check command → apply → optional arm-and-undo timer for changes that can cut SSH → history row). Frontend gets server sections `network` (tabs Interfaces / DNS / Hosts) and `system` ("Name & time"), plus a `sources` tab in Packages; every write answers the fresh overview.

**Tech Stack:** Go 1.x + Huma + sqlc + goose, `gopkg.in/yaml.v3` (Node API for netplan); Next.js 16, TanStack Query, nuqs, shadcn/Base UI.

**Spec:** this conversation (user picked items 1, 2, 3, 4, 6 of the list on 2026-11-23): hosts, DNS, hostname/time/NTP, network (netplan + NetworkManager), package repositories.

## Global Constraints

- Morche writes **its own drop-ins** where the tool supports them (`/etc/systemd/resolved.conf.d/90-morche.conf`, `/etc/systemd/timesyncd.conf.d/90-morche.conf`, `/etc/apt/sources.list.d/morche-*.sources`, `/etc/yum.repos.d/morche-*.repo`); otherwise it edits the real file and keeps every line it doesn't understand.
- Every write sends `revision` (sha256 hex of the files read, joined in a fixed order); a mismatch = 409 "Changed on the server since you opened it".
- A check command runs after writing and before applying (`netplan generate`, `nmcli connection load` / reload, `apt-cache policy`, `dnf -q repolist --all`); a failed check restores the snapshot and answers 422 with the tool's message; nothing stays changed.
- Network changes are **risky**: armed undo timer of 90 s in `/run/morche-config` (same shape as the firewall's `fwApply`), fresh SSH dial; unreachable → undone at once (422 "That change would have cut Morche off…"); reachable → pending with Keep it / Undo now. Other areas are applied straight away.
- A change that removes the address Morche connects to (server `host` is an IP on that interface) is refused with 422 unless the body sets `confirm_address_change: true`.
- Levels (policy.go): read = Viewer, raw file text = Operator, resolve/test lookup = Operator, every write = Engineer, history restore = Engineer. All writes in `demoRefused`.
- History: table `server_config_changes`, last 50 per server per area, each row keeps the files before and after (each ≤ 256 KiB) for diff and Go back.
- UI copy is plain English, sentence case, no jargon without a hint. Desktop: no page title, one `Bar` row; phones: chip row + bottom sheets. Nothing scrolls sideways.
- Test real writes on **vm1** only (192.168.56.102). Never vm2.

## Review Focus

- Netplan file written by cloud-init (`50-cloud-init.yaml`): an edit must also write `/etc/cloud/cloud.cfg.d/99-disable-network-config.cfg` (`network: {config: disabled}`), else the next boot throws the change away. Test: `TestNetplanEditCloudInitNeedsDisable`.
- `/etc/resolv.conf` as a symlink to `stub-resolv.conf` (systemd-resolved) vs a plain file vs NetworkManager-managed: writing the plain file under resolved would be lost. Test: `TestResolverManager` covers all three.
- `/etc/hosts` lines with tabs, several names, trailing comments, IPv6, and commented-out entries must print back byte-identical when untouched. Test: `TestHostsRoundTrip`.
- apt deb822 `.sources` with several URIs/Suites and `Enabled: no`, plus one-line entries with `[arch=amd64 signed-by=…]` options. Test: `TestAptSources`.
- Hostname change must update the `127.0.1.1` line in `/etc/hosts` (else `sudo` warns "unable to resolve host" and slows). Test: `TestHostsSetHostname`.

---

### Task 1: `internal/sysconf` hosts + resolver + clock parsers

**Files:**
- Create: `../backend/internal/sysconf/hosts.go`, `resolver.go`, `clock.go`, `sysconf_test.go`

**Interfaces:**
- Produces:
  - `type HostEntry struct { Address string; Names []string; Comment string; Enabled bool; System bool }` (json `address,names,comment,enabled,system`; System = loopback/IPv6 boilerplate lines).
  - `ParseHosts(text string) []HostEntry`; `PrintHosts(old string, entries []HostEntry) string` (keeps untouched lines and pure comment lines in place, appends new ones at the end); `HostsProblems(entries) []string` (same name on two addresses, invalid IP, invalid name); `SetHostname(text, old, new string) string`.
  - `type Resolver struct { Manager string /* resolved|networkmanager|resolvconf|static */; Servers, Search []string; Options []string }`; `ResolverManager(link string, resolvConf string, nmActive bool) string`; `ParseResolvConf(text) Resolver`; `PrintResolvConf(old string, r Resolver) string`; `PrintResolvedDropIn(servers, search []string) string`.
  - `type Clock struct { Timezone string; NTP, Synced bool; Service string /* timesyncd|chronyd|ntpd|none */ }`; `ParseTimedatectl(showOutput string) Clock`; `ParseChronyServers(conf string) []string`; `SetChronyServers(conf string, servers []string) string`; `PrintTimesyncdDropIn(servers []string) string`; `ValidHostname(s string) bool` (RFC 1123, ≤ 63 per label).

- [ ] Write `TestHostsRoundTrip` (untouched text prints identical; one edited entry changes only its line), `TestHostsProblems`, `TestHostsSetHostname` (`127.0.1.1 old` → `127.0.1.1 new`; missing line → added after `127.0.0.1`), `TestResolverManager` (symlink to `../run/systemd/resolve/stub-resolv.conf` → resolved; `# Generated by NetworkManager` → networkmanager; plain → static), `TestResolvConfRoundTrip`, `TestParseTimedatectl`, `TestChronyServers`.
- [ ] `go test ./internal/sysconf/` fails, implement, passes.
- [ ] Commit `feat(sysconf): hosts, resolver and clock parsers`.

### Task 2: netplan + NetworkManager models

**Files:**
- Create: `../backend/internal/sysconf/netplan.go`, `nm.go`, `network_test.go`

**Interfaces:**
- Produces:
  - `type IfaceConfig struct { Name string; DHCP4, DHCP6 bool; Addresses []string /* CIDR */; Gateway4, Gateway6 string; DNS, Search []string; MTU int }` (json snake_case).
  - `ReadNetplan(files map[string]string) (map[string]IfaceConfig, map[string]string /* iface → file */, error)` over `network.ethernets|bonds|bridges|vlans|wifis`; `gateway4` and a `routes: [{to: default|0.0.0.0/0, via}]` both read as Gateway4.
  - `EditNetplan(text string, cfg IfaceConfig) (string, error)` via yaml.v3 Node: sets/removes only the keys it owns (`dhcp4`, `dhcp6`, `addresses`, `routes` default entries, `gateway4/6` (rewritten as a default route), `nameservers`, `mtu`), keeps others and comments.
  - `CloudInitNetplan(path, text string) bool` (path is `50-cloud-init.yaml` or text has the cloud-init header).
  - `ParseNmcli(terse string) []NmConn` with `type NmConn struct { UUID, Name, Device, Type string; Config IfaceConfig }` read from `nmcli -t -f connection.uuid,connection.id,connection.interface-name,connection.type,ipv4.method,ipv4.addresses,ipv4.gateway,ipv4.dns,ipv4.dns-search,ipv6.method,ipv6.addresses,ipv6.gateway,802-3-ethernet.mtu connection show <uuid>` blocks separated by blank lines.
  - `NmcliModify(c NmConn, cfg IfaceConfig) []string` (args for `nmcli connection modify <uuid> …`, every value shell-quoted by the caller).
- [ ] Tests `TestReadNetplan` (static + dhcp + vlan + `routes` default), `TestEditNetplanKeepsComments`, `TestEditNetplanToDHCP` (addresses/routes removed), `TestNetplanEditCloudInitNeedsDisable`, `TestParseNmcli`, `TestNmcliModify` (static → `ipv4.method manual ipv4.addresses "a,b" ipv4.gateway g`, dhcp → `ipv4.method auto ipv4.addresses "" ipv4.gateway ""`).
- [ ] Fail → implement → pass. Commit `feat(sysconf): netplan and NetworkManager models`.

### Task 3: apt + yum/dnf repositories

**Files:**
- Create: `../backend/internal/sysconf/repos.go`, `repos_test.go`

**Interfaces:**
- Produces:
  - `type Repo struct { ID, File, Format /* line|deb822|repo */ string; Enabled bool; Name string; Types, URIs, Suites, Components []string; Options map[string]string; Main bool; Morche bool }` (ID = `file#index`; Main = the distro's own archive/security repos; Morche = file name starts with `morche-`).
  - `ParseAptLine(file, text string) []Repo`, `ParseDeb822(file, text string) []Repo`, `ParseYumRepo(file, text string) []Repo` (Name = section, URIs = baseurl / mirrorlist / metalink, Enabled from `enabled=`).
  - `SetRepoEnabled(format, text string, index int, on bool) string` (line: comment/uncomment with `# `; deb822: `Enabled: no` added/removed; repo: `enabled=0/1`).
  - `SetMirror(format, text, from, to string) string` (replace URI prefix `from` with `to` on Main repos only).
  - `PrintDeb822(r Repo) string`, `PrintYumRepo(r Repo) string` (new Morche files).
- [ ] Tests `TestAptSources` (one-line with options, commented, deb-src; deb822 with two suites and `Enabled: no`), `TestYumRepo`, `TestSetRepoEnabled` (each format round-trips), `TestSetMirror` (`http://archive.ubuntu.com/ubuntu` → mirror; third-party PPA untouched).
- [ ] Fail → implement → pass. Commit `feat(sysconf): apt and yum repository files`.

### Task 4: shared write path + history

**Files:**
- Create: `../backend/migrations/20261123160000_create_server_config_changes.sql`, `../backend/queries/server_config.sql`, `../backend/internal/api/sysconf.go`
- Modify: `../backend/internal/api/api.go` (register), `policy.go`, `demo.go`

**Interfaces:**
- Produces:
  - Table `server_config_changes(id uuidv7, server_id, user_id, user_name, area text CHECK IN ('hosts','dns','clock','network','repos'), summary, status CHECK IN ('applied','pending','undone','failed'), files jsonb /* [{path, before, after, existed}] */, created_at)`; queries `InsertConfigChange`, `ListConfigChanges(server, area, limit 50)`, `GetConfigChange`, `SetConfigChangeStatus`, `SettlePendingConfigChanges(server, area, status)`, `PruneConfigChanges`.
  - `type configFile struct { Path, Text string; Exists bool }`; `func (h *serverHandler) readConfig(ctx, sh *rootShell, paths ...string) ([]configFile, string /* revision */, error)` (one `cat` script with `\x00MORCHE <path> <exists>\n` separators).
  - `type configWrite struct { Path, Text string; Remove bool; Mode string /* default 0644 */ }`; `type configPlan struct { Area, Summary, Revision string; Read []string; Writes []configWrite; Check, Apply string; Risky bool; Keep []string /* extra paths to snapshot */ }`.
  - `func (h *serverHandler) configChange(ctx, id string, p func(sh *rootShell) (configPlan, error)) error` — per server+area lock; re-reads and compares revision (409); script: snapshot tar of `Read ∪ Keep` into `/run/morche-config/<area>`, write files (base64 → temp → `mv`), run Check (fail → restore, exit 70), run Apply under the armed timer when Risky (fail → restore + re-apply, exit 71); then `reachable()` for risky ones; history row (`pending` for risky, else `applied`, `failed` on 422).
  - Endpoints (tag `Server config`): `GET /servers/{id}/config-changes?area=` (`list-config-changes`, Viewer), `GET …/config-changes/{change}` with files before/after (`get-config-change`, Operator), `POST …/config-changes/{change}/restore` (`restore-config-change`, Engineer; writes `before` back through `configChange` with the area's Check/Apply), `POST /servers/{id}/config/{area}/keep` + `/undo` (`keep-config-change` / `undo-config-change`, Engineer).
- [ ] Integration test `TestIntegrationConfigChangeHistory` (insert → list → settle) in `sysconf_integration_test.go`; `TestEveryOperationHasAPolicy` and `TestDemoRefusedOperationsExist` stay green.
- [ ] `make test-integration` + `go test ./internal/api/` pass. Commit `feat(api): shared config write path and history`.

### Task 5: hosts, DNS and clock endpoints

**Files:**
- Create: `../backend/internal/api/sysconf_hosts.go`, `sysconf_dns.go`, `sysconf_clock.go`

**Interfaces:**
- Consumes: Task 1 parsers, Task 4 `configChange`/`readConfig`.
- Produces (operation ids, bodies answer the fresh overview):
  - `get-server-hosts` GET `/servers/{id}/hosts` → `HostsOverview{revision, entries, problems, hostname}`; `update-server-hosts` PUT `{revision, entries}`; `resolve-server-name` POST `{name}` → `{answers: [{address, source}], took_ms}` (`getent ahosts`, Operator).
  - `get-server-dns` → `DnsOverview{revision, manager, servers, search, links: [{name, servers, search}] /* resolvectl status */, editable, note, file}`; `update-server-dns` PUT `{revision, servers, search}` (resolved → drop-in + `systemctl restart systemd-resolved`; static → `/etc/resolv.conf`; networkmanager/netplan-managed → 422 "Set DNS on the interface"); `test-server-dns` POST `{name, server?}` → `{ok, answers, took_ms, error}` (`getent` / `resolvectl query` / `dig @server` when present).
  - `get-server-clock` → `ClockOverview{revision, hostname, pretty_hostname, timezone, local_time, utc_offset, service, ntp, synced, offset_ms, servers, can_set_servers}`; `update-server-hostname` PUT `{hostname, pretty_hostname, fix_hosts}` (`hostnamectl set-hostname` + hosts line); `update-server-clock` PUT `{revision, timezone?, ntp?, servers?}` (zone checked against `/usr/share/zoneinfo/<zone>` existing; `timedatectl set-timezone`, `set-ntp`; servers → timesyncd drop-in or chrony conf + restart); `sync-server-clock` POST (chrony `makestep`, timesyncd restart).
- [ ] Test on vm1 with `curl` against the dev backend: read hosts, add an entry, read back, Go back from history.
- [ ] `pnpm gen:api` (frontend) regenerates the client. Commit `feat(api): hosts, DNS and clock settings`.

### Task 6: network endpoints

**Files:**
- Create: `../backend/internal/api/sysconf_network.go`

**Interfaces:**
- Consumes: Task 2 models, Task 4 (Risky plans).
- Produces: `get-server-network` → `NetworkOverview{revision, backend /* netplan|networkmanager|ifupdown|networkd|unknown */, editable, note, interfaces: [{name, kind, mac, state, mtu, addresses /* live */, gateway, carries_morche, virtual, config?: IfaceConfig, file?, connection?}], routes: [{to, via, dev}], cloud_init}`; `preview-server-network` POST `{revision, iface: IfaceConfig}` → `{files: [{path, before, after}], commands, warnings}`; `update-server-network` POST `{revision, iface, confirm_address_change, disable_cloud_init}`. netplan: Check `netplan generate`, Apply `netplan apply`; NM: Check none, writes = `nmcli connection modify` + Apply `nmcli connection up <uuid>`, snapshot `/etc/NetworkManager/system-connections`, rollback `nmcli connection reload && nmcli connection up`. Virtual (docker0, br-*, veth*, lo) = read-only.
- [ ] On vm1: change MTU 1500 → 1450 → Keep; change it back → let the timer undo.
- [ ] Commit `feat(api): network interfaces with undo`.

### Task 7: repository endpoints

**Files:**
- Create: `../backend/internal/api/sysconf_repos.go`

**Interfaces:**
- Consumes: Task 3, Task 4.
- Produces: `get-server-repositories` → `ReposOverview{revision, manager, editable, repos, mirror: {current, distro /* ubuntu|debian|… */}}`; `update-server-repository` PUT `{revision, id, enabled}`; `add-server-repository` POST `{revision, name, uris, suites, components, signed_by?}` (apt) / `{revision, name, baseurl, gpgcheck, gpgkey?}` (dnf); `delete-server-repository` POST `{revision, id}` (Morche files and non-main entries only); `set-server-mirror` PUT `{revision, url}`; `test-server-mirror` POST `{url}` → `{ok, took_ms, error}` (curl/wget of `<url>/dists/<suite>/Release` or `repodata/repomd.xml`, Operator). Check: `apt-cache policy` / `dnf -q repolist --all`.
- [ ] Commit `feat(api): package repositories and mirrors`.

### Task 8: frontend shared pieces + Network section

**Files:**
- Modify: `src/app/(panel)/servers/[id]/components/sections.ts` (new `network` entry first in the Network group, lucide `Network`; `system` entry in System group "Name & time", lucide `Clock`)
- Create: `src/app/(panel)/servers/[id]/components/config/` — `history-layer.tsx` (`ConfigHistoryLayer({serverId, area})`: rows, diff via `src/components/diff.tsx`, Go back), `pending-banner.tsx` (`ConfigPendingBanner`), `api.ts` (`configKeys`, `useConfigHistory`, `useRestoreConfig`, `useKeepConfig`/`useUndoConfig`)
- Create: `src/app/(panel)/servers/[id]/network/page.tsx`, `api.ts`, `components/network-view.tsx` (`Bar` tabs Interfaces / DNS / Hosts, `tab` in the URL via `useNetworkFilters()`), `interfaces-tab.tsx` (cards: name, state dot, addresses, gateway, "Morche connects here" tag), `interface-editor.tsx` (side sheet / bottom sheet: DHCP/Static `Segmented`, address rows with CIDR check (`src/components/sessions/ip.ts`), gateway, DNS, MTU under More options → Review = preview diff + warnings → Apply), `dns-tab.tsx` (servers + search rows, manager note, Test a lookup), `hosts-tab.tsx` (rows address / names chips / comment, add row, problems inline, Resolve a name, Save bar)
- [ ] `rtk proxy pnpm lint`, `pnpm build` pass; check in the browser (desktop + phone, light + dark) on vm1.
- [ ] Commit `feat(servers): network section — interfaces, DNS, hosts`.

### Task 9: Name & time section + Packages sources tab

**Files:**
- Create: `src/app/(panel)/servers/[id]/system/page.tsx`, `api.ts`, `components/system-view.tsx` (cards Hostname (rename dialog, `fix_hosts` on), Time zone (searchable list from `Intl.supportedValuesOf("timeZone")`, server time live), Time sync (service, Synced / Not synced, offset, servers rows, Sync now))
- Create: `src/app/(panel)/servers/[id]/packages/components/sources-tab.tsx`, `source-editor.tsx`, `mirror-dialog.tsx` (presets Official / ArvanCloud `https://mirror.arvancloud.ir/<distro>` / custom; Test first; after save offer Refresh lists = existing `useRefreshLists`)
- Modify: `packages-view.tsx` + `meta.ts` (tab `sources`)
- [ ] lint + build + browser check. Commit `feat(servers): name & time, package sources`.

### Task 10: guides + project memory

**Files:**
- Create: `src/app/help/content/network-settings.tsx` (sections interfaces, undo, dns, hosts, cloud-init, troubleshoot), `system-settings.tsx` (hostname, timezone, time-sync)
- Modify: `content/index.ts`, `src/components/help/guides.ts` (routes `/servers/*/network`, `/servers/*/system`), `packages.tsx` (`#sources`, `#mirror`), `CLAUDE.md` (frontend + backend one entry each)
- [ ] build passes. Commit `docs: guides for network and system settings`.

## Not in this plan

Creating VLAN/bond/bridge interfaces, ifupdown/networkd editing (read-only), sysctl, fstab, limits — phase 2.
