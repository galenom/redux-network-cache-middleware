type AdditionalPayloadProps<T = {}, V = {}> = {
  mapper?: ((response: AxiosResponse<T>) => AxiosResponse<V>);
  cachePath?: string;
};

type NetworkPayload<T = {}, V = {}> = AxiosRequestConfig & AdditionalPayloadProps<T, V>;

export interface ApiState<T> {
  fetching: boolean;
  cancelled: boolean;
  completed: boolean;
  error: string | null;
  data: T | null;
  timestamp: number | null
}