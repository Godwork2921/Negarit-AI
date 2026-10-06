"""Shared response types and paging."""

from __future__ import annotations

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")

__all__ = [
    "ApiModel",
    "MessageResponse",
    "PageMeta",
    "Page",
    "ErrorDetail",
    "ErrorBody",
    "ErrorResponse",
]


class ApiModel(BaseModel):
    """Base for every response model.

    ``extra="forbid"`` on responses would break forward compatibility, so it is
    deliberately not set. ``from_attributes`` lets a response be built straight
    from an ORM object without an intermediate DTO.
    """

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(ApiModel):
    """A simple acknowledgement."""

    message: str
    detail: str | None = None


class PageMeta(ApiModel):
    """Pagination envelope metadata."""

    total: int = Field(description="Total matching records.")
    limit: int
    offset: int
    has_more: bool


class Page(ApiModel, Generic[T]):
    """A paginated collection."""

    items: list[T]
    meta: PageMeta

    @classmethod
    def of(
        cls, items: list[T], *, total: int, limit: int, offset: int
    ) -> "Page[T]":
        return cls(
            items=items,
            meta=PageMeta(
                total=total,
                limit=limit,
                offset=offset,
                has_more=offset + len(items) < total,
            ),
        )


class ErrorDetail(ApiModel):
    """One field-level validation problem."""

    field: str
    issue: str
    message: str


class ErrorBody(ApiModel):
    """The body of every error response."""

    code: str = Field(description="Stable machine-readable error identifier.")
    message: str = Field(description="Human-readable, safe to display.")
    request_id: str | None = None
    details: dict[str, Any] | None = None


class ErrorResponse(ApiModel):
    """Envelope used by every failing endpoint."""

    error: ErrorBody