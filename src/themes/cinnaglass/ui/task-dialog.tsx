// Shared task shell: the browser manages the top layer and background inertness.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IClose } from '@/themes/cinnaglass/icons';
import '@/themes/cinnaglass/ui/ui-system.css';

type TaskDialogProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    description?: string;
    footer?: ReactNode;
    className?: string;
    wide?: boolean;
    /** Return true when an attached picker consumed Escape. */
    onEscape?: () => boolean;
};

// Only the reading liner scrolls; callers keep their own data and draft lifetimes.
export function TaskDialog({
    open,
    onClose,
    title,
    children,
    description,
    footer,
    className = '',
    wide,
    onEscape
}: TaskDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const titleId = useId();
    const backdropPress = useRef(false);
    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            const opener = document.activeElement;
            dialog.showModal();
            titleRef.current?.focus();
            return () => {
                if (dialog.open) dialog.close();
                if (
                    opener instanceof HTMLElement &&
                    opener.isConnected &&
                    (document.activeElement === document.body || dialog.contains(document.activeElement))
                )
                    opener.focus();
            };
        } else if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={dialogRef}
            className={`ui-dialog ui-surface ${wide ? 'ui-dialog-wide' : ''} ${className}`}
            aria-labelledby={titleId}
            onKeyDown={(event) => {
                // Consume nested menus before the browser's dialog close request, including repeated Esc.
                if (event.key === 'Escape' && !event.defaultPrevented && onEscape?.()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }}
            onCancel={(event) => {
                event.stopPropagation();
                event.preventDefault();
                if (!onEscape?.()) onClose();
            }}
            onClose={(event) => {
                event.stopPropagation();
                if (open && !dialogRef.current?.open) onClose();
            }}
            onPointerDown={(event) => {
                const r = event.currentTarget.getBoundingClientRect();
                backdropPress.current =
                    event.target === event.currentTarget &&
                    (event.clientX < r.left ||
                        event.clientX > r.right ||
                        event.clientY < r.top ||
                        event.clientY > r.bottom);
            }}
            onClick={(event) => {
                const r = event.currentTarget.getBoundingClientRect();
                if (
                    backdropPress.current &&
                    event.target === event.currentTarget &&
                    (event.clientX < r.left ||
                        event.clientX > r.right ||
                        event.clientY < r.top ||
                        event.clientY > r.bottom)
                )
                    onClose();
                backdropPress.current = false;
            }}
        >
            <header className="ui-dialog-header">
                <div>
                    {description && <p>{description}</p>}
                    <h2 id={titleId} ref={titleRef} tabIndex={-1}>
                        {title}
                    </h2>
                </div>
                <button type="button" className="ui-icon-button" aria-label={`关闭${title}`} onClick={onClose}>
                    <IClose size={20} />
                </button>
            </header>
            <div className="ui-dialog-content ui-liner">{children}</div>
            {footer && <footer className="ui-dialog-footer">{footer}</footer>}
        </dialog>
    );
}
