import { Component, Injector, computed, input, signal } from '@angular/core'
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing'
import { QueryClient } from '@tanstack/query-core'
// NOTE: do not import test from 'vitest' here - only global test function is patched for Angular zone
import { describe, expect, vi } from 'vitest'
import { injectQuery } from '../inject-query'
import { provideAngularQuery } from '../providers'
import {
  delayedFetcher,
  getSimpleFetcherWithReturnData,
  rejectFetcher,
  setSignalInputs,
  simpleFetcher,
} from './test-utils'

describe('injectQuery', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideAngularQuery(new QueryClient())],
    })
  })

  test('should return pending status initially', fakeAsync(() => {
    const query = TestBed.runInInjectionContext(() => {
      return injectQuery(() => ({
        queryKey: ['key1'],
        queryFn: simpleFetcher,
      }))
    })

    expect(query.status()).toBe('pending')
    expect(query.isPending()).toBe(true)
    expect(query.isFetching()).toBe(true)
    expect(query.isStale()).toBe(true)
    expect(query.isFetched()).toBe(false)

    flush()
  }))

  test('should resolve to success and update signal: injectQuery()', fakeAsync(() => {
    const query = TestBed.runInInjectionContext(() => {
      return injectQuery(() => ({
        queryKey: ['key2'],
        queryFn: getSimpleFetcherWithReturnData('result2'),
      }))
    })

    flush()

    expect(query.status()).toBe('success')
    expect(query.data()).toBe('result2')
    expect(query.isPending()).toBe(false)
    expect(query.isFetching()).toBe(false)
    expect(query.isFetched()).toBe(true)
    expect(query.isSuccess()).toBe(true)
  }))

  test('should reject and update signal', fakeAsync(() => {
    const query = TestBed.runInInjectionContext(() => {
      return injectQuery(() => ({
        retry: false,
        queryKey: ['key3'],
        queryFn: rejectFetcher,
      }))
    })

    flush()

    expect(query.status()).toBe('error')
    expect(query.data()).toBe(undefined)
    expect(query.error()).toMatchObject({ message: 'Some error' })
    expect(query.isPending()).toBe(false)
    expect(query.isFetching()).toBe(false)
    expect(query.isError()).toBe(true)
    expect(query.failureCount()).toBe(1)
    expect(query.failureReason()).toMatchObject({ message: 'Some error' })
  }))

  test('should update query on options contained signal change', fakeAsync(() => {
    const key = signal(['key6', 'key7'])
    const spy = vi.fn(simpleFetcher)

    const query = TestBed.runInInjectionContext(() => {
      return injectQuery(() => ({
        queryKey: key(),
        queryFn: spy,
      }))
    })
    flush()
    expect(spy).toHaveBeenCalledTimes(1)

    expect(query.status()).toBe('success')

    key.set(['key8'])
    TestBed.flushEffects()

    expect(spy).toHaveBeenCalledTimes(2)

    flush()
  }))

  test('should only run query once enabled signal is set to true', fakeAsync(() => {
    const spy = vi.fn(simpleFetcher)
    const enabled = signal(false)

    const query = TestBed.runInInjectionContext(() => {
      return injectQuery(() => ({
        queryKey: ['key9'],
        queryFn: spy,
        enabled: enabled(),
      }))
    })

    expect(spy).not.toHaveBeenCalled()
    expect(query.status()).toBe('pending')

    enabled.set(true)
    TestBed.flushEffects()
    flush()
    expect(spy).toHaveBeenCalledTimes(1)
    expect(query.status()).toBe('success')
  }))

  test('should properly execute dependant queries', fakeAsync(() => {
    const query1 = TestBed.runInInjectionContext(() => {
      return injectQuery(() => ({
        queryKey: ['dependant1'],
        queryFn: simpleFetcher,
      }))
    })

    const dependentQueryFn = vi.fn().mockImplementation(delayedFetcher(1000))

    const query2 = TestBed.runInInjectionContext(() => {
      return injectQuery(
        computed(() => ({
          queryKey: ['dependant2'],
          queryFn: dependentQueryFn,
          enabled: !!query1.data(),
        })),
      )
    })

    expect(query1.data()).toStrictEqual(undefined)
    expect(query2.fetchStatus()).toStrictEqual('idle')
    expect(dependentQueryFn).not.toHaveBeenCalled()

    tick()
    TestBed.flushEffects()

    expect(query1.data()).toStrictEqual('Some data')
    expect(query2.fetchStatus()).toStrictEqual('fetching')

    flush()

    expect(query2.fetchStatus()).toStrictEqual('idle')
    expect(query2.status()).toStrictEqual('success')
    expect(dependentQueryFn).toHaveBeenCalledTimes(1)
    expect(dependentQueryFn).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['dependant2'] }),
    )
  }))

  test('should use the current value for the queryKey when refetch is called', fakeAsync(() => {
    const fetchFn = vi.fn(simpleFetcher)
    const keySignal = signal('key11')

    const query = TestBed.runInInjectionContext(() => {
      return injectQuery(() => ({
        queryKey: ['key10', keySignal()],
        queryFn: fetchFn,
        enabled: false,
      }))
    })

    expect(fetchFn).not.toHaveBeenCalled()

    query.refetch().then(() => {
      expect(fetchFn).toHaveBeenCalledTimes(1)
      expect(fetchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['key10', 'key11'],
        }),
      )
    })

    flush()

    keySignal.set('key12')

    TestBed.flushEffects()

    query.refetch().then(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2)
      expect(fetchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['key10', 'key12'],
        }),
      )
    })

    flush()
  }))

  describe('throwOnError', () => {
    test('should evaluate throwOnError when query is expected to throw', fakeAsync(() => {
      const boundaryFn = vi.fn()
      TestBed.runInInjectionContext(() => {
        return injectQuery(() => ({
          queryKey: ['key12'],
          queryFn: rejectFetcher,
          throwOnError: boundaryFn,
        }))
      })

      flush()

      expect(boundaryFn).toHaveBeenCalledTimes(1)
      expect(boundaryFn).toHaveBeenCalledWith(
        Error('Some error'),
        expect.objectContaining({
          state: expect.objectContaining({ status: 'error' }),
        }),
      )
    }))

    test('should throw when throwOnError is true', fakeAsync(() => {
      TestBed.runInInjectionContext(() => {
        return injectQuery(() => ({
          queryKey: ['key13'],
          queryFn: rejectFetcher,
          throwOnError: true,
        }))
      })

      expect(() => {
        flush()
      }).toThrowError('Some error')
      flush()
    }))

    test('should throw when throwOnError function returns true', fakeAsync(() => {
      TestBed.runInInjectionContext(() => {
        return injectQuery(() => ({
          queryKey: ['key14'],
          queryFn: rejectFetcher,
          throwOnError: () => true,
        }))
      })

      expect(() => {
        flush()
      }).toThrowError('Some error')
      flush()
    }))
  })

  describe('injection context', () => {
    test('throws NG0203 outside injection context', () => {
      expect(() => {
        injectQuery(() => ({
          queryKey: ['injectionContextError'],
          queryFn: simpleFetcher,
        }))
      }).toThrowError(
        'NG0203: injectQuery() can only be used within an injection context such as a constructor, a factory function, a field initializer, or a function used with `runInInjectionContext`. Find more at https://angular.io/errors/NG0203',
      )
    })

    test('can be used outside injection context when passing an injector', () => {
      const query = injectQuery(
        () => ({
          queryKey: ['manualInjector'],
          queryFn: simpleFetcher,
        }),
        TestBed.inject(Injector),
      )

      expect(query.status()).toBe('pending')
    })
  })

  test('should set state to error when queryFn returns reject promise', fakeAsync(() => {
    const query = TestBed.runInInjectionContext(() => {
      return injectQuery(() => ({
        retry: false,
        queryKey: ['key15'],
        queryFn: rejectFetcher,
      }))
    })

    expect(query.status()).toBe('pending')

    flush()

    expect(query.status()).toBe('error')
  }))

  test('should render with required signal inputs', fakeAsync(async () => {
    @Component({
      selector: 'app-fake',
      template: `{{ query.data() }}`,
      standalone: true,
    })
    class FakeComponent {
      name = input.required<string>()

      query = injectQuery(() => ({
        queryKey: ['fake', this.name()],
        queryFn: () => Promise.resolve(this.name()),
      }))
    }

    const fixture = TestBed.createComponent(FakeComponent)
    setSignalInputs(fixture.componentInstance, {
      name: 'signal-input-required-test',
    })

    flush()
    fixture.detectChanges()

    expect(fixture.debugElement.nativeElement.textContent).toEqual(
      'signal-input-required-test',
    )
  }))
})
