export type ValidationIssue = {
  field: string;
  reason: string;
};

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: ValidationIssue[] };

type ProductStatusInput = "Active" | "Out of Stock" | "Inactive" | "active" | "out_of_stock" | "inactive";

export type CreateProductInput = {
  name: string;
  price: number;
  stock: number;
  category: string;
  image: string | null;
  status?: ProductStatusInput;
};

export type UpdateProductInput = Partial<CreateProductInput>;

export type CreateRedemptionInput = {
  userId: string;
  productId: string;
  quantity: number;
};

function parseSafeInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  return n;
}

function parseText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeProductStatus(value: unknown): ProductStatusInput | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  const allowed: ProductStatusInput[] = ["Active", "Out of Stock", "Inactive", "active", "out_of_stock", "inactive"];
  if (allowed.includes(normalized as ProductStatusInput)) return normalized as ProductStatusInput;
  return undefined;
}

export function validateCreateProductPayload(body: unknown): ValidationResult<CreateProductInput> {
  const input = (body ?? {}) as Record<string, unknown>;
  const issues: ValidationIssue[] = [];

  const name = parseText(input.name);
  if (!name) issues.push({ field: "name", reason: "required" });
  if (name && name.length > 120) issues.push({ field: "name", reason: "length must be <= 120" });

  const category = parseText(input.category);
  if (!category) issues.push({ field: "category", reason: "required" });
  if (category && category.length > 50) issues.push({ field: "category", reason: "length must be <= 50" });

  const price = parseSafeInt(input.price);
  if (price === null) issues.push({ field: "price", reason: "must be integer" });
  if (price !== null && (price < 1 || price > 999999)) issues.push({ field: "price", reason: "must be between 1 and 999999" });

  const stock = parseSafeInt(input.stock);
  if (stock === null) issues.push({ field: "stock", reason: "must be integer" });
  if (stock !== null && (stock < 0 || stock > 999999)) issues.push({ field: "stock", reason: "must be between 0 and 999999" });

  const status = input.status === undefined ? undefined : normalizeProductStatus(input.status);
  if (input.status !== undefined && !status) {
    issues.push({ field: "status", reason: "must be Active|Out of Stock|Inactive" });
  }

  let image: string | null = null;
  if (input.image !== undefined && input.image !== null) {
    if (typeof input.image !== "string") {
      issues.push({ field: "image", reason: "must be string" });
    } else {
      image = input.image.trim() ? input.image : null;
    }
  }

  if (issues.length > 0 || !name || !category || price === null || stock === null) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    data: {
      name,
      price,
      stock,
      category,
      image,
      status,
    },
  };
}

export function validateUpdateProductPayload(body: unknown): ValidationResult<UpdateProductInput> {
  const input = (body ?? {}) as Record<string, unknown>;
  const issues: ValidationIssue[] = [];
  const data: UpdateProductInput = {};

  if (Object.keys(input).length === 0) {
    return { ok: false, issues: [{ field: "body", reason: "at least one field is required" }] };
  }

  if ("name" in input) {
    const name = parseText(input.name);
    if (!name) issues.push({ field: "name", reason: "must be non-empty string" });
    else if (name.length > 120) issues.push({ field: "name", reason: "length must be <= 120" });
    else data.name = name;
  }

  if ("category" in input) {
    const category = parseText(input.category);
    if (!category) issues.push({ field: "category", reason: "must be non-empty string" });
    else if (category.length > 50) issues.push({ field: "category", reason: "length must be <= 50" });
    else data.category = category;
  }

  if ("price" in input) {
    const price = parseSafeInt(input.price);
    if (price === null) issues.push({ field: "price", reason: "must be integer" });
    else if (price < 1 || price > 999999) issues.push({ field: "price", reason: "must be between 1 and 999999" });
    else data.price = price;
  }

  if ("stock" in input) {
    const stock = parseSafeInt(input.stock);
    if (stock === null) issues.push({ field: "stock", reason: "must be integer" });
    else if (stock < 0 || stock > 999999) issues.push({ field: "stock", reason: "must be between 0 and 999999" });
    else data.stock = stock;
  }

  if ("status" in input) {
    const status = normalizeProductStatus(input.status);
    if (!status) issues.push({ field: "status", reason: "must be Active|Out of Stock|Inactive" });
    else data.status = status;
  }

  if ("image" in input) {
    if (input.image !== null && typeof input.image !== "string") {
      issues.push({ field: "image", reason: "must be string|null" });
    } else {
      data.image = typeof input.image === "string" && input.image.trim() ? input.image : null;
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  if (Object.keys(data).length === 0) {
    return { ok: false, issues: [{ field: "body", reason: "no valid updatable field provided" }] };
  }

  return { ok: true, data };
}

export function validateCreateRedemptionPayload(body: unknown): ValidationResult<CreateRedemptionInput> {
  const input = (body ?? {}) as Record<string, unknown>;
  const issues: ValidationIssue[] = [];

  const userId = parseText(input.userId);
  if (!userId) issues.push({ field: "userId", reason: "required" });

  const productId = parseText(input.productId);
  if (!productId) issues.push({ field: "productId", reason: "required" });

  let quantity = 1;
  if (input.quantity !== undefined) {
    const parsed = parseSafeInt(input.quantity);
    if (parsed === null) {
      issues.push({ field: "quantity", reason: "must be integer" });
    } else if (parsed === 0) {
      issues.push({ field: "quantity", reason: "quantity cannot be zero" });
    } else if (Math.abs(parsed) > 999) {
      issues.push({ field: "quantity", reason: "quantity must be at most 999" });
    } else {
      quantity = parsed;
    }
  }

  if (issues.length > 0 || !userId || !productId) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    data: { userId, productId, quantity },
  };
}
