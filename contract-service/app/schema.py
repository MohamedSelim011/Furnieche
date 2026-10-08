"""The structured shape Claude must return for every contract.

Every field is required (nullable where the contract may not say), so the
JSON schema sent to the API is strict and the Next.js app can rely on it.
"""

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Party(_Strict):
    name: str
    role: Literal["client", "contractor", "subcontractor", "supplier", "consultant", "other"]
    details: Optional[str] = Field(description="Address, ID / commercial register, phone or representative, if stated")


class KeyDates(_Strict):
    signing_date: Optional[str] = Field(description="YYYY-MM-DD")
    start_date: Optional[str] = Field(description="YYYY-MM-DD")
    end_date: Optional[str] = Field(description="YYYY-MM-DD. If only a duration is given, compute it from start_date when possible")
    duration: Optional[str] = Field(description="Duration as written, e.g. '120 calendar days'")


class Financials(_Strict):
    total_value: Optional[float] = Field(description="Total contract value as a plain number")
    currency: Optional[str] = Field(description="ISO 4217 code, e.g. EGP, USD, SAR, AED")
    includes_vat: Optional[bool]
    advance_payment: Optional[str] = Field(description="Down payment terms as written")
    retention: Optional[str] = Field(description="Retention / guarantee withheld, as written")
    notes: Optional[str]


class PaymentMilestone(_Strict):
    label: str = Field(description="Short name, e.g. 'Down payment', 'After carpentry delivery'")
    amount: Optional[float] = Field(description="Amount as a plain number; compute from percent x total_value if only a percent is given")
    percent: Optional[float] = Field(description="Percent of total value, e.g. 30 for 30%")
    due_date: Optional[str] = Field(description="YYYY-MM-DD if a calendar date is stated")
    trigger: Optional[str] = Field(description="The event that makes it due, if not a fixed date")


class Penalty(_Strict):
    description: str
    amount: Optional[str] = Field(description="Amount or rate as written, e.g. '0.5% per day, max 10%'")


class Clause(_Strict):
    title: str
    summary: str
    reference: Optional[str] = Field(description="Clause number as written in the document, e.g. 'Clause 7.2' or 'البند السابع'")


class Risk(_Strict):
    severity: Literal["high", "medium", "low"]
    title: str
    detail: str = Field(description="Why this matters for the engineer/contractor and what to do about it")
    reference: Optional[str]


class ContractAnalysis(_Strict):
    is_contract: bool = Field(description="False if the document is not a contract or agreement")
    document_language: Literal["ar", "en", "mixed"]
    output_language: Literal["ar", "en"] = Field(description="Language used for all free-text fields below")
    title: str
    contract_type: str = Field(description="e.g. 'Interior fit-out', 'Furniture supply & installation'")
    summary: str = Field(description="3-5 sentence plain-language summary")
    parties: list[Party]
    project_name: Optional[str]
    project_location: Optional[str]
    key_dates: KeyDates
    financials: Financials
    payment_schedule: list[PaymentMilestone]
    scope_of_work: list[str]
    exclusions: list[str]
    client_obligations: list[str]
    contractor_obligations: list[str]
    penalties: list[Penalty]
    warranty: Optional[str]
    termination: Optional[str]
    dispute_resolution: Optional[str]
    key_clauses: list[Clause]
    risks: list[Risk]
    missing_or_unclear: list[str] = Field(description="Important terms that are missing, vague, or contradictory")


def _clean(node: Any, is_property_map: bool = False) -> Any:
    """Drop pydantic-only keywords ("title", "default") from the schema.

    Keys inside a "properties" map are field names, not keywords, so a field
    that is itself called "title" is kept.
    """
    if isinstance(node, dict):
        if is_property_map:
            return {k: _clean(v) for k, v in node.items()}
        return {
            k: _clean(v, is_property_map=(k == "properties"))
            for k, v in node.items()
            if k not in ("title", "default")
        }
    if isinstance(node, list):
        return [_clean(v) for v in node]
    return node


def output_schema() -> dict[str, Any]:
    return _clean(ContractAnalysis.model_json_schema())
