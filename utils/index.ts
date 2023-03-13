export * from './log'
export * from './constant'
export const completeSuffix = (fileName: string, suffix = 'css') => {
  return !fileName.endsWith(`.${suffix}`) ? `${fileName}.${suffix}` : fileName
}
export const extend = <
  T extends Record<string, any>,
  U extends Record<string, any>>(
    objFir: T,
    objSec: U): T & U => {
  return Object.assign({}, objFir, objSec)
}
