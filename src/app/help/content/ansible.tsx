import {
  A,
  C,
  Code,
  Example,
  type GuideSection,
  List,
  P,
  Recommended,
  See,
  Steps,
  Table,
  Tip,
  UI,
  Warn,
} from "../components/prose"

export const ansible: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          <A href="/ansible">Ansible</A> runs playbooks on your servers from the
          panel: keep the playbooks your team uses in one place, write new ones
          in the editor, pick the servers (one by one, by tag, by folder or all
          of them), run, and watch each task land on each server as it happens.
        </P>
        <List>
          <li>
            Playbooks belong to the workspace. Everyone in it with Viewer or
            more sees them; Engineers write them.
          </li>
          <li>
            Morcheh builds the inventory for you from the servers you pick, with
            their saved logins and trusted host keys. There is no inventory file
            to keep.
          </li>
          <li>
            Every run is kept with its output, the result per task and per
            server, and a copy of the playbook as it was, so you can see later
            exactly what ran.
          </li>
          <li>
            A run is a background task: close the page and it goes on. It shows
            in <See guide="tasks" /> too.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "write",
    title: "Writing a playbook",
    body: (
      <>
        <Steps>
          {[
            <>
              Open <A href="/ansible">Ansible</A> and press{" "}
              <UI>New playbook</UI>.
            </>,
            <>
              Start from a template (Blank, Update packages, Install packages,
              Add a user with a key, Gather facts) or write your own. The editor
              checks the YAML as you type and shows the first problem under it.
            </>,
            <>
              Put default values in the <UI>Variables</UI> tab (YAML). They are
              filled into the run sheet, where you can change them for one run.
            </>,
            <>
              Press <UI>Save</UI>. <UI>Run</UI> saves first if there are
              changes.
            </>,
          ]}
        </Steps>
        <Example title="Make sure nginx is installed and running">
          <Code>{`- name: Web servers
  hosts: all
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.package:
        name: nginx
        state: present
    - name: Start it now and on boot
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true`}</Code>
        </Example>
        <Tip>
          Write <C>hosts: all</C>: the servers you pick when you run{" "}
          <em>are</em> the inventory, so <C>all</C> means "the servers in this
          run". Use a group name only to narrow a play to some of them (see{" "}
          <A href="#groups">Groups</A>).
        </Tip>
        <P>
          If two people edit the same playbook, the second save is refused with{" "}
          <UI>Someone else saved this playbook</UI>: <UI>Load theirs</UI> drops
          your changes, <UI>Overwrite</UI> saves yours over theirs.
        </P>
      </>
    ),
  },
  {
    id: "run",
    title: "Running on servers",
    body: (
      <>
        <Steps>
          {[
            <>
              Press <UI>Run</UI> on a playbook (in the list, its ⋯ menu, or its
              page).
            </>,
            <>
              Pick the targets: tick <UI>Servers</UI>, or choose <UI>Tags</UI>,{" "}
              <UI>Folders</UI> or <UI>All</UI>. A tag or folder takes every
              server in it at the moment the run starts.
            </>,
            <>
              Look at the list of servers under the picker. Servers that can't
              take part (offline, never checked, not enough access) are listed
              first with the reason. A run starts only when every server can
              take part: <UI>Leave them out</UI> keeps just the rest.
            </>,
            <>
              Set the options, then press <UI>Run</UI>. The run's page opens and
              fills as Ansible goes.
            </>,
          ]}
        </Steps>
        <Recommended
          rows={[
            {
              setting: <UI>Dry run (check mode)</UI>,
              value: "On, the first time",
              why: "Ansible's check mode: shows what would change without changing anything. Not every module supports it.",
            },
            {
              setting: <UI>Show differences</UI>,
              value: "On",
              why: "Shows what changed in files and templates, line by line, under each task.",
            },
            {
              setting: <UI>Servers at once</UI>,
              value: "5 (the default)",
              why: "Raise it for many servers; lower it so a bad change hits fewer at a time.",
            },
            {
              setting: <UI>Limit</UI>,
              value: "Empty",
              why: "Ansible's --limit pattern. Picking fewer servers does the same and is easier to read later.",
            },
          ]}
        />
        <P>
          <UI>More options</UI> also has <UI>Only tasks tagged</UI> and{" "}
          <UI>Skip tasks tagged</UI> (Ansible task tags, not server tags) and
          the output's <UI>Verbosity</UI> (<C>-v</C> to <C>-vvvv</C>).
        </P>
      </>
    ),
  },
  {
    id: "results",
    title: "Reading a run",
    body: (
      <>
        <Table
          head={["Tab", "What it shows"]}
          rows={[
            [
              <UI key="t">Tasks</UI>,
              "Each play and task with its result on every server. A task that failed somewhere opens by itself: message, return code, stdout/stderr, differences and the loop's items.",
            ],
            [
              <UI key="o">Output</UI>,
              "Ansible's own output, in color. It follows new lines while you're at the bottom; scroll up to stop, Follow to go back.",
            ],
            [
              <UI key="s">Servers</UI>,
              "The recap per server: ok, changed, failed, unreachable, skipped. A server's name opens its page.",
            ],
            [
              <UI key="p">Playbook</UI>,
              "The playbook, variables and options exactly as they were when the run started.",
            ],
          ]}
        />
        <P>
          From a run's ⋯ menu: <UI>Download output</UI> (plain text),{" "}
          <UI>Open the playbook</UI> and <UI>Delete run</UI>. <UI>Run again</UI>{" "}
          opens the run sheet with the same servers and options. <UI>Stop</UI>{" "}
          ends a run that's going: a task half done on a server stays half done.
        </P>
        <P>
          The <UI>Runs</UI> tab on the Ansible page lists every run, newest
          first, with search and a filter for running, failed and succeeded
          runs.
        </P>
      </>
    ),
  },
  {
    id: "groups",
    title: "Groups",
    body: (
      <>
        <P>
          Every server in a run is put into groups you can use in a play's{" "}
          <C>hosts:</C> line:
        </P>
        <Table
          head={["Group", "Who is in it"]}
          rows={[
            [<C key="a">all</C>, "Every server in the run."],
            [
              <C key="t">web_servers</C>,
              "Servers with the tag “Web servers”. Tags are lowercased, and anything but letters, digits and _ becomes _. A tag starting with a digit gets a leading _.",
            ],
            [
              <C key="o">os_ubuntu</C>,
              "Servers whose system is Ubuntu (os_debian, os_alpine, os_rocky…), from the server's last check.",
            ],
          ]}
        />
        <P>
          Servers are named in the inventory after their name in Morcheh, with
          spaces turned into <C>-</C>. The <UI>Servers</UI> tab of a run shows
          each one's inventory name. Each host also gets{" "}
          <C>morcheh_server_id</C> and <C>morcheh_server_name</C> as variables.
        </P>
        <Tip>
          A play whose <C>hosts:</C> matches none of the servers in the run is
          marked on the Tasks tab: check the spelling against the groups above.
        </Tip>
      </>
    ),
  },
  {
    id: "access",
    title: "Who can do what",
    body: (
      <>
        <Table
          head={["Level on the workspace", "Can"]}
          rows={[
            ["Viewer", "See and run playbooks (see below)."],
            ["Operator", "Also see runs and their output."],
            [
              "Engineer",
              "Also write and delete playbooks, stop and delete runs.",
            ],
          ]}
        />
        <Warn>
          Starting a run needs <UI>Owner</UI> on every server in it. A playbook
          can do anything the server's login can, including reading that login,
          so it's treated like having the server's credentials.
        </Warn>
        <P>
          Playbook text, variables and output are not a place for secrets:
          Operators can read them. Morcheh does hide the servers' own passwords
          and keys if they show up in the output.
        </P>
        <P>
          More in <See guide="access" />.
        </P>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <>
        <Table
          head={["You see", "What to do"]}
          rows={[
            [
              "“… hasn't been checked yet, so its host key isn't known”",
              <>
                A run only connects to servers whose host key Morcheh already
                trusts. Press <UI>Check</UI> on the server once, then run again.
              </>,
            ],
            [
              "“Using a SSH password instead of a key is not possible because Host Key checking is enabled”",
              <>
                The server's host key changed since Morcheh trusted it. Open the
                server: if the change is expected, trust the new key there (see{" "}
                <See guide="servers" />
                ).
              </>,
            ],
            [
              "“/usr/bin/python3: not found” or a failed “Gathering Facts”",
              <>
                Ansible needs Python 3 on the target. Install it from the
                server's terminal (<C>apt install python3</C>,{" "}
                <C>apk add python3</C>…), or add <C>gather_facts: false</C> and
                use only <C>ansible.builtin.raw</C> until it's there.
              </>,
            ],
            [
              "“couldn't resolve module/action …”",
              <>
                Only ansible-core's own modules (<C>ansible.builtin.*</C>) are
                installed. Modules from collections such as{" "}
                <C>community.general</C> aren't available yet.
              </>,
            ],
            [
              "“Playbooks can't run right now”",
              <>
                Ansible isn't installed on the Morcheh host, or it runs without
                its sandbox, in which case only system admins may start runs.
                Ask whoever runs Morcheh.
              </>,
            ],
            [
              "“You need Owner …” when starting",
              "You lack Owner on one of the picked servers. Leave it out, or ask for access.",
            ],
            [
              "A play says no server matched",
              <>
                Its <C>hosts:</C> names a group none of the run's servers is in.
                Use <C>all</C> or a group from <A href="#groups">Groups</A>.
              </>,
            ],
            [
              "A task needs root and fails with “Missing sudo password”",
              <>
                Add <C>become: true</C>. Servers with a password login use it as
                the sudo password; key logins need passwordless sudo.
              </>,
            ],
          ]}
        />
      </>
    ),
  },
]
