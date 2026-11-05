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
          Plays use <C>hosts: all</C>: the servers you pick when you run{" "}
          <em>are</em> the inventory, so <C>all</C> means "the servers in this
          run". To narrow one play to some of them, write a group in{" "}
          <UI>YAML</UI> (see <A href="#groups">Groups</A>).
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
    id: "modules",
    title: "The module list",
    body: (
      <>
        <P>
          A module is one ready-made job Ansible knows how to do: install a
          package, copy a file, create a user. The <UI>Modules</UI> tab of{" "}
          <A href="/ansible">Ansible</A> lists every module installed on the
          Morcheh host, sorted by category, with the most used ones on top.
        </P>
        <Steps>
          {[
            <>
              Open <A href="/ansible">Ansible</A> › <UI>Modules</UI>.
            </>,
            <>
              Search by name or by what you want done (<C>apt</C>,{" "}
              <C>download</C>, <C>firewall</C>), or press a category.
            </>,
            <>
              Press a module to read what it does, its required and most used
              options, the rest under <UI>Other options</UI>, and examples you
              can copy.
            </>,
            <>
              <UI>Use in a new playbook</UI> opens a new playbook with that
              module as its first task.
            </>,
          ]}
        </Steps>
        <Tip>
          On a Morcheh with only <C>ansible-core</C> the list has about 70
          modules. Install the full <C>ansible</C> package on the Morcheh host
          to get thousands more (Docker, MySQL, UFW…); they appear here by
          themselves.
        </Tip>
      </>
    ),
  },
  {
    id: "visual",
    title: "Building a playbook visually",
    body: (
      <>
        <P>
          The playbook page has two modes, <UI>Visual</UI> and <UI>YAML</UI>.
          They edit the same playbook: switch whenever you like. Your choice is
          remembered on this browser.
        </P>
        <Steps>
          {[
            <>
              In <UI>Visual</UI>, name the play. There is no servers field here:
              you pick them each time you press <UI>Run</UI>.
            </>,
            <>
              Press <UI>Add task</UI> and pick a module.
            </>,
            <>
              Give the task a name and fill in its fields. Required ones have a{" "}
              <C>*</C>; the usual ones are shown too.
            </>,
            <>
              Everything else is under <UI>More options</UI>. Conditions, loops,
              run as, register and notify are under <UI>Task settings</UI>.
            </>,
            <>
              Drag a task by its grip to reorder it (an open task folds first),
              or use the <UI>⋯</UI> menu (<UI>Move up</UI>, <UI>Duplicate</UI>,{" "}
              <UI>Remove</UI>).
            </>,
          ]}
        </Steps>
        <Example title="Restart nginx only when its config changed">
          <Steps>
            {[
              <>
                Add a <C>copy</C> task for the config file, and under{" "}
                <UI>Task settings</UI> set <C>notify</C> to <C>Restart nginx</C>
                .
              </>,
              <>
                Under <UI>Handlers</UI> press <UI>Add handler</UI>, pick{" "}
                <C>service</C>, name it <C>Restart nginx</C> (the same words),
                then set <C>name</C> to <C>nginx</C> and <C>state</C> to{" "}
                <C>restarted</C>.
              </>,
            ]}
          </Steps>
        </Example>
        <P>
          A variable fits any field: press the <C>{"{ }"}</C> button of a
          yes/no, a choice, a number or a list and write{" "}
          <C>{"{{ my_variable }}"}</C>. Lists take one item at a time: type it
          and press Enter. Fields for nested data take YAML.
        </P>
        <Recommended
          rows={[
            {
              setting: "Task name",
              value: "Always set it",
              why: "It's what you read in a run.",
            },
            {
              setting: "Module",
              value: (
                <>
                  A real module over <C>shell</C>
                </>
              ),
              why: "Modules skip work that's already done, so running twice is safe.",
            },
            {
              setting: "First run",
              value: <UI>Check mode</UI>,
              why: "See what would change before changing it.",
            },
          ]}
        />
        <Warn>
          Saving from <UI>Visual</UI> rewrites the YAML in a tidy form, so
          comments are dropped on the first change (a notice says so when there
          are any). Steps it can't take apart, such as a <C>block</C>, are kept
          whole and shown as YAML. A mode like <C>0644</C> comes back quoted as{" "}
          <C>"0644"</C>, which Ansible reads as the same mode.
        </Warn>
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
          <C>hosts:</C> line in <UI>YAML</UI>:
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
          <UI>Visual</UI> shows such a play's group with{" "}
          <UI>Run on all of them</UI>, which puts it back to <C>all</C>.
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
                The module isn't installed on the Morcheh host: check the{" "}
                <A href="#modules">module list</A>. Collections have to come
                with the Ansible install itself (the full <C>ansible</C>{" "}
                package); ones in a user's <C>~/.ansible</C> aren't seen by
                runs.
              </>,
            ],
            [
              "“Needs …” on a task card",
              <>
                A required option is empty. Open the task and fill in the field
                with a <C>*</C>.
              </>,
            ],
            [
              "“The YAML has a mistake” in Visual",
              <>
                The text doesn't parse, so it can't be drawn. Press{" "}
                <UI>Edit in YAML</UI>, fix the line shown, and switch back.
              </>,
            ],
            [
              "“This module isn't installed on the Morcheh host” in a task",
              <>
                Its options can't be listed, so write them as YAML in the field
                below it, or press <UI>Change</UI> to pick another module.
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
                Press <UI>Run on all of them</UI> in <UI>Visual</UI>, or use a
                group from <A href="#groups">Groups</A>.
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
