export class StateManager {
    constructor(engine) {
        this.engine = engine;
        this.states = new Map();
        this.currentState = null;
    }

    addState(name, stateObj) {
        this.states.set(name, stateObj);
    }

    changeState(name) {
        if (this.currentState && this.currentState.exit) {
            this.currentState.exit();
        }

        this.currentState = this.states.get(name);

        if (this.currentState && this.currentState.enter) {
            this.currentState.enter();
        }
    }

    update(dt) {
        if (this.currentState && this.currentState.update) {
            this.currentState.update(dt);
        }
    }

    render(ctx) {
        if (this.currentState && this.currentState.render) {
            this.currentState.render(ctx);
        }
    }
}
