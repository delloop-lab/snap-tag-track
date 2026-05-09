import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const DEMO_REGISTER_PROMPT_EVENT = "snap:demo-register-prompt";

export type DemoRegisterPromptDetail = {
  title: string;
  description: string;
};

export function openDemoRegisterPrompt(title: string, description: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<DemoRegisterPromptDetail>(DEMO_REGISTER_PROMPT_EVENT, {
      detail: { title, description },
    }),
  );
}

/** Global “Register now” dialog for session demo (sidebar, print, profile, etc.). */
export default function DemoRegisterPromptHost() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const onPrompt = useCallback((e: Event) => {
    const ce = e as CustomEvent<DemoRegisterPromptDetail>;
    const d = ce.detail;
    if (!d?.title) return;
    setTitle(d.title);
    setDescription(d.description ?? "");
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener(DEMO_REGISTER_PROMPT_EVENT, onPrompt as EventListener);
    return () => window.removeEventListener(DEMO_REGISTER_PROMPT_EVENT, onPrompt as EventListener);
  }, [onPrompt]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="border-slate-600 bg-slate-900 text-slate-100 sm:max-w-md [&>button]:text-slate-400">
        <DialogHeader className="space-y-3 text-center sm:text-center">
          <DialogTitle className="text-xl font-bold text-white">{title}</DialogTitle>
          <DialogDescription className="text-base text-slate-300">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="w-full rounded-xl bg-orange-500 py-6 text-base font-bold text-white hover:bg-orange-600"
            onClick={() => {
              setOpen(false);
              navigate("/auth?register=1");
            }}
          >
            Register Now
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl border-slate-500 bg-slate-800 text-slate-100 hover:bg-slate-700"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
