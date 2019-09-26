import axios from 'axios';
import { networkCacheMiddleware } from '../index';

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
        cancelled: false,
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
    return networkCacheMiddleware({
      dispatch,
      getState
    })(next)(action);
  };

  describe('test middleware functionality', () => {
    test('if types (plural) is passed in, networkMiddlware action passed to next is modified', async () => {
      action = {
        types: ['DIESL_REQUEST', 'DIESL_SUCCESS', 'DIESL_FAILURE'],
        payload: {
          url: 'https://api.com'
        }
      };

      await runMiddlware();

      expect(next).not.toHaveBeenCalledWith(action);
    });

    test('Cancel middleware if types called without proper config for axios', async () => {
      action = {
        types: ['DIESL_REQUEST', 'DIESL_SUCCESS', 'DIESL_FAILURE'],
        payload: {
          link: 'https://api.com'
        }
      };

      await runMiddlware();

      expect(next).not.toHaveBeenCalled();
    });

    test('dispatches REQUEST action', async () => {
      axios.mockResolvedValue({ data: { status: 'SUCCESS' } });
      action = {
        types: ['DIESL_REQUEST', 'DIESL_SUCCESS', 'DIESL_FAILURE'],
        payload: {
          url: 'https://api.com'
        }
      };

      await runMiddlware();

      expect(next).toHaveBeenCalledWith({
        type: 'DIESL_REQUEST',
        payload: {
          data: null,
          fetching: true,
          error: null,
          cancelled: false,
          completed: false,
          timestamp: null
        }
      })
    });

    test('dispatches SUCCESS action', async () => {
      axios.mockResolvedValue({ data: { status: 'SUCCESS' } });
      action = {
        types: ['DIESL_REQUEST', 'DIESL_SUCCESS', 'DIESL_FAILURE'],
        payload: {
          url: 'https://api.com'
        }
      };

      await runMiddlware();

      expect(next).toHaveBeenNthCalledWith(2, {
        type: 'DIESL_SUCCESS',
        payload: {
          data: {
            status: 'SUCCESS'
          },
          fetching: false,
          error: null,
          cancelled: false,
          completed: true,
          timestamp: null
        }
      });
    });

    test('dispatches FAILURE action', async () => {
      axios.mockRejectedValue({ message: 'FAILURE' });
      action = {
        types: ['DIESL_REQUEST', 'DIESL_SUCCESS', 'DIESL_FAILURE'],
        payload: {
          url: 'https://api.com'
        }
      };

      await runMiddlware();

      expect(next).toHaveBeenNthCalledWith(2, {
        type: 'DIESL_FAILURE',
        payload: {
          data: null,
          fetching: false,
          error: 'FAILURE',
          cancelled: false,
          completed: false,
          timestamp: null
        }
      });
    });

    test('optionally maps axios response if mapper included in payload', async () => {
      axios.mockResolvedValue({ data: { unnecessaryNestedLayer: { status: 'SUCCESS' } } });

      const mapper = (response) => {
        return {
          data: response.data.unnecessaryNestedLayer
        };
      };

      action = {
        types: ['DIESL_REQUEST', 'DIESL_SUCCESS', 'DIESL_FAILURE'],
        payload: {
          url: 'https://api.com',
          mapper
        }
      };

      await runMiddlware();

      expect(next).toHaveBeenNthCalledWith(2, {
        type: 'DIESL_SUCCESS',
        payload: {
          data: {
            status: 'SUCCESS'
          },
          fetching: false,
          error: null,
          cancelled: false,
          completed: true,
          timestamp: null
        }
      });
    });

    describe('cache', () => {
      test('Caches successful response', async () => {
        axios.mockResolvedValue({ data: { status: 'SUCCESS' } });
        action = {
          types: ['DIESL_REQUEST', 'DIESL_SUCCESS', 'DIESL_FAILURE'],
          payload: {
            url: 'https://api.com',
            cachePath: 'shouldBeCached'
          }
        };

        await runMiddlware();

        expect(next).toHaveBeenNthCalledWith(2, {
          type: 'DIESL_SUCCESS',
          payload: {
            data: {
              status: 'SUCCESS'
            },
            fetching: false,
            error: null,
            cancelled: false,
            completed: true,
            timestamp: 600005
          }
        });
      });

      test('Does not dispatch actions if cache within ttl', async () => {
        getState = () => ({
          auth: {
            fetching: false,
            cancelled: false,
            error: null,
            data: { auth: { data: { sessionId: 'USER' } } },
            timestamp: 6
          }
        });

        action = {
          types: ['DIESL_REQUEST', 'DIESL_SUCCESS', 'DIESL_FAILURE'],
          payload: {
            cachePath: 'auth',
            url: 'https://api.com'
          }
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