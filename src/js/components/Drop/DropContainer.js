import React, { forwardRef, useContext, useEffect, useMemo } from 'react';
import { ThemeContext } from 'styled-components';
import { ContainerTargetContext } from '../../contexts/ContainerTargetContext';
import { FocusedContainer } from '../FocusedContainer';
import {
  backgroundIsDark,
  findScrollParents,
  parseMetricToNum,
  PortalContext,
  useForwardedRef,
} from '../../utils';
import { Keyboard } from '../Keyboard';

import { StyledDrop } from './StyledDrop';
import { OptionsContext } from '../../contexts/OptionsContext';
import { useThemeValue } from '../../utils/useThemeValue';

// using react synthetic event to be able to stop propagation that
// would otherwise close the layer on ESC.
const preventLayerClose = (event) => {
  const key = event.keyCode ? event.keyCode : event.which;

  if (key === 27) {
    event.stopPropagation();
  }
};

// Gets the closest ancestor positioned element
const getParentNode = (element) => element.offsetParent ?? element.parentNode;

// return the containing block
const getContainingBlock = (element) => {
  let currentNode = getParentNode(element);
  while (
    currentNode instanceof window.HTMLElement &&
    !['html', 'body'].includes(currentNode.nodeName.toLowerCase())
  ) {
    const css = window.getComputedStyle(currentNode);
    // This is non-exhaustive but covers the most common CSS properties that
    // create a containing block.
    // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block
    if (
      (css.transform ? css.transform !== 'none' : false) ||
      (css.perspective ? css.perspective !== 'none' : false) ||
      (css.backdropFilter ? css.backdropFilter !== 'none' : false) ||
      css.contain === 'paint' ||
      ['transform', 'perspective'].includes(css.willChange) ||
      css.willChange === 'filter' ||
      (css.filter ? css.filter !== 'none' : false)
    ) {
      return currentNode;
    }
    currentNode = currentNode?.parentNode;
  }
  return null;
};

const defaultAlign = { top: 'top', left: 'left' };

