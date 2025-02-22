import { resolve } from 'path'
import { describe, expect, test, vi } from 'vitest'
import { transformSymbol } from '@unplugin-vue-cssvars/utils'
import { getCSSFileRecursion, getVBindVariableListByPath, handleAlias } from '../process-css'
import type { ICSSFile } from '../../types'

describe('process css', () => {
  test('getCSSFileRecursion: basic', () => {
    const mockEvt = vi.fn()
    const mockRes: Array<ICSSFile> = []
    const mockCssFiles = new Map()
    mockCssFiles.set('foo.css', {
      importer: new Set(),
      vBindCode: {
        foo: new Set(['v-bind(foo)']),
      },
    })
    getCSSFileRecursion('css', 'foo', mockCssFiles, (v) => {
      mockEvt()
      mockRes.push(v)
    })
    expect(mockRes.length).toBe(1)
    expect(mockEvt).toBeCalledTimes(1)
    expect(mockRes[0].vBindCode).toMatchObject({
      foo: new Set(['v-bind(foo)']),
    })
  })

  test('getCSSFileRecursion: unmatched key', () => {
    const mockEvt = vi.fn()
    const mockRes = []
    const mockCssFiles = new Map()
    mockCssFiles.set('foo.css', {
      importer: new Set(['foo1', 'foo2']),
    })
    const testFn = () => getCSSFileRecursion('css', 'bar', mockCssFiles, (v) => {
      mockEvt()
      mockRes.push(v)
    })
    expect(mockRes.length).toBe(0)
    expect(mockEvt).not.toBeCalled()
    expect(testFn).toThrowError()
  })

  test('getCSSFileRecursion: not custom suffix', () => {
    const mockEvt = vi.fn()
    const mockRes: Array<ICSSFile> = []
    const mockCssFiles = new Map()
    mockCssFiles.set('foo.module.css', {
      importer: new Set(),
      vBindCode: {
        foo: new Set(['v-bind(foo)']),
      },
    })
    getCSSFileRecursion('css', 'foo.module', mockCssFiles, (v) => {
      mockEvt()
      mockRes.push(v)
    })
    expect(mockRes.length).toBe(1)
    expect(mockEvt).toBeCalledTimes(1)
    expect(mockRes[0].vBindCode).toMatchObject({
      foo: new Set(['v-bind(foo)']),
    })
  })

  test('getCSSFileRecursion: recursion', () => {
    const mockEvt = vi.fn()
    const mockRes: Array<ICSSFile> = []
    const mockCssFiles = new Map()
    mockCssFiles.set('foo.css', {
      importer: new Set(['bar.css']),
      vBindCode: {
        foo: new Set(['v-bind(foo)']),
      },
    })
    mockCssFiles.set('bar.css', {
      importer: new Set(),
      vBindCode: {
        bar: new Set(['v-bind(bar)']),
      },
    })
    getCSSFileRecursion('css', 'foo', mockCssFiles, (v) => {
      mockEvt()
      mockRes.push(v)
    })
    expect(mockRes.length).toBe(2)
    expect(mockEvt).toBeCalledTimes(2)
    expect(mockRes[0].vBindCode).toMatchObject({
      foo: new Set(['v-bind(foo)']),
    })
    expect(mockRes[1].vBindCode).toMatchObject({
      bar: new Set(['v-bind(bar)']),
    })
  })

  test('getCSSFileRecursion: circular dependencies', () => {
    const mockEvt = vi.fn()
    const mockRes: Array<ICSSFile> = []
    const mockCssFiles = new Map()
    mockCssFiles.set('foo.css', {
      importer: new Set(['bar.css']),
      vBindCode: {
        foo: new Set(['v-bind(foo)']),
      },
    })
    mockCssFiles.set('bar.css', {
      importer: new Set(['foo']),
      vBindCode: {
        bar: new Set(['v-bind(bar)']),
      },
    })
    getCSSFileRecursion('css', 'foo', mockCssFiles, (v) => {
      mockEvt()
      mockRes.push(v)
    })
    expect(mockRes.length).toBe(2)
    expect(mockEvt).toBeCalledTimes(2)
    expect(mockRes[0].vBindCode).toMatchObject({
      foo: new Set(['v-bind(foo)']),
    })
    expect(mockRes[1].vBindCode).toMatchObject({
      bar: new Set(['v-bind(bar)']),
    })
  })

  test('getVBindVariableListByPath: basic', () => {
    const mockCssFiles = new Map()
    const mockCSSFilesContent = {
      importer: new Set(),
      vBindCode: ['fooColor'],
      content: 'content foo color',
      lang: 'scss',
    }
    mockCssFiles.set(transformSymbol(resolve('/play/src/assets/test.css')), mockCSSFilesContent)
    const mockDescriptor = {
      styles: [{
        content: '@import "./assets/test";\n'
          + ' div {\n'
          + '   color: v-bind(color2);\n'
          + ' }',
      }],
    }
    const mockId = transformSymbol(resolve('/play/src/App.vue'))
    const res = getVBindVariableListByPath(mockDescriptor as any, mockId, mockCssFiles, false)
    expect(res.vbindVariableListByPath).toMatchObject(['fooColor'])
    expect([...res.injectCSSContent]).toMatchObject([{
      content: 'content foo color',
      lang: 'scss',
    }])
    expect(res).matchSnapshot()
  })

  test('getVBindVariableListByPath: server is true', () => {
    const mockCssFiles = new Map()
    const mockCSSFilesContent = {
      importer: new Set(),
      vBindCode: ['fooColor'],
      content: 'content foo color',
      lang: 'scss',
    }
    mockCssFiles.set(transformSymbol(resolve('/play/src/assets/test.css')), mockCSSFilesContent)
    const mockDescriptor = {
      styles: [{
        content: '@import "./assets/test";\n'
          + ' div {\n'
          + '   color: v-bind(color2);\n'
          + ' }',
      }],
    }
    const mockId = transformSymbol(resolve('/play/src/App.vue'))
    const res = getVBindVariableListByPath(mockDescriptor as any, mockId, mockCssFiles, true)
    expect(res.vbindVariableListByPath).toMatchObject(['fooColor'])
    expect([...res.injectCSSContent]).toMatchObject([])
    expect(res).matchSnapshot()
  })

  test('getVBindVariableListByPath: alias', () => {
    const mockCssFiles = new Map()
    const mockCSSFilesContent = {
      importer: new Set(),
      vBindCode: ['fooColor'],
      content: 'content foo color',
      lang: 'scss',
    }
    mockCssFiles.set(transformSymbol('/play/src/assets/test.css'), mockCSSFilesContent)
    const mockDescriptor = {
      styles: [{
        content: '@import "@/assets/test";\n'
            + ' div {\n'
            + '   color: v-bind(color2);\n'
            + ' }',
      }],
    }
    const mockId = transformSymbol('/play/src/App.vue')
    const res = getVBindVariableListByPath(
      mockDescriptor as any,
      mockId,
      mockCssFiles,
      false,
      { '@': '/play/src' })
    expect(res.vbindVariableListByPath).toMatchObject(['fooColor'])
    expect([...res.injectCSSContent]).toMatchObject([{
      content: 'content foo color',
      lang: 'scss',
    }])
    expect(res).matchSnapshot()
  })

  test('createCSSModule: no file with lang', () => {
    const mockCssFiles = new Map()
    const mockCSSFilesContent = {
      importer: new Set(),
      vBindCode: ['fooColor'],
    }
    mockCssFiles.set(transformSymbol(resolve('/play/src/assets/test.css')), mockCSSFilesContent)
    const mockDescriptor = {
      styles: [{
        lang: 'scss',
        content: '@import "./assets/test";\n'
          + ' div {\n'
          + '   color: v-bind(color2);\n'
          + ' }',
      }],
    }
    const mockId = transformSymbol(resolve('/play/src/App.vue'))
    const res = getVBindVariableListByPath(mockDescriptor as any, mockId, mockCssFiles, true)
    expect(res.vbindVariableListByPath).toMatchObject(['fooColor'])
    expect(res).matchSnapshot()
  })

  test('createCSSModule: multiple style tag', () => {
    const mockCssFiles = new Map()
    const mockCSSFilesContent = {
      importer: new Set(),
      vBindCode: ['fooColor'],
    }
    mockCssFiles.set(transformSymbol(resolve('/play/src/assets/test.css')), mockCSSFilesContent)
    const mockCSSFilesContent2 = {
      importer: new Set(),
      vBindCode: ['barColor'],
    }
    mockCssFiles.set(transformSymbol(resolve('/play/src/assets/test2.css')), mockCSSFilesContent2)
    const mockDescriptor = {
      styles: [{
        content: '@import "./assets/test";\n'
          + ' div {\n'
          + '   color: v-bind(color);\n'
          + ' }',
      },
      {
        content: '@import "./assets/test2";\n'
          + ' div {\n'
          + '   color: v-bind(color2);\n'
          + ' }',
      }],
    }
    const mockId = resolve('/play/src/App.vue')
    const res = getVBindVariableListByPath(mockDescriptor as any, mockId, mockCssFiles, true)
    expect(res.vbindVariableListByPath).toMatchObject(['fooColor', 'barColor'])
    expect(res).matchSnapshot()
  })

  test('createCSSModule: no style tag', () => {
    const mockCssFiles = new Map()
    mockCssFiles.set('foo', {
      importer: new Set(),
      vBindCode: ['fooColor'],
    })
    const mockDescriptor = {
      styles: [],
    }
    const res = getVBindVariableListByPath(mockDescriptor as any, 'foo', mockCssFiles, true)
    expect(res.vbindVariableListByPath.length).toBe(0)
  })
})

