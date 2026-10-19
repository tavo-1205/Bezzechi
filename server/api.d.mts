export type ApiRequestLike = {
  url?: string;
  originalUrl?: string;
  method?: string;
};

export type ApiResponseLike = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string): void;
};

export type ApiHandler = (req: ApiRequestLike, res: ApiResponseLike) => void | Promise<void>;

export type FetchOptions = { force?: boolean };

export function createApiHandler(): ApiHandler;
export function fetchStandings(options?: FetchOptions): Promise<unknown>;
export function fetchSeason(options?: FetchOptions): Promise<unknown>;
