import { redirect } from "next/navigation"

// No dashboard yet: send everyone to sign in.
export default function Home() {
  redirect("/login")
}
