import { Badge } from "@/components/badge";
import { CONTACT_STATUS_LABELS, type ContactStatus } from "@/lib/contacts";
import { BUTTON, BUTTON_SM } from "@/lib/styles";

const TONES: Record<ContactStatus, "danger" | "info" | "success" | "neutral"> = {
  // Chưa xử lý là thứ duy nhất cần gây chú ý — còn tồn đọng là còn việc.
  new: "danger",
  in_progress: "info",
  resolved: "success",
  rejected: "neutral",
};

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return (
    <Badge tone={TONES[status] ?? "neutral"}>
      {CONTACT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

/**
 * Nút chuyển sang một trạng thái cụ thể.
 *
 * Mỗi trạng thái một nút thay vì ô select: chỉ có bốn, và bấm một lần là xong
 * thay vì chọn rồi lại phải bấm lưu.
 */
export function ContactStatusButtons({
  id,
  current,
  action,
}: {
  id: number;
  current: ContactStatus;
  action: (formData: FormData) => Promise<void>;
}) {
  const options = (
    Object.keys(CONTACT_STATUS_LABELS) as ContactStatus[]
  ).filter((status) => status !== current);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((status) => (
        <form key={status} action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={status} />
          <button
            type="submit"
            className={`${BUTTON.secondary} ${BUTTON_SM}`}
          >
            {CONTACT_STATUS_LABELS[status]}
          </button>
        </form>
      ))}
    </div>
  );
}
