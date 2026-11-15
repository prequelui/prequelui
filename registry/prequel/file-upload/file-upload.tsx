"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { Check, FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const MAX_SIZE = 25 * 1024 * 1024;

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type UploadFile = {
  id: string;
  name: string;
  /** Size in bytes. */
  size: number;
  /** Upload progress from 0 to 100. */
  progress: number;
};

export type FileUploadProps = {
  className?: string;
  title?: string;
  description?: string;
  /** Comma-separated extensions or MIME types. */
  accept?: string;
  multiple?: boolean;
  /** Maximum size per file, in bytes. */
  maxSize?: number;
  initialFiles?: UploadFile[];
  /** Called when files are added or removed. */
  onFilesChange?: (files: UploadFile[]) => void;
};

/* ------------------------------------------------------------------ */
/* demo data                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_FILES: UploadFile[] = [
  {
    id: "northwind-q4-revenue",
    name: "northwind-q4-revenue.csv",
    size: 248_320,
    progress: 100,
  },
  {
    id: "brand-assets",
    name: "brand-assets.zip",
    size: 8_412_160,
    progress: 64,
  },
];

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function formatBytes(bytes: number) {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

function matchesAccept(file: File, accept: string) {
  const tokens = accept
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;

  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return tokens.some((token) => {
    if (token.startsWith(".")) return name.endsWith(token);
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

/* ------------------------------------------------------------------ */
/* block                                                               */
/* ------------------------------------------------------------------ */

export function FileUpload({
  className,
  title = "Upload documents",
  description = "Contracts, invoices and exports, all in one place.",
  accept = ".csv,.pdf,.zip",
  multiple = true,
  maxSize = MAX_SIZE,
  initialFiles = DEFAULT_FILES,
  onFilesChange,
}: FileUploadProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = Boolean(useReducedMotion());

  const [files, setFiles] = useState<UploadFile[]>(initialFiles);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasPending = files.some((file) => file.progress < 100);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => {
      setFiles((current) =>
        current.map((file) =>
          file.progress >= 100 ? file : { ...file, progress: Math.min(100, file.progress + 9) }
        )
      );
    }, 450);
    return () => clearInterval(timer);
  }, [hasPending]);

  const addFiles = (list: FileList | File[]) => {
    const incoming = Array.from(list);
    const accepted: UploadFile[] = [];
    let rejection: string | null = null;

    for (const file of incoming) {
      if (file.size > maxSize) {
        rejection = `${file.name} is ${formatBytes(file.size)} — the limit is ${formatBytes(maxSize)}.`;
        continue;
      }
      if (!matchesAccept(file, accept)) {
        rejection = `${file.name} is not an accepted file type.`;
        continue;
      }
      nextId.current += 1;
      accepted.push({
        id: `${file.name}-${nextId.current}`,
        name: file.name,
        size: file.size,
        progress: 0,
      });
    }

    if (accepted.length === 0) {
      setError(rejection);
      return;
    }

    const next = multiple ? [...accepted, ...files] : accepted.slice(0, 1);
    setFiles(next);
    setError(rejection);
    onFilesChange?.(next);
  };

  const removeFile = (id: string) => {
    const next = files.filter((file) => file.id !== id);
    setFiles(next);
    setError(null);
    onFilesChange?.(next);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div ref={ref} className={cn("w-full", className)}>
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={{ opacity: inView ? 1 : 0, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.55, ease: EASE }}
          className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
              <p className="mt-0.5 text-[12.5px] leading-5 text-muted-foreground">{description}</p>
            </div>
            <p className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
              {files.length} {files.length === 1 ? "file" : "files"} · {formatBytes(totalSize)}
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleInput}
            className="hidden"
          />

          <motion.button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            initial={{ opacity: 0, y: reduce ? 0 : 8 }}
            animate={{ opacity: inView ? 1 : 0, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.5, ease: EASE, delay: reduce ? 0 : 0.08 }}
            className={cn(
              "mt-4 flex w-full flex-col items-center justify-center rounded-lg border border-dashed px-4 py-7 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              dragging
                ? "border-foreground/40 bg-muted/60"
                : "border-border bg-muted/20 hover:border-foreground/25 hover:bg-muted/40"
            )}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground">
              <Upload className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="mt-2.5 text-[13px] font-medium text-foreground">
              Drop files here, or browse
            </span>
            <span className="mt-0.5 text-[11.5px] text-muted-foreground">
              {accept.replace(/\./g, "").replace(/,/g, ", ").toUpperCase()} · up to{" "}
              {formatBytes(maxSize)} each
            </span>
          </motion.button>

          <div className="min-h-[18px]" aria-live="polite">
            {error ? (
              <p role="alert" className="mt-2 text-[11.5px] leading-5 text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          {files.length > 0 ? (
            <ul className="mt-1 flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {files.map((file) => {
                  const complete = file.progress >= 100;
                  return (
                    <motion.li
                      key={file.id}
                      layout
                      initial={reduce ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                      className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                          complete
                            ? "border-success/25 bg-success/10 text-success"
                            : "border-border bg-muted/40 text-muted-foreground"
                        )}
                      >
                        {complete ? (
                          <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
                        ) : (
                          <FileText className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="truncate text-[12.5px] font-medium text-foreground">
                            {file.name}
                          </p>
                          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            {formatBytes(file.size)}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                            <motion.div
                              aria-hidden="true"
                              initial={false}
                              animate={{ scaleX: file.progress / 100 }}
                              transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                              style={{ transformOrigin: "left center" }}
                              className={cn(
                                "h-full rounded-full",
                                complete ? "bg-success" : "bg-foreground"
                              )}
                            />
                          </div>
                          <span
                            className={cn(
                              "w-10 shrink-0 text-right text-[10.5px] tabular-nums",
                              complete ? "text-success" : "text-muted-foreground"
                            )}
                          >
                            {complete ? "Done" : `${file.progress}%`}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        aria-label={`Remove ${file.name}`}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="mt-2 text-center text-[11.5px] text-muted-foreground">
              Nothing uploaded yet.
            </p>
          )}

          <p className="mt-4 border-t border-border pt-3 text-[11px] text-muted-foreground">
            Files are private to this workspace and expire after 30 days.
          </p>
        </motion.div>
      </div>
    </MotionConfig>
  );
}

export default FileUpload;