const DropContainer = forwardRef(
  (
    {
      a11yTitle,
      'aria-label': ariaLabel,
      align = defaultAlign,
      background,
      onAlign,
      children,
      dropTarget,
      elevation,
      onClickOutside,
      onEsc,
      onKeyDown,
      overflow = 'auto',
      plain,
      responsive = true,
      restrictFocus,
      stretch = 'width',
      trapFocus,
      ...rest
    },
    ref,
  ) => {
    const containerTarget = useContext(ContainerTargetContext);
    const { theme, passThemeFlag } = useThemeValue();
    // dropOptions was created to preserve backwards compatibility
    const { drop: dropOptions } = useContext(OptionsContext);
    const portalContext = useContext(PortalContext);
    const portalId = useMemo(() => portalContext.length, [portalContext]);
    const nextPortalContext = useMemo(
      () => [...portalContext, portalId],
      [portalContext, portalId],
    );
    const dropRef = useForwardedRef(ref);

    useEffect(() => {
      const onClickDocument = (event) => {
        // determine which portal id the target is in, if any
        let clickedPortalId = null;
        let node = (event.composed && event.composedPath()[0]) || event.target;

        while (
          clickedPortalId === null &&
          node &&
          node !== document &&
          !(node instanceof ShadowRoot)
        ) {
          const attr = node.getAttribute('data-g-portal-id');
          if (attr !== null) clickedPortalId = parseInt(attr, 10);
          node = node.parentNode;
        }
        // Check if the click happened within the dropTarget
        const clickInsideDropTarget =
          (dropTarget?.current && dropTarget.current.contains(event.target)) ||
          (dropTarget &&
            typeof dropTarget.contains === 'function' &&
            dropTarget.contains(event.target));

        if (
          (!clickInsideDropTarget && clickedPortalId === null) ||
          portalContext.indexOf(clickedPortalId) !== -1
        ) {
          onClickOutside(event);
        }
      };

      if (onClickOutside) {
        document.addEventListener('mousedown', onClickDocument);
      }

      return () => {
        if (onClickOutside) {
          document.removeEventListener('mousedown', onClickDocument);
        }
      };
    }, [onClickOutside, containerTarget, portalContext, dropTarget]);

    useEffect(() => {
      const target = dropTarget?.current || dropTarget;

      const notifyAlign = () => {
        const styleCurrent = dropRef?.current?.style;
        const alignControl = styleCurrent?.top !== '' ? 'top' : 'bottom';

        onAlign(alignControl);
      };

      // We try to preserve the maxHeight as changing it causes any scroll
      // position to be lost. We set the maxHeight on mount and if the window
      // is resized.
      const place = (preserveHeight) => {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const container = dropRef.current;
        if (container && target) {
          // clear prior styling
          container.style.left = '';
          container.style.top = '';
          container.style.bottom = '';
          container.style.width = '';
          if (!preserveHeight) {
            container.style.maxHeight = '';
          }
          // get bounds
          const targetRect = target.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          // determine width
          let width;
          if (stretch) {
            width = Math.min(
              stretch === 'align'
                ? Math.min(targetRect.width, containerRect.width)
                : Math.max(targetRect.width, containerRect.width),
              windowWidth,
            );
          } else {
            width = Math.min(containerRect.width, windowWidth);
          }
          // set left position
          let left;
          if (align.left) {
            if (align.left === 'left') {
              ({ left } = targetRect);
            } else if (align.left === 'right') {
              left = targetRect.left + targetRect.width;
            }
          } else if (align.right) {
            if (align.right === 'left') {
              left = targetRect.left - width;
            } else if (align.right === 'right') {
              left = targetRect.left + targetRect.width - width;
            }
          } else {
            left = targetRect.left + targetRect.width / 2 - width / 2;
          }
          if (left + width > windowWidth) {
            left -= left + width - windowWidth;
          } else if (left < 0) {
            left = 0;
          }
          // set top or bottom position
          let top;
          let bottom;
          let maxHeight = containerRect.height;

          /* If responsive is true and the Drop doesn't have enough room
            to be fully visible and there is more room in the other
            direction, change the Drop to display above/below. If there is
            less room in the other direction leave the Drop in its current
            position. */
          if (
            responsive &&
            // drop is above target
            align.bottom === 'top' &&
            // drop is overflowing above window
            targetRect.top - containerRect.height <= 0 &&
            // there is room to display the drop below the target
            targetRect.bottom + containerRect.height < windowHeight
          ) {
            // top of drop is aligned to bottom of target
            top = targetRect.bottom;
            maxHeight = top;
          } else if (
            responsive &&
            // top of drop is aligned to top of target
            align.top === 'top' &&
            // drop is overflowing below window
            targetRect.top + containerRect.height >= windowHeight &&
            // height of the drop is larger than the target.
            targetRect.top + containerRect.height > targetRect.bottom &&
            // there is room to display the drop above the target
            targetRect.bottom - containerRect.height > 0
          ) {
            // bottom of drop is aligned to bottom of target
            bottom = targetRect.bottom;
            maxHeight = top;
          } else if (
            responsive &&
            // top of drop is aligned to bottom of target
            align.top === 'bottom' &&
            // drop is overflowing below window
            targetRect.bottom + containerRect.height >= windowHeight &&
            // there is room to display the drop above the target
            targetRect.top - containerRect.height > 0
          ) {
            // bottom of drop is aligned to top of target
            bottom = targetRect.top;
            maxHeight = bottom;
          } else if (
            responsive &&
            // bottom of drop is aligned to bottom of target
            align.bottom === 'bottom' &&
            // drop is overflowing above window
            targetRect.bottom - containerRect.height <= 0 &&
            // height of the drop is larger than the target.
            targetRect.bottom - containerRect.height > targetRect.top &&
            // there is room to display the drop below the target
            targetRect.top + containerRect.height > 0
          ) {
            // top of drop is aligned to top of target
            top = targetRect.top;
            maxHeight = bottom;
          } else if (align.top === 'top') {
            top = targetRect.top;
            maxHeight = windowHeight - top;
          } else if (align.top === 'bottom') {
            top = targetRect.bottom;
            maxHeight = windowHeight - top;
          } else if (align.bottom === 'top') {
            bottom = targetRect.top;
            maxHeight = bottom;
          } else if (align.bottom === 'bottom') {
            bottom = targetRect.bottom;
            maxHeight = bottom;
          } else {
            top =
              targetRect.top + targetRect.height / 2 - containerRect.height / 2;
          }

          let containingBlock;
          let containingBlockRect;
          // dropOptions was created to preserve backwards compatibility
          if (dropOptions?.checkContainingBlock) {
            // return the containing block for absolute elements or `null`
            // for fixed elements
            containingBlock = getContainingBlock(container);
            containingBlockRect = containingBlock?.getBoundingClientRect();
          }

          // compute viewport offsets
          const viewportOffsetLeft = containingBlockRect?.left ?? 0;
          const viewportOffsetTop = containingBlockRect?.top ?? 0;
          const viewportOffsetBottom =
            containingBlockRect?.bottom ?? windowHeight;

          const containerOffsetLeft = containingBlock?.scrollLeft ?? 0;
          const containerOffsetTop = containingBlock?.scrollTop ?? 0;

          container.style.left = `${
            left - viewportOffsetLeft + containerOffsetLeft
          }px`;

          if (stretch) {
            // offset width by 0.1 to avoid a bug in ie11 that
            // unnecessarily wraps the text if width is the same
            // NOTE: turned off for now
            container.style.width = `${width + 0.1}px`;
          }
          // the (position:absolute + scrollTop)
          // is presenting issues with desktop scroll flickering
          if (top !== '') {
            container.style.top = `${
              top - viewportOffsetTop + containerOffsetTop
            }px`;
          }
          if (bottom !== '') {
            container.style.bottom = `${
              viewportOffsetBottom - bottom - containerOffsetTop
            }px`;
          }
          if (!preserveHeight) {
            if (theme.drop && theme.drop.maxHeight) {
              maxHeight = Math.min(
                maxHeight,
                parseMetricToNum(theme.drop.maxHeight),
              );
            }
            container.style.maxHeight = `${maxHeight}px`;
          }
        }
        if (onAlign) notifyAlign();
      };

      let scrollParents;

      const addScrollListeners = () => {
        scrollParents = findScrollParents(target);
        scrollParents.forEach((scrollParent) =>
          scrollParent.addEventListener('scroll', place),
        );
      };

      const removeScrollListeners = () => {
        scrollParents.forEach((scrollParent) =>
          scrollParent.removeEventListener('scroll', place),
        );
        scrollParents = [];
      };

      const onResize = () => {
        removeScrollListeners();
        addScrollListeners();
        place(false);
      };

      addScrollListeners();
      window.addEventListener('resize', onResize);

      place(false);

      return () => {
        removeScrollListeners();
        window.removeEventListener('resize', onResize);
      };
    }, [
      align,
      containerTarget,
      onAlign,
      dropTarget,
      portalContext,
      portalId,
      responsive,
      restrictFocus,
      stretch,
      theme.drop,
      dropRef,
      dropOptions,
    ]);

    // Once drop is open the focus will be put on the drop container
    // if restrictFocus is true. If the caller put focus
    // on an element already, we honor that. Otherwise, we put
    // the focus on the drop container.
    useEffect(() => {
      if (restrictFocus) {
        const dropContainer = dropRef.current;
        if (dropContainer) {
          if (!dropContainer.contains(document.activeElement)) {
            dropContainer.focus();
          }
        }
      }
    }, [dropRef, restrictFocus]);

    let content = (
      <StyledDrop
        aria-label={a11yTitle || ariaLabel}
        ref={dropRef}
        background={background}
        plain={plain}
        elevation={
          !plain
            ? elevation ||
              theme.global.drop.elevation ||
              theme.global.drop.shadowSize || // backward compatibility
              'small'
            : undefined
        }
        tabIndex="-1"
        alignProp={align}
        overflow={overflow}
        data-g-portal-id={portalId}
        {...passThemeFlag}
        {...rest}
      >
        {children}
      </StyledDrop>
    );

    const themeContextValue = useMemo(() => {
      let dark;
      if (background || theme.global.drop.background) {
        dark = backgroundIsDark(
          background || theme.global.drop.background,
          theme,
        );
      }
      return { ...theme, dark };
    }, [background, theme]);

    const { dark } = themeContextValue;
    if (dark !== undefined && dark !== theme.dark) {
      content = (
        <ThemeContext.Provider value={themeContextValue}>
          {content}
        </ThemeContext.Provider>
      );
    }

    return (
      <PortalContext.Provider value={nextPortalContext}>
        <FocusedContainer
          onKeyDown={onEsc && preventLayerClose}
          trapFocus={trapFocus}
        >
          <Keyboard
            // should capture keyboard event before other elements,
            // such as Layer
            // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
            capture
            onEsc={
              onEsc
                ? (event) => {
                    event.stopPropagation();
                    onEsc(event);
                  }
                : undefined
            }
            onKeyDown={onKeyDown}
            target="document"
          >
            {content}
          </Keyboard>
        </FocusedContainer>
      </PortalContext.Provider>
    );
  },
);

export { DropContainer };
