import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref
} from "react";

interface ThumbnailHoverPreviewProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  expandedImageUrl: string;
  previewSize?: number;
}

type ThumbnailHoverPreviewBounds = {
  left: number;
  top: number;
  size: number;
};

const DEFAULT_THUMBNAIL_HOVER_PREVIEW_SIZE = 144;
const THUMBNAIL_HOVER_PREVIEW_MARGIN = 10;

function assignForwardedRef<TElement>(ref: Ref<TElement> | undefined, value: TElement | null): void {
  if (!ref) {
    return;
  }
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  ref.current = value;
}

export const ThumbnailHoverPreview = forwardRef<HTMLSpanElement, ThumbnailHoverPreviewProps>(
  function ThumbnailHoverPreview(
    {
      children,
      className,
      expandedImageUrl,
      previewSize = DEFAULT_THUMBNAIL_HOVER_PREVIEW_SIZE,
      ...rootProps
    },
    forwardedRef
  ) {
    const rootRef = useRef<HTMLSpanElement | null>(null);
    const [previewBounds, setPreviewBounds] = useState<ThumbnailHoverPreviewBounds | null>(null);

    const setRootRef = useCallback(
      (element: HTMLSpanElement | null) => {
        rootRef.current = element;
        assignForwardedRef(forwardedRef, element);
      },
      [forwardedRef]
    );

    const closePreview = useCallback(() => {
      setPreviewBounds(null);
    }, []);

    const openPreview = useCallback(() => {
      const element = rootRef.current;
      if (!element || typeof window === "undefined" || expandedImageUrl.trim().length < 1) {
        return;
      }

      const bounds = element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const fitsRight =
        bounds.right + THUMBNAIL_HOVER_PREVIEW_MARGIN + previewSize <= viewportWidth;
      const preferredLeft = fitsRight
        ? bounds.right + THUMBNAIL_HOVER_PREVIEW_MARGIN
        : bounds.left - THUMBNAIL_HOVER_PREVIEW_MARGIN - previewSize;
      const left = Math.max(
        THUMBNAIL_HOVER_PREVIEW_MARGIN,
        Math.min(preferredLeft, viewportWidth - previewSize - THUMBNAIL_HOVER_PREVIEW_MARGIN)
      );
      const centeredTop = bounds.top + bounds.height / 2 - previewSize / 2;
      const top = Math.max(
        THUMBNAIL_HOVER_PREVIEW_MARGIN,
        Math.min(centeredTop, viewportHeight - previewSize - THUMBNAIL_HOVER_PREVIEW_MARGIN)
      );

      setPreviewBounds({ left, top, size: previewSize });
    }, [expandedImageUrl, previewSize]);

    useEffect(() => {
      if (!previewBounds || typeof window === "undefined") {
        return;
      }

      window.addEventListener("resize", closePreview);
      window.addEventListener("scroll", closePreview, true);
      return () => {
        window.removeEventListener("resize", closePreview);
        window.removeEventListener("scroll", closePreview, true);
      };
    }, [closePreview, previewBounds]);

    return (
      <span
        {...rootProps}
        ref={setRootRef}
        className={className}
        onMouseEnter={openPreview}
        onMouseLeave={closePreview}
      >
        {children}
        {previewBounds ? (
          <span
            aria-hidden="true"
            className="thumbnail-hover-preview"
            style={{
              height: `${previewBounds.size}px`,
              left: `${previewBounds.left}px`,
              top: `${previewBounds.top}px`,
              width: `${previewBounds.size}px`
            }}
          >
            <img src={expandedImageUrl} width={previewBounds.size} height={previewBounds.size} alt="" />
          </span>
        ) : null}
      </span>
    );
  }
);
