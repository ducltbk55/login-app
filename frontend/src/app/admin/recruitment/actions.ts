"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import {
  BATCH_STATUSES,
  JOB_STATUSES,
  createBatch,
  createJob,
  deleteBatch,
  deleteJob,
  updateBatch,
  updateJob,
  type BatchStatus,
  type JobStatus,
  type SaveBatchInput,
  type SaveJobInput,
} from "@/lib/recruitment";

export type FormState = { error?: string } | null;

const LIST_PATH = "/admin/recruitment";

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function oneOf<T extends string>(
  values: readonly T[],
  raw: string,
  fallback: T,
): T {
  return (values as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/** Lỗi nghiệp vụ hiện trên form thay vì làm vỡ cả trang. */
async function save(
  work: () => Promise<unknown>,
  redirectTo: string,
): Promise<FormState> {
  try {
    await work();
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  redirect(redirectTo);
}

/* ---------------- đợt tuyển dụng ---------------- */

function readBatch(formData: FormData): SaveBatchInput | { error: string } {
  const name = text(formData, "name");
  if (name === "") return { error: "Tên đợt không được để trống." };

  const startDate = text(formData, "startDate");
  const endDate = text(formData, "endDate");
  if (!startDate || !endDate) {
    return { error: "Hãy chọn ngày bắt đầu và ngày kết thúc." };
  }
  // Chuỗi YYYY-MM-DD so sánh được trực tiếp; backend kiểm tra lại.
  if (startDate > endDate) {
    return { error: "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu." };
  }

  return {
    name,
    description: text(formData, "description") || null,
    startDate,
    endDate,
    status: oneOf<BatchStatus>(BATCH_STATUSES, text(formData, "status"), "draft"),
  };
}

export async function createBatchAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("RECRUITMENT.WRITE");

  const input = readBatch(formData);
  if ("error" in input) return input;

  let id: number;
  try {
    id = (await createBatch(input)).id;
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  // Tạo xong vào thẳng trang đợt để thêm vị trí — việc tiếp theo hiển nhiên.
  refresh();
  redirect(`${LIST_PATH}/${id}`);
}

export async function updateBatchAction(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("RECRUITMENT.WRITE");

  const input = readBatch(formData);
  if ("error" in input) return input;

  return save(() => updateBatch(id, input), `${LIST_PATH}/${id}`);
}

/** Mở / đóng đợt nhanh từ danh sách. */
export async function setBatchStatusAction(formData: FormData): Promise<void> {
  await requirePermission("RECRUITMENT.WRITE");

  await updateBatch(text(formData, "id"), {
    status: oneOf<BatchStatus>(BATCH_STATUSES, text(formData, "status"), "draft"),
  });
  refresh();
}

export async function deleteBatchAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("RECRUITMENT.WRITE");

  try {
    await deleteBatch(text(formData, "id"));
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  return null;
}

export async function deleteBatchAndGoBackAction(
  prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await deleteBatchAction(prev, formData);
  if (result?.error) return result;
  redirect(LIST_PATH);
}

/* ---------------- vị trí ---------------- */

function readJob(formData: FormData): SaveJobInput | { error: string } {
  const batchId = Number(text(formData, "batchId"));
  if (!Number.isInteger(batchId) || batchId <= 0) {
    return { error: "Hãy chọn đợt tuyển dụng." };
  }

  const title = text(formData, "title");
  if (title === "") return { error: "Chức danh không được để trống." };

  const level = text(formData, "level");
  const employmentType = text(formData, "employmentType");
  const location = text(formData, "location");
  if (!level || !employmentType || !location) {
    return {
      error: "Cấp bậc, hình thức và nơi làm việc không được để trống.",
    };
  }

  const openings = Number(text(formData, "openings"));
  if (!Number.isInteger(openings) || openings < 1) {
    return { error: "Số lượng cần tuyển phải là số nguyên từ 1 trở lên." };
  }

  const description = text(formData, "description");
  if (description === "") {
    return { error: "Mô tả công việc không được để trống." };
  }

  return {
    batchId,
    slug: text(formData, "slug") || undefined,
    title,
    department: text(formData, "department") || null,
    level,
    employmentType,
    location,
    salary: text(formData, "salary") || null,
    openings,
    summary: text(formData, "summary") || null,
    requirements: text(formData, "requirements") || null,
    description,
    status: oneOf<JobStatus>(JOB_STATUSES, text(formData, "status"), "open"),
  };
}

export async function createJobAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("RECRUITMENT.WRITE");

  const input = readJob(formData);
  if ("error" in input) return input;

  return save(() => createJob(input), `${LIST_PATH}/${input.batchId}`);
}

export async function updateJobAction(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("RECRUITMENT.WRITE");

  const input = readJob(formData);
  if ("error" in input) return input;

  return save(() => updateJob(id, input), `${LIST_PATH}/${input.batchId}`);
}

/** Tạm dừng / mở lại vị trí ngay trên bảng. */
export async function setJobStatusAction(formData: FormData): Promise<void> {
  await requirePermission("RECRUITMENT.WRITE");

  await updateJob(text(formData, "id"), {
    status: oneOf<JobStatus>(JOB_STATUSES, text(formData, "status"), "open"),
  });
  refresh();
}

export async function deleteJobAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("RECRUITMENT.WRITE");

  try {
    await deleteJob(text(formData, "id"));
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  return null;
}
