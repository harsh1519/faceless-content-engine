"use client";

import { useCallback, useState } from "react";
import { Film, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRegisterPageAction } from "@/components/providers/page-actions-provider";
import {
  useChannelsForPicker,
  useCreateLongFormProject,
  useLongFormDetail,
  useLongFormPipeline,
  useLongFormProjects,
  useUpdateLongFormChannel,
} from "@/hooks/use-long-form";
import { getMediaPublicUrl } from "@/lib/media/resolve-media-url";
import { toastError, toastSuccess } from "@/lib/toast";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  researched: "Researched",
  outlined: "Outlined",
  scripted: "Scripted",
  tts_ready: "TTS ready",
  merged: "Merged",
  review: "Review",
  queued_render: "Rendering",
  published: "Published",
  failed: "Failed",
};

export function LongFormView() {
  const { data: projects, isLoading, isError, error, refetch } = useLongFormProjects();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [topic, setTopic] = useState("");
  const [title, setTitle] = useState("");

  const openNewProject = useCallback(() => setOpenNew(true), []);
  useRegisterPageAction("onNew", openNewProject);

  const createProject = useCreateLongFormProject();

  async function handleCreate() {
    if (!topic.trim()) {
      toastError(new Error("Topic is required"));
      return;
    }
    try {
      const p = await createProject.mutateAsync({
        topic: topic.trim(),
        title: title.trim() || undefined,
      });
      toastSuccess("Long-form project created");
      setOpenNew(false);
      setTopic("");
      setTitle("");
      setSelectedId(p.project_id);
    } catch (e) {
      toastError(e);
    }
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "Could not load long-form projects"}
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Long-form engine</h1>
          <p className="text-sm text-muted-foreground">
            Topic → research → outline → section scripts → TTS per section → merge → enqueue vertical render.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setOpenNew(true)}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New long-form project</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="lf-topic">Topic</Label>
              <Textarea
                id="lf-topic"
                placeholder="e.g. The complete history of Nokia"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lf-title">Title (optional)</Label>
              <Input
                id="lf-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Defaults from topic"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>
              Cancel
            </Button>
            <Button disabled={createProject.isPending} onClick={handleCreate}>
              {createProject.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-xl border border-border/60">
          <div className="border-b border-border/60 px-4 py-3 text-sm font-medium">
            Projects
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : !projects?.length ? (
              <p className="p-4 text-sm text-muted-foreground">No projects yet.</p>
            ) : (
              <ul className="space-y-1">
                {projects.map((p) => (
                  <li key={p.project_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.project_id)}
                      className={`flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        selectedId === p.project_id
                          ? "bg-zinc-800 text-foreground"
                          : "hover:bg-zinc-900/80 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span className="font-medium line-clamp-1">{p.title}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <LongFormDetailPanel projectId={selectedId} />
      </div>
    </div>
  );
}

function LongFormDetailPanel({ projectId }: { projectId: string | null }) {
  const { data, isLoading } = useLongFormDetail(projectId);
  const pipeline = useLongFormPipeline(projectId);
  const { data: channels } = useChannelsForPicker();
  const updateChannel = useUpdateLongFormChannel();

  if (!projectId) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 text-center text-sm text-muted-foreground">
        <Film className="mb-2 h-10 w-10 opacity-40" />
        Select a project or create one.
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-border/60 text-sm text-muted-foreground">
        Loading project…
      </div>
    );
  }

  const { project, sections } = data;
  const busy =
    pipeline.runResearch.isPending ||
    pipeline.runOutline.isPending ||
    pipeline.writeSections.isPending ||
    pipeline.ttsAll.isPending ||
    pipeline.mergeAudio.isPending ||
    pipeline.enqueueRender.isPending ||
    updateChannel.isPending;

  const mergedUrl = getMediaPublicUrl(project.merged_audio_path);

  async function onChannelChange(channelId: string) {
    try {
      await updateChannel.mutateAsync({
        projectId: project.project_id,
        channel_id: channelId === "__none__" ? null : channelId,
      });
      toastSuccess("Channel updated");
    } catch (e) {
      toastError(e);
    }
  }

  async function run(
    fn: () => Promise<unknown>,
    ok: string
  ) {
    try {
      await fn();
      toastSuccess(ok);
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 p-4">
      <div>
        <h2 className="text-base font-semibold">{project.title}</h2>
        <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{project.topic}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Status: <span className="text-foreground">{STATUS_LABEL[project.status]}</span>
        </p>
        {project.error_message && (
          <p className="mt-2 rounded-md border border-red-500/40 bg-red-950/30 px-2 py-1 text-[11px] text-red-300">
            {project.error_message}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label className="text-xs text-muted-foreground">Channel (required before enqueue)</Label>
        <Select
          value={project.channel_id ?? "__none__"}
          onValueChange={onChannelChange}
          disabled={busy}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select channel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {(channels ?? []).map((c) => (
              <SelectItem key={c.channel_id} value={c.channel_id}>
                {c.name} ({c.platform})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => run(() => pipeline.runResearch.mutateAsync(), "Research saved")}
        >
          1. Research
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => run(() => pipeline.runOutline.mutateAsync(), "Outline created")}
        >
          2. Outline
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => run(() => pipeline.writeSections.mutateAsync(), "Section scripts written")}
        >
          3. Write sections
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => run(() => pipeline.ttsAll.mutateAsync(), "Section TTS done")}
        >
          4. Section TTS
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => run(() => pipeline.mergeAudio.mutateAsync(), "Audio merged")}
        >
          5. Merge audio
        </Button>
        <Button
          size="sm"
          disabled={busy}
          onClick={() =>
            run(() => pipeline.enqueueRender.mutateAsync(), "Queued for vertical render")
          }
        >
          6. Enqueue render
        </Button>
      </div>

      {mergedUrl && (
        <div className="grid gap-1">
          <Label className="text-xs">Merged audio</Label>
          <audio controls className="w-full" src={mergedUrl}>
            <track kind="captions" />
          </audio>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Sections</p>
        <ul className="max-h-48 space-y-2 overflow-y-auto text-xs">
          {sections.map((s) => (
            <li
              key={s.section_id}
              className="rounded-md border border-border/50 bg-zinc-950/40 px-2 py-1.5"
            >
              <span className="font-medium">{s.title}</span>
              <span className="ml-2 text-[10px] text-muted-foreground">{s.status}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-md border border-border/40 bg-zinc-950/30 p-3 text-[11px] text-muted-foreground">
        Set <code className="text-foreground">LOCAL_MEDIA_ROOT</code> to store audio/renders on disk
        and avoid large Supabase Storage files. Run{" "}
        <code className="text-foreground">node renderer/render.js</code> with the same env. FFmpeg
        must be on PATH for merge and render.
      </div>
    </div>
  );
}
