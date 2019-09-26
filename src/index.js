import axios from 'axios';
import _ from 'lodash';

const DEFAULT_CACHE_TTL = 600000;

export const networkCache = ({ getState }) => (next) => async (action)=> {
  const {
    types,
    config,
    mapResponseToState,
    cacheReduxPath,
    ...rest
  } = action;
  
  if (types) {
    const [REQUEST, SUCCESS, FAILURE] = types;

    if (!config || !config.url) {
      return;
    }

    if (cacheReduxPath) {
      const state = getState();
      const cache = _.get(state, cacheReduxPath);
      if (
        cache && ((
        cache.data &&
        cache.timestamp &&
        cache.timestamp > Date.now()) || 
        cache.fetching)) {
        return;
      }
    }

    next({
      ...rest,
      type: REQUEST,
      payload: {
        data: null,
        fetching: true,
        error: null,
        timestamp: null
      }
    });

    try {
      let response = (await axios(config)).data;

      if (mapResponseToState) {
        response = mapResponseToState(response);
      }

      let timestamp = null;
      if (cacheReduxPath) {
        const ttl = _.toNumber(process.env.NETWORK_CACHE_TTL) || DEFAULT_CACHE_TTL;
        timestamp = Date.now() + ttl;
      }

      return next({
        ...rest,
        type: SUCCESS,
        payload: {
          data: response,
          fetching: false,
          error: null,
          timestamp
        }
      });
    } catch (e) {
      return next({
        ...rest,
        type: FAILURE,
        payload: {
          data: null,
          fetching: false,
          error: e.message,
          timestamp: null
        }
      });
    }
  }

  return next(action);
};