import { AxiosRequestConfig } from 'axios';
import { Dispatch, AnyAction, MiddlewareAPI } from 'redux';

export interface NetworkCacheAction<T = {}, V = {}> {
  types: [string, string, string];
  config: AxiosRequestConfig;
  cacheReduxPath?: string;
  mapResponseToState?: (data: T) => V;
}

export type ReduxAction<T = {}, V = {}> = AnyAction | NetworkCacheAction<T, V>;

export interface ApiState<T> {
  fetching: boolean;
  error: string | null;
  data: T | null;
  timestamp: number | null;
}

export const networkCache: (api: MiddlewareAPI) => (next: Dispatch<AnyAction>) => (action: ReduxAction) => Promise<void>;