import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, relative, sep } from 'node:path'
import { mount } from '@vue/test-utils'
import { ESLint } from 'eslint'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { h } from 'vue'

const require = createRequire(import.meta.url)
const vueRequire = createRequire(require.resolve('@vue/test-utils'))
let directory: string

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'shodan-toolchain-'))
})

afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

describe('security override consumer compatibility', () => {
  it('discovers brace/globstar paths and honors ESLint ignores and rules', async () => {
    await mkdir(join(directory, 'src/nested'), { recursive: true })
    await mkdir(join(directory, 'dist'))
    await Promise.all([
      writeFile(join(directory, 'src/one.ts'), 'debugger;'),
      writeFile(join(directory, 'src/nested/two.js'), 'const value = 1;'),
      writeFile(join(directory, 'src/ignored.test.ts'), 'debugger;'),
      writeFile(join(directory, 'dist/ignored.js'), 'debugger;')
    ])
    const eslint = new ESLint({
      cwd: directory,
      overrideConfigFile: true,
      overrideConfig: [
        { ignores: ['**/*.test.ts', 'dist/**'] },
        { files: ['**/*.{js,ts}'], rules: { 'no-debugger': 'error' } }
      ]
    })
    const results = await eslint.lintFiles(['{src,dist}/**/*.{js,ts}'])
    expect(
      results.map(({ filePath }) => relative(directory, filePath).split(sep).join('/')).sort()
    ).toEqual(['src/nested/two.js', 'src/one.ts'])
    expect(results.flatMap(({ messages }) => messages.map(({ ruleId }) => ruleId))).toEqual([
      'no-debugger'
    ])
  })

  it('keeps Vue wrapper HTML formatting stable after dependency overrides', () => {
    const wrapper = mount({ render: () => h('section', h('div', 'hello')) })
    try {
      expect(wrapper.html()).toBe('<section>\n  <div>hello</div>\n</section>')
    } finally {
      wrapper.unmount()
    }
  })

  it('expands CLI globs and applies matching EditorConfig indentation', async () => {
    await mkdir(join(directory, 'src/nested'), { recursive: true })
    await writeFile(
      join(directory, '.editorconfig'),
      'root = true\n\n[*.{js,ts}]\nindent_style = space\nindent_size = 4\n'
    )
    const file = join(directory, 'src/nested/example.js')
    await writeFile(file, 'function greet(){return 1;}')
    const manifestPath = vueRequire.resolve('js-beautify/package.json')
    const { bin } = vueRequire('js-beautify/package.json')
    execFileSync(
      process.execPath,
      [
        join(dirname(manifestPath), bin['js-beautify']),
        '--editorconfig',
        '--replace',
        'src/**/*.js'
      ],
      { cwd: directory, encoding: 'utf8', timeout: 10000 }
    )
    expect(await readFile(file, 'utf8')).toContain('\n    return 1;\n}')
  })
})
