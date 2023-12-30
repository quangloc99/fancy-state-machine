import {
    FSMBuilder,
    InvalidTransitionEventCause,
    FSMStates,
    FSMEvents,
    FSMFromBuilder,
    OnTransitionCallback,
    OnInvalidTransitionCallback,
    renderToMermaid,
} from '../src/index.js';

import { trafficLightFsmBuilder } from '../examples/traffic-light.js';
import { passwordFSMBuilder } from '../examples/password.js';

describe(FSMBuilder, () => {
    describe('simple trafic light', () => {
        const fsmBuilder = trafficLightFsmBuilder;
        const builtFsm = fsmBuilder.build('green-light');

        test('do `next-light` 6 times', async () => {
            const fsm = builtFsm.clone();

            await fsm.dispatch('next-light');
            expect(fsm.stateData).toEqual(['yellow-light']);
            await fsm.dispatch('next-light');
            expect(fsm.stateData).toEqual(['red-light']);
            await fsm.dispatch('next-light');
            expect(fsm.stateData).toEqual(['green-light']);

            await fsm.dispatch('next-light');
            expect(fsm.stateData).toEqual(['yellow-light']);
            await fsm.dispatch('next-light');
            expect(fsm.stateData).toEqual(['red-light']);
            await fsm.dispatch('next-light');
            expect(fsm.stateData).toEqual(['green-light']);
        });

        it('should have correct return value', async () => {
            const fsm = builtFsm.clone();
            const onTransitionMock = jest.fn();
            await fsm.fullDispatch(['next-light'], {
                onTransition: onTransitionMock,
            });
            expect(onTransitionMock.mock.calls).toMatchInlineSnapshot(`
[
  [
    [
      "green-light",
    ],
    [
      "next-light",
    ],
    [
      "yellow-light",
    ],
  ],
]
`);
        });

        test('#renderToMermaid', () => {
            const mermaidChart = renderToMermaid(fsmBuilder);
            expect(mermaidChart).toMatchSnapshot();
        });
    });

    describe('simple turnstile', () => {
        // https://en.wikipedia.org/wiki/Finite-state_machine#Example:_coin-operated_turnstile

        const fsmBuilder = FSMBuilder.create()
            .addEvents<{
                coin: [];
                push: [];
            }>()
            .addState('locked')
            .addState('unlocked')
            .addTransition('locked', 'coin', 'unlocked')
            .addTransition('unlocked', 'push', 'locked');
        type Testcase = {
            initState: 'locked' | 'unlocked';
            events: ('coin' | 'push')[];
            stateAfterEach: ('locked' | 'unlocked')[];
        };
        const testCases: Testcase[] = [
            {
                initState: 'locked',
                events: ['coin', 'push', 'coin', 'push'],
                stateAfterEach: ['unlocked', 'locked', 'unlocked', 'locked'],
            },
            {
                initState: 'locked',
                events: ['coin', 'coin', 'coin'],
                stateAfterEach: ['unlocked', 'unlocked', 'unlocked'],
            },
            {
                initState: 'unlocked',
                events: ['push', 'push', 'push'],
                stateAfterEach: ['locked', 'locked', 'locked'],
            },
            {
                initState: 'unlocked',
                events: ['push', 'push', 'coin', 'coin', 'push', 'push'],
                stateAfterEach: ['locked', 'locked', 'unlocked', 'unlocked', 'locked', 'locked'],
            },
        ];

        test.each(testCases)(
            'Test with init state = $initState, events = $events',
            async ({ initState, events, stateAfterEach }) => {
                const fsm = fsmBuilder.build(initState).setOptions({
                    ignoreInvalidTransition: true,
                });
                for (let i = 0; i < events.length; ++i) {
                    await fsm.dispatch(events[i]);
                    expect(fsm.stateData).toEqual([stateAfterEach[i]]);
                }
            }
        );

        test('#renderToMermaid', () => {
            const mermaidChart = renderToMermaid(fsmBuilder);
            expect(mermaidChart).toMatchSnapshot();
        });
    });

    // https://en.wikipedia.org/wiki/Finite-state_machine#Example:_coin-operated_turnstile
    // But with a catch: the cost to unlock will be 10 coins.
    // Each time there is a coin event, the user can insert an integer amount of coins
    describe('complex stateful turnstile', () => {
        const fsmBuilder = FSMBuilder.create()
            .addEvent<'coin', [amount: number]>()
            .addEvent<'not-enough-amount'>()
            .addEvent<'enough-amount'>()
            .addEvent<'push'>()

            .addState('locked', (_currentAmount: number) => {})
            .addState('checking?', (currentAmount: number) => {
                if (currentAmount >= 10) return ['enough-amount'];
                return ['not-enough-amount'];
            })
            .addState('unlocked')

            .addTransition('locked', 'coin', 'checking?', (currentAmount, additionalAmount) => [
                currentAmount + additionalAmount,
            ])
            .addTransition('checking?', 'not-enough-amount', 'locked')
            .addTransition('checking?', 'enough-amount', 'unlocked', () => [])
            .addTransition('unlocked', 'push', 'locked', () => [0]);

        const initialFsm = fsmBuilder.build('locked', 0).setOptions({
            ignoreInvalidTransition: true,
        });
        type TestCase = {
            events: ('push' | number)[];
            stateAfterEach: (keyof FSMStates<typeof fsmBuilder>)[];
            allEvents: (keyof FSMEvents<typeof fsmBuilder>)[];
        };

        const testcases: TestCase[] = [
            {
                events: [1, 'push', 2, 'push', 3, 'push', 4, 'push'],
                stateAfterEach: ['locked', 'locked', 'locked', 'locked', 'locked', 'locked', 'unlocked', 'locked'],
                allEvents: [
                    'coin',
                    'not-enough-amount',
                    'push',

                    'coin',
                    'not-enough-amount',
                    'push',

                    'coin',
                    'not-enough-amount',
                    'push',

                    'coin',
                    'enough-amount',
                    'push',
                ],
            },
            {
                events: [10, 'push', 5, 5, 'push', 2, 2, 2, 2, 2, 'push'],
                stateAfterEach: [
                    'unlocked',
                    'locked',
                    'locked',
                    'unlocked',
                    'locked',
                    'locked',
                    'locked',
                    'locked',
                    'locked',
                    'unlocked',
                    'locked',
                ],
                allEvents: [
                    'coin',
                    'enough-amount',
                    'push',

                    'coin',
                    'not-enough-amount',
                    'coin',
                    'enough-amount',
                    'push',

                    'coin',
                    'not-enough-amount',
                    'coin',
                    'not-enough-amount',
                    'coin',
                    'not-enough-amount',
                    'coin',
                    'not-enough-amount',
                    'coin',
                    'enough-amount',
                    'push',
                ],
            },
        ];

        test.each(testcases)('Test with events: $events', async ({ events, stateAfterEach, allEvents }) => {
            const fsm = initialFsm.clone();
            const actualStates: (keyof FSMStates<typeof fsmBuilder>)[] = [];
            const actualEvents: (keyof FSMEvents<typeof fsmBuilder>)[] = [];
            const onTransition: OnTransitionCallback<typeof fsm> = (_src, evt, _dst) => actualEvents.push(evt[0]);
            const onInvalidTransition: OnInvalidTransitionCallback<typeof fsm> = (_src, evt) =>
                actualEvents.push(evt[0]);

            for (const e of events) {
                if (typeof e === 'number') {
                    await fsm.fullDispatch(['coin', e], {
                        onTransition,
                        onInvalidTransition,
                    });
                } else {
                    await fsm.fullDispatch([e], {
                        onTransition,
                        onInvalidTransition,
                    });
                }
                actualStates.push(fsm.stateData[0]);
            }
            expect(actualStates).toEqual(stateAfterEach);
            expect(actualEvents).toEqual(allEvents);
        });

        test('#renderToMermaid', () => {
            const mermaidChart = renderToMermaid(fsmBuilder);
            expect(mermaidChart).toMatchSnapshot();
        });
    });

    // a calculator consist of buttons from 0 to 9, plus (+) sign, minus (-) sign, multiply (*) sign and equal (=) sign.
    // This calculator accept this sequence of button pressing, and evaluate the expression, with multiplication
    // having higher precedence.
    // Note that 2 consecutive signs are not allowed. This check is encoded right in the FSM.
    describe('simple calculator', () => {
        const fsmBuilder = FSMBuilder.create()
            .addEvent<'+'>()
            .addEvent<'-'>()
            .addEvent<'*'>()
            .addEvent<'='>()

            .addEvent<'digit', [d: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9]>()
            .addState('start-entering', (_currentSum: bigint, _currentTerm: bigint) => {})
            .addState('entering', (_currentSum: bigint, _currentTerm: bigint, _currentOperand: bigint) => {})
            .addState<'result!', [result: bigint]>('result!')

            .addTransition('entering', '+', 'start-entering', (currentSum, currentTerm, currentOperand) => {
                currentSum += currentTerm * currentOperand;
                currentTerm = 1n;
                return [currentSum, currentTerm];
            })
            .addTransition('entering', '-', 'start-entering', (currentSum, currentTerm, currentOperand) => {
                currentSum += currentTerm * currentOperand;
                currentTerm = -1n;
                return [currentSum, currentTerm];
            })
            .addTransition('entering', '*', 'start-entering', (currentSum, currentTerm, currentOperand) => {
                currentTerm *= currentOperand;
                return [currentSum, currentTerm];
            })
            .addTransition('entering', 'digit', 'entering', (currentSum, currentTerm, currentOperand, digit) => {
                currentOperand = currentOperand * 10n + BigInt(digit);
                return [currentSum, currentTerm, currentOperand];
            })
            .addTransition('start-entering', 'digit', 'entering', (currentSum, currentTerm, digit) => {
                return [currentSum, currentTerm, BigInt(digit)];
            })
            .addTransition('entering', '=', 'result!', (currentSum, currentTerm, currentOperand) => {
                currentSum += currentTerm * currentOperand;
                return [currentSum];
            });
        const initialFsm = fsmBuilder.build('start-entering', 0n, 1n);

        type TestCase = {
            sequence: string;
            result: bigint;
        };

        const testcases: TestCase[] = [
            {
                sequence: '0=',
                result: 0n,
            },
            {
                sequence: '1+2=',
                result: 3n,
            },
            {
                sequence: '69-420=',
                result: 69n - 420n,
            },
            {
                sequence: '1+2+3+4+5+6+7+8+9+10=',
                result: BigInt(1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10),
            },
            {
                sequence: '1-2+3-4+5-6+7-8+9-10=',
                result: BigInt(1 - 2 + 3 - 4 + 5 - 6 + 7 - 8 + 9 - 10),
            },
            {
                sequence: '1*2-3*4*5+6*7*8-9*10*11+12*13*14=',
                result: BigInt(1 * 2 - 3 * 4 * 5 + 6 * 7 * 8 - 9 * 10 * 11 + 12 * 13 * 14),
            },
            {
                sequence: '0-2*3*4*5*6*7*8*9*10*11*12*13*14*15*16*17*18*19*20=',
                result: -Array(20)
                    .fill(0)
                    .map((_, index) => BigInt(index + 1))
                    .reduce((s, a) => s * a, 1n),
            },
            {
                sequence: '314159265358979=',
                result: 314159265358979n,
            },
            {
                sequence: '314+15-9*2*653-58*979=',
                result: BigInt(314 + 15 - 9 * 2 * 653 - 58 * 979),
            },
            {
                sequence: '69*0=',
                result: 0n,
            },
            {
                sequence: '0*69=',
                result: 0n,
            },
            {
                sequence: '420*0+0*69=',
                result: 0n,
            },
        ];

        async function evaluateSingleChar(fsm: FSMFromBuilder<typeof fsmBuilder>, ch: string) {
            switch (ch) {
                case '+':
                    await fsm.dispatch('+');
                    break;
                case '-':
                    await fsm.dispatch('-');
                    break;
                case '*':
                    await fsm.dispatch('*');
                    break;
                case '=':
                    await fsm.dispatch('=');
                    break;
                default:
                    if (ch < '0' || ch > '9') {
                        throw new Error('Invalid digit');
                    }
                    await fsm.dispatch('digit', parseInt(ch) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9);
            }
        }

        test.each(testcases)('$sequence $result', async ({ sequence, result }) => {
            const fsm = initialFsm.clone();
            for (const ch of sequence) {
                await evaluateSingleChar(fsm, ch);
                expect(fsm.stateData).toMatchSnapshot();
            }
            expect(fsm.stateData).toEqual(['result!', result]);
        });

        type FailTestCase = {
            sequence: string;
            sourceState: keyof FSMStates<typeof fsmBuilder>;
            event: keyof FSMEvents<typeof fsmBuilder>;
        };
        const failTestCases: FailTestCase[] = [
            {
                sequence: '1=1',
                sourceState: 'result!',
                event: 'digit',
            },
            {
                sequence: '1==1',
                sourceState: 'result!',
                event: '=',
            },
            {
                sequence: '0=+',
                sourceState: 'result!',
                event: '+',
            },
            {
                sequence: '0=-',
                sourceState: 'result!',
                event: '-',
            },
            {
                sequence: '0=*',
                sourceState: 'result!',
                event: '*',
            },
            {
                sequence: '1++',
                sourceState: 'start-entering',
                event: '+',
            },
            {
                sequence: '2--',
                sourceState: 'start-entering',
                event: '-',
            },
            {
                sequence: '*',
                sourceState: 'start-entering',
                event: '*',
            },
            {
                sequence: '1*-1=',
                sourceState: 'start-entering',
                event: '-',
            },
            {
                sequence: '1+=1',
                sourceState: 'start-entering',
                event: '=',
            },
        ];

        test.each(failTestCases)(
            'Fail test: $sequence (error on state "$sourceState" when "$event" is fired)',
            async ({ sequence, sourceState, event }) => {
                const fsm = initialFsm.clone();
                let err: unknown = undefined;

                try {
                    for (const ch of sequence) {
                        await evaluateSingleChar(fsm, ch);
                    }
                } catch (e) {
                    err = e;
                }

                const errorCause = fsm.getErrorCause(err, InvalidTransitionEventCause);
                expect(errorCause).toBeDefined();
                expect(errorCause?.fromState[0]).toBe(sourceState);
                expect(errorCause?.event[0]).toBe(event);
            }
        );

        test('#renderToMermaid', () => {
            const mermaidChart = renderToMermaid(fsmBuilder);
            expect(mermaidChart).toMatchSnapshot();
        });
    });

    describe('password', () => {
        type Digit = 1 | 2 | 3 | 4;
        const fsmBuilder = passwordFSMBuilder;
        const initialFsm = fsmBuilder.build('start');

        beforeAll(async () => {
            await initialFsm.drain();
        });

        async function consumPassword(fsm: typeof initialFsm, password: [Digit, Digit, Digit, Digit]) {
            await fsm.dispatch('digit', password[0]);
            await fsm.dispatch('digit', password[1]);
            await fsm.dispatch('digit', password[2]);
            await fsm.dispatch('digit', password[3]);
        }

        it('should unlock on correct password', async () => {
            const fsm = initialFsm.clone();
            await consumPassword(fsm, [4, 2, 1, 3]);
            expect(fsm.stateData).toEqual(['unlocked!']);
        });

        const testPasswords = [
            [1, 2, 3, 4],
            [1, 2, 1, 2],
            [1, 1, 1, 1],
            [2, 2, 2, 2],
            [3, 3, 3, 3],
            [4, 4, 4, 4],
            [4, 3, 2, 1],
            [1, 3, 2, 4],
        ] as const;

        test.each(testPasswords)('Should fail on incorrect password %d,%d,%d,%d', async (...pass) => {
            const fsm = initialFsm.clone();
            await consumPassword(fsm, pass);
            expect(fsm.stateData[0]).toEqual('fail!');
        });

        test('#renderToMermaid', () => {
            const mermaidChart = renderToMermaid(fsmBuilder, {
                direction: 'LR',
                subgraphNameSeparator: '.',
            });
            expect(mermaidChart).toMatchSnapshot();
        });
    });

    describe('base64 encoder/decoder UI', () => {
        function createFSMForFunction(fn: (input: string) => Promise<string>) {
            return FSMBuilder.create()
                .addEvent<'success', [result: string]>()
                .addEvent<'error', [e: unknown]>()
                .addEvent<'redirect'>()

                .addState('checking?', async (input: string) => {
                    return fn(input)
                        .then((res) => ['success', res] as const)
                        .catch((e: unknown) => ['error', e] as const);
                })
                .addState('resolved', (_result: string) => ['redirect'])
                .addState('rejected', (_e: unknown) => ['redirect'])

                .addTransition('checking?', 'success', 'resolved', (_, res) => [res])
                .addTransition('checking?', 'error', 'rejected', (_, e) => [e]);
        }

        const fsmBuilder = FSMBuilder.create()
            .addState('choose-action')
            .addEvent<'encode-base-64', [inp: string]>()
            .addEvent<'decode-base-64', [inp: string]>()

            .addState('result!', (_res: string) => {})
            .addState('error!', (_e: string) => {})
            .addEvent<'continue'>()
            .addTransition('result!', 'continue', 'choose-action', () => [])
            .addTransition('error!', 'continue', 'choose-action', () => [])

            .embed(createFSMForFunction((str) => Promise.resolve(btoa(str))).scope('encode.'))
            .embed(createFSMForFunction((str) => Promise.resolve(atob(str))).scope('decode.'))

            .addTransition('choose-action', 'encode-base-64', 'encode.checking?')
            .addTransition('choose-action', 'decode-base-64', 'decode.checking?')
            .addTransition('encode.resolved', 'redirect', 'result!')
            .addTransition('decode.resolved', 'redirect', 'result!')
            .addTransition('encode.rejected', 'redirect', 'error!')
            .addTransition('decode.rejected', 'redirect', 'error!');

        const initialFsm = fsmBuilder.build('choose-action');

        type TestCase = {
            raw: string;
            encoded: string;
        };

        function createTestCase(raw: string): TestCase {
            return {
                raw,
                encoded: btoa(raw),
            };
        }

        const testcases = [
            createTestCase('a'),
            createTestCase('b'),
            createTestCase('c'),
            createTestCase('69'),
            createTestCase('420'),
            createTestCase('177,013'),
            createTestCase('A quick brown fox jumped over the lazy dog.'),
        ];

        test.each(testcases)('Test "$raw" <=> "$encoded"', async ({ raw, encoded }) => {
            const fsm = initialFsm.clone();
            await fsm.dispatch('encode-base-64', raw);
            expect(fsm.stateData).toEqual(['result!', encoded]);
            await fsm.dispatch('continue');
            await fsm.dispatch('decode-base-64', encoded);
            expect(fsm.stateData).toEqual(['result!', raw]);
        });

        type FailTestCase = {
            encoded: string;
        };
        const failTestCases: FailTestCase[] = [
            {
                encoded: '????',
            },
            {
                encoded: (() => {
                    const s = btoa('a');
                    // remove padding
                    return s.slice(0, s.length - 1);
                })(),
            },
        ];

        test.each(failTestCases)('Fail test encoded: "$encoded"', async ({ encoded }) => {
            const fsm = initialFsm.clone();
            await fsm.dispatch('decode-base-64', encoded);
            // console.log(fsm.stateData);
            expect(fsm.stateData[0]).toBe('error!');
        });

        test('#renderToMermaid', () => {
            const mermaidChart = renderToMermaid(fsmBuilder, {
                direction: 'TD',
                subgraphNameSeparator: '.',
            });
            expect(mermaidChart).toMatchSnapshot();
        });
    });

    test('render multi-subgraph FSM', () => {
        const f1 = FSMBuilder.create().addEvent<'x'>().addState('foo').addState('bar').addTransition('foo', 'x', 'bar');
        const f2 = FSMBuilder.create()
            .addEvent<'y'>()
            .embed(f1.clone().scope('foo/'))
            .embed(f1.clone().scope('bar/'))
            .addTransition('foo/bar', 'y', 'bar/foo');
        const f3 = FSMBuilder.create()
            .addEvent<'z'>()
            .embed(f2.clone().scope('foo/'))
            .embed(f2.clone().scope('bar/'))
            .addTransition('foo/bar/bar', 'z', 'bar/foo/foo');
        const f4 = FSMBuilder.create()
            .addEvent<'t'>()
            .embed(f3.clone().scope('foo/'))
            .embed(f3.clone().scope('bar/'))
            .addTransition('foo/bar/bar/bar', 't', 'bar/foo/foo/foo');
        const chart = renderToMermaid(f4, {
            direction: 'RL',
            subgraphNameSeparator: '/',
        });
        expect(chart).toMatchSnapshot();
    });
});
