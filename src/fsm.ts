import { Promisable, Constructor, Simplify } from 'type-fest';

type KeyType = string;

type EmptyObject = Record<never, never>;
type AddProp<Obj extends object, PropName extends KeyType, Value> = Simplify<Obj & Record<PropName, Value>>;
type If<Cond extends boolean, IfTrueType, IfFalseType> = Cond extends true ? IfTrueType : IfFalseType;

export type StateDataMap = Record</* StateName */ KeyType, /* Data */ unknown[]>;
export type EventDataMap = Record</* EventName */ KeyType, /* Data */ unknown[]>;

const NOP_FUNC = () => {};
const ECHO_FUNC = <Params extends unknown[]>(...params: Params) => params;

export type StateDataTuple<
    States extends StateDataMap,
    StateName extends keyof States = keyof States,
> = StateName extends string ? [StateName, ...States[StateName]] : never;
export type EventDataTuple<
    Events extends EventDataMap,
    EventName extends keyof Events = keyof Events,
> = EventName extends string ? [EventName, ...Events[EventName]] : never;

export type AddScopeToStateDataMap<S extends StateDataMap, Scope extends string> = Simplify<{
    [KeyType in keyof S as KeyType extends string ? `${Scope}${KeyType}` : never]: S[KeyType];
}>;

export type EnterHandlerFunctionReturnType<E extends EventDataMap> = void | undefined | null | EventDataTuple<E>;
export type EnterHandlerFunction<E extends EventDataMap, Params extends unknown[] = unknown[]> = (
    this: void,
    ...params: Params
) => Promisable<EnterHandlerFunctionReturnType<E>>;

export type TransitionTable<States extends StateDataMap, Events extends EventDataMap> = {
    [SourceStateName in keyof States]: {
        enterHandler: EnterHandlerFunction<Events, States[SourceStateName]>;
        transitions: {
            [EventName in keyof Events]?: Transition<States, Events, SourceStateName, keyof States, EventName>;
        };
    };
};

export type Transition<
    States extends StateDataMap,
    Events extends EventDataMap,
    SourceStateName extends keyof States,
    TargetStateName extends keyof States,
    EventName extends keyof Events,
> = TargetStateName extends string
    ? {
          target: TargetStateName;
          transitionHandler: (
              this: void,
              ...params: [...States[SourceStateName], ...Events[EventName]]
          ) => Promisable<States[TargetStateName]>;
      }
    : never;

export type AnyTransitionTable = TransitionTable<StateDataMap, EventDataMap>;

export class InvalidTransitionEventCause<S extends StateDataMap, E extends EventDataMap> {
    constructor(
        readonly fromState: StateDataTuple<S>,
        readonly event: EventDataTuple<E>
    ) {}
}

type AllCauses<S extends StateDataMap, E extends EventDataMap> = InvalidTransitionEventCause<S, E>;

export type FSMOptions = {
    ignoreInvalidTransition: boolean;
};
export const DEFAULT_FSM_OPTIONS: FSMOptions = {
    ignoreInvalidTransition: false,
};

export class FSM<S extends StateDataMap, E extends EventDataMap> {
    constructor(
        readonly transitionTable: TransitionTable<S, E>,
        public stateData: StateDataTuple<S>,
        readonly options: FSMOptions = { ...DEFAULT_FSM_OPTIONS }
    ) {}

    clone(): FSM<S, E> {
        return new FSM(this.transitionTable, structuredClone(this.stateData), structuredClone(this.options));
    }

    setOptions(opts: Partial<FSMOptions>): this {
        for (const [key, val] of Object.entries(opts)) {
            if (val == undefined) continue;
            this.options[key as keyof FSMOptions] = val;
        }
        return this;
    }

    async dispatch(...event: EventDataTuple<E>) {
        return this.fullDispatch(event);
    }

