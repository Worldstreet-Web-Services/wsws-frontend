"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Eyebrow } from "@/components/ui/eyebrow";
import { usePredictionActions } from "@/hooks/use-prediction-actions";
import { useCategories } from "@/hooks/use-prediction-markets";
import { attachMetadata, newIdempotencyKey, uploadImage } from "@/lib/prediction/api";
import { toBaseUnits } from "@/lib/trade/math";
import { USDC_DECIMALS } from "@/lib/prediction/types";
import { toast } from "@/lib/toast";

interface CreateMarketFlowProps {
  onDone: () => void;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Minimum seed liquidity to create a market: $1 (6-dec USDC base units).
const MIN_SEED_USDC = 1_000_000n;

// How long the market stays open, chosen from timer presets. Seconds each.
const DURATIONS: { key: string; label: string; seconds: number }[] = [
  { key: "1d", label: "1d", seconds: 86_400 },
  { key: "3d", label: "3d", seconds: 259_200 },
  { key: "1w", label: "1w", seconds: 604_800 },
  { key: "2w", label: "2w", seconds: 1_209_600 },
  { key: "1M", label: "1M", seconds: 2_592_000 },
];

// Fallback categories (from the platform's category taxonomy) so users can
// always pick one even before the live category list is populated.
const DEFAULT_CATEGORIES = ["Crypto", "Forex", "Commodities", "Equities", "Sports", "Politics", "Other"];

// Generates an unused market id off-chain: a random uint256 (the contract lets
// the creator pick the id; a wide random space avoids collisions).
function randomMarketId(): bigint {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let id = 0n;
  for (const b of bytes) id = (id << 8n) | BigInt(b);
  return id;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the image."));
    reader.readAsDataURL(file);
  });
}

// True when the image is landscape (at least as wide as it is tall).
function isLandscape(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.naturalWidth >= img.naturalHeight);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
}

