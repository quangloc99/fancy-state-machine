import { FSMBuilder, InvalidTransitionEventCause, FSMStates, FSMEvents, FSMFromBuilder } from '../src/index.js';

describe(FSMBuilder, () => {
    describe('simple trafic light', () => {
        const fsmBuilder = FSMBuilder.create()
            .addEvent<'next-light'>()
            .addState('red-light')
            .addState('green-light')
            .addState('yellow-light')
            .addTransition('red-light', 'next-light', 'green-light')
            .addTransition('green-light', 'next-light', 'yellow-light')
            .addTransition('yellow-light', 'next-light', 'red-light');

        test('do `next-light` 6 times', async () => {
            const fsm = fsmBuilder.build('green-light');

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
            const fsm = fsmBuilder.build('green-light');
            const res = await fsm.dispatch('next-light');
            expect(res).toMatchInlineSnapshot(`
{
  "eventsFired": [
    {
      "event": [
        "next-light",
      ],
      "targetState": [
        "yellow-light",
      ],
    },
  ],
}
`);
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
                const fsm = fsmBuilder.build(initState);
                for (let i = 0; i < events.length; ++i) {
                    await fsm.dispatchIgnoreInvalidTransition(events[i]);
                    expect(fsm.stateData).toEqual([stateAfterEach[i]]);
                }
            }
        );
    });

    // https://en.wikipedia.org/wiki/Finite-state_machine#Example:_coin-operated_turnstile
    // But with a catch: the cost to unlock will be 10 coins.
    // Each time there is a coin event, the user can insert an integer amount of coins
    it.todo('complex stateful turnstile');

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
            .addState<'result', [result: bigint]>('result')

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
            .addTransition('entering', '=', 'result', (currentSum, currentTerm, currentOperand) => {
                currentSum += currentTerm * currentOperand;
                return [currentSum];
            });

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
            const fsm = fsmBuilder.build('start-entering', 0n, 1n);
            for (const ch of sequence) {
                await evaluateSingleChar(fsm, ch);
                expect(fsm.stateData).toMatchSnapshot();
            }
            expect(fsm.stateData).toEqual(['result', result]);
        });

        type FailTestCase = {
            sequence: string;
            sourceState: keyof FSMStates<typeof fsmBuilder>;
            event: keyof FSMEvents<typeof fsmBuilder>;
        };
        const failTestCases: FailTestCase[] = [
            {
                sequence: '1=1',
                sourceState: 'result',
                event: 'digit',
            },
            {
                sequence: '1==1',
                sourceState: 'result',
                event: '=',
            },
            {
                sequence: '0=+',
                sourceState: 'result',
                event: '+',
            },
            {
                sequence: '0=-',
                sourceState: 'result',
                event: '-',
            },
            {
                sequence: '0=*',
                sourceState: 'result',
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
                const fsm = fsmBuilder.build('start-entering', 0n, 1n);
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
    });
});
