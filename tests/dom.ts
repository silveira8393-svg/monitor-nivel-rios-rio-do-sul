import { JSDOM } from 'jsdom';

export const dom = new JSDOM('<!doctype html><html><body><button id="opener">Histórico</button><div id="root"></div></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
