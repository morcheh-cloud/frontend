import {
  C,
  Code,
  Example,
  type GuideSection,
  Keys,
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

export const terminalRecordings: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          With recording on, every terminal opened on a workspace's servers is
          saved as it runs, so it can be replayed later like a video: what the
          shell printed, with the same timing, along with who opened it, on
          which server, when, and how it ended.
        </P>
        <P>
          It answers the question that comes after an incident: what was done on
          that server last night, and in what order? It's also a good way to
          show a teammate how a job was done.
        </P>
        <P>
          Recording is off until an Owner turns it on, and it's set per
          workspace. A shell that's being recorded shows a <UI>Recorded</UI>{" "}
          badge in the terminal, so nobody is recorded without being told.
        </P>
      </>
    ),
  },
  {
    id: "saved",
    title: "What is and isn't saved",
    body: (
      <>
        <P>
          Only what the shell sends back to the screen is saved. The keys you
          press aren't recorded separately. In practice:
        </P>
        <Table
          head={["On the screen", "In the recording"]}
          rows={[
            [
              "A command as you type it",
              "Yes, because the shell echoes it back",
            ],
            ["The command's output", "Yes"],
            [
              "A password typed at a sudo or ssh prompt",
              "No, those prompts don't echo what's typed",
            ],
            [
              "A secret printed on screen, like cat .env",
              "Yes, exactly as it appeared",
            ],
          ]}
        />
        <Warn>
          A recording can contain anything a shell printed, secrets included.
          Treat recordings like the servers themselves: keep the time they're
          kept short, and delete one that shows something it shouldn't.
        </Warn>
      </>
    ),
  },
  {
    id: "turn-on",
    title: "Turn it on",
    body: (
      <>
        <P>
          You need to be an <UI>Owner</UI> of the workspace.
        </P>
        <Steps>
          {[
            <>
              Open <UI>Recordings</UI> in the menu, under Observability.
            </>,
            <>
              Press <UI>Settings</UI>.
            </>,
            <>
              Switch on <UI>Record terminals</UI> and choose how many days to
              keep recordings for.
            </>,
            <>
              Press <UI>Save</UI>.
            </>,
          ]}
        </Steps>
        <P>
          Only shells opened from then on are recorded. A shell that's already
          open keeps going as it started, recorded or not. Turning recording off
          works the same way, and what was saved stays until its time is up.
        </P>
      </>
    ),
  },
  {
    id: "watch",
    title: "Watch a recording",
    body: (
      <>
        <P>
          <UI>Recordings</UI> lists the selected workspace's recordings, newest
          first. A server's own <UI>Recordings</UI> tab shows just that server.
          Search by server, person or shell title, and open one to replay it.
        </P>
        <P>
          Long pauses are cut to two seconds, so a shell left open over lunch
          doesn't make you wait. On a keyboard:
        </P>
        <Table
          head={["Key", "Does"]}
          rows={[
            [<Keys key="s">Space</Keys>, "Pause or play"],
            [<Keys key="a">←</Keys>, "Back 5 seconds"],
            [<Keys key="d">→</Keys>, "Forward 5 seconds"],
            [
              <Keys key="n">0</Keys>,
              "Back to the start; 1 to 9 jump to 10–90%",
            ],
            [<Keys key="c">,</Keys>, "One step back while paused"],
            [<Keys key="p">.</Keys>, "One step forward while paused"],
            [<Keys key="f">f</Keys>, "Full screen"],
            [<Keys key="h">?</Keys>, "Show every shortcut"],
          ]}
        />
        <P>
          A shell that's still open shows <UI>Live</UI>. Its replay goes up to
          the moment you opened it; press <UI>Reload</UI> for what came since.
        </P>
        <Example title="What happened to nginx last night">
          <P>
            Open the server's <UI>Recordings</UI> tab, find the shells from that
            evening, and open the one that matches. Drag along the bar until you
            reach the edit, then play from there at normal speed.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "download",
    title: "Download a recording",
    body: (
      <>
        <P>
          <UI>Download</UI> saves the recording as a <C>.cast</C> file, the
          standard asciinema format. It's plain text and plays anywhere, without
          Morcheh:
        </P>
        <Code>asciinema play web-1-2026-11-07-21-40.cast</Code>
        <Tip>
          Keep one before its time is up if it matters, for an incident report
          for example. Downloaded files stay with you after the recording is
          deleted, so they need the same care.
        </Tip>
      </>
    ),
  },
  {
    id: "who",
    title: "Who sees what",
    body: (
      <>
        <P>Anyone can watch their own recordings. Beyond that:</P>
        <Table
          head={["Access", "Can"]}
          rows={[
            [
              "Everyone who opened a terminal",
              "List, replay and download their own",
            ],
            [
              "Owner of the workspace",
              "See and download everyone's, delete any, turn recording on or off, set how long they're kept",
            ],
            ["System admin", "The same as an Owner, on every workspace"],
          ]}
        />
        <P>
          A shell that's still open can't be deleted; close it first. Deleting a
          recording has no effect on the shell itself.
        </P>
        <See guide="access" section="levels">
          How access levels work
        </See>
      </>
    ),
  },
  {
    id: "limits",
    title: "Limits",
    body: (
      <List>
        <li>
          One recording keeps up to 50 MiB. Past that, the shell keeps working
          but the rest isn't saved, and the replay says it was cut.
        </li>
        <li>
          Recordings are compressed and stored in Morcheh's own database. A
          noisy shell, like a long build or <C>tail -f</C> on a busy log, takes
          the most room.
        </li>
        <li>
          If Morcheh restarts while a shell is open, up to the last 30 seconds
          may be missing, and the recording says so.
        </li>
        <li>
          Only terminals opened in Morcheh are recorded. Someone connecting over
          SSH directly leaves no recording here.
        </li>
      </List>
    ),
  },
  {
    id: "recommended",
    title: "Recommended settings",
    body: (
      <Recommended
        rows={[
          {
            setting: "Production workspaces",
            value: "On, kept 30 to 90 days",
            why: "Long enough to look back after an incident; use your audit rules if they ask for more.",
          },
          {
            setting: "Test workspaces",
            value: "Off, or 7 days",
            why: "There's rarely a reason to look back further, and noisy shells take room.",
          },
          {
            setting: "The team",
            value: "Tell them first",
            why: "Say that recording is going on, and why, before you turn it on.",
          },
        ]}
      />
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <>
        <Table
          head={["What you see", "What to do"]}
          rows={[
            [
              "A shell didn't get a recording",
              "It was opened before recording was turned on. Open a new one; the Recorded badge shows it's being saved.",
            ],
            [
              "The list is shorter than expected",
              "Below Owner you only see your own. Otherwise older ones passed their keep time, or the workspace selected is a different one.",
            ],
            [
              "The replay ends early",
              "It reached the 50 MiB limit, or Morcheh restarted. The page says which.",
            ],
            [
              "The replay looks broken",
              "Full-screen programs were drawn for the window size at the time. Make the window larger, or use full screen.",
            ],
            [
              "Delete is refused",
              "The shell is still open. Close it in the terminal, then delete.",
            ],
          ]}
        />
        <See guide="terminal">The terminal guide</See>
      </>
    ),
  },
]
