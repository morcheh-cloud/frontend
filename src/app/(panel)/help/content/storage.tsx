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
          Passwords, secret keys and private keys are stored encrypted and never
          sent back to the browser. When you edit a storage, leave a secret
          blank to keep the saved one, or tick <UI>Forget the saved…</UI> to
          remove it.
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
      </List>
    ),
  },
]
