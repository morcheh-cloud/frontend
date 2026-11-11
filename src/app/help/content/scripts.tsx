import {
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

export const scripts: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          <UI>Scripts</UI> keeps the shell snippets your team runs again and
          again (clean up old logs, restart a stuck service, check a
          certificate) in one place, for the whole workspace. Run one on a
          single server or on twenty at once, and see each server's output and
          exit code side by side.
        </P>
        <P>
          Every run is kept: who started it, on which servers, the exact copy of
          the script that ran and the values it got. Editing or deleting the
          script later never changes what a past run shows.
        </P>
        <P>
          For a one-off, <UI>Run a command</UI> runs a few lines without saving
          a script. It lands in the same run history.
        </P>
        <List>
          <li>
            <UI>Scripts</UI> in the sidebar (phone: <UI>More</UI> ›{" "}
            <UI>Scripts</UI>) = every script and every run in the workspace.
          </li>
          <li>
            A server's <UI>Scripts</UI> tab = the same scripts, run here in a
            tap, plus <UI>Ran here</UI>: what ran on that server.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "write",
    title: "Writing a script",
    body: (
      <>
        <Steps>
          {[
            <>
              Open <UI>Scripts</UI> and press <UI>New script</UI> (phone:{" "}
              <UI>+</UI>).
            </>,
            <>
              Pick a starting point (<UI>Blank</UI> or one of the templates).
            </>,
            <>
              Write the script. Pick the language: <UI>Bash</UI>,{" "}
              <UI>sh (POSIX)</UI> or <UI>Python 3</UI>. It must be installed on
              the servers you run it on.
            </>,
            <>
              Give it a name, and a description if others should know when to
              use it.
            </>,
            <>
              Choose <UI>Run as</UI> and the <UI>Time limit</UI> (see below).
            </>,
            <>
              Add <UI>Values</UI> the script asks for on each run, if any.
            </>,
            <>
              Press <UI>Create</UI>, or <UI>Save and run</UI> to try it at once.
            </>,
          ]}
        </Steps>
        <P>
          If someone else saved the script while you were editing, Morche says
          so instead of overwriting: <UI>Load theirs</UI> drops your changes,{" "}
          <UI>Overwrite</UI> keeps yours.
        </P>
        <Tip>
          Start Bash scripts with <C>set -eu</C>: the script stops at the first
          failing command and treats an unset variable as an error, so a failed
          step shows up as a failed run instead of being skipped quietly.
        </Tip>
      </>
    ),
  },
  {
    id: "values",
    title: "Values",
    body: (
      <>
        <P>
          A value is something that changes from run to run: a version, a
          domain, a number of days. Each has a name (an environment variable,
          written in capitals, like <C>DAYS</C>), an optional label the run form
          shows, a default, and whether it's required.
        </P>
        <P>
          The script reads it as a normal environment variable: <C>$DAYS</C> in
          Bash and sh, <C>os.environ["DAYS"]</C> in Python. Values are passed as
          they are, never pasted into the script text, so quotes and spaces in a
          value can't break the script.
        </P>
        <Warn>
          Values are saved with the run, and anyone who can open the run sees
          them. Never pass passwords or tokens as values: read them on the
          server instead (a file only root can read, a secrets manager).
        </Warn>
      </>
    ),
  },
  {
    id: "run-as",
    title: "Run as and time limit",
    body: (
      <>
        <Table
          head={["Run as", "What happens"]}
          rows={[
            [
              <UI key="u">Login user</UI>,
              "The script runs as the user Morche logs in with on each server.",
            ],
            [
              <UI key="r">root (sudo)</UI>,
              "Through sudo when the login user isn't root. sudo must work without a password prompt (NOPASSWD), else that server fails with a clear message.",
            ],
          ]}
        />
        <P>
          The <UI>Time limit</UI> (1 second to 24 hours) stops a script that
          runs too long. Past it the script gets <C>SIGTERM</C>, then is cut off
          5 seconds later, and the server shows{" "}
          <UI>Stopped: past its time limit</UI>.
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
              Press <UI>Run</UI> on a script (or its <UI>⋯</UI> menu ›{" "}
              <UI>Run…</UI>). On a server's tab it's <UI>Run here…</UI>, with
              that server already ticked.
            </>,
            <>
              Tick the servers. Only servers where you have <UI>Engineer</UI>{" "}
              access are listed.
            </>,
            <>
              Fill in the values, then press <UI>Run</UI>.
            </>,
          ]}
        </Steps>
        <P>
          The run is a background task: you can leave the page, and it shows
          under <UI>Tasks</UI> until it ends. Morche works on 5 servers at a
          time; the rest wait their turn.
        </P>
        <P>
          The run page shows each server with its state. Pick one to see its
          output, live while it runs. <UI>Script</UI> shows the copy that ran,{" "}
          <UI>Values</UI> what it got. In the <UI>⋯</UI> menu:{" "}
          <UI>Run again</UI> (same servers and values, you can change them),{" "}
          <UI>Download output</UI> and <UI>Delete run</UI>.
        </P>
        <P>
          Each server keeps up to 1 MiB of output; past that the rest is dropped
          and the output says so. Write long logs to a file on the server and
          print a summary.
        </P>
        <P>
          <UI>Stop</UI> skips servers that haven't started yet; scripts already
          running get <C>SIGTERM</C>, then are cut off after 5 seconds. What a
          script already did stays done.
        </P>
        <See guide="tasks">Background tasks</See>
      </>
    ),
  },
  {
    id: "levels",
    title: "Who can do what",
    body: (
      <>
        <Table
          head={["Access", "Can"]}
          rows={[
            ["Viewer on the workspace", "See the scripts"],
            ["Engineer on the workspace", "Create, edit and delete scripts"],
            [
              "Engineer on every target server",
              "Run a script or a command there (as for the terminal), stop and delete the run",
            ],
            [
              "Operator on every server a run touched (or on the workspace)",
              "Open that run and read its output",
            ],
          ]}
        />
        <See guide="access" section="levels">
          Access levels
        </See>
      </>
    ),
  },
  {
    id: "recommended",
    title: "Recommended settings",
    body: (
      <Recommended
        rows={[
          {
            setting: "Run as",
            value: "Login user",
            why: "Pick root only when the script needs it; a mistake as root reaches the whole server.",
          },
          {
            setting: "Time limit",
            value: "A little over the usual run",
            why: "A stuck script then ends on its own instead of holding the run for hours.",
          },
          {
            setting: "First run",
            value: "One server",
            why: "Try it on one, read the output, then run it on the rest.",
          },
        ]}
      />
    ),
  },
  {
    id: "examples",
    title: "Examples",
    body: (
      <>
        <Example title="Delete old logs, with the number of days as a value">
          <P>
            Run as <UI>root (sudo)</UI>, value <C>DAYS</C> with default{" "}
            <C>14</C>:
          </P>
          <Code>{`set -eu
find /var/log -name "*.gz" -mtime +"$DAYS" -print -delete
df -h /var/log`}</Code>
        </Example>
        <Example title="Which servers need a reboot">
          <Code>{`if [ -f /var/run/reboot-required ]; then
  echo "Reboot needed"
  cat /var/run/reboot-required.pkgs 2>/dev/null || true
  exit 1
fi
echo "No reboot needed"`}</Code>
          <P>
            Exiting with 1 marks the servers that need one as failed, so they
            stand out in the run.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <Table
        head={["What you see", "What to do"]}
        rows={[
          [
            "Exit code 127 (command not found)",
            "A command or the language (python3) isn't installed on that server, or isn't in the PATH of a non-interactive login. Use the full path (/usr/sbin/…) or install it.",
          ],
          [
            "Exit code 126 (not executable)",
            "The script tried to run a file without the execute permission, or on a noexec filesystem.",
          ],
          [
            "Exit code 143 (stopped)",
            "The script got SIGTERM: someone pressed Stop, or the time limit passed.",
          ],
          [
            "“sudo: a password is required”",
            "The login user needs passwordless sudo for root runs. Add a NOPASSWD rule on that server, or log in as root.",
          ],
          [
            "A server isn't in the list",
            "You need Engineer access to run on it. Ask an Owner of the server.",
          ],
          [
            "“Output was cut at 1 MiB”",
            "The script printed more than a server keeps. Write the details to a file and print a summary.",
          ],
          [
            "A run says “interrupted”",
            "Morche restarted while it ran. Check the server, then use Run again if needed.",
          ],
        ]}
      />
    ),
  },
]
