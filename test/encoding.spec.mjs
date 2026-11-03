import assert from 'node:assert/strict'
import { escapeHtml, iconSrc } from '../src/utils/encoding.js'

describe('escapeHtml', () => {
  it('escapes every HTML metacharacter', () => {
    assert.equal(
      escapeHtml(`<img src=x onerror="alert('1')">&`),
      '&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;'
    )
  })

  it('leaves already-safe text untouched', () => {
    assert.equal(escapeHtml('Apple Store'), 'Apple Store')
  })

  it('renders nullish input as an empty string', () => {
    assert.equal(escapeHtml(null), '')
    assert.equal(escapeHtml(undefined), '')
  })
})

describe('iconSrc', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"></svg>'

  it('re-encodes SVG markup as a base64 data URL', () => {
    const src = iconSrc(svg)
    assert.ok(src.startsWith('data:image/svg+xml;base64,'))
    assert.equal(Buffer.from(src.split(',')[1], 'base64').toString(), svg)
  })

  it('keeps script and event handlers inside the image, never as markup', () => {
    const hostile = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">' +
      '<script>alert(2)</script><rect width="10" height="10"/></svg>'
    const src = iconSrc(hostile)
    assert.ok(src.startsWith('data:image/svg+xml;base64,'))
    assert.ok(!src.includes('<'))
    assert.ok(!src.includes('onload='))
    assert.equal(Buffer.from(src.split(',')[1], 'base64').toString(), hostile)
  })

  it('passes through http(s) and image data URLs', () => {
    assert.equal(iconSrc('https://example.com/icon.svg'), 'https://example.com/icon.svg')
    assert.equal(iconSrc('http://example.com/icon.png'), 'http://example.com/icon.png')
    assert.equal(iconSrc('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA')
  })

  it('rejects schemes that could execute', () => {
    assert.equal(iconSrc('javascript:alert(1)'), '')
    assert.equal(iconSrc('  javascript:alert(1)  '), '')
    assert.equal(iconSrc('data:text/html;base64,PHNjcmlwdD4='), '')
    assert.equal(iconSrc('vbscript:msgbox(1)'), '')
  })

  it('rejects non-SVG markup and empty input', () => {
    assert.equal(iconSrc('<img src=x onerror=alert(1)>'), '')
    assert.equal(iconSrc(''), '')
    assert.equal(iconSrc(null), '')
    assert.equal(iconSrc(undefined), '')
    assert.equal(iconSrc({}), '')
  })
})
