"use client";

import { Camera, Loader2, ScanBarcode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BarcodeScannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (value: string) => void;
};

export function BarcodeScanner({ open, onOpenChange, onScan }: BarcodeScannerProps) {
  const containerIdRef = useRef(`barcode-scanner-${Math.random().toString(36).slice(2, 10)}`);
  const scannerRef = useRef<{
    stop: () => Promise<void>;
    clear: () => void;
  } | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "ready">("idle");

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function startScanner() {
      setStatus("starting");

      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) {
          return;
        }

        const scanner = new Html5Qrcode(containerIdRef.current);
        scannerRef.current = scanner;

        const supportedFormats = [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ];

        const config = {
          fps: 10,
          formatsToSupport: supportedFormats,
          qrbox: { width: 280, height: 160 },
        };

        const onDecode = async (decodedText: string) => {
          if (cancelled) {
            return;
          }

          onScan(decodedText);
          onOpenChange(false);
        };

        const onDecodeError = () => undefined;

        try {
          await scanner.start(
            { facingMode: { exact: "environment" } },
            config,
            onDecode,
            onDecodeError,
          );
        } catch {
          await scanner.start({ facingMode: "environment" }, config, onDecode, onDecodeError);
        }

        if (!cancelled) {
          setStatus("ready");
        }
      } catch (error) {
        console.error(error);
        setStatus("idle");
        toast.error("Could not access the camera for barcode scanning");
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      setStatus("idle");
      const scanner = scannerRef.current;
      scannerRef.current = null;

      if (scanner) {
        void scanner
          .stop()
          .catch(() => undefined)
          .then(() => {
            scanner.clear();
          });
      }
    };
  }, [onOpenChange, onScan, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-5 p-0 sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="size-5 text-primary" />
            Scan barcode
          </DialogTitle>
          <DialogDescription>
            Point the camera at a UPC, EAN, ISBN, or QR code. The rear camera is preferred on
            mobile.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/20">
            <div
              id={containerIdRef.current}
              className="relative min-h-72 bg-black/90 [&_video]:min-h-72 [&_video]:w-full [&_video]:object-cover"
            />
            {status !== "ready" && (
              <div className="absolute inset-0 flex min-h-72 items-center justify-center gap-3 bg-black/90 text-sm text-white">
                {status === "starting" ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Starting camera…
                  </>
                ) : (
                  <>
                    <Camera className="size-5" />
                    Camera idle
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="px-6" showCloseButton={false}>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
