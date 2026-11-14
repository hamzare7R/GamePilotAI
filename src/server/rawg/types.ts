export type RawgRef = {
  id: number;
  name: string;
  slug: string;
};

export type RawgGame = {
  id: number;
  slug: string;
  name: string;
  released: string | null;
  background_image: string | null;
  background_image_additional?: string | null;
  rating: number;
  rating_top?: number;
  metacritic?: number | null;
  playtime?: number;
  added?: number;
  platforms?: { platform: RawgRef }[];
  genres?: RawgRef[];
  tags?: RawgRef[];
  description_raw?: string;
  description?: string;
  developers?: RawgRef[];
  publishers?: RawgRef[];
};

export type RawgListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: RawgGame[];
};
