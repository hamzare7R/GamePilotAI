export class LibraryNotReadyError extends Error {
  constructor() {
    super("Library storage is not initialized.");
    this.name = "LibraryNotReadyError";
  }
}

export class LibraryGameNotFoundError extends Error {
  constructor() {
    super("That game is not in the catalog.");
    this.name = "LibraryGameNotFoundError";
  }
}

export class LibraryEntryNotFoundError extends Error {
  constructor() {
    super("That library entry was not found.");
    this.name = "LibraryEntryNotFoundError";
  }
}

export class MockLibraryEntryError extends Error {
  constructor() {
    super("Demo catalog games cannot be saved to a library in production.");
    this.name = "MockLibraryEntryError";
  }
}
