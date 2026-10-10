import { Badge, type BadgeTone } from "@/components/badge";
import {
  BATCH_STATUS_LABELS,
  CANDIDATE_STATUS_LABELS,
  JOB_STATUS_LABELS,
  type Batch,
  type CandidateStatus,
  type Job,
} from "@/lib/recruitment";

/**
 * Trạng thái đợt kèm tình trạng thực tế: một đợt "Đang mở" nhưng chưa tới
 * ngày, hoặc đã quá ngày kết thúc, thì trang ngoài KHÔNG nhận hồ sơ — phải
 * nói rõ ra, nếu không admin tưởng đợt đang chạy.
 */
export function BatchStatusBadge({
  batch,
}: {
  batch: Pick<Batch, "status" | "accepting" | "startDate" | "endDate">;
}) {
  if (batch.status !== "open") {
    return (
      <Badge tone={batch.status === "draft" ? "warning" : "neutral"}>
        {BATCH_STATUS_LABELS[batch.status]}
      </Badge>
    );
  }
  if (batch.accepting) return <Badge tone="success">Đang nhận hồ sơ</Badge>;

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date());
  return (
    <Badge tone="info">
      {today < batch.startDate ? "Chờ tới ngày mở" : "Đã quá hạn"}
    </Badge>
  );
}

export function JobStatusBadge({ job }: { job: Pick<Job, "status" | "accepting"> }) {
  if (job.status === "closed") {
    return <Badge tone="neutral">{JOB_STATUS_LABELS.closed}</Badge>;
  }
  return job.accepting ? (
    <Badge tone="success">{JOB_STATUS_LABELS.open}</Badge>
  ) : (
    // Vị trí bật nhưng đợt chưa/không nhận hồ sơ.
    <Badge tone="info">Chờ đợt mở</Badge>
  );
}

const CANDIDATE_TONES: Record<CandidateStatus, BadgeTone> = {
  // Hồ sơ mới là thứ duy nhất cần gây chú ý — còn tồn là còn việc.
  new: "danger",
  screening: "warning",
  interview: "info",
  offered: "brand",
  hired: "success",
  rejected: "neutral",
};

export function CandidateStatusBadge({ status }: { status: CandidateStatus }) {
  return (
    <Badge tone={CANDIDATE_TONES[status] ?? "neutral"}>
      {CANDIDATE_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
