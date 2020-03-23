import axios from 'axios';
import { networkCache } from '../index';

jest.mock('axios');

window.Date = {
  now: () => {
    return 5;
  }
}

describe('NetworkCacheMiddlewareTest', () => {
  let dispatch, getState, next, action;

  beforeEach(() => {
    dispatch = jest.fn();
    getState = () => ({
      auth: {
        fetching: false,
        error: null,
        data: { auth: { sessionId: 'USER' } },
        timestamp: 600000
      }
    });
    next = jest.fn();
    action = {};
    jest.clearAllMocks();
  });

  const runMiddlware = () => {
    return networkCache({
      dispatch,
      getState
    })(next)(action);
  };

  describe('test middleware functionality', () => {
    test('if types (plural) is passed in, networkMiddlware action passed to next is modified', async () => {
      action = {
        types: ['MY_REQUEST', 'MY_SUCCESS', 'MY_FAILURE'],
        config: {
          url: 'https://api.com'
        }
      };

      await runMiddlware();

      expect(next).not.toHaveBeenCalledWith(action);
    });

    test('Cancel middleware if types called without proper config for axios', async () => {
      action = {
        types: ['MY_REQUEST', 'MY_SUCCESS', 'MY_FAILURE'],
        config: {
          link: 'https://api.com'
        }
      };

      await runMiddlware();

      expect(next).not.toHaveBeenCalled();
    });

    test('dispatches REQUEST action', async () => {
      axios.mockResolvedValue({ data: { status: 'SUCCESS' } });
      action = {
        types: ['MY_REQUEST', 'MY_SUCCESS', 'MY_FAILURE'],
        config: {
          url: 'https://api.com'
        }
      };

      await runMiddlware();

      expect(next).toHaveBeenCalledWith({
        type: 'MY_REQUEST',
        payload: {
          data: null,
          fetching: true,
          error: null,
          timestamp: null
        }
      })
    });

    test('dispatches SUCCESS action', async () => {
      axios.mockResolvedValue({ data: { status: 'SUCCESS' } });
      action = {
        types: ['MY_REQUEST', 'MY_SUCCESS', 'MY_FAILURE'],
        config: {
          url: 'https://api.com'
        }
      };

      await runMiddlware();

      expect(next).toHaveBeenNthCalledWith(2, {
        type: 'MY_SUCCESS',
        payload: {
          data: {
            status: 'SUCCESS'
          },
          fetching: false,
          error: null,
          timestamp: null
        }
      });
    });

    test('dispatches FAILURE action', async () => {
      axios.mockRejectedValue({ message: 'FAILURE' });
      action = {
        types: ['MY_REQUEST', 'MY_SUCCESS', 'MY_FAILURE'],
        config: {
          url: 'https://api.com'
        }
      };

      await runMiddlware();

      expect(next).toHaveBeenNthCalledWith(2, {
        type: 'MY_FAILURE',
        payload: {
          data: null,
          fetching: false,
          error: 'FAILURE',
          
          timestamp: null
        }
      });
    });

    test('optionally maps axios response if mapResponseToState included in payload', async () => {
      axios.mockResolvedValue({ data: { unnecessaryNestedLayer: { status: 'SUCCESS' } } });

      const mapResponseToState = (response) => {
        return response.unnecessaryNestedLayer;
      };

      action = {
        types: ['MY_REQUEST', 'MY_SUCCESS', 'MY_FAILURE'],
        config: { url: 'https://api.com' },
        mapResponseToState
      };

      await runMiddlware();

      expect(next).toHaveBeenNthCalledWith(2, {
        type: 'MY_SUCCESS',
        payload: {
          data: {
            status: 'SUCCESS'
          },
          fetching: false,
          error: null,
          timestamp: null
        }
      });
    });

    describe('cache', () => {
      test('Caches successful response', async () => {
        axios.mockResolvedValue({ data: { status: 'SUCCESS' } });
        action = {
          types: ['MY_REQUEST', 'MY_SUCCESS', 'MY_FAILURE'],
          config: { url: 'https://api.com' },
          cacheReduxPath: 'shouldBeCached'
        };

        await runMiddlware();

        expect(next).toHaveBeenNthCalledWith(2, {
          type: 'MY_SUCCESS',
          payload: {
            data: {
              status: 'SUCCESS'
            },
            fetching: false,
            error: null,
            timestamp: 600005
          }
        });
      });

      test('Does not dispatch actions if cache within ttl', async () => {
        getState = () => ({
          auth: {
            fetching: false,
            error: null,
            data: { auth: { data: { sessionId: 'USER' } } },
            timestamp: 6
          }
        });

        action = {
          types: ['MY_REQUEST', 'MY_SUCCESS', 'MY_FAILURE'],
          config: { url: 'https://api.com' },
          cacheReduxPath: 'auth'
        };

        await runMiddlware();

        expect(next).not.toHaveBeenCalled()
      });

      test('Does not dispatch actions if cache in fetching state', async () => {
        getState = () => ({
          auth: {
            fetching: true,
            error: null,
            data: null,
            timestamp: 6
          }
        });

        action = {
          types: ['MY_REQUEST', 'MY_SUCCESS', 'MY_FAILURE'],
          config: { url: 'https://api.com' },
          cacheReduxPath: 'auth',
        };

        await runMiddlware();

        expect(next).not.toHaveBeenCalled()
      });
    });
  });

  describe('regular redux and thunk behavior', () => {
    test('passes regular actions through to next middleware', async () => {
      action = {
        type: 'GO_TO_NEXT',
        payload: { data: 'ignored' }
      };

      await runMiddlware();

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(action);
    });

    test('passes thunk actions through to the next middleware', async () => {
      action = () => ({ type: 'thunk_simple_action' });

      await runMiddlware();

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(action);
    });
  });
});