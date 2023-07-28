import { createContext, version as ReactVersion } from 'react'
import type { Context } from 'react'
import type { Action, AnyAction, Store } from 'redux'
import type { Subscription } from '../utils/Subscription'
import type { CheckFrequency } from '../hooks/useSelector'

export interface ReactReduxContextValue<
  SS = any,
  A extends Action = AnyAction
> {
  store: Store<SS, A>
  subscription: Subscription
  getServerState?: () => SS
  stabilityCheck: CheckFrequency
  noopCheck: CheckFrequency
}

// 是一个全局的注册表逻辑
const ContextKey = Symbol.for(`react-redux-context-${ReactVersion}`)
const gT = globalThis as { [ContextKey]?: Context<ReactReduxContextValue> }

function getContext() {
  let realContext = gT[ContextKey]
  if (!realContext) {
    realContext = createContext<ReactReduxContextValue>(null as any)
    if (process.env.NODE_ENV !== 'production') {
      realContext.displayName = 'ReactRedux'
    }
    gT[ContextKey] = realContext
  }
  return realContext
}

/**
 * 这个有点过于高级了
 * 两次 new Proxy 进行代理
 * 加上一个 Reflect https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect
 * 过于高级，难以理解
 */
export const ReactReduxContext = /*#__PURE__*/ new Proxy(
  {} as Context<ReactReduxContextValue>,
  /*#__PURE__*/ new Proxy<ProxyHandler<Context<ReactReduxContextValue>>>(
    {},
    {
      get(_, handler) {
        const target = getContext()
        // @ts-ignore
        return (_target, ...args) => Reflect[handler](target, ...args)
      },
    }
  )
)

export type ReactReduxContextInstance = typeof ReactReduxContext

export default ReactReduxContext
