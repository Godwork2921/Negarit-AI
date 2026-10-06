"""Image analysis status reporting.

Image forensics is not implemented yet. Rather than let the health endpoint
imply a capability that does not exist, this reports ``pending`` with the reason
and the modules still to be built. The analysis engine is explicit about what it
cannot do, and the API is held to the same standard.
"""

from __future__ import annotations

from typing import Any

__all__ = ["image_analysis_status"]

_PENDING_MODULES = ("ocr", "deepfake_detection")


def image_analysis_status() -> dict[str, Any]:
    """Report the current state of screenshot and image analysis."""
    return {
        "status": "pending",
        "available": False,
        "pending_modules": list(_PENDING_MODULES),
        "detail": (
            "Text, URL and risk analysis are operational. Screenshot OCR and "
            "deepfake detection are not implemented; an uploaded image is "
            "rejected rather than analysed by placeholder logic."
        ),
    }