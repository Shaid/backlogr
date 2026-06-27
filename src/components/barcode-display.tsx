"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function BarcodeDisplay({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "auto",
          width: 1.5,
          height: 50,
          displayValue: true,
          fontSize: 12,
          margin: 8,
          background: "transparent",
          lineColor: "currentColor",
        });
      } catch {
        // If the barcode format can't be auto-detected, try CODE128
        try {
          JsBarcode(svgRef.current, value, {
            format: "CODE128",
            width: 1.5,
            height: 50,
            displayValue: true,
            fontSize: 12,
            margin: 8,
            background: "transparent",
            lineColor: "currentColor",
          });
        } catch {
          // Barcode rendering failed — hide the SVG
          if (svgRef.current) svgRef.current.style.display = "none";
        }
      }
    }
  }, [value]);

  return <svg ref={svgRef} className="text-foreground" />;
}
