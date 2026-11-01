import {
  C,
  Code,
  Example,
  type GuideSection,
  Keys,
  List,
  P,
  Table,
  Tip,
  UI,
  Warn,
} from "../components/prose"

export const terminal: GuideSection[] = [
  {
    id: "what",
    title: "Shells that keep running",
    body: (
      <>
        <P>
          The <UI>Terminal</UI> tab opens a real shell on the server, logged in
          as the server's SSH user. The shell lives on Morcheh's backend, not in
          your browser: reload the page, close the tab or lose Wi-Fi, and it is
          still there when you come back, with its recent output replayed.
        </P>
        <List>
          <li>
            Open up to 10 terminals per server with <UI>New terminal</UI>. They
            come back as tabs whenever you open the server.
          </li>
          <li>
            Double-click a tab (or use its menu) to <UI>Rename</UI> it, e.g.{" "}
            <C>logs</C> or <C>deploy</C>.
          </li>
          <li>
            <UI>Close terminal</UI> ends the shell on the server.{" "}
            <UI>Restart</UI> starts a fresh one in its place after it ended.
          </li>
          <li>
            <UI>Open in terminal</UI> in the file manager opens a new shell
            already in that folder.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "keys",
    title: "Keyboard shortcuts",
    body: (
      <>
        <P>
          Plain <Keys>Ctrl+C</Keys> and <Keys>Ctrl+V</Keys> go to the shell (to
          stop a program, or for vim), so copy and paste use Shift:
        </P>
        <Table
          head={["Keys", "Does"]}
          rows={[
            [
              <Keys key="c">Ctrl+Shift+C</Keys>,
              "Copy the selection (⌘C on a Mac)",
            ],
            [<Keys key="v">Ctrl+Shift+V</Keys>, "Paste (⌘V on a Mac)"],
            [
              <Keys key="f">Ctrl+Shift+F</Keys>,
              "Find in the output (⌘F on a Mac)",
            ],
            [
              <Keys key="e">Enter</Keys>,
              "Next match while finding; Shift+Enter goes back",
            ],
          ]}
        />
        <P>
          The toolbar also has <UI>Copy</UI> (the selection, or all output),{" "}
          <UI>Paste</UI>, <UI>Text size</UI>, <UI>Clear scrollback</UI> and{" "}
          <UI>Focus mode</UI>, which hides the panel around the terminal.
        </P>
      </>
    ),
  },
  {
    id: "history",
    title: "Recent commands",
    body: (
      <>
        <P>
          Each command you run is remembered for that terminal. Turn on{" "}
          <UI>Recent commands</UI> in the toolbar for a small list over the
          terminal; click a command to jump to where it ran in the output, which
          flashes so you can spot it.
        </P>
        <Tip>
          Full-screen programs (vim, top, less) are not recorded, only what you
          type at the prompt.
        </Tip>
      </>
    ),
  },
  {
    id: "phone",
    title: "On a phone",
    body: (
      <P>
        The terminal fills the screen, and a row above the keyboard adds what a
        phone keyboard lacks: <UI>Esc</UI>, <UI>Tab</UI>, <UI>Ctrl</UI>,{" "}
        <UI>Alt</UI>, arrows, <UI>Home</UI>/<UI>End</UI>, <UI>PgUp</UI>/
        <UI>PgDn</UI> and <C>~ / | -</C>. Ctrl and Alt stay pressed until the
        next key: tap <UI>Ctrl</UI>, then <C>c</C>, to stop a program.
      </P>
    ),
  },
  {
    id: "examples",
    title: "Examples",
    body: (
      <>
        <Example title="Keep a long job running">
          <P>
            The shell survives your browser, but not a server reboot or a{" "}
            <UI>Close terminal</UI>. For anything that must finish (a big
            backup, a migration), run it under <C>tmux</C> so it survives those
            too:
          </P>
          <Code>{`
tmux new -s backup
# … start the job, then detach with Ctrl+B, D
tmux attach -t backup
`}</Code>
        </Example>
        <Example title="Follow a service's logs in its own tab">
          <P>
            Open a second terminal, rename it <C>logs</C>, and run:
          </P>
          <Code>sudo journalctl -u nginx -f</Code>
          <P>Work in the first tab while this one keeps streaming.</P>
        </Example>
      </>
    ),
  },
  {
    id: "recommended",
    title: "Good habits",
    body: (
      <>
        <List>
          <li>
            Name terminals after their job so the tabs stay readable when you
            come back days later.
          </li>
          <li>
            Close terminals you are done with: each one is a live login on the
            server.
          </li>
          <li>
            Paste multi-line scripts into a file (in <UI>Files</UI>) and run the
            file, rather than pasting them into the prompt.
          </li>
        </List>
        <Warn>
          A terminal runs with the full rights of the server's SSH user. Anyone
          who can open this server in Morcheh can use its shells.
        </Warn>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <List>
        <li>
          <UI>This session has ended</UI>: the shell exited (you typed{" "}
          <C>exit</C>, or the server rebooted). Press <UI>Restart</UI>.
        </li>
        <li>
          Paste does nothing: the browser blocked clipboard access. Use{" "}
          <Keys>Ctrl+Shift+V</Keys>, or allow clipboard access for this site.
        </li>
        <li>
          <UI>Reconnecting…</UI> for long: check the server's status; the
          terminal reconnects on its own once the network is back.
        </li>
      </List>
    ),
  },
]
