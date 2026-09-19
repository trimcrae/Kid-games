// No browser: exercise image loading, retry and out-of-order network callbacks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

function fixture() {
  const requests = [];
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.attributes = {}; }
    get firstChild() { return this.children[0]; }
    appendChild(child) { this.children.push(child); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
  }
  class Image extends Element {
    constructor() { super('img'); }
    set src(value) { this.url = value; requests.push(this); }
  }
  const context = { window: {}, Image, document: { createElement: tag => new Element(tag) } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../games/adventure/images.js'), 'utf8'), context);
  return { show: context.window.AdventureImages.show, container: new Element('div'), requests };
}

test('loading contains no illustration until the requested generated image loads', () => {
  const { show, container, requests } = fixture();
  show(container, 'one.webp', 'scene-img');
  const frame = container.firstChild;
  assert.equal(frame.firstChild.attributes.role, 'status');
  assert.equal(frame.firstChild.textContent, 'Loading picture…');
  assert.equal(requests[0].url, 'one.webp');
  requests[0].onload();
  assert.equal(frame.firstChild, requests[0]);
  assert.equal(frame.firstChild.className, 'scene-img');
});

test('failed image can be retried with pointer or keyboard without leaving the page', () => {
  for (const key of [null, 'Enter', ' ']) {
    const { show, container, requests } = fixture();
    show(container, 'one.webp', 'scene-img');
    requests[0].onerror();
    const button = container.firstChild.firstChild;
    assert.equal(button.attributes.role, 'button');
    assert.equal(button.tabIndex, 0);
    let stopped = false, prevented = false;
    const event = { key, stopPropagation() { stopped = true; }, preventDefault() { prevented = true; } };
    if (key) button.onkeydown(event); else button.onclick(event);
    assert(stopped);
    if (key) assert(prevented);
    assert.equal(requests.length, 2);
    assert.equal(requests[1].url, 'one.webp');
    requests[1].onload();
    assert.equal(container.firstChild.firstChild, requests[1]);
  }
});

test('late success or failure cannot overwrite a newer page, even when revisiting the same URL', () => {
  for (const callback of ['onload', 'onerror']) {
    const { show, container, requests } = fixture();
    show(container, 'one.webp', 'scene-img');
    show(container, 'two.webp', 'scene-img');
    show(container, 'one.webp', 'scene-img');
    const latest = container.firstChild;
    requests[2].onload();
    requests[0][callback]();
    requests[1][callback]();
    assert.equal(container.firstChild, latest);
    assert.equal(latest.firstChild, requests[2]);
  }
});

test('cover failure keeps its parent story button usable without a nested button', () => {
  const { show, container, requests } = fixture();
  show(container, 'cover.webp', 'cover-img');
  requests[0].onerror();
  const status = container.firstChild.firstChild;
  assert.equal(status.attributes.role, 'status');
  assert.equal(status.textContent, 'Open story');
  assert.equal(status.onclick, undefined);
});

test('missing image is explicit and never requests the document URL or invokes vector art', () => {
  const { show, container, requests } = fixture();
  show(container, undefined, 'scene-img');
  assert.equal(requests.length, 0);
  assert.equal(container.firstChild.firstChild.attributes.role, 'button');
});
