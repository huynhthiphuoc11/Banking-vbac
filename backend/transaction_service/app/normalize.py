from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any, Literal


Category = Literal[
  "Travel",
  "Shopping",
  "Groceries",
  "Utilities",
  "Rent",
  "Insurance",
  "Credit",
  "Transfers",
  "Investment",
  "Other",
]


@dataclass(frozen=True)
class CategoryMapping:
  category: Category
  mcc: int


_MAPPINGS: list[CategoryMapping] = [
  CategoryMapping("Travel", 4511),      # Airlines
  CategoryMapping("Shopping", 5311),    # Department stores
  CategoryMapping("Groceries", 5411),   # Grocery stores
  CategoryMapping("Utilities", 4900),   # Utilities
  CategoryMapping("Rent", 6513),        # Real estate agents/manager
  CategoryMapping("Insurance", 6300),   # Insurance sales
  CategoryMapping("Credit", 6012),      # Financial institutions
  CategoryMapping("Transfers", 4829),   # Money transfer
  CategoryMapping("Investment", 6211),  # Security brokers
  CategoryMapping("Other", 7399),       # Misc business services
]


def _stable_idx(seed: str, mod: int) -> int:
  h = hashlib.sha256(seed.encode("utf-8")).digest()
  return int.from_bytes(h[:4], "big") % mod


def map_to_category(transaction_id: str, channel: str | None = None) -> CategoryMapping:
  # Deterministic pseudo-mapping for FAR-Trans (investment) -> core-banking style categories.
  # This enables dashboard UX (insights/recs) even though source data is investment transactions.
  base_seed = f"{transaction_id}|{channel or ''}"
  idx = _stable_idx(base_seed, len(_MAPPINGS))
  return _MAPPINGS[idx]


def synthetic_installment(transaction_id: str, category: Category, amount_abs: float) -> dict[str, Any] | None:
  """
  FAR-Trans has no installment data. We synthesize a stable mock installment flag + terms.
  - More likely for Shopping/Rent/Travel (demo).
  """
  likelihood = {
    "Shopping": 0.35,
    "Travel": 0.25,
    "Rent": 0.15,
    "Utilities": 0.1,
    "Other": 0.08,
    "Investment": 0.05,
    "Groceries": 0.05,
    "Insurance": 0.12,
    "Credit": 0.1,
    "Transfers": 0.03,
  }.get(category, 0.05)

  h = hashlib.sha256(transaction_id.encode("utf-8")).digest()
  p = int.from_bytes(h[:2], "big") / 65535.0
  if p > likelihood or amount_abs < 100:
    return None

  months_options = [3, 6, 12]
  months = months_options[_stable_idx(transaction_id + "|months", len(months_options))]
  monthly = round(amount_abs / months, 2)
  return {
    "is_installment": True,
    "months": months,
    "monthly_amount": monthly,
  }


