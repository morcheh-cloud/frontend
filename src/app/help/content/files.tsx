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

export const files: GuideSection[] = [
  {
    id: "browse",
    title: "Browsing",
    body: (
      <>
        <P>
          The <UI>Files</UI> tab browses the server over SFTP, as the server's
          SSH user: you see what that user can read. It opens in the user's{" "}
          <UI>Home folder</UI>.
        </P>
        <List>
          <li>
            Click the path to type one (<Keys>Ctrl+L</Keys>), e.g.{" "}
            <C>/etc/nginx</C>. The folder is kept in the address bar, so Back
            and bookmarks work.
          </li>
          <li>
            Folder sizes fill in by themselves, a few at a time, so the biggest
            folder stands out.
          </li>
          <li>
            Type in the filter (<Keys>/</Keys>) to narrow this folder; press{" "}
            <Keys>Enter</Keys> to search every folder inside it.
          </li>
          <li>
            <UI>Show hidden files</UI> lists names starting with a dot, like{" "}
            <C>.env</C> or <C>.ssh</C>.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "actions",
    title: "Working with files",
    body: (
      <>
        <P>
          Right-click a file (or use its <UI>⋯</UI>; on a phone, tap it) for
          everything you can do with it: <UI>Open</UI>, <UI>Edit</UI>,{" "}
          <UI>Preview</UI>, <UI>Download</UI>, <UI>Rename</UI>,{" "}
          <UI>Move to…</UI>, <UI>Copy to…</UI>, <UI>Send to…</UI>,{" "}
          <UI>Compress…</UI>, <UI>Extract here</UI>, <UI>Permissions…</UI>,{" "}
          <UI>Copy path</UI>, <UI>Open in terminal</UI>, <UI>Info</UI> and{" "}
          <UI>Delete</UI>.
        </P>
        <P>
          Select several with <Keys>Ctrl</Keys>/<Keys>Shift</Keys>-click (on a
          phone, long-press one) to move, copy, compress, download as zip or
          delete them together. <UI>Cut</UI> and <UI>Copy</UI> work across
          folders: paste them in another folder. Pasting, moving and copying run
          as <See guide="tasks">tasks</See>, so a big copy carries on if you
          leave the page, and you can follow or cancel it from <UI>Tasks</UI>.
        </P>
        <P>
          <UI>Move to…</UI> and <UI>Copy to…</UI> show a folder tree: click a
          folder to pick it (its sub-folders open below it), or type the path in{" "}
          <UI>Folder</UI>; the tree opens down to what you type. In the tree,{" "}
          <Keys>↑</Keys>/<Keys>↓</Keys> move, <Keys>→</Keys>/<Keys>←</Keys> open
          and close, <Keys>Enter</Keys> picks. The folder being moved, and
          everything inside it, is greyed out.
        </P>
        <Table
          head={["Keys", "Does"]}
          rows={[
            [<Keys key="1">Enter</Keys>, "Open the selected file or folder"],
            [<Keys key="2">Alt+↑</Keys>, "Up one folder"],
            [<Keys key="3">F2</Keys>, "Rename"],
            [<Keys key="4">Delete</Keys>, "Delete the selection"],
            [<Keys key="5">Ctrl+A</Keys>, "Select all"],
            [<Keys key="6">Ctrl+X</Keys>, "Cut (Ctrl+C copies, Ctrl+V pastes)"],
            [<Keys key="7">Esc</Keys>, "Clear the selection"],
          ]}
        />
      </>
    ),
  },
  {
    id: "upload",
    title: "Uploading and downloading",
    body: (
      <>
        <P>
          Drag files or folders from your computer onto the list, or use{" "}
          <UI>Upload files</UI> / <UI>Upload a folder</UI>. Uploads queue in the{" "}
          <UI>Uploads</UI> panel with their progress; you can keep browsing
          while they run, or cancel them. A file with the same name asks before
          it is overwritten.
        </P>
        <P>
          <UI>Download</UI> saves a file; a folder or a selection downloads as a
          zip.
        </P>
        <P>
          <UI>Send to…</UI> copies (or moves) the selection straight to another
          server or a storage, without going through your computer. The other
          way round, <UI>Upload</UI> › <UI>From a server or storage…</UI> (on
          phones: <UI>+</UI> › <UI>From a server or storage</UI>; or right-click
          an empty spot) brings files from elsewhere into the folder you're in:
          see{" "}
          <See guide="storage" section="send">
            sending files
          </See>
          .
        </P>
        <P>
          On a server, <UI>Upload</UI> › <UI>From a URL…</UI> (phones:{" "}
          <UI>+</UI> › <UI>From a URL</UI>) makes the server download a link
          straight into this folder, using <C>curl</C> or <C>wget</C>. Nothing
          goes through your computer. Leave <UI>Save as</UI> empty to keep the
          name from the link; a name that's already here stops the download
          unless you tick <UI>Replace existing file</UI>.
        </P>
        <P>
          Sending, downloading from a URL, compressing and extracting all run in
          the background: you can leave the page or close the browser, and
          follow or cancel them under <See guide="tasks">Tasks</See>. The folder
          refreshes when one ends.
        </P>
      </>
    ),
  },
  {
    id: "editor",
    title: "Editing",
    body: (
      <>
        <P>
          <UI>Edit</UI> opens a text file in an editor with syntax highlighting
          for most languages and configs. Save with <Keys>Ctrl+S</Keys>; find
          and replace with <Keys>Ctrl+F</Keys>.
        </P>
        <P>
          If the file changed on the server since you opened it (someone else,
          or a program, wrote to it), saving stops and offers{" "}
          <UI>Reload from server</UI> or <UI>Overwrite</UI>, so you never undo
          someone's change by accident. Very large files are download-only.
        </P>
        <Example title="Change an nginx setting safely">
          <P>
            Open <C>/etc/nginx/sites-available/default</C>, edit, save, then in
            the terminal test before you reload:
          </P>
          <Code>sudo nginx -t && sudo systemctl reload nginx</Code>
          <P>
            If the test fails nginx keeps running with the old config; fix the
            file and try again.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "permissions",
    title: "Permissions",
    body: (
      <>
        <P>
          <UI>Permissions…</UI> shows <UI>Read</UI>, <UI>Write</UI> and{" "}
          <UI>Execute</UI> for <UI>Owner</UI>, <UI>Group</UI> and{" "}
          <UI>Others</UI> as checkboxes, with the <UI>Octal</UI> number next to
          them; change either one.
        </P>
        <Recommended
          rows={[
            {
              setting: "Folders",
              value: <C>755</C>,
              why: "Everyone can enter and list; only the owner changes them.",
            },
            {
              setting: "Ordinary files",
              value: <C>644</C>,
              why: "Readable by everyone, writable by the owner.",
            },
            {
              setting: "Scripts",
              value: <C>755</C>,
              why: "The same, plus executable, so cron or you can run them.",
            },
            {
              setting: "Secrets (.env, keys)",
              value: <C>600</C>,
              why: "Only the owner can read them.",
            },
            {
              setting: "~/.ssh",
              value: <C>700</C>,
              why: "SSH refuses keys in a folder others can open; authorized_keys should be 600.",
            },
          ]}
        />
        <Warn>
          Never fix a permission error with <C>777</C>: it lets every user and
          every compromised program on the server change the file.
        </Warn>
      </>
    ),
  },
  {
    id: "archives",
    title: "Archives",
    body: (
      <>
        <P>
          <UI>Compress…</UI> packs the selection as <C>zip</C> or <C>tar.gz</C>;{" "}
          <UI>Extract here</UI> and <UI>Extract to folder</UI> unpack zip and
          tar archives on the server, without downloading them.
        </P>
        <Tip>
          Before editing a config, compress a copy of it next to the original
          (e.g. <C>nginx-before-tls.tar.gz</C>). Rolling back is one{" "}
          <UI>Extract here</UI>.
        </Tip>
      </>
    ),
  },
  {
    id: "usage",
    title: "Disk usage",
    body: (
      <>
        <P>
          <UI>Disk usage</UI> shows what takes the space in a folder, biggest
          first, like <C>ncdu</C>: each folder and file with its size and its
          share of the folder, plus how much of the whole disk the folder uses
          and how much is free. Click a folder to look inside it; the path at
          the top and <UI>Up</UI> take you back.
        </P>
        <Steps>
          {[
            <>
              Open the folder to check and click the chart icon in the toolbar
              (on a phone: <UI>⋯</UI> → <UI>Disk usage</UI>). A folder's own
              menu has <UI>Disk usage</UI> too.
            </>,
            <>
              Wait for the scan: small folders take a moment, a whole disk can
              take a minute or more.
            </>,
            <>
              Follow the biggest bars down until you find what grew. Each row's{" "}
              <UI>⋯</UI> has <UI>Show in Files</UI>, <UI>Copy path</UI> and{" "}
              <UI>Delete</UI> (it asks first and says how much space it frees).
            </>,
          ]}
        </Steps>
        <Table
          head={["You see", "Meaning"]}
          rows={[
            [
              "Percent next to a row",
              "Its share of the folder you're in. Hover the bar for its share of the whole disk.",
            ],
            [
              <>
                <UI>Separate filesystem</UI> on a row
              </>,
              "Another disk is mounted there. Its bytes aren't counted in this folder; open it to scan that disk.",
            ],
            [
              "“N folders couldn't be read”",
              "The scan had no permission for them, so the totals are too small.",
            ],
            [
              "“N smaller items”",
              "Only the 500 biggest entries are listed; the rest are summed in one row.",
            ],
          ]}
        />
        <Example title="The root disk is 95% full">
          <P>
            Open <C>/</C> and the scan usually points at <C>/var</C>. Inside it,{" "}
            <C>log</C> or <C>lib/docker</C> are the common suspects. An old{" "}
            <C>/var/log/app/debug.log</C> of 30 GB can go with <UI>Delete</UI>.
            A live database file can't, so move it to a bigger disk instead.
          </P>
        </Example>
        <Recommended
          rows={[
            {
              setting: "Sudo for the SSH user",
              value: (
                <>
                  Passwordless (<C>NOPASSWD</C>)
                </>
              ),
              why: "The scan runs as root when it can, so folders other users own are counted too. Without it, it scans as the login user and says so.",
            },
            {
              setting: "Where to start",
              value: "The folder you suspect",
              why: "Scanning / on a big server reads every file. Start from /var or /home when you can.",
            },
          ]}
        />
        <Tip>
          Results are kept for 10 minutes so going back up is instant. Click{" "}
          <UI>Scan again</UI> after cleaning up; deleting from the list rescans
          for you.
        </Tip>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    body: (
      <List>
        <li>
          <UI>The login user has no permission to read it</UI>: SFTP runs as the
          SSH user, without sudo. Use the terminal with <C>sudo</C> for system
          files, or log in as a user that owns them.
        </li>
        <li>
          An upload was interrupted: upload it again; the partial file is
          replaced.
        </li>
        <li>
          Folder sizes stay empty: the server is busy or the folder is huge.
          They're worked out with <C>du</C> and stop when you leave the folder.
        </li>
        <li>
          <UI>Scanning took too long</UI>: a disk usage scan stops after 5
          minutes. Open a smaller folder (e.g. <C>/var</C> instead of <C>/</C>).
        </li>
        <li>
          Disk usage totals look too small: check for <UI>couldn't be read</UI>{" "}
          (give the SSH user passwordless sudo) and <UI>Separate filesystem</UI>{" "}
          rows (scan them on their own).
        </li>
      </List>
    ),
  },
]
