import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, updateProfile } from "@/lib/data.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-provider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/profile")({
  head: () => ({ meta: [{ title: "Profile — FinAssist AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => getMyProfile() });

  const [name, setName] = useState("");
  const [firm, setFirm] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (profile.data) {
      setName(profile.data.full_name ?? "");
      setFirm(profile.data.firm ?? "");
      setTitle(profile.data.job_title ?? "");
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () => updateProfile({ data: { full_name: name, firm, job_title: title } }),
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Profile</h1>
      <Card className="space-y-3 p-5">
        <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Firm</Label><Input value={firm} onChange={(e) => setFirm(e.target.value)} /></div>
        <div><Label>Job title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Paraplanner / Adviser" /></div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="bg-gradient-brand">Save changes</Button>
      </Card>

      <Card className="flex items-center justify-between p-5">
        <div>
          <h2 className="font-display font-semibold">Sign out</h2>
          <p className="text-sm text-muted-foreground">End your session on this device.</p>
        </div>
        <Button variant="outline" onClick={async () => {
          await qc.cancelQueries();
          qc.clear();
          await supabase.auth.signOut();
          navigate({ to: "/auth", replace: true });
        }}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button>
      </Card>
    </div>
  );
}
