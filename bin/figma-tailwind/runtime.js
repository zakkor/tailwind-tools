import { propertiesToClass } from './lib/translate.js';
import { responsive } from './lib/responsive.js';

const canvas = document.querySelector('canvas');

// Run translate/append function whenever the canvas or the left pane are clicked.
[canvas, document.querySelector('[class*="left_panel--panelContainer"]')].forEach((el) => {
  el.removeEventListener('mouseup', translateDelayed);
  el.addEventListener('mouseup', translateDelayed);
});

function translateDelayed(event) {
  window.setTimeout(() => {
    translate(event);
  }, 50);
}

function translate(event) {
  if (event.button !== 0) {
    return;
  }

  // Fix Figma `font-medium` bug
  checkIfFontMedium((hasFontMedium) => {
    translateAndAttach(hasFontMedium);
  });
}

function translateAndAttach(hasFontMedium) {
  const paneEl = document.querySelector('[class*="inspect_panels--tabularInspectionPanel"] > div > div > div > div');
  paneEl.style.display = 'flex';
  paneEl.style.flexDirection = 'column';

  // Remove previously translated elements if any.
  paneEl.querySelectorAll('button.translated, button.responsive').forEach((el) => el.remove());
  const lastPaneChild = paneEl.children[paneEl.children.length - 1];
  if (lastPaneChild.tagName === 'DIV' && lastPaneChild.classList.length === 0) {
    lastPaneChild.style.display = 'none';
  }

  // Attach translated elements to the inspector pane
  const attachTranslation = (el, classnames, position) => {
    if (!el || !classnames) {
      return;
    }
    const translatedEl = document.createElement('BUTTON');
    translatedEl.classList.add('translated');
    translatedEl.textContent = classnames;
    translatedEl.addEventListener('click', () => {
      navigator.clipboard.writeText(translatedEl.textContent);
    });
    translatedEl.style.textAlign = 'left';
    translatedEl.style.cursor = 'pointer';
    translatedEl.style.backgroundImage = 'linear-gradient(to right, #caf3ee, #dde8f9)';
    translatedEl.style.border = '1px solid #06B6D4';
    translatedEl.style.borderRadius = '6px';
    translatedEl.style.padding = '2px 8px';
    translatedEl.style.marginTop = '8px';
    translatedEl.style.display = 'block';
    translatedEl.style.alignSelf = 'self-start';
    el.insertAdjacentElement(position, translatedEl);
  };

  const { lastEl: positionEl, classnames: positionClassnames } = findPropertyGroup(paneEl, 0);
  let { lastEl: restEl, classnames: restClassnames } = findPropertyGroup(paneEl, 1);

  if (hasFontMedium) {
    restClassnames += ' font-medium';
  }

  attachResponsiveButton(paneEl, restEl, restClassnames);
  attachTranslation(positionEl, positionClassnames, 'beforebegin');
  attachTranslation(restEl, restClassnames, 'afterend');
}

function attachResponsiveButton(paneEl, insertEl, initialClassnames) {
  const responsiveEl = document.createElement('BUTTON');
  responsiveEl.classList.add('responsive');
  responsiveEl.textContent = 'Responsive';
  responsiveEl.addEventListener('click', () => {
    canvas.addEventListener(
      'click',
      () => {
        window.setTimeout(() => {
          let { classnames: restClassnames } = findPropertyGroup(paneEl, 1);
          const resp = responsive({ byClassname, breakpoints: ['md'] }, initialClassnames, restClassnames);
          navigator.clipboard.writeText(resp);
        }, 50);
      },
      { once: true }
    );
  });
  responsiveEl.style.textAlign = 'center';
  responsiveEl.style.cursor = 'pointer';
  responsiveEl.style.border = '1px solid #06B6D4';
  responsiveEl.style.color = 'white';
  responsiveEl.style.backgroundImage = 'linear-gradient(to right, #2dd4bf, #3b82f6)';
  responsiveEl.style.borderRadius = '8px';
  responsiveEl.style.width = '100px';
  responsiveEl.style.height = '25px';
  responsiveEl.style.marginTop = '18px';
  responsiveEl.style.display = 'block';
  responsiveEl.style.alignSelf = 'self-start';
  insertEl.insertAdjacentElement('afterend', responsiveEl);
}

function findPropertyGroup(paneEl, i) {
  let lineEls = [];
  const separatorEl = Array.from(paneEl.querySelectorAll('div')).filter((el) => el.classList.length === 0)?.[i];
  if (!separatorEl) {
    return {
      lastEl: null,
      classnames: null,
    };
  }

  let iteratorEl = separatorEl.nextElementSibling;
  while (true) {
    if (i === 0 && iteratorEl?.classList.length === 0) {
      break;
    }

    if (iteratorEl.tagName === 'DIV' && iteratorEl?.classList.length > 0) {
      lineEls.push(iteratorEl);
    }

    if (i === 1 && !iteratorEl.nextElementSibling) {
      break;
    }
    iteratorEl = iteratorEl.nextElementSibling;
  }

  const properties = Array.from(lineEls).map((el) => el.textContent.slice(0, -1));
  const classnames = properties
    .map((prop) => propertiesToClass(prop, byProperties)?.replace('\\', ''))
    .filter(Boolean)
    .join(' ');

  return {
    lastEl: iteratorEl,
    classnames,
  };
}

// Manually trigger a click to switch to the 'Table' pane, read the elements inside there and check if
// we can find the text "Font-style: Medium", switch the pane back to the 'Code' pane, then pass `hasFontMedium` forwards to `fn`.
// Waits a set amount of time between each action for the pane content to change.
function checkIfFontMedium(fn) {
  // Yes, this is what we've gotta do to trigger a click event. Thanks React.
  const switchPane = (pane) => {
    Object.entries(document.querySelector(`[class*="segmented_control"][data-tooltip="${pane}"]`))
      .find(([key]) => key.startsWith('__reactEventHandlers'))[1]
      .onMouseDown({ stopPropagation: () => {} });
  };

  switchPane('Table');
  window.setTimeout(() => {
    const hasFontMedium = Array.from(
      document.querySelectorAll(
        '[class*="code_inspection_panels--formattingControls"] + div .cachedSubtree[style="display: inline;"] [class*="raw_components--panel"] [class*="code_inspection_panels--inspectorRow"]'
      )
    ).some((el) => el.innerText.includes('Font style: Medium'));
    switchPane('Code');
    window.setTimeout(() => {
      fn(hasFontMedium);
    }, 15);
  }, 15);
}
