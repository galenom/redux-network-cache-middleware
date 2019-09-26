import axios from 'axios';
import _ from 'lodash';

const CACHE_TTL = 600000;

export const networkCacheMiddleware = ({ getState }) => (next) => async (action)=> {
  const { types, payload, ...rest} = action;
  
  if (types) {
    const [REQUEST, SUCCESS, FAILURE] = types;

    const config = payload;

    if (!config || !config.url) {
      return;
    }

    if (config.cachePath) {
      const state = getState();
      const cache = _.get(state, config.cachePath);
      if (cache && cache.data && cache.timestamp && cache.timestamp > Date.now()) {
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
        cancelled: false,
        completed: false,
        timestamp: null
      }
    });

    try {
      let response = await axios(_.omit(config, 'mapper'));

      if (config.mapper) {
        response = config.mapper(response);
      }

      let timestamp = null;
      if (config.cachePath) {
        timestamp = Date.now() + CACHE_TTL;
      }

      next({
        ...rest,
        type: SUCCESS,
        payload: {
          data: response.data,
          fetching: false,
          error: null,
          cancelled: false,
          completed: true,
          timestamp
        }
      });
    } catch (e) {
      next({
        ...rest,
        type: FAILURE,
        payload: {
          data: null,
          fetching: false,
          error: e.message,
          cancelled: false,
          completed: false,
          timestamp: null
        }
      });
    }

    return;
  }

  next(action);
};