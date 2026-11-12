import { CAPTURE_ID, CAPTURE_TYPE, captureId } from "./sharing.ts";
import type { CaptureErrorReply, ShareReply, UploadReply } from "./sharing.ts";
import { t } from "./i18n";

export async function checkedResponse(response: Response): Promise<Response> {
  if (response.ok) return response;
  const reply = await response.json().catch(() => null) as CaptureErrorReply | null;
  throw new Error(t(`share.error.${reply?.error.code ?? "unavailable"}`));
}

export async function sharedFile(id: string, signal?: AbortSignal): Promise<File> {
  if (!CAPTURE_ID.test(id)) throw new Error(t("share.invalidLink"));
  const response = await checkedResponse(await fetch(`/api/perf/captures/${id}`, { signal }));
  return new File([await response.blob()], `${id}.hzperf`, { type: CAPTURE_TYPE });
}

export async function fileFromLink(link: string): Promise<File> {
  const id = captureId(link, window.location.origin);
  if (!id) throw new Error(t("share.invalidLink"));
  return sharedFile(id);
}

export async function publishCapture(file: File): Promise<{ upload: UploadReply; shared: ShareReply }> {
  const uploaded = await checkedResponse(await fetch("/api/perf/captures", { method: "POST", headers: { "Content-Type": CAPTURE_TYPE }, body: file }));
  const upload = await uploaded.json() as UploadReply;
  sessionStorage.setItem(`perf-owner:${upload.id}`, upload.delete_token);
  const pinned = await checkedResponse(await fetch(`/api/perf/captures/${upload.id}/share`, { method: "POST", headers: { Authorization: `Bearer ${upload.delete_token}` } }));
  return { upload, shared: await pinned.json() as ShareReply };
}