    async fullDispatch(
        _event: EventDataTuple<E>,
        options?: {
            ignoreInvalidTransition?: boolean;
            onTransition?: (
                fromState: StateDataTuple<S>,
                event: EventDataTuple<E>,
                targetState: StateDataTuple<S>
            ) => void;
            onInvalidTransition?: (fromState: StateDataTuple<S>, event: EventDataTuple<E>) => void;
        }
    ): Promise<void> {
        const {
            ignoreInvalidTransition = this.options.ignoreInvalidTransition,
            onTransition = NOP_FUNC,
            onInvalidTransition = NOP_FUNC,
        } = options ?? {};

        let curEvent: EnterHandlerFunctionReturnType<E> = _event;

        while (Array.isArray(curEvent)) {
            const [eventName, ...eventData] = curEvent as EventDataTuple<E>;
            const [curStateName, ...curStateData] = this.stateData;
            const transitionData = this.transitionTable[curStateName].transitions[eventName];
            if (transitionData === undefined) {
                onInvalidTransition(this.stateData, curEvent);
                if (!ignoreInvalidTransition) {
                    throw new Error(
                        `No transition from state ${JSON.stringify(
                            String(this.stateData[0])
                        )} when event ${JSON.stringify(String(curEvent[0]))} is fired`,
                        { cause: new InvalidTransitionEventCause<S, E>(this.stateData, curEvent) }
                    );
                } else {
                    return;
                }
            }
            const newData = await transitionData.transitionHandler(...curStateData, ...eventData);
            const newState = [transitionData.target, ...newData] as StateDataTuple<S>;

            onTransition(this.stateData, curEvent, newState);
            this.stateData = newState;

            curEvent = await this.transitionTable[this.stateData[0]].enterHandler(...newData);
        }
    }

    getErrorCause<Cause extends AllCauses<S, E>>(e: unknown, causeClass: Constructor<Cause>): Cause | undefined {
        if (!(e instanceof Error)) return undefined;
        if (e.cause instanceof causeClass) return e.cause;
    }
}

type IsRedirectable<
    States extends StateDataMap,
    Events extends StateDataMap,
    SourceStateName extends keyof States,
    TargetStateName extends keyof States,
    EventName extends keyof Events,
> = ((...params: States[TargetStateName]) => void) extends (
    ...params: [...States[SourceStateName], ...Events[EventName]]
) => void
    ? true
    : false;

export class FSMBuilder<S extends StateDataMap, E extends EventDataMap> {
    constructor(public transitionTable: TransitionTable<S, E>) {}

    static create(): FSMBuilder<EmptyObject, EmptyObject> {
        return new FSMBuilder({});
    }

    addEvent<EventName extends KeyType, EventData extends unknown[] = []>(): FSMBuilder<
        S,
        AddProp<E, EventName, EventData>
    > {
        return this as unknown as FSMBuilder<S, AddProp<E, EventName, EventData>>;
    }

    addEvents<NewEvents extends EventDataMap>(): FSMBuilder<S, Simplify<E & NewEvents>> {
        return this as unknown as FSMBuilder<S, Simplify<E & NewEvents>>;
    }

    addState<const StateName extends KeyType, StateData extends unknown[]>(
        stateName: StateName,
        enterHandler: EnterHandlerFunction<E, StateData>
    ): FSMBuilder<AddProp<S, StateName, StateData>, E>;
    addState<const StateName extends KeyType, StateData extends unknown[] = []>(
        stateName: StateName
    ): FSMBuilder<AddProp<S, StateName, StateData>, E>;
    addState<const StateName extends KeyType, StateData extends unknown[]>(
        stateName: StateName,
        enterHandler: EnterHandlerFunction<E, StateData> = NOP_FUNC
    ): FSMBuilder<AddProp<S, StateName, StateData>, E> {
        const res = this as unknown as FSMBuilder<S & Record<StateName, StateData>, E>;
        res.transitionTable[stateName] = {
            enterHandler,
            transitions: {},
        };
        return res;
    }

    embed<SubFSMBuilderStates extends StateDataMap, SubFSMBuilderEvents extends EventDataMap>(
        subFSMBuilder: FSMBuilder<SubFSMBuilderStates, SubFSMBuilderEvents>
    ): FSMBuilder<Simplify<S & SubFSMBuilderStates>, Simplify<E & SubFSMBuilderEvents>> {
        const res = this as unknown as FSMBuilder<Simplify<S & SubFSMBuilderStates>, Simplify<E & SubFSMBuilderEvents>>;
        res.transitionTable = {
            ...this.transitionTable,
            ...subFSMBuilder.transitionTable,
        } as TransitionTable<S & SubFSMBuilderStates, E & SubFSMBuilderEvents>;
        return res;
    }

