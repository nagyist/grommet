import React, { useState } from 'react';
import 'jest-styled-components';
import 'jest-axe/extend-expect';
import 'regenerator-runtime/runtime';
import '@testing-library/jest-dom';

import { axe } from 'jest-axe';
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Home } from 'grommet-icons';
import { createPortal, expectPortal } from '../../../utils/portal';

import { ThemeType } from '../../../themes';
import { Grommet, Notification, Button, Text, LayerPositionType } from '../..';

const TestNotification = ({ ...rest }) => (
  <Notification title="title" message="message" {...rest} />
);

describe('Notification', () => {
  beforeEach(createPortal);
  test('should have no accessibility violations', async () => {
    const { container, asFragment } = render(
      <Grommet>
        <Notification title="title" />
      </Grommet>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(asFragment()).toMatchSnapshot();
  });

  test('should have no accessibility violations for toast', async () => {
    const { container, asFragment } = render(
      <Grommet>
        <Notification toast title="title" message="message" />
      </Grommet>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(asFragment()).toMatchSnapshot();
  });

  test('should render outside grommet wrapper', async () => {
    const { asFragment } = render(
      <Notification title="title" message="message" />,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  test('onClose', async () => {
    const user = userEvent.setup();

    const onClose = jest.fn();
    const { asFragment } = render(
      <Grommet>
        <Notification title="Title" onClose={onClose} />
      </Grommet>,
    );

    await user.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalled();
    expect(asFragment()).toMatchSnapshot();
  });

  test('Grommet messages', () => {
    const onClose = jest.fn();
    const { asFragment } = render(
      <Grommet
        messages={{
          messages: { notification: { close: 'Clear notification' } },
        }}
      >
        <Notification title="Title" onClose={onClose} />
      </Grommet>,
    );

    expect(
      screen.getByRole('button', { name: 'Clear notification' }),
    ).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  test('messages prop', () => {
    const onClose = jest.fn();
    const { asFragment } = render(
      <Grommet>
        <Notification
          title="Title"
          onClose={onClose}
          messages={{ close: 'Clear notification' }}
        />
      </Grommet>,
    );

    expect(
      screen.getByRole('button', { name: 'Clear notification' }),
    ).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  const validPositions: LayerPositionType[] = [
    'top',
    'bottom',
    'left',
    'right',
    'start',
    'end',
    'center',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right',
  ];

  validPositions.forEach((positions) =>
    test(`position ${positions}`, () => {
      render(
        <Grommet>
          <Notification
            id="position-test"
            toast={{ position: positions }}
            title="title"
            message="message"
          />
        </Grommet>,
      );
      expectPortal('position-test').toMatchSnapshot();
    }),
  );

  test('autoClose true', async () => {
    const user = userEvent.setup({ delay: null });

    jest.useFakeTimers();
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const Test = () => {
      const [visible, setVisible] = useState(false);
      return (
        <Grommet>
          <Button
            label="Show Notification"
            onClick={() => {
              onOpen();
              setVisible(true);
            }}
          />
          {visible && (
            <Notification
              toast={{ autoClose: true }}
              title="Status Title"
              message="Messages should be at max two lines of text."
              onClose={() => {
                onClose();
                setVisible(false);
              }}
            />
          )}
        </Grommet>
      );
    };
    render(<Test />);
    await user.click(screen.getByRole('button', { name: 'Show Notification' }));
    expect(screen.getByText('Status Title')).toBeInTheDocument();
    expect(onOpen).toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(9000);
    });
    expect(onClose).toHaveBeenCalled();
  });

  test('custom time', async () => {
    const user = userEvent.setup({ delay: null });
    const time = 3000;

    jest.useFakeTimers();
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const Test = () => {
      const [visible, setVisible] = useState(false);
      return (
        <Grommet>
          <Button
            label="Show Notification"
            onClick={() => {
              onOpen();
              setVisible(true);
            }}
          />
          {visible && (
            <Notification
              toast={{ autoClose: true }}
              title="Status Title"
              message="Messages should be at max two lines of text."
              onClose={() => {
                onClose();
                setVisible(false);
              }}
              time={time}
            />
          )}
        </Grommet>
      );
    };
    render(<Test />);
    await user.click(screen.getByRole('button', { name: 'Show Notification' }));
    expect(screen.getByText('Status Title')).toBeInTheDocument();
    expect(onOpen).toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    expect(onClose).toHaveBeenCalled();
  });

  test('autoClose false', async () => {
    const user = userEvent.setup({ delay: null });

    jest.useFakeTimers();
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const Test = () => {
      const [visible, setVisible] = useState(false);
      return (
        <Grommet>
          <Button
            label="Show Notification"
            onClick={() => {
              onOpen();
              setVisible(true);
            }}
          />
          {visible && (
            <Notification
              toast={{ autoClose: false }}
              title="Status Title"
              message="Messages should be at max two lines of text."
              onClose={() => {
                onClose();
                setVisible(false);
              }}
            />
          )}
        </Grommet>
      );
    };
    render(<Test />);
    await user.click(screen.getByRole('button', { name: 'Show Notification' }));
    expect(onOpen).toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(9000);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  test('custom theme', () => {
    const theme: ThemeType = {
      notification: {
        direction: 'row',
        container: {
          pad: 'medium',
        },
        toast: {
          direction: 'column',
        },
        critical: {
          background: 'red',
          toast: {
            background: 'background-front',
          },
        },
      },
    };

    const themeTest: ThemeType = {
      notification: {
        message: {
          fill: true,
        },
        critical: {
          background: 'red',
        },
      },
    };

    const Test = () => (
      <>
        <Grommet theme={theme}>
          <TestNotification status="critical" />
          <TestNotification toast title="Toast title" status="critical" />
        </Grommet>
        <Grommet theme={themeTest}>
          <TestNotification status="critical" />
        </Grommet>
      </>
    );
    const { asFragment } = render(<Test />);

    expect(asFragment()).toMatchSnapshot();
    expect(screen.getByText('Toast title')).toBeInTheDocument();
  });

  test('actions', () => {
    render(
      <Grommet>
        <TestNotification
          actions={[{ href: '/some-link', label: 'Renew Subscription' }]}
        />
      </Grommet>,
    );

    const link = screen.getByRole('link', { name: 'Renew Subscription' });
    expect(link).toHaveAttribute('href', '/some-link');
  });

  test('multi actions', () => {
    const { asFragment } = render(
      <Grommet>
        <TestNotification
          actions={[
            { href: '/some-link', label: 'Renew Subscription' },
            {
              href: '/link',
              label: 'View More',
            },
          ]}
        />
      </Grommet>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('global', () => {
    const { asFragment } = render(
      <Grommet>
        <TestNotification global />
      </Grommet>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('status', () => {
    const { asFragment } = render(
      <Grommet>
        <TestNotification global status="normal" />
        <TestNotification global status="warning" />
        <TestNotification global status="critical" />
      </Grommet>,
    );

    expect(asFragment()).toMatchSnapshot();
  });

  test('should render custom template inside notification', () => {
    const { container } = render(
      <Grommet>
        <Notification
          title="Test title"
          message={<Text>A sample text message</Text>}
        />
      </Grommet>,
    );
    expect(container).toMatchSnapshot();
  });

  test('should render custom icon', () => {
    const { asFragment } = render(
      <Grommet>
        <TestNotification icon={<Home />} />
      </Grommet>,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  test('should render the default icon if no icon is passed', () => {
    const theme = {
      notification: {
        unknown: {
          icon: Home,
          color: 'blue',
        },
      },
    };
    const { asFragment } = render(
      <Grommet theme={theme}>
        <Notification data-testid="test" title="Test title" message="message" />
      </Grommet>,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  test('should render status and kind specific message and title colors', () => {
    const theme: ThemeType = {
      notification: {
        title: {
          color: 'blue',
        },
        message: {
          color: 'red',
        },
        normal: {
          message: {
            color: 'blue',
          },
          title: {
            color: 'red',
          },
          global: {
            title: {
              color: 'green',
            },
            message: {
              color: 'purple',
            },
          },
          toast: {
            title: {
              color: 'skyblue',
            },
            message: {
              color: 'green',
            },
          },
        },
      },
    };

    const { asFragment } = render(
      <Grommet theme={theme}>
        <Notification
          status="normal"
          title="Status Title"
          message="This is an example of message text"
        />
        <Notification
          status="normal"
          title="Status Title"
          message="This is an example of message text"
          global
        />
        <Notification
          status="normal"
          title="Status Title"
          message="This is an example of message text"
          toast
        />
      </Grommet>,
    );
    expect(asFragment()).toMatchSnapshot();
  });

  test('focus remains on second button after toast notification closes', async () => {
    jest.useFakeTimers();

    const TestComponent = () => {
      const [showNotification, setShowNotification] = useState(false);
      return (
        <Grommet>
          <Button
            label="Show Notification"
            onClick={() => setShowNotification(true)}
          />
          {showNotification && (
            <Notification
              toast
              title="Toast"
              message="This is a toast notification"
              onClose={() => setShowNotification(false)}
              time={500}
            />
          )}
          <Button label="Second Button" data-testid="second-btn" />
        </Grommet>
      );
    };

    const { getByText, getByTestId, queryByText } = render(<TestComponent />);

    // Click to show notification
    act(() => {
      fireEvent.click(getByText('Show Notification'));
    });

    // Focus the second button
    const secondBtn = getByTestId('second-btn');
    act(() => {
      secondBtn.focus();
    });
    expect(document.activeElement).toBe(secondBtn);

    // Advance timers to close the notification
    act(() => {
      jest.advanceTimersByTime(600);
    });

    // Wait for notification to close
    await waitFor(() => {
      expect(
        queryByText('This is a toast notification'),
      ).not.toBeInTheDocument();
    });

    // Focus should remain on the second button
    expect(document.activeElement).toBe(secondBtn);

    jest.useRealTimers();
  });
});
