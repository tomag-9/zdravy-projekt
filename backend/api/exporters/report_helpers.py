"""Shared helpers for exporter modules."""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


class PDFFontManager:
    """Manages font registration for PDF generation."""

    _fonts_registered = False
    _font_regular = "Helvetica"
    _font_bold = "Helvetica-Bold"

    @classmethod
    def get_fonts(cls):
        """Get font names, registering DejaVuSans if available."""
        cls._register_pdf_fonts()
        return cls._font_regular, cls._font_bold

    @classmethod
    def _register_pdf_fonts(cls):
        """Register DejaVu Sans TTFont for Unicode support."""
        if cls._fonts_registered:
            return
        try:
            # Lazy-import reportlab to avoid startup overhead
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont

            regular = bold = None
            candidates = [
                (
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                ),
                (
                    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
                    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
                ),
                (
                    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
                    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
                ),
                ("/Library/Fonts/DejaVuSans.ttf", "/Library/Fonts/DejaVuSans-Bold.ttf"),
            ]
            for reg_path, bold_path in candidates:
                if os.path.isfile(reg_path) and os.path.isfile(bold_path):
                    regular, bold = reg_path, bold_path
                    break
            else:
                cls._fonts_registered = True
                return

            pdfmetrics.registerFont(TTFont("DejaVuSans", regular))
            pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", bold))
            pdfmetrics.registerFontFamily(
                "DejaVuSans",
                normal="DejaVuSans",
                bold="DejaVuSans-Bold",
            )
            cls._font_regular = "DejaVuSans"
            cls._font_bold = "DejaVuSans-Bold"
            logger.debug("Registered DejaVuSans TTFont for PDF generation.")
        except Exception:
            logger.warning(
                "Could not register DejaVuSans TTFont; falling back to Helvetica.",
                exc_info=True,
            )
        finally:
            cls._fonts_registered = True