// Creation flow: pick an image (uploaded to Cloudinary immediately for a secure
// URL), then sign createMarket on-chain (seed + $1 fee, gasless) and attach the
// question/category/image URL. The image must finish uploading before the market
// can be created, so its URL is ready to attach the moment the market exists.
export function CreateMarketFlow({ onDone }: CreateMarketFlowProps) {
  const t = useTranslations("prediction");
  const actions = usePredictionActions();
  const { data: liveCategories } = useCategories();

  // The market id is chosen once and reused for both the image upload and the
  // on-chain createMarket, so the uploaded art belongs to the market we create.
  const marketIdRef = useRef<bigint | null>(null);
  const marketId = () => {
    if (marketIdRef.current == null) marketIdRef.current = randomMarketId();
    return marketIdRef.current;
  };

  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState("");
  const [durationKey, setDurationKey] = useState("1w");
  const [useCustom, setUseCustom] = useState(false);
  const [customClose, setCustomClose] = useState("");
  const [seed, setSeed] = useState("");

  // Image upload state: the secure Cloudinary URL once uploaded.
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);
  // Bumping this remounts the file input to clear its value on removal.
  const [fileInputKey, setFileInputKey] = useState(0);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of [...(liveCategories ?? []), ...DEFAULT_CATEGORIES]) {
      const key = c.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(c);
      }
    }
    return out;
  }, [liveCategories]);

  const seedUnits = toBaseUnits(seed, USDC_DECIMALS);
  const seedTooLow = seed !== "" && seedUnits < MIN_SEED_USDC;
  const hasCloseChoice = useCustom ? customClose !== "" : durationKey !== "";
  // A chosen image must finish uploading (or be removed) before creation.
  const imageBlocking = uploading || imageError;
  const valid =
    question.trim().length > 0 &&
    seedUnits >= MIN_SEED_USDC &&
    hasCloseChoice &&
    !imageBlocking &&
    !actions.busy;

  const removeImage = () => {
    setImageUrl(null);
    setImageError(false);
    setUploading(false);
    setFileInputKey((k) => k + 1);
  };

  // Uploads on selection so the secure URL is ready before creation. Validates
  // size and landscape orientation client-side first.
  const onPickFile = async (picked: File | null) => {
    if (!picked) return;
    if (picked.size > MAX_IMAGE_BYTES) {
      toast.error(t("imageTooLarge"));
      return;
    }
    if (!(await isLandscape(picked))) {
      toast.error(t("imageNotLandscape"));
      return;
    }
    setImageUrl(null);
    setImageError(false);
    setUploading(true);
    try {
      const dataUrl = await readAsDataUrl(picked);
      const { imageUrl: url } = await uploadImage(
        marketId().toString(),
        dataUrl,
        newIdempotencyKey()
      );
      setImageUrl(url);
    } catch {
      setImageError(true);
      toast.error(t("imageUploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  // Resolves the chosen close time to unix seconds, reading the clock here (in
  // the handler, not during render) so presets stay relative to submit time.
  const resolveCloseTime = (): number => {
    if (useCustom) return Math.floor(new Date(customClose).getTime() / 1000);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const duration = DURATIONS.find((d) => d.key === durationKey)?.seconds ?? 0;
    return nowSeconds + duration;
  };

  const submit = async () => {
    if (!valid) return;
    const closeTime = resolveCloseTime();
    if (closeTime <= Math.floor(Date.now() / 1000)) {
      toast.error(t("closeTimeInPast"));
      return;
    }
    const created = await actions.createMarket({
      marketId: marketId(),
      closeTime,
      seedUsdc: seedUnits,
    });
    if (!created) return;

    // The market is on-chain now. Attach the question/category and the secure
    // image URL we already have. A failure here is non-fatal.
    try {
      await attachMetadata(
        marketId().toString(),
        {
          question: question.trim(),
          category: category.trim() || undefined,
          imageUrl: imageUrl ?? undefined,
        },
        newIdempotencyKey()
      );
    } catch {
      toast.info(t("metadataDeferred"));
    }

    toast.success(t("marketCreated"));
    onDone();
  };

  const inputClass =
    "ws-inset w-full bg-transparent p-3 font-sans text-sm outline-none placeholder:text-white/35";
  const labelClass = "text-[12.5px] font-normal text-white/55";

  return (
    <div className="p-1 sm:p-2">
      <Eyebrow>{t("createMarket")}</Eyebrow>
      <p className="mt-1 text-[12.5px] font-normal text-white/45">{t("createMarketSubtitle")}</p>

      <div className="mt-4 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>{t("questionLabel")}</span>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("questionPlaceholder")}
            className={inputClass}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("categoryLabel")}</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="" className="bg-sheet">
                {t("categoryPlaceholder")}
              </option>
              {categories.map((c) => (
                <option key={c} value={c} className="bg-sheet">
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>{t("seedLabel")}</span>
            <input
              inputMode="decimal"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="1"
              className={inputClass}
            />
            {seedTooLow ? <span className="text-down text-[11.5px]">{t("seedMin")}</span> : null}
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className={labelClass}>{t("closesIn")}</span>
            <button
              type="button"
              onClick={() => setUseCustom((v) => !v)}
              className="text-accent cursor-pointer text-[12px] font-medium"
            >
              {useCustom ? t("usePresets") : t("useCustomDate")}
            </button>
          </div>
          {useCustom ? (
            <input
              type="datetime-local"
              value={customClose}
              onChange={(e) => setCustomClose(e.target.value)}
              className={inputClass}
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDurationKey(d.key)}
                  className={`cursor-pointer rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                    durationKey === d.key
                      ? "border-accent/45 bg-accent/12 text-white"
                      : "border-white/10 bg-white/4 text-white/60 hover:bg-white/8"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Image: uploaded to Cloudinary on selection; a preview and status show
            the secure URL is attached before creation is allowed. */}
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>{t("imageLabel")}</span>
          {imageUrl ? (
            <div className="ws-inset relative overflow-hidden rounded-[14px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="aspect-[16/7] w-full object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 cursor-pointer rounded-lg border border-white/15 bg-black/55 px-2.5 py-1 text-[12px] font-medium text-white/85 backdrop-blur-sm hover:text-white"
              >
                {t("removeImage")}
              </button>
            </div>
          ) : (
            <>
              <input
                key={fileInputKey}
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                className="font-sans text-[12.5px] text-white/60 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white disabled:opacity-50"
              />
              <span className={uploading ? "text-accent text-[11.5px]" : "text-[11.5px] text-white/40"}>
                {uploading ? t("uploadingImage") : t("imageHint")}
              </span>
              {imageError ? (
                <span className="text-down text-[11.5px]">{t("imageUploadFailed")}</span>
              ) : null}
            </>
          )}
        </div>

        <p className="text-[12px] font-normal text-white/45">{t("createFeeNote")}</p>

        <button
          onClick={submit}
          disabled={!valid}
          className="text-ink mt-1 w-full cursor-pointer rounded-[14px] bg-white p-3.5 font-sans text-[15px] font-semibold hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {actions.busy
            ? t("creatingMarket")
            : uploading
              ? t("uploadingImage")
              : t("createMarketCta")}
        </button>
      </div>
    </div>
  );
}
