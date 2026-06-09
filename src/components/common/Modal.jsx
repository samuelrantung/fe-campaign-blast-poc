// Centered modal dialog. Renders nothing when closed.
// `wide` widens it for two-column content (e.g. preview + details).
export default function Modal({ open, onClose, title, sub, children, footer, wide }) {
  if (!open) return null;
  return (
    <div
      className="modal-scrim"
      onClick={(e) => {
        if (e.target.classList.contains('modal-scrim')) onClose && onClose();
      }}
    >
      <div className="modal" style={wide ? { maxWidth: 760 } : undefined}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          {sub && <div className="modal-sub">{sub}</div>}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
