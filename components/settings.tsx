import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function Settings() {
  const getInitial = () => {
    if (typeof window === "undefined") return { key: "", storage: "local" as const }
    try {
      const session = sessionStorage.getItem("AI_GATEWAY_API_KEY")
      const local = localStorage.getItem("AI_GATEWAY_API_KEY")
      if (session) return { key: session, storage: "session" as const }
      if (local) return { key: local, storage: "local" as const }
    } catch {
      // ignore
    }
    return { key: "", storage: "local" as const }
  }

  const initial = getInitial()
  const [key, setKey] = useState<string>(initial.key)
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [storage, setStorage] = useState<"local" | "session">(initial.storage)

  async function saveKey() {
    setStatus("saving")
    try {
      try {
        if (storage === "local") {
          localStorage.setItem("AI_GATEWAY_API_KEY", key)
          sessionStorage.removeItem("AI_GATEWAY_API_KEY")
        } else {
          sessionStorage.setItem("AI_GATEWAY_API_KEY", key)
          localStorage.removeItem("AI_GATEWAY_API_KEY")
        }
      } catch {
        // ignore storage errors
      }
      setStatus("saved")
    } catch (err) {
      console.error(err)
      setStatus("error")
    }
    setTimeout(() => setStatus("idle"), 2000)
  }

  function clearKey() {
    try {
      localStorage.removeItem("AI_GATEWAY_API_KEY")
      sessionStorage.removeItem("AI_GATEWAY_API_KEY")
      setKey("")
      setStorage("local")
      setStatus("idle")
    } catch {}
  }
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Setings</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add your key</SheetTitle>
          <SheetDescription>
            Add your AI_GATEWAY_API_KEY to use the AI services.
          </SheetDescription>
        </SheetHeader>
        <div className="grid flex-1 auto-rows-min gap-6 px-4">
          <div className="grid gap-3">
            <Label htmlFor="sheet-demo-name">AI_GATEWAY_API_KEY</Label>
            <Input
              type="password"
              id="sheet-demo-name"
              value={key}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKey(e.target.value)}
            />
          </div>
        </div>
        <SheetFooter>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm">Store in:</label>
              <Select value={storage} onValueChange={(v) => setStorage(v as "local" | "session") }>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local Storage (persist)</SelectItem>
                  <SelectItem value="session">Session Storage (current tab)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="button" onClick={saveKey} disabled={status === "saving"}>
              {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save changes"}
            </Button>

            <Button type="button" variant="outline" onClick={clearKey}>
              Clear
            </Button>

            <SheetClose asChild>
              <Button variant="outline">Close</Button>
            </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
