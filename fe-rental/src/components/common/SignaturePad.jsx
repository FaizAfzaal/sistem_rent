import { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, Edit3 } from 'lucide-react';

export default function SignaturePad({ label, value, onChange }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e1b4b'; // Deep navy signature color

    // If initial value exists as base64 image
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setIsEmpty(false);
      };
      img.src = value;
    }
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (onChange) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    if (onChange) {
      onChange('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
          {label || 'Tanda Tangan Digital'}
        </label>
        {!isEmpty && (
          <button
            type="button"
            onClick={clearCanvas}
            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold transition"
          >
            <RotateCcw className="h-3 w-3" /> Hapus / Ulangi
          </button>
        )}
      </div>

      <div className="relative bg-slate-50 border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden hover:border-indigo-400 transition">
        <canvas
          ref={canvasRef}
          width={400}
          height={160}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-40 cursor-crosshair touch-none"
        />

        {isEmpty && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400">
            <Edit3 className="h-6 w-6 mb-1 opacity-40" />
            <p className="text-xs font-medium">Tanda tangan di sini menggunakan mouse / sentuhan</p>
          </div>
        )}
      </div>
    </div>
  );
}
