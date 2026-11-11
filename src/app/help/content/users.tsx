import {
  C,
  Code,
  Example,
  type GuideSection,
  List,
  P,
  Recommended,
  Steps,
  Table,
  Tip,
  UI,
  Warn,
} from "../components/prose"

export const users: GuideSection[] = [
  {
    id: "what",
    title: "What this page shows",
    body: (
      <>
        <P>
          <UI>Users & groups</UI> lists the server's local accounts: who can log
          in, how, which groups they're in, who can use sudo and who is logged
          in right now. Everything is read in one SSH round trip from{" "}
          <C>/etc/passwd</C>, <C>/etc/shadow</C>, <C>/etc/group</C>, the sudoers
          files and the login history.
        </P>
        <List>
          <li>
            <UI>People</UI>: real accounts (uid at or above <C>UID_MIN</C>,
            usually 1000), plus root and the account Morche logs in with.{" "}
            <UI>All</UI> also shows service accounts like <C>www-data</C>.
          </li>
          <li>
            <UI>Groups</UI>: every group and its members. <UI>Regular</UI> hides
            system groups unless they give sudo.
          </li>
          <li>
            <UI>Sudo</UI>: who can run commands as root, through what, and every
            rule in the sudoers files.
          </li>
        </List>
        <P>
          Open an account (its name, or a row on a phone) to see everything
          about it and act on it: edit, set a password, change sudo, lock, log
          out, open its home folder or remove it.
        </P>
      </>
    ),
  },
  {
    id: "status",
    title: "Account status",
    body: (
      <Table
        head={["Status", "Meaning"]}
        rows={[
          [<UI key="a">Active</UI>, "Logs in with its password or an SSH key."],
          [
            <UI key="k">Key only</UI>,
            "No password is set: SSH keys only (or no login at all).",
          ],
          [
            <UI key="e">Empty password</UI>,
            "Asks for no password where that's allowed. Set one or lock it.",
          ],
          [
            <UI key="l">Locked</UI>,
            "No logins at all, password or key, until unlocked.",
          ],
          [
            <UI key="x">Expired</UI>,
            "Past its account expiry date: no logins.",
          ],
          [
            <UI key="n">No login</UI>,
            <>
              Its shell (<C>nologin</C> or <C>false</C>) refuses logins: a
              service account.
            </>,
          ],
        ]}
      />
    ),
  },
  {
    id: "add",
    title: "Adding an account",
    body: (
      <>
        <Steps>
          <div>
            Press <UI>Add account</UI> and type a username: lowercase letters,
            digits, <C>_ . -</C>, starting with a letter.
          </div>
          <div>
            Give it a password (<UI>Generate</UI> makes a strong one; copy it
            before saving), an SSH public key, or both.
          </div>
          <div>
            Pick its sudo level and extra groups (for example <C>docker</C>).
          </div>
          <div>
            <UI>More options</UI> sets the shell, home folder, primary group and
            uid, or makes it a service account (no login, low uid).
          </div>
        </Steps>
        <Example title="A teammate who deploys with Docker">
          <P>
            Username <C>sara</C>, <UI>Generate</UI> a password and tick{" "}
            <UI>Ask for a new password at the first login</UI>, paste her{" "}
            <C>ssh-ed25519 …</C> key, <UI>Sudo with password</UI>, group{" "}
            <C>docker</C>. Send her the password over a separate channel; she
            picks her own the first time she logs in.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "sudo",
    title: "Sudo access",
    body: (
      <>
        <P>
          Change it from an account's menu (<UI>Sudo access…</UI>) or the{" "}
          <UI>Sudo</UI> tab. There are three levels:
        </P>
        <List>
          <li>
            <UI>No sudo</UI>: Morche takes the account out of every group that
            gives sudo and disables rules that grant sudo to it alone.
          </li>
          <li>
            <UI>Sudo with password</UI>: the account joins the distribution's
            sudo group (<C>sudo</C> or <C>wheel</C>). Where there is none, a
            rule goes in <C>/etc/sudoers.d/morcheh-&lt;name&gt;</C>.
          </li>
          <li>
            <UI>Sudo without password</UI>: a <C>NOPASSWD</C> rule in{" "}
            <C>/etc/sudoers.d/morcheh-&lt;name&gt;</C>.
          </li>
        </List>
        <P>
          Rules in other files are never deleted: Morche comments them out with{" "}
          <C># (disabled by Morche)</C>. Every sudoers change is checked with{" "}
          <C>visudo</C> first and put back if it doesn't parse, so a change
          can't break sudo. A rule that names several accounts at once has to be
          changed by hand.
        </P>
        <Warn>
          Sudo without a password means anyone who gets into that account is
          root. Keep it for automation accounts that log in with a key only.
        </Warn>
      </>
    ),
  },
  {
    id: "lock",
    title: "Locking, logging out and removing",
    body: (
      <>
        <List>
          <li>
            <UI>Lock</UI> blocks the password and sets the account's expiry to
            1970, so SSH keys stop working too. Files, groups and cron jobs
            stay. Tick <UI>Log them out now</UI> to end their open sessions as
            well. <UI>Unlock</UI> undoes both.
          </li>
          <li>
            <UI>Log out</UI> ends every session and process the account runs. It
            can log in again right away.
          </li>
          <li>
            <UI>Remove account</UI> deletes it.{" "}
            <UI>Delete the home folder too</UI> removes its files too;{" "}
            <UI>End its processes first</UI> is needed while it's logged in.
          </li>
        </List>
        <P>
          Root and the account Morche logs in with can't be locked, removed,
          renamed or have their sudo changed here, so Morche can't cut off its
          own access.
        </P>
        <Tip>
          When someone leaves, lock the account first and remove it later. A
          locked account keeps its files, so nothing is lost if you need
          something from it.
        </Tip>
      </>
    ),
  },
  {
    id: "groups",
    title: "Groups",
    body: (
      <>
        <P>
          <UI>Add group</UI> creates one; open a group to rename it or pick its
          members. An account whose primary group it is counts as a member even
          though <C>/etc/group</C> doesn't list it (shown as <UI>(primary)</UI>
          ). A group that is someone's primary group can't be removed.
        </P>
        <P>
          New group memberships apply at the account's next login: sessions
          already open keep the old groups.
        </P>
      </>
    ),
  },
  {
    id: "recommended",
    title: "Recommended setup",
    body: (
      <Recommended
        rows={[
          {
            setting: "One account per person",
            value: "Never shared",
            why: "You can see who did what, and remove one person without changing everyone's password.",
          },
          {
            setting: "Login",
            value: "SSH key",
            why: "Keys can't be guessed. Give people a password only for sudo.",
          },
          {
            setting: "Sudo",
            value: "With password",
            why: "A stolen key alone doesn't give root.",
          },
          {
            setting: "Empty passwords",
            value: "None",
            why: "The page warns about them: set a password or lock the account.",
          },
          {
            setting: "Leavers",
            value: "Lock the same day",
            why: "Ends both password and key access at once.",
          },
        ]}
      />
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <List>
        <li>
          Read-only view: changes need root, or sudo without a password, for the
          account Morche logs in with.
        </li>
        <li>
          Password status shows as unknown: <C>/etc/shadow</C> can't be read
          with this login.
        </li>
        <li>
          Last login says <UI>Not recorded</UI>: the server keeps no login
          history (common in containers and minimal images).
        </li>
        <li>
          Some options are missing: the server has BusyBox account tools (for
          example Alpine) instead of <C>useradd</C>/<C>usermod</C>. Installing
          the <C>shadow</C> package adds them.
        </li>
        <li>
          Sudo given to one account has no effect: <C>/etc/sudoers</C> doesn't
          include <C>/etc/sudoers.d</C>. Add this line with <C>visudo</C>:
          <Code>@includedir /etc/sudoers.d</Code>
        </li>
      </List>
    ),
  },
]
