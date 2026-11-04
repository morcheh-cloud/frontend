import { Suspense } from "react"

import { AnsibleActionsProvider } from "./components/ansible-actions"

// The run sheet and every confirmation, shared by the list, playbook and run
// pages.
export default function AnsibleLayout({ children }: LayoutProps<"/ansible">) {
  return (
    <Suspense>
      <AnsibleActionsProvider>{children}</AnsibleActionsProvider>
    </Suspense>
  )
}
