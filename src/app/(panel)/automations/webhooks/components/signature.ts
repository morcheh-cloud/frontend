// How a receiver checks that a delivery came from Morche. Shared by the
// webhook page's "Verify the signature" card and the `api` guide.
//
// X-Morche-Signature = "sha256=" + hex(HMAC-SHA256(secret,
//   X-Morche-Timestamp + "." + raw body)); the timestamp is Unix seconds.
// The whole secret (whsec_…) is the key. Check against the raw body bytes,
// before any JSON parsing, and refuse old timestamps (replays).

export const signatureSamples = [
  {
    key: "node",
    label: "Node.js",
    code: `import crypto from "node:crypto"
import express from "express"

const secret = process.env.MORCHE_WEBHOOK_SECRET // whsec_…
const app = express()

// Keep the raw body: the signature covers the exact bytes sent.
app.post("/morche", express.raw({ type: "application/json" }), (req, res) => {
  const ts = req.get("X-Morche-Timestamp") ?? ""
  const got = req.get("X-Morche-Signature") ?? ""
  const want =
    "sha256=" +
    crypto
      .createHmac("sha256", secret)
      .update(ts + ".")
      .update(req.body)
      .digest("hex")
  const fresh = Math.abs(Date.now() / 1000 - Number(ts)) < 300
  if (
    !fresh ||
    got.length !== want.length ||
    !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want))
  ) {
    return res.status(401).send("bad signature")
  }
  const event = JSON.parse(req.body.toString("utf8"))
  console.log(event.type, event.title)
  res.sendStatus(204)
})

app.listen(3000)`,
  },
  {
    key: "python",
    label: "Python",
    code: `import hashlib, hmac, json, os, time
from flask import Flask, abort, request

secret = os.environ["MORCHE_WEBHOOK_SECRET"].encode()  # whsec_…
app = Flask(__name__)

@app.post("/morche")
def morche():
    ts = request.headers.get("X-Morche-Timestamp", "")
    got = request.headers.get("X-Morche-Signature", "")
    body = request.get_data()  # the raw bytes, before any parsing
    want = "sha256=" + hmac.new(
        secret, ts.encode() + b"." + body, hashlib.sha256
    ).hexdigest()
    if not ts.isdigit() or abs(time.time() - int(ts)) > 300:
        abort(401)
    if not hmac.compare_digest(got, want):
        abort(401)
    event = json.loads(body)
    print(event["type"], event["title"])
    return "", 204`,
  },
  {
    key: "go",
    label: "Go",
    code: `package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"
)

var secret = []byte(os.Getenv("MORCHE_WEBHOOK_SECRET")) // whsec_…

func morche(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}
	ts := r.Header.Get("X-Morche-Timestamp")
	sec, err := strconv.ParseInt(ts, 10, 64)
	if err != nil || time.Since(time.Unix(sec, 0)).Abs() > 5*time.Minute {
		http.Error(w, "old or missing timestamp", http.StatusUnauthorized)
		return
	}
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(ts + "."))
	mac.Write(body)
	want := "sha256=" + hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(r.Header.Get("X-Morche-Signature")), []byte(want)) {
		http.Error(w, "bad signature", http.StatusUnauthorized)
		return
	}
	var event struct {
		Type  string \`json:"type"\`
		Title string \`json:"title"\`
	}
	_ = json.Unmarshal(body, &event)
	log.Println(event.Type, event.Title)
	w.WriteHeader(http.StatusNoContent)
}

func main() {
	http.HandleFunc("POST /morche", morche)
	log.Fatal(http.ListenAndServe(":3000", nil))
}`,
  },
] as const