describe('handleAlias function', () => {
  test('no alias and no idDirPath', () => {
    const path = 'path/to/some/file'
    expect(handleAlias(path)).toBe(path)
  })

  test('no idDirPath & alias unmatched', () => {
    const path = 'path/to/some/file'
    const alias = { '@': 'alias-path/' }
    expect(handleAlias(path, alias)).toBe(path)
  })

  test('no idDirPath & alias matched', () => {
    const path = '@/path/to/some/file'
    const alias = { '@': 'alias-path' }
    expect(handleAlias(path, alias)).toBe('alias-path/path/to/some/file')
  })

  test('idDirPath & alias unmatched', () => {
    const path = 'path/to/some/file'
    const alias = { '@': 'alias-path' }
    const idDirPath = '/some/directory'
    expect(handleAlias(path, alias, idDirPath)).toContain('/some/directory/path/to/some/file')
  })

  test('idDirPath & alias matched', () => {
    const path = '@/to/some/file'
    const alias = { '@': 'alias-path' }
    const idDirPath = '/some/directory'
    expect(handleAlias(path, alias, idDirPath)).toBe('alias-path/to/some/file')
  })

  test('no alias and idDirPath', () => {
    const path = 'path/to/some/file'
    const idDirPath = '/some/directory'
    expect(handleAlias(path, undefined, idDirPath)).toContain('/some/directory/path/to/some/file')
  })
})
