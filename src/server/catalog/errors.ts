export class CatalogNotFoundError extends Error {
  constructor(message = "Game not found") {
    super(message);
    this.name = "CatalogNotFoundError";
  }
}

export class CatalogUnavailableError extends Error {
  constructor(message = "The games catalog is temporarily unavailable") {
    super(message);
    this.name = "CatalogUnavailableError";
  }
}
