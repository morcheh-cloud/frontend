import {
  C,
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

export const tasks: GuideSection[] = [
  {
    id: "what",
    title: "What tasks are",
    body: (
      <>
        <P>
          Some work can take minutes or hours. Morcheh runs it on its own
          backend as a task, so it doesn't depend on your browser: you can leave
          the page, close the tab or switch computers, and it carries on.
        </P>
        <List>
          <li>
            <See guide="storage" section="send">
              Sending or copying files
            </See>{" "}
            between servers and storages
          </li>
          <li>
            Copying and moving inside one server or storage: paste,{" "}
            <UI>Copy to…</UI>, <UI>Move to…</UI> and dragging onto a folder
          </li>
          <li>Compressing files into an archive, and extracting one</li>
          <li>Having a server download a file from a URL</li>
          <li>
            <See guide="fail2ban" section="install">
              Installing or removing fail2ban
            </See>
          </li>
        </List>
        <P>
          Regular uploads and downloads aren't tasks: they run through your
          browser, so they stop if you close it. They have their own{" "}
          <UI>Uploads</UI> panel.
        </P>
      </>
    ),
  },
  {
    id: "follow",
    title: "Following a task",
    body: (
      <>
        <P>
          Starting one shows a short notice, and another when it ends, with{" "}
          <UI>Open folder</UI> to jump to the result. The folder you're looking
          at refreshes by itself.
        </P>
        <List>
          <li>
            On desktop, the <UI>Tasks</UI> icon in the top bar shows how many
            are running. Press it for the latest ones, or <UI>View all</UI> for
            the full page.
          </li>
          <li>
            On a phone, a thin line along the top of the tab bar shows progress,
            and <UI>More</UI> carries the count. Open <UI>More</UI> ›{" "}
            <UI>Tasks</UI> for the list.
          </li>
        </List>
        <P>
          Press a task to see its details: speed, time left, the item being
          worked on, and its log.
        </P>
      </>
    ),
  },
  {
    id: "states",
    title: "What the states mean",
    body: (
      <Table
        head={["State", "Meaning"]}
        rows={[
          [
            "Waiting",
            "All slots are busy. Morcheh runs 4 tasks at once, and at most 2 per server or storage, so a big copy doesn't choke the machine. Moves inside one server or storage skip the wait, since they're usually instant.",
          ],
          ["Running", "Working now."],
          ["Done", "Finished without a problem."],
          ["Failed", "Stopped on an error, shown in its details."],
          ["Canceled", "You canceled it."],
          [
            "Interrupted",
            "Morcheh restarted while it was running. Waiting tasks resume by themselves after a restart; running ones don't, because a half-done copy can't always be picked up safely.",
          ],
        ]}
      />
    ),
  },
  {
    id: "cancel",
    title: "Canceling and trying again",
    body: (
      <>
        <Steps>
          <li>
            Press <UI>Cancel</UI> on a running task (or open it and press{" "}
            <UI>Cancel task</UI>). The command on the server is stopped too.
          </li>
          <li>
            On a task that failed, was canceled or was interrupted, press{" "}
            <UI>Try again</UI>. It starts a new task with the same settings.
          </li>
        </Steps>
        <Warn>
          Canceling doesn't undo what's already done. A canceled copy leaves the
          files it finished on the other side, and a canceled move has already
          deleted the originals of those files. An unfinished URL download is
          removed. A copy inside one server or storage removes the item it was
          in the middle of; a move there never removes anything, so a stopped
          move may leave part of an item in both places.
        </Warn>
        <P>
          A fail2ban install or removal can be canceled while it waits, but not
          once the package manager is running: stopping one half way can break
          the server's packages. <UI>Cancel</UI> is disabled for that step, and
          it ends on its own.
        </P>
        <Tip>
          Trying a copy again stops right away if something it copied is already
          there, unless the original had <UI>Replace existing files</UI> ticked;
          then it starts over and replaces it. A move that got partway can't be
          tried again as it was: the items it finished are gone from the source.
        </Tip>
      </>
    ),
  },
  {
    id: "page",
    title: "The Tasks page",
    body: (
      <>
        <P>
          <UI>Tasks</UI> in the sidebar lists the latest 200, newest first.
          Search by title, or narrow to <UI>Running</UI> or <UI>Finished</UI>.{" "}
          <UI>Clear finished</UI> removes every finished task from the list;
          running ones stay. Finished tasks are also removed by themselves after
          30 days. Removing a task never touches its files.
        </P>
        <Recommended
          rows={[
            {
              setting: "Moving something big",
              value: "Copy first",
              why: "Check the copy on the other side, then delete the originals yourself. A canceled or failed move can leave the files split between both ends.",
            },
            {
              setting: "Replace existing files",
              value: "Off",
              why: "A name clash stops the task instead of overwriting something you didn't mean to.",
            },
            {
              setting: "Archive format",
              value: "tar.gz",
              why: "Keeps owners and permissions, and needs nothing extra on a Linux server.",
            },
          ]}
        />
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
            "Stuck on Waiting",
            "Other tasks hold the slots for that server or storage. It starts when one ends, or cancel one to free a slot.",
          ],
          [
            "“zip isn't installed on the server”",
            <>
              Install <C>zip</C> on the server, or choose <C>tar.gz</C> instead.
            </>,
          ],
          [
            "A URL download fails at once",
            <>
              The server needs <C>curl</C> or <C>wget</C> and must be able to
              reach the link itself: try it from the{" "}
              <See guide="terminal">terminal</See>. The error in the task's
              details is what the server reported.
            </>,
          ],
          [
            "The bar pulses without a percentage",
            "The total size isn't known (for example, a link that doesn't report its size). It's still working; watch the log.",
          ],
          [
            "Tasks don't update",
            "The live connection dropped. It reconnects by itself and reloads the list; reloading the page does the same.",
          ],
        ]}
      />
    ),
  },
]
