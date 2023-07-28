import { getBatch } from './batch'

// encapsulates the subscription logic for connecting a component to the redux store, as
// well as nesting subscriptions of descendant components, so that we can ensure the
// ancestor components re-render before descendants

type VoidFunc = () => void

type Listener = {
  callback: VoidFunc
  next: Listener | null
  prev: Listener | null
}

/**
 * 创建 listener 容器
 * 
 * 双向链表式结构的访问
 * @returns 
 */
function createListenerCollection() {
  const batch = getBatch()
  let first: Listener | null = null
  let last: Listener | null = null

  return {
    /** 清除方法 */
    clear() {
      first = null
      last = null
    },

    /** 
     * 通知所有 listener 方法，调用 callback
     * 同时是使用的 batch 方法进行的回调
     * batch 可以通过 setBatch 进行变化
     */
    notify() {
      batch(() => {
        let listener = first
        while (listener) {
          listener.callback()
          listener = listener.next
        }
      })
    },

    /** 返回所有被监听的 listeners 数组 */
    get() {
      let listeners: Listener[] = []
      let listener = first
      while (listener) {
        listeners.push(listener)
        listener = listener.next
      }
      return listeners
    },

    /** 创建监听器 */
    subscribe(callback: () => void) {
      let isSubscribed = true

      // 初始化，将 last 放入 prev 同时更新 last 
      let listener: Listener = (last = {
        callback,
        next: null,
        prev: last,
      })

      // 判断是不是第一个
      if (listener.prev) {
        listener.prev.next = listener
      } else {
        first = listener
      }

      // 取消监听器
      return function unsubscribe() {
        if (!isSubscribed || first === null) return
        isSubscribed = false

        // 如果删除的监听不是最后一个
        if (listener.next) {
          listener.next.prev = listener.prev
        } else {
          last = listener.prev
        }
        // 如果不是第一个
        if (listener.prev) {
          listener.prev.next = listener.next
        } else {
          first = listener.next
        }
      }
    },
  }
}

type ListenerCollection = ReturnType<typeof createListenerCollection>

export interface Subscription {
  addNestedSub: (listener: VoidFunc) => VoidFunc
  notifyNestedSubs: VoidFunc
  handleChangeWrapper: VoidFunc
  isSubscribed: () => boolean
  onStateChange?: VoidFunc | null
  trySubscribe: VoidFunc
  tryUnsubscribe: VoidFunc
  getListeners: () => ListenerCollection
}

const nullListeners = {
  notify() {},
  get: () => [],
} as unknown as ListenerCollection

export function createSubscription(store: any, parentSub?: Subscription) {
  /** 将是 store.subscribe 或者 parentSub.addNestedSub 之后的返回值
   * handleChangeWrapper 是这个会调用的方法
   */
  let unsubscribe: VoidFunc | undefined
  let listeners: ListenerCollection = nullListeners

  /**
   * 添加监听
   * @param listener 
   * @returns 
   */
  function addNestedSub(listener: () => void) {
    trySubscribe()
    return listeners.subscribe(listener)
  }

  /**
   * 通知监听
   */
  function notifyNestedSubs() {
    listeners.notify()
  }

  /** 将调用 onStateChange 方法 */
  function handleChangeWrapper() {
    if (subscription.onStateChange) {
      subscription.onStateChange()
    }
  }

  /**
   * 是否有监听
   * @returns 
   */
  function isSubscribed() {
    return Boolean(unsubscribe)
  }

  /**
   * 如果没有 unsubscribe 方法，那么会初始化创建 listeners：createListenerCollection
   * 同时赋值 unsubscribe ，同时依赖于 createSubscription 方法是否传递了 parentSub 参数
   * 这决定了会将 handleChangeWrapper 放在哪个身上。
   */
  function trySubscribe() {
    if (!unsubscribe) {
      unsubscribe = parentSub
        ? parentSub.addNestedSub(handleChangeWrapper)
        : store.subscribe(handleChangeWrapper)

      listeners = createListenerCollection()
    }
  }

  /**
   * 删除所有监听 并执行 unsubscribe
   */
  function tryUnsubscribe() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = undefined
      listeners.clear()
      listeners = nullListeners
    }
  }

  const subscription: Subscription = {
    addNestedSub,
    notifyNestedSubs,
    handleChangeWrapper,
    isSubscribed,
    trySubscribe,
    tryUnsubscribe,
    getListeners: () => listeners,
  }

  return subscription
}
