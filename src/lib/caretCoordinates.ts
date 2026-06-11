// Derived from textarea-caret-position utility to support exact cursor coordinate offsets
export function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'borderStyle',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
    'tabSize',
    'MozTabSize',
  ];

  const isBrowser = typeof window !== 'undefined';
  if (!isBrowser) return { top: 0, left: 0, height: 0 };

  const div = document.createElement('div');
  div.id = 'input-textarea-caret-position-mirror-div';
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(element);

  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  style.position = 'absolute';
  style.visibility = 'hidden';

  properties.forEach(prop => {
    style[prop as any] = computed[prop as any];
  });

  div.textContent = element.value.substring(0, position);
  
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.';
  div.appendChild(span);

  const elementRect = element.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();

  const top = spanRect.top - divRect.top;
  const left = spanRect.left - divRect.left;
  const height = spanRect.height;

  document.body.removeChild(div);

  return {
    top: elementRect.top + top - element.scrollTop,
    left: elementRect.left + left - element.scrollLeft,
    height
  };
}
