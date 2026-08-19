import { describe, it, expect } from 'vitest'
import { inferIssueType } from '@/utils/issueClassifier'

describe('inferIssueType', () => {
  it('identifies WebGL and Three.js 3D canvas targets', () => {
    expect(inferIssueType({ renderer_type: 'webgl', element_tag: 'canvas' })).toBe('canvas_webgl')
    expect(inferIssueType({ renderer_type: 'threejs', element_tag: 'canvas' })).toBe('canvas_webgl')
    expect(inferIssueType({ canvas_context: { type: 'webgl2' } })).toBe('canvas_webgl')
    expect(inferIssueType({ element_tag: '<CANVAS>' })).toBe('canvas_webgl')
  })

  it('identifies interactive controls (buttons, inputs, forms)', () => {
    expect(inferIssueType({ element_tag: 'button' })).toBe('interaction')
    expect(inferIssueType({ element_tag: '<INPUT>', aria_role: 'textbox' })).toBe('interaction')
    expect(inferIssueType({ element_tag: 'select' })).toBe('interaction')
    expect(inferIssueType({ element_tag: 'div', aria_role: 'button' })).toBe('interaction')
    expect(inferIssueType({ element_tag: 'div', element_selector: '.btn-primary' })).toBe('interaction')
  })

  it('identifies navigation elements (links, nav bars)', () => {
    expect(inferIssueType({ element_tag: 'a' })).toBe('navigation')
    expect(inferIssueType({ element_tag: '<NAV>' })).toBe('navigation')
    expect(inferIssueType({ element_tag: 'div', aria_role: 'link' })).toBe('navigation')
    expect(inferIssueType({ element_tag: 'div', element_selector: '#main-menu a.nav-item' })).toBe('navigation')
  })

  it('identifies copy / typography elements (headings, paragraphs, labels)', () => {
    expect(inferIssueType({ element_tag: 'h1' })).toBe('copy')
    expect(inferIssueType({ element_tag: 'p', element_text: 'Welcome to our platform' })).toBe('copy')
    expect(inferIssueType({ element_tag: 'label' })).toBe('copy')
    expect(inferIssueType({ element_tag: 'blockquote' })).toBe('copy')
  })

  it('identifies visual and media rendering elements (images, svgs, videos)', () => {
    expect(inferIssueType({ element_tag: 'img' })).toBe('rendering')
    expect(inferIssueType({ element_tag: 'svg' })).toBe('rendering')
    expect(inferIssueType({ element_tag: 'video' })).toBe('rendering')
  })

  it('identifies layout and structure elements as default fallback', () => {
    expect(inferIssueType({ element_tag: 'div' })).toBe('layout')
    expect(inferIssueType({ element_tag: 'section' })).toBe('layout')
    expect(inferIssueType({ element_tag: 'main' })).toBe('layout')
  })

  it('prioritizes active console or network errors when no specific tag is matched', () => {
    expect(inferIssueType({ element_tag: 'div', console_errors: [{ message: 'Uncaught TypeError: Cannot read property of undefined' }] })).toBe('rendering')
    expect(inferIssueType({ element_tag: 'div', network_errors: [{ status: 500, url: '/api/items' }] })).toBe('rendering')
  })

  it('correctly overrides inference when user enters keyword in title or note', () => {
    expect(inferIssueType({ element_tag: 'button' }, 'Typo in button text')).toBe('copy')
    expect(inferIssueType({ element_tag: 'p' }, 'Alignment is off on mobile')).toBe('layout')
    expect(inferIssueType({ element_tag: 'div' }, '3D model shader is flickering')).toBe('canvas_webgl')
    expect(inferIssueType({ element_tag: 'h2' }, 'Broken link leads to 404')).toBe('navigation')
    expect(inferIssueType({ element_tag: 'img' }, 'Button click does not respond')).toBe('interaction')
  })
})
