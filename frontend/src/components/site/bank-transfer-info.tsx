"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { COMPANY_BANK, COMPANY_BANK_QR } from "@/lib/company";
import { formatVnd } from "@/lib/format";

/** Nút chép vào clipboard, báo "Đã chép" một lúc. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => setCopied(true));
      }}
      aria-label={`Chép ${label}`}
      className={`shrink-0 cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium ring-1 transition ring-inset ${
        copied
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "text-gold-800 ring-gold-300 hover:bg-gold-50"
      }`}
    >
      {copied ? "Đã chép" : "Chép"}
    </button>
  );
}

function Row({
  label,
  value,
  copy,
  mono,
}: {
  label: string;
  value: string;
  /** Giá trị đưa vào clipboard (vd. số tiền không định dạng). */
  copy?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-black/55">{label}</dt>
      <dd className="flex items-center gap-2 text-right">
        <span
          className={`font-semibold ${mono ? "font-mono tracking-wide" : ""}`}
        >
          {value}
        </span>
        {copy !== undefined && (
          <CopyButton value={copy} label={label.toLowerCase()} />
        )}
      </dd>
    </div>
  );
}

/**
 * Thông tin chuyển khoản. Có mã đơn thì kèm số tiền và nội dung chuyển khoản
 * (= mã đơn) để kế toán đối chiếu; chưa có (lúc đang chọn hình thức thanh
 * toán) thì chỉ hiện tài khoản.
 */
export function BankTransferInfo({
  orderCode,
  amount,
  className = "",
}: {
  orderCode?: string;
  amount?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-black/10 bg-white px-4 py-3 text-left text-sm ${className}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Mã VietQR tĩnh (chỉ chứa tài khoản): app ngân hàng điền sẵn người
          nhận, khách tự nhập số tiền và nội dung ở bảng bên cạnh. */}
        <figure className="mx-auto shrink-0 text-center sm:mx-0">
          <Image
            src={COMPANY_BANK_QR}
            alt={`Mã QR chuyển khoản ${COMPANY_BANK.bankName} ${COMPANY_BANK.accountNumber}`}
            width={553}
            height={553}
            className="size-40 rounded-lg border border-black/10"
          />
          <figcaption className="mt-1.5 text-xs text-black/50">
            Quét bằng app ngân hàng
          </figcaption>
        </figure>
        <dl className="min-w-0 flex-1 divide-y divide-black/5">
          <Row label="Ngân hàng" value={COMPANY_BANK.bankName} />
          <Row
            label="Số tài khoản"
            value={COMPANY_BANK.accountNumber}
            copy={COMPANY_BANK.accountNumber}
            mono
          />
          <Row label="Chủ tài khoản" value={COMPANY_BANK.accountName} />
          {amount !== undefined && (
            <Row
              label="Số tiền"
              value={formatVnd(amount)}
              copy={String(amount)}
            />
          )}
          {orderCode && (
            <Row label="Nội dung" value={orderCode} copy={orderCode} mono />
          )}
        </dl>
      </div>
      <p className="mt-2 text-xs text-black/50">
        {orderCode
          ? "Sau khi quét mã, nhập đúng số tiền và ghi nội dung là mã đơn để chúng tôi xác nhận thanh toán nhanh."
          : "Nội dung chuyển khoản là mã đơn — bạn nhận được ngay sau khi đặt hàng."}
      </p>
    </div>
  );
}
