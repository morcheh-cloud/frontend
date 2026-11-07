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

export const serverNotes: GuideSection[] = [
  {
    id: "what",
    title: "What it does",
    body: (
      <>
        <P>
          A server's <UI>Notes</UI> tab is where the team writes down what
          anyone touching that server should know: what runs on it, who owns it,
          how to restart the odd service, what went wrong last time. It replaces
          the shared document nobody can find at 3 a.m.
        </P>
        <P>
          Notes are written in Markdown (headings, lists, checklists, code
          blocks, tables, links). Each one shows who wrote it, who changed it
          last and when. Pin the important ones and they show on the server's{" "}
          <UI>Overview</UI>, right under the facts.
        </P>
        <P>
          Everyone who can see the server can read its notes. Writing, pinning
          and deleting needs <UI>Operator</UI> on the server.
        </P>
        <See guide="access" section="levels">
          Access levels
        </See>
      </>
    ),
  },
  {
    id: "write",
    title: "Writing a note",
    body: (
      <>
        <Steps>
          {[
            <>
              Open the server and go to the <UI>Notes</UI> tab (phone: the{" "}
              <UI>Notes</UI> row on the server's page).
            </>,
            <>
              Press <UI>New note</UI> (phone: <UI>+</UI>).
            </>,
            <>
              Give it a title if you like. Without one, its first line is used
              as the title in lists.
            </>,
            <>
              Write the text. <UI>Preview</UI> shows it the way readers will see
              it.
            </>,
            <>
              Turn on <UI>Pin to the server's overview</UI> if everyone should
              see it first.
            </>,
            <>
              Press <UI>Add note</UI> (or <Keys>Ctrl+Enter</Keys>).
            </>,
          ]}
        </Steps>
        <P>
          To change a note, open it and press <UI>Edit</UI>, or pick{" "}
          <UI>Edit</UI> in its <UI>⋯</UI> menu. The same menu pins and unpins
          it, copies it as Markdown and deletes it.
        </P>
        <Tip>
          Closing the editor with unsaved changes asks first, so a stray click
          outside it doesn't lose your text.
        </Tip>
      </>
    ),
  },
  {
    id: "markdown",
    title: "Markdown you can use",
    body: (
      <>
        <Table
          head={["You write", "You get"]}
          rows={[
            [<C key="h">## Restarting</C>, "A heading"],
            [<C key="b">**careful**</C>, "Bold text"],
            [<C key="l">- item</C>, "A bullet list"],
            [<C key="t">- [ ] renew the cert</C>, "A checklist item"],
            [<C key="c">`systemctl restart app`</C>, "Inline code"],
            [
              <C key="a">[Runbook](https://…)</C>,
              "A link (opens in a new tab)",
            ],
            [<C key="q">&gt; quote</C>, "A quote"],
          ]}
        />
        <P>
          Fence commands with three backticks so they keep their spacing and are
          easy to copy:
        </P>
        <Code>
          {
            "```\nsudo systemctl restart billing-worker\njournalctl -u billing-worker -n 50\n```"
          }
        </Code>
        <P>
          Tables from <C>| a | b |</C> rows work too. Images aren't loaded: a
          picture from another site would tell that site who reads the note, so
          its description is shown instead. Raw HTML isn't rendered.
        </P>
      </>
    ),
  },
  {
    id: "pinned",
    title: "Pinned notes on the overview",
    body: (
      <>
        <P>
          Pinned notes come first in the list (marked with a pin) and show on
          the server's <UI>Overview</UI> in the <UI>Notes</UI> card, under the
          server's short description. <UI>All notes</UI> on that card opens the
          tab. On a phone they're rows in the overview's <UI>Notes</UI> group.
        </P>
        <Recommended
          rows={[
            {
              setting: "Pinned",
              value: "1–3 notes",
              why: "What to do when it breaks, who owns it. More than a few and nobody reads them.",
            },
            {
              setting: "Description",
              value: "One line",
              why: "Set in Edit server; says what the server is. Notes hold the rest.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "search",
    title: "Finding a note",
    body: (
      <>
        <P>
          The search box matches the title and the text; every word you type
          must appear. <UI>Pinned</UI> shows only the pinned ones. Both stay in
          the address, so a link you share opens the same view.
        </P>
      </>
    ),
  },
  {
    id: "examples",
    title: "Examples",
    body: (
      <>
        <Example title="A runbook pinned to the overview">
          <P>
            Title <C>If the API is down</C>, pinned:
          </P>
          <Code>
            {
              "1. Check `systemctl status api` (Services tab).\n2. Disk full? Look at /var/log in the Files tab.\n3. Still down: call Sara (on call this week).\n\n- [ ] Add a health check for the queue"
            }
          </Code>
        </Example>
        <Example title="What's on this box">
          <List>
            <li>
              <C>## Runs here</C> with a list of apps and their ports.
            </li>
            <li>
              <C>## Owners</C> with the team and a link to the repo.
            </li>
            <li>
              <C>## History</C>: “2026-10: moved from vm-old, disk grown to 200
              GB.”
            </li>
          </List>
        </Example>
      </>
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
              "“Someone else saved this note after you opened it.”",
              "A teammate saved first. Load theirs to see their version (your text is dropped), or Overwrite to keep yours.",
            ],
            [
              "No New note button",
              "Writing needs Operator on this server. Ask an owner to raise your level.",
            ],
            [
              "“This server already has 200 notes.”",
              "Delete old ones, or merge several into one note.",
            ],
            [
              "An image shows as [image]",
              "On purpose: images from other sites aren't loaded. Link to it instead.",
            ],
          ]}
        />
        <Warn>
          Don't keep passwords or keys in notes: everyone with access to the
          server can read them. Use the server's credentials, or the Services
          launcher's accounts, which are encrypted and log every reveal.
        </Warn>
      </>
    ),
  },
]
