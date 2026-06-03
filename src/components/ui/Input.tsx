/* ─────────────────────────────────────────────
   GORILA MOTOS — Input component
   Dark-compatible (funciona en fondos oscuros)
   ───────────────────────────────────────────── */

import { InputHTMLAttributes, forwardRef, useState, ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:   string;
  error?:   string;
  hint?:    string;
  prefix?:  ReactNode;
  suffix?:  ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className, type, id, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const isPass = type === 'password';
    const inputType = isPass ? (show ? 'text' : 'password') : type;
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '_');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-white/70">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 text-white/35 pointer-events-none">{prefix}</span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              'gm-input-d w-full h-11',
              prefix  && 'pl-10',
              (suffix || isPass) && 'pr-10',
              error   && '!border-gm-red/60 !bg-gm-red/[0.04]',
              className,
            )}
            {...props}
          />

          {isPass && (
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 text-white/30 hover:text-white/60 transition-colors"
              tabIndex={-1}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {!isPass && suffix && (
            <span className="absolute right-3 text-white/35">{suffix}</span>
          )}
        </div>

        {error && <p className="text-xs text-gm-red/80 flex items-center gap-1">{error}</p>}
        {!error && hint && <p className="text-xs text-white/30">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
