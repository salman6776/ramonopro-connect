import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, PenLine } from "lucide-react";

interface SignaturePadProps {
  onSigned: (base64: string) => void;
  onClear?: () => void;
  className?: string;
}

export function SignaturePad({ onSigned, onClear, className = "" }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: MouseEvent | Touch, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "clientX" in e ? e.clientX : e.clientX;
    const clientY = "clientY" in e ? e.clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((pos: { x: number; y: number }) => {
    drawing.current = true;
    lastPos.current = pos;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
  }, []);

  const draw = useCallback((pos: { x: number; y: number }) => {
    if (!drawing.current || !lastPos.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHasSignature(true);
  }, []);

  const endDraw = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPos.current = null;
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    onSigned(canvas.toDataURL("image/png"));
  }, [hasSignature, onSigned]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e: MouseEvent) => startDraw(getPos(e, canvas));
    const onMouseMove = (e: MouseEvent) => { if (drawing.current) draw(getPos(e, canvas)); };
    const onMouseUp = () => endDraw();

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      startDraw(getPos(e.touches[0], canvas));
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (drawing.current) draw(getPos(e.touches[0], canvas));
    };
    const onTouchEnd = (e: TouchEvent) => { e.preventDefault(); endDraw(); };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [startDraw, draw, endDraw]);

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onClear?.();
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg bg-white overflow-hidden" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={200}
          className="w-full"
          style={{ touchAction: "none", cursor: "crosshair", display: "block" }}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-sm text-muted-foreground/50 flex items-center gap-2">
              <PenLine className="h-4 w-4" />
              Signez ici
            </span>
          </div>
        )}
        <div className="absolute bottom-0 left-4 right-4 border-t border-muted-foreground/20 pointer-events-none" />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{hasSignature ? "✓ Signature enregistrée" : "Tracez votre signature avec le doigt ou la souris"}</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-7 text-xs">
          <Eraser className="h-3 w-3 mr-1" />Effacer
        </Button>
      </div>
    </div>
  );
}