    scope<Scope extends string>(scope: Scope): FSMBuilder<AddScopeToStateDataMap<S, Scope>, E> {
        const curTransitionTable = this.transitionTable as TransitionTable<StateDataMap, EventDataMap>;
        const newTransitionTable = {} as TransitionTable<StateDataMap, EventDataMap>;

        for (const [srcState, transitionData] of Object.entries(curTransitionTable)) {
            for (const transition of Object.values(transitionData.transitions)) {
                if (transition === undefined) continue;
                transition.target = `${scope}${transition.target}`;
            }
            newTransitionTable[`${scope}${srcState}`] = transitionData;
        }

        const res = this as unknown as FSMBuilder<AddScopeToStateDataMap<S, Scope>, E>;
        res.transitionTable = newTransitionTable as TransitionTable<AddScopeToStateDataMap<S, Scope>, E>;
        return res;
    }

    addTransition<
        const SourceStateName extends keyof S,
        const EventName extends keyof E,
        const TagetStateName extends keyof S,
    >(
        src: SourceStateName,
        evt: EventName,
        dst: TagetStateName,
        transitionHandler: Transition<S, E, SourceStateName, TagetStateName, EventName>['transitionHandler']
    ): this;

    addTransition<
        const SourceStateName extends keyof S,
        const EventName extends keyof E,
        const TargetStateName extends keyof S,
    >(
        src: SourceStateName,
        evt: EventName,
        dst: TargetStateName
    ): If<IsRedirectable<S, E, SourceStateName, TargetStateName, EventName>, this, never>;

    addTransition<
        const SourceStateName extends keyof S,
        const EventName extends keyof E,
        const TargetStateName extends keyof S,
    >(
        src: SourceStateName,
        evt: EventName,
        dst: TargetStateName,
        transitionHandler?: Transition<S, E, SourceStateName, TargetStateName, EventName>['transitionHandler']
    ) {
        this.transitionTable[src].transitions[evt] = {
            target: dst,
            transitionHandler: transitionHandler ?? ECHO_FUNC,
        } as Transition<S, E, SourceStateName, TargetStateName, EventName>;
        return this;
    }

    build(...initialStateData: StateDataTuple<S>): FSM<S, E> {
        return new FSM(this.transitionTable, initialStateData);
    }
}

export type FSMFromBuilder<Builder> = Builder extends FSMBuilder<infer S, infer F> ? FSM<S, F> : never;

export type FSMStates<T> =
    | (T extends FSMBuilder<infer S, infer _F> ? S : never)
    | (T extends FSM<infer S, infer _F> ? S : never);

export type FSMEvents<T> =
    | (T extends FSMBuilder<infer _S, infer F> ? F : never)
    | (T extends FSM<infer _S, infer F> ? F : never);

/**
 * This type is parsed directly from the function signature.
 *
 * @remarks
 * In my opinion, the code reader should understand the function signature, therefore the
 * type of the callback is in the function signature instead of here.
 *
 * This is just a helper type for the consumer and hopefully it serves its purpose.
 */
export type OnTransitionCallbackWithMaps<S extends StateDataMap, E extends EventDataMap> = NonNullable<
    NonNullable<Parameters<FSM<S, E>['fullDispatch']>[1]>['onTransition']
>;

export type OnTransitionCallback<T> =
    | (T extends FSMBuilder<infer S, infer F> ? OnTransitionCallbackWithMaps<S, F> : never)
    | (T extends FSM<infer S, infer F> ? OnTransitionCallbackWithMaps<S, F> : never);

/**
 * This type is parsed directly from the function signature.
 *
 * @remarks
 * In my opinion, the code reader should understand the function signature, therefore the
 * type of the callback is in the function signature instead of here.
 *
 * This is just a helper type for the consumer and hopefully it serves its purpose.
 */
export type OnInvalidTransitionCallbackWithMaps<S extends StateDataMap, E extends EventDataMap> = NonNullable<
    NonNullable<Parameters<FSM<S, E>['fullDispatch']>[1]>['onInvalidTransition']
>;

export type OnInvalidTransitionCallback<T> =
    | (T extends FSMBuilder<infer S, infer F> ? OnInvalidTransitionCallbackWithMaps<S, F> : never)
    | (T extends FSM<infer S, infer F> ? OnInvalidTransitionCallbackWithMaps<S, F> : never);
