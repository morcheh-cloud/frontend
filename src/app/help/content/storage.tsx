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

export const storage: GuideSection[] = [
  {
    id: "overview",
    title: "What it's for",
    body: (
      <>
        <P>
          <UI>Storage</UI> connects Morcheh to places that hold files but aren't
          servers you manage: an S3 bucket, an FTP or SFTP account, a WebDAV
          share. Browse them with the same file manager as a server's{" "}
          <See guide="files" />, and send files between them and your servers
          without downloading anything to your computer.
        </P>
        <Table
          head={["Protocol", "Use it for"]}
          rows={[
            [
              "S3",
              "Amazon S3 and compatible object storage: MinIO, Cloudflare R2, Wasabi, DigitalOcean Spaces, Backblaze B2, ArvanCloud…",
            ],
            [
              "FTP",
              "Hosting accounts and old NAS boxes; FTPS when they support TLS",
            ],
            ["SFTP", "Any machine with an SSH server, e.g. a backup box"],
            ["WebDAV", "Nextcloud, ownCloud, NAS boxes"],
          ]}
        />
      </>
    ),
  },
  {
    id: "status",
    title: "Connection status",
    body: (
      <>
        <P>
          Morcheh re-checks every storage by itself every 30 seconds, even when
          nobody has the panel open, by signing in afresh. The list and the
          storage's page pick up new statuses every 10 seconds, so a storage
          that went away stops showing <UI>Online</UI> within about a minute.
          Press <UI>Check connection</UI> in its menu to check right now.
        </P>
        <P>
          The red number beside <UI>Storage</UI> in the sidebar (on a phone, in{" "}
          <UI>More</UI>) counts the storages in this workspace that are{" "}
          <UI>Unreachable</UI>, <UI>Auth failed</UI>, <UI>Host key changed</UI>{" "}
          or <UI>Error</UI>. When one comes back online, folders that failed to
          load while it was down load again by themselves.
        </P>
        <Recommended
          rows={[
            {
              setting: <C>STORAGE_CHECK_INTERVAL</C>,
              value: "30s (the default)",
              why: "A backend setting (e.g. 1m, 5m; 0 turns background checks off). Each check is a sign-in, plus one list request on S3: on a paid provider, or an FTP server that logs every login, raise it to 5m.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "add",
    title: "Adding a storage",
    body: (
      <>
        <Steps>
          <P>
            Open <UI>Storage</UI> and press <UI>Add storage</UI>.
          </P>
          <P>
            Pick the <UI>Protocol</UI>, then the <UI>Provider</UI>. A provider
            fills the endpoint, region and URL style for you; everything stays
            editable.
          </P>
          <P>
            Fill in the address and the credentials, then press{" "}
            <UI>Test connection</UI>. It connects without saving, and shows what
            it found or why it failed.
          </P>
          <P>
            Press <UI>Add storage</UI>. Morcheh checks the connection once more
            and shows the result in the list.
          </P>
        </Steps>
        <P>
          Passwords, secret keys and private keys are stored encrypted. When you
          edit a storage, leave a secret blank to keep the saved one, or tick{" "}
          <UI>Forget the saved…</UI> to remove it. To read a saved secret, see{" "}
          <A href="#credentials">Seeing a storage's credentials</A>.
        </P>
      </>
    ),
  },
  {
    id: "s3",
    title: "S3 and compatible",
    body: (
      <>
        <List>
          <li>
            <UI>Endpoint</UI>: the API address, with <C>https://</C> (or{" "}
            <C>http://</C> for a local MinIO). Not the web console's address.
          </li>
          <li>
            <UI>Bucket</UI>: leave it empty to see every bucket the key can list
            (each one shows as a top-level folder), or set one to stay inside
            it.
          </li>
          <li>
            <UI>Path-style URLs</UI>: needed by MinIO and most self-hosted
            servers; AWS and the big clouds use the default (off).
          </li>
          <li>
            Use an access key limited to the buckets Morcheh needs, not your
            root account's.
          </li>
        </List>
        <Example title="A MinIO on one of your servers">
          <Table
            head={["Field", "Value"]}
            rows={[
              ["Provider", "MinIO"],
              [
                <UI key="e">Endpoint</UI>,
                <C key="v">http://203.0.113.10:9000</C>,
              ],
              [<UI key="r">Region</UI>, <C key="v">us-east-1</C>],
              [<UI key="p">Path-style URLs</UI>, "On"],
              [<UI key="k">Access key</UI>, "A user made for Morcheh"],
            ]}
          />
          <P>
            The API is on port 9000 by default; 9001 is the console and won't
            answer S3 requests.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "ftp-sftp-webdav",
    title: "FTP, SFTP and WebDAV",
    body: (
      <>
        <List>
          <li>
            <UI>FTP</UI>: choose the <UI>Encryption</UI>. <UI>Explicit TLS</UI>{" "}
            (port 21) is the usual FTPS; <UI>Implicit (990)</UI> is the older
            kind. <UI>None</UI> sends the password in the clear.
          </li>
          <li>
            <UI>SFTP</UI>: log in with a password or a <UI>Private key</UI>{" "}
            (paste it or load the file). The host key is trusted on the first
            connection; if it changes later the storage shows{" "}
            <UI>Host key changed</UI> and waits for you.
          </li>
          <li>
            <UI>WebDAV</UI>: the full URL of the folder, e.g. for Nextcloud{" "}
            <C>https://cloud.example.com/remote.php/dav/files/USER/</C>, with an
            app password instead of your login password.
          </li>
          <li>
            <UI>Start folder</UI> opens the storage in a sub-folder and keeps
            you inside it.
          </li>
        </List>
        <Warn>
          <UI>Accept any certificate</UI> turns off the TLS check: anyone
          between Morcheh and the storage can read the traffic, password
          included. Use it only for a self-signed certificate on a network you
          trust.
        </Warn>
      </>
    ),
  },
  {
    id: "browse",
    title: "Browsing and files",
    body: (
      <>
        <P>
          Click a storage to open its files. Everything works as in a server's{" "}
          <See guide="files" section="actions">
            file manager
          </See>
          : upload by dragging, download (folders as zip), rename, move, copy,
          delete, search, preview, and edit text files with a check that nobody
          changed them meanwhile.
        </P>
        <P>
          What doesn't apply is hidden: storages have no Unix permissions,
          owners or links, and no terminal.
        </P>
        <Table
          head={["Feature", "Works on"]}
          rows={[
            [<UI key="s">Share link…</UI>, "S3"],
            ["Copies made on the storage itself (fast)", "S3, WebDAV"],
            ["Resumable downloads, seeking in video", "S3, SFTP"],
          ]}
        />
        <Tip>
          On S3 a folder is only a shared name prefix: renaming or moving a big
          folder copies every object inside it, so it can take a while.
        </Tip>
      </>
    ),
  },
  {
    id: "send",
    title: "Sending files between servers and storages",
    body: (
      <>
        <P>
          On any file or selection, in a server's <UI>Files</UI> or in a
          storage, choose <UI>Send to…</UI>. Pick the <UI>Destination</UI> (any
          server or storage), then the folder in its tree (or type a path in{" "}
          <UI>Folder</UI>; <UI>Change</UI> goes back to the list). On an S3
          storage that shows every bucket, pick a bucket or a folder inside one.
          Morcheh streams the files from one to the other: nothing passes
          through your browser, so it's as fast as the link between them.
        </P>
        <P>
          To pull files the other way, open the folder they should land in and
          choose <UI>Upload</UI> › <UI>From a server or storage…</UI> (phones:{" "}
          <UI>+</UI> › <UI>From a server or storage</UI>). Pick where they are
          under <UI>From</UI>, browse its folders, tick the files or folders you
          want (the ticks stay while you move between folders), then{" "}
          <UI>Copy here</UI>. A folder with many entries gets a filter box.
        </P>
        <P>
          Either way it runs as a background task, so you can close the dialog
          and the page. Follow its progress, cancel it or try it again under{" "}
          <See guide="tasks">Tasks</See>.
        </P>
        <List>
          <li>Missing folders on the other side are created.</li>
          <li>
            Something with the same name stops the transfer unless you tick{" "}
            <UI>Replace existing files</UI>.
          </li>
          <li>
            Tick <UI>Move</UI> to delete the originals once they've arrived.
          </li>
        </List>
        <Example title="Keep a database dump off the server">
          <P>On the server, in the terminal:</P>
          <Code>{"pg_dump -Fc shop > /tmp/shop-$(date +%F).dump"}</Code>
          <P>
            Then in <UI>Files</UI>, open <C>/tmp</C>, choose <UI>Send to…</UI>{" "}
            on the dump, pick your backup bucket, tick <UI>Move</UI>, and send.
          </P>
        </Example>
        <Example title="Restore a backup onto a server">
          <P>
            In the server's <UI>Files</UI>, open <C>/tmp</C>, choose{" "}
            <UI>Upload</UI> › <UI>From a server or storage…</UI>, pick the
            backup storage, open its bucket, tick yesterday's dump and press{" "}
            <UI>Copy here</UI>. Then restore it in the terminal.
          </P>
        </Example>
      </>
    ),
  },
  {
    id: "credentials",
    title: "Seeing a storage's credentials",
    body: (
      <>
        <P>
          To use a storage outside Morcheh (the AWS CLI, an FTP client, a backup
          script), open its credentials on demand:
        </P>
        <Steps>
          {[
            <P key="1">
              On the storage's page press <UI>Credentials</UI>, or choose{" "}
              <UI>Show credentials…</UI> from a storage's menu on the list (on a
              phone: its action sheet).
            </P>,
            <P key="2">
              Addresses and usernames are shown as they are. The secret key,
              password, private key and passphrase stay hidden until you press
              the eye; the copy button works either way.
            </P>,
            <P key="3">
              <UI>Edit credentials</UI> opens the storage form to change them.
            </P>,
          ]}
        </Steps>
        <P>
          The edit form has the same eye: press it on a blank secret field to
          see the saved value, or on a field you typed in to check your typing.
          For a private key, use <UI>Show saved key</UI>. Showing a saved value
          doesn't change it: leave the field blank and saving keeps it.
        </P>
        <Table
          head={["Protocol", "What you see"]}
          rows={[
            [
              <UI key="s3">S3</UI>,
              "Endpoint, access key, secret key, bucket, region and URL style.",
            ],
            [
              <UI key="ftp">FTP / FTPS</UI>,
              "Host, port, username, password, encryption and the full address.",
            ],
            [
              <UI key="sftp">SFTP</UI>,
              "Host, port, username, password or private key (with passphrase and public key), the trusted host key and a ready sftp command.",
            ],
            [<UI key="dav">WebDAV</UI>, "URL, username and password."],
          ]}
        />
        <Example title="List a bucket with the AWS CLI">
          <P>
            Copy the access key, secret key and endpoint from the window, then:
          </P>
          <Code>{`
export AWS_ACCESS_KEY_ID=<access key>
export AWS_SECRET_ACCESS_KEY=<secret key>
aws s3 ls s3://backups --endpoint-url https://s3.example.com
`}</Code>
        </Example>
        <Warn>
          Anyone who can open Morcheh can read these. Don't share your screen
          with a secret visible, and delete a downloaded key once it is in{" "}
          <C>~/.ssh</C>.
        </Warn>
        <Tip>
          The secrets are fetched only while the window is open and are
          forgotten when you close it. If it says the credentials can't be
          decrypted, the backend's <C>SECRETS_KEY</C> changed since they were
          saved: enter them again with <UI>Edit credentials</UI>.
        </Tip>
      </>
    ),
  },
  {
    id: "share",
    title: "Share links",
    body: (
      <>
        <P>
          On S3 storages, <UI>Share link…</UI> makes a download link that works
          without logging in, for <UI>1 hour</UI>, <UI>1 day</UI> or{" "}
          <UI>7 days</UI>. The link is signed by the storage: it can't be
          revoked early except by disabling the access key.
        </P>
        <Tip>Pick the shortest expiry that does the job.</Tip>
      </>
    ),
  },
  {
    id: "insights",
    title: "Insights: charts and statistics",
    body: (
      <>
        <P>
          The <UI>Insights</UI> tab on the Storage page shows how your storages
          have been doing: whether they stayed reachable, how fast they
          answered, how much they hold and what was copied to or from them. Pick{" "}
          <UI>24 hours</UI>, <UI>7 days</UI> or <UI>30 days</UI> at the top; the
          page refreshes by itself every minute.
        </P>
        <Table
          head={["Part", "What it shows"]}
          rows={[
            [
              "Tiles",
              "How many are online now, uptime over the range, the space they hold and the data moved.",
            ],
            [
              "Availability",
              "One strip per storage: each block is a stretch of connection checks. Green = all passed, orange = some failed, red = all failed, grey = no checks (Morcheh wasn't running).",
            ],
            [
              "Response time",
              "How long a connection check took, for all storages or the one you pick. Failed checks aren't counted.",
            ],
            [
              "Activity",
              "File transfers, cron job syncs and database backups that used a storage: runs (succeeded and failed) or the data they moved.",
            ],
            [
              "Space",
              "What each storage holds and how much it grew over the range. Open one for its biggest folders and a chart of its size.",
            ],
            [
              "Status changes",
              "Each time a storage went down or came back, with the error it gave.",
            ],
          ]}
        />
        <P>
          Hover a chart (or tap it on a phone) to read the exact numbers; on a
          keyboard, focus it and use the arrow keys.
        </P>
      </>
    ),
  },
  {
    id: "measuring",
    title: "How space is measured",
    body: (
      <>
        <P>
          Storages don't report their size, so Morcheh walks every folder and
          adds up the files. It does this on its own about once a day for each
          online storage, as a background task. To measure one now, press{" "}
          <UI>Measure now</UI> (the scan icon in its row, or in its space
          panel), or <UI>Measure all</UI> at the top. You need Operator access
          on the storage.
        </P>
        <Steps>
          <li>
            Open <UI>Storage</UI> › <UI>Insights</UI>.
          </li>
          <li>
            In <UI>Space</UI>, open the storage you want to look at.
          </li>
          <li>
            Press <UI>Measure now</UI>. The walk runs in{" "}
            <See guide="tasks">Tasks</See>; the numbers update when it ends.
          </li>
          <li>
            Click a folder in <UI>Biggest folders</UI> to browse it.
          </li>
        </Steps>
        <Example title="Finding what filled a backup bucket">
          <P>
            The <UI>Stored</UI> tile shows +40 GB in 7 days. In <UI>Space</UI>{" "}
            the backup bucket grew the most; its panel shows <C>postgres/</C>{" "}
            holds 90% of it. Lower the number of copies the backup job keeps, or
            add a lifecycle rule on the bucket.
          </P>
        </Example>
        <Tip>
          A walk that runs too long stops early and is marked <UI>Partial</UI>:
          the storage holds at least that much. SFTP storages also show the free
          space on the disk.
        </Tip>
        <P>
          Connection checks are kept for 31 days and space measurements for
          about a year. Admins can change how long checks are kept, and how
          often space is measured, with these backend settings:
        </P>
        <Recommended
          rows={[
            {
              setting: "STORAGE_SCAN_INTERVAL",
              value: "24h",
              why: "How often each storage is measured. Walking a big storage costs requests (and on S3, money): don't go below a few hours.",
            },
            {
              setting: "STORAGE_HISTORY",
              value: "744h (31 days)",
              why: "How long connection checks are kept. The 30-day view needs at least 31 days.",
            },
            {
              setting: "STORAGE_CHECK_INTERVAL",
              value: "30s",
              why: "How often each storage is checked; this is what fills the availability strips.",
            },
          ]}
        />
      </>
    ),
  },
  {
    id: "settings",
    title: "Recommended settings",
    body: (
      <Recommended
        rows={[
          {
            setting: "Credentials",
            value: "A key or user just for Morcheh",
            why: "Limit it to what Morcheh needs; revoke it without touching anything else.",
          },
          {
            setting: "Read-only",
            value: "On for archives and backups",
            why: "Morcheh refuses every write, so a mis-click can't delete a backup.",
          },
          {
            setting: "FTP encryption",
            value: "Explicit TLS",
            why: "Plain FTP sends the password and files in the clear.",
          },
          {
            setting: "Start folder",
            value: "The folder you work in",
            why: "Keeps the rest of the account out of reach.",
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
          <UI>Auth failed</UI>: check the username and password or the access
          and secret keys, then <UI>Edit</UI> and save again. For Nextcloud, use
          an app password.
        </li>
        <li>
          <UI>Unreachable</UI> or a timeout: the address or port is wrong, or a
          firewall blocks the backend's server (not your computer) from reaching
          the storage.
        </li>
        <li>
          S3 says the bucket doesn't exist, or requests fail with odd addresses:
          turn on <UI>Path-style URLs</UI> for self-hosted servers, and check
          the <UI>Region</UI>.
        </li>
        <li>
          FTP lists nothing or hangs: the server may need TLS, or its passive
          ports are blocked by a firewall.
        </li>
        <li>
          <UI>Host key changed</UI> on SFTP: expected after the machine was
          reinstalled; otherwise find out why before you trust the new key.
        </li>
        <li>
          In <UI>Insights</UI>, a storage says <UI>Not measured yet</UI>: it's
          measured once it's online and its turn comes; press{" "}
          <UI>Measure now</UI> to skip the wait.
        </li>
        <li>
          Grey blocks in an availability strip: Morcheh wasn't running then, or
          the storage was added later.
        </li>
        <li>
          Insights' <UI>Activity</UI> is empty: only transfers, cron job syncs
          and database backups count. Browsing, uploads and downloads in the
          file manager don't.
        </li>
      </List>
    ),
  },
]
