// @ts-nocheck
function log(title, obj) {
    console.log(`${title}: \n `, JSON.stringify(obj, null, 2));
}

function throttle(func, delay) {
    let prev = 0;
    return (...args) => {
        let now = new Date().getTime();
        if (now - prev > delay) {
            prev = now;
            return func(...args);
        }
    }
};

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}

const KEY_CODES = {
    User1MoveLeft: 'ArrowLeft',
    User1MoveRight: 'ArrowRight',
    User1Jump: 'ArrowUp',
    User1Kick: 'Space',
    User1Fire: 'Enter',
    User1Throw: 'Slash',

    User2MoveLeft: 'KeyA',
    User2MoveRight: 'KeyD',
    User2Jump: 'KeyW',
    User2Kick: 'KeyF',
    User2Fire: 'KeyR',
    User2Throw: 'KeyE',
};

const JOYSTICK_BUTTON_NAMES = {
    One: 'One',
    Two: 'Two',
    Three: 'Three',
    Four: 'Four',
    Up: 'Up',
    Down: 'Down',
    Left: 'Left',
    Right: 'Right',
};

const JOYSTICK_KEY_CODES = {
    UserMoveLeft: JOYSTICK_BUTTON_NAMES.Left,
    UserMoveRight: JOYSTICK_BUTTON_NAMES.Right,
    UserJump: JOYSTICK_BUTTON_NAMES.Up,
    UserKick: JOYSTICK_BUTTON_NAMES.One,
    UserFire: JOYSTICK_BUTTON_NAMES.Two,
    UserThrow: JOYSTICK_BUTTON_NAMES.Three,
};

const GAME_EVENTS = {
    UserMoveRight: 'TryMoveRight',
    UserMoveLeft: 'UserMoveLeft',
    UserJump: 'UserJump',
    UserKick: 'UserKick',
    UserKicked: 'UserKicked',
    UserFire: 'UserFire',
    UserThrow: 'UserThrow',
};

const INTERACTION_TYPE = {
    Kicked: 'Kicked',
};

class User {
    name = '';
    character = '';
    isComp = false;
    isKicked = false;
    isKicking = false;
    isDirectedRight = true;
    isJumping = false;
    isLanding = false;
    isThrowing = false;
    isThrown = false;
    health = 10;
    skin = '';
    imgs = {
        kicked: '',
        fire: ''
    };
    skins = {
        default: '',
        kicking: '',
        throwing: '',
        thrown: ''
    };
    sounds = {
        kicking: '',
        jumping: '',
        kicked: ''
    };

    constructor({
        name,
        character,
        isComp,
        isDirectedRight,
        fireImage
    }) {
        this.name = name;
        this.character = character;
        this.skins.default = `./assets/characters/${this.character}/default.png`;
        this.skins.kicking = `./assets/characters/${this.character}/kicking.png`;
        this.skins.throwing = `./assets/characters/${this.character}/throwing.png`;
        this.skins.thrown = `./assets/characters/${this.character}/hitByThrowing.png`;
        this.imgs.kicked = `./assets/kicked.png`;
        this.imgs.fire = `./assets/fire/${fireImage}`;
        this.sounds.kicking = `./assets/characters/${this.character}/kicking.m4a`;
        this.sounds.kicked = `./assets/kicked.mp3`;
        this.sounds.jumping = `./assets/characters/${this.character}/jumping.m4a`;
        this.skin = this.skins.default;
        this.isComp = isComp;
        this.isDirectedRight = isDirectedRight;
    }
}

class Fire { }

class Movement {

    static stopCause = {
        clientStopped: 'clientStopped',
        willBeOutOfView: 'willBeOutOfView',
        isOutOfView: 'isOutOfView',
        willIntesect: 'willIntesect',
        intersected: 'intersected',
        finished: 'finished',
    };

    isStopped = false;
    stopCause = '';

    constructor({ view, stepTime, stepsNumber, getStepDefinition, onStarted,
        onWillIntersect, onWillBeOutOfView, onIsOutOfView, onIntesect, onFinished, onStopped }) {

        this.view = view;
        this.stepTime = stepTime = stepTime || 0;
        this.stepsNumber = stepsNumber || 1;
        this.getStepDefinition = getStepDefinition;
        this.onStarted = onStarted ? onStarted : () => { };
        this.onWillIntersect = onWillIntersect ? onWillIntersect : () => true;
        this.onWillBeOutOfView = onWillBeOutOfView ? onWillBeOutOfView : () => true;
        this.onIsOutOfView = onIsOutOfView ? onIsOutOfView : () => true;
        this.onIntesect = onIntesect ? onIntesect : () => true;
        this.onFinished = onFinished ? onFinished : () => { };
        this.onStopped = onStopped ? onStopped : () => { };
    }

    async move(simulate = false) {
        return new Promise(async (mainResolve) => {

            const steps = Array.from(Array(this.stepsNumber).keys());
            for await (const step of steps) {
                const isFirstMove = step === 0;
                const shouldProceed = await new Promise((resolve) => {
                    setTimeout(() => {

                        if (this.isStopped) {
                            this._doStop({ cause: Movement.stopCause.clientStopped });
                            return resolve(false);
                        }

                        const points = this.view.getPoints();

                        const isOutOfView = this.view.parent.isOutOfView(points);
                        if (isOutOfView) {
                            const shouldProceedOnIsOutOfView = this.onIsOutOfView();
                            if (!shouldProceedOnIsOutOfView) {
                                this._doStop({ cause: Movement.stopCause.isOutOfView });
                                return resolve(false);
                            }
                        }

                        const viewIntersected = this.view.parent.getIntersectedView({
                            view: this.view,
                            nextViewPoints: points
                        });
                        if (viewIntersected) {
                            const shouldProceedViewIntersected = this.onIntesect({ view: viewIntersected });
                            if (!shouldProceedViewIntersected) {
                                this._doStop({ cause: Movement.stopCause.intersected });
                                return resolve(false);
                            }
                        }

                        const stepDef = this.getStepDefinition({ step });
                        const nextPoints = points.map(item => {
                            const { x: xDef, y: yDef } = stepDef;
                            const getMapCoord = coordDef => {
                                switch (coordDef) {
                                    case '+':
                                        return val => val + 1;
                                    case '-':
                                        return val => val - 1;
                                    case '=':
                                        return val => val;
                                    default:
                                        throw Error('Wrong step definition ' + coordDef);
                                };
                            };
                            const nextX = getMapCoord(xDef)(item.x);
                            const nextY = getMapCoord(yDef)(item.y);
                            return {
                                x: nextX,
                                y: nextY
                            };
                        });

                        const viewWillIntersect = this.view.parent.getIntersectedView({
                            view: this.view,
                            nextViewPoints: nextPoints
                        });
                        if (viewWillIntersect) {
                            const shouldProceedOnWillIntersect = this.onWillIntersect({ view: viewWillIntersect });
                            if (!shouldProceedOnWillIntersect) {
                                this._doStop({ cause: Movement.stopCause.willIntesect });
                                return resolve(false);
                            }
                        }

                        const willBeOutOfView = this.view.parent.isOutOfView(nextPoints);
                        if (willBeOutOfView) {
                            const shouldProceedOnwillBeOutOfView = this.onWillBeOutOfView();
                            if (!shouldProceedOnwillBeOutOfView) {
                                this._doStop({ cause: Movement.stopCause.willBeOutOfView });
                                return resolve(false);
                            }
                        }

                        if (isFirstMove) {
                            this.onStarted();
                        }

                        if (!simulate) {
                            this.view.parent.moveToPoints({ view: this.view, points: nextPoints });
                        }

                        return resolve(true);

                    }, isFirstMove ? 0 : this.stepTime);
                });

                if (!shouldProceed) {
                    break;
                }
            }

            if (!this.isStopped) {
                this.finish();
                mainResolve({ cause: this.stopCause });
            }
        });
    }

    async simulate() {
        return this.move(true)
    }

    stop() {
        this._doStop({ cause: Movement.stopCause.clientStopped });
    }

    finish() {
        this.onFinished();
        this._doStop({ cause: Movement.stopCause.finished });
    }

    _doStop({ cause }) {
        this.stopCause = cause;
        this.onStopped({ cause: this.stopCause });
    }
}

class FireView {

    reactiveModel = null;
    points = [];
    el = null;
    image = '';
    userView = null;

    constructor({
        containerId,
        reactiveModel,
        width,
        height,
        xOffset,
        yOffset,
        pointSize,
        image,
        userView
    }) {
        this.containerId = containerId;
        this.reactiveModel = reactiveModel;
        this.pointSize = pointSize;
        this.width = width;
        this.height = height;
        this.points = this.rectToCells({
            width,
            height,
            xOffset,
            yOffset
        });
        this.image = image;
        this.userView = userView;

        this.model = reactiveModel.getModel()

        const unSubModelChange = reactiveModel.onChange(({
            model
        }) => {
            this.model = model;
            this.render();
        });

        const unSubIsKickingModelChange = reactiveModel.onPropChange('isKicking', ({
            value
        }) => {
            if (value) {
                unSubModelChange();
                unSubIsKickingModelChange();
                this.destroy();
            }
        });
    }

    setParent(parentView) {
        this.parent = parentView;
    }

    getPoints() {
        return this.points;
    }

    setPoints(points) {
        this.points = points;
        this.render();
    }

    rectToCells({
        xOffset,
        yOffset,
        width,
        height
    }) {
        let points = [];
        for (let row = yOffset; row < (height + yOffset); row++) {
            for (let col = xOffset; col < (width + xOffset); col++) {
                points.push({
                    x: col,
                    y: row
                });
            }
        }
        return points;
    }

    destroy() {
        this.parent.removeChildView({
            view: this,
            element: this.el
        });
    }

    render() {
        if (this.el === null) {
            const element = document.createElement('img');
            element.src = this.image;
            element.classList.add('scene-object', 'fire-object');
            const container = document.getElementById(this.containerId);
            container.appendChild(element);
            this.el = element;
        }

        const xPoint = Math.min(...this.points.map(item => item.x));
        const left = xPoint * this.pointSize;
        const yPoint = Math.max(...this.points.map(item => item.y));

        const parentPoints = this.parent.getPoints();
        const yParentPoint = Math.max(...parentPoints.map(item => item.y));

        const topDiff = yParentPoint - yPoint;
        const top = (topDiff * this.pointSize);

        this.el.style.top = `${top}px`;
        this.el.style.left = `${left}px`;
        this.el.style.width = `${this.width * this.pointSize}px`;
        this.el.style.height = `${this.height * this.pointSize}px`;
    }
}


class GameOverView {

    points = [];
    width = 0;
    height = 0;
    text = '';
    image = '';
    playAgainButtonId = 'game-over-paly-again';

    constructor({
        containerId,
        xOffset,
        yOffset,
        pointSize
    }) {
        this.containerId = containerId;
        this.xOffset = xOffset;
        this.yOffset = yOffset;
        this.pointSize = pointSize;
    }

    setParent(parentView) {
        this.parent = parentView;
    }

    getPoints() {
        return this.points;
    }

    setPoints(points) {
        this.points = points;
    }

    rectToCells({
        xOffset,
        yOffset,
        width,
        height
    }) {
        let points = [];
        for (let row = yOffset; row < (height + yOffset); row++) {
            for (let col = xOffset; col < (width + xOffset); col++) {
                points.push({
                    x: col,
                    y: row
                });
            }
        }
        return points;
    }

    setText(text) {
        this.text = text;
    }

    setImage(image) {
        this.image = image;
    }

    show() {
        this.width = 10;
        this.height = 10;
        this.setPoints(
            this.rectToCells({
                xOffset: this.xOffset,
                yOffset: this.yOffset,
                width: this.width,
                height: this.height
            })
        );
        this.render();
    }

    bindEvents() {
        document.getElementById(this.playAgainButtonId)
            .addEventListener('click', () => {
                window.location.reload();
            });
    }

    render() {
        if (this.width === 0 || this.height === 0) {
            return;
        }
        const el = document.getElementById(this.containerId);
        const xPoint = Math.min(...this.points.map(item => item.x));
        const left = xPoint * this.pointSize;
        const yPoint = Math.max(...this.points.map(item => item.y));

        const parentPoints = this.parent.getPoints();
        const yParentPoint = Math.max(...parentPoints.map(item => item.y));

        const topDiff = yParentPoint - yPoint;
        const top = (topDiff * this.pointSize);

        el.style.top = `${top}px`;
        el.style.zIndex = 3;
        el.style.left = `${left}px`;
        el.style.width = `${this.width * this.pointSize}px`;
        el.style.height = `${this.height * this.pointSize}px`;

        const html = `
            <div class="game-over-wrapper">
                <div class="game-over__title">${this.text}</div>
                <img 
                    style="width: ${this.width * this.pointSize / 5}px;" class="game-over__img" src="${this.image}" />
                <button id="${this.playAgainButtonId}">Play again!</button>
            </div>
        `;
        el.innerHTML = html;

        this.bindEvents();
    }
}


class ScoreView {
    rUser1 = null;
    rUser2 = null;
    parent = null;
    model = {
        user1: {
            name: '',
            health: 0
        },
        user2: {
            name: '',
            health: 0
        }
    }

    constructor({
        containerId,
        rUser1,
        rUser2
    }) {
        this.containerId = containerId;
        this.rUser1 = rUser1;
        this.rUser2 = rUser2;

        const user1 = this.rUser1.getModel();
        this.model.user1.name = user1.name;
        this.model.user1.health = user1.health;

        const user2 = this.rUser2.getModel();
        this.model.user2.name = user2.name;
        this.model.user2.health = user2.health;

        this.rUser1.onPropChange('health', ({
            value
        }) => {
            this.model.user1.health = value;
            this.render();
        });

        this.rUser2.onPropChange('health', ({
            value
        }) => {
            this.model.user2.health = value;
            this.render();
        });
    }

    setParent(parentView) {
        this.parent = parentView;
    }

    getPoints() {
        return [];
    }

    setPoints(points) { }

    render() {
        const users = [this.model.user1, this.model.user2];
        const cols = users.map(user => {
            return `
                <div class="score__user">
                    <div class="score__user-name">${user.name}</div>
                    <div class="score__user-health">${user.health}</div>
                </div>
            `
        });
        const wrapper = `
            ${cols.join('')}
        `;
        document.getElementById(this.containerId).innerHTML = wrapper;
    }
}

class CharacterSelectorView {

    onCharactersSelectedListeners = [];

    okButtonId = 'character-selector-btn';
    character1SelectorId = 'user-1-character';
    character2SelectorId = 'user-2-character';

    constructor({
        containerId,
        characters
    }) {
        this.containerId = containerId;
        this.characters = characters;
    }

    subscribeCharactersSelected(cb) {
        const includes = this.onCharactersSelectedListeners.includes(cb);
        if (!includes) {
            this.onCharactersSelectedListeners.push(cb);
        }
        return () => {
            const indx = this.onCharactersSelectedListeners.indexOf(cb);
            if (indx >= 0) {
                this.onCharactersSelectedListeners.splice(indx, 1);
            }
        };
    }

    notifyOnCharactersSelected() {
        const user1Selector = document.getElementById(this.character1SelectorId);
        const originalChar1 = this.characters[parseInt(user1Selector.value, 10)];
        const char1Clone = {
            ...originalChar1
        };
        Object.setPrototypeOf(char1Clone, originalChar1);

        const user2Selector = document.getElementById(this.character2SelectorId);
        const originalChar2 = this.characters[parseInt(user2Selector.value, 10)];
        const char2Clone = {
            ...originalChar2
        };
        Object.setPrototypeOf(char2Clone, originalChar2);

        const data = {
            user1Character: char1Clone,
            user2Character: char2Clone,
        };

        this.onCharactersSelectedListeners.forEach(cb => cb(data));
    }

    bindEvents() {
        const button = document.getElementById(this.okButtonId);
        button.addEventListener('click', () => {
            this.notifyOnCharactersSelected();
        });
    }

    destroy() {
        document.getElementById(this.containerId).innerHTML = '';
    }

    render() {
        const cols = [this.character1SelectorId, this.character2SelectorId].map(id => {
            return `
                <div class="character-selector__user">
                    <div class="character-selector__title">User ${id === this.character1SelectorId ? '1' : '2'}</div>
                    <div class="character-selector__content">
                        <select name="${id}" id="${id}">
                            ${this.characters.map((item, charIndex) => {
                return `
                                    <option value="${charIndex}" 
                                        ${id === this.character1SelectorId && charIndex === 0 ? "selected" : ''}
                                        ${id === this.character2SelectorId && charIndex === 1 ? "selected" : ''}>
                                        ${item.getDisplayName()}
                                    </option>
                                    `;
            })}
                        </select>
                    </div>
                </div>
            `;
        });

        const wrapper = `
            <div class="character-selector">
                ${cols.join('')}
                <div id="${this.okButtonId}" class="character-selector__btn-wrapper">
                    <button>OK</button>
                </div>
            </div>
        `;

        document.getElementById(this.containerId).innerHTML = wrapper;
        this.bindEvents();
    }
}

class UserView {
    reactiveModel = null;
    audioManager = null;
    parent = null;
    model = null;
    points = [];

    constructor({
        containerId,
        audioManager,
        reactiveModel,
        width,
        height,
        xOffset,
        pointSize,
        jumpHeight,
        jumpStepTime
    }) {
        this.containerId = containerId;
        this.audioManager = audioManager;
        this.reactiveModel = reactiveModel;
        this.width = width;
        this.height = height;
        this.pointSize = pointSize;
        this.jumpHeight = jumpHeight;
        this.jumpStepTime = jumpStepTime;
        this.points = this.rectToCells({
            xOffset,
            width,
            height
        });

        this.model = reactiveModel.getModel()

        reactiveModel.onChange(({
            model
        }) => {
            // console.log('model', model);
            this.model = model;
            this.render();
        });

        reactiveModel.onPropChange('isKicking', ({
            value
        }) => {
            if (value) {
                reactiveModel.setPropValue('skin', this.model.skins.kicking);
                this.audioManager.play(this.model.sounds.kicking);
            } else {
                reactiveModel.setPropValue('skin', this.model.skins.default);
            }
        });

        reactiveModel.onPropChange('isJumping', ({
            value
        }) => {
            if (value) {
                this.audioManager.play(this.model.sounds.jumping);
            }
        });

        reactiveModel.onPropChange('isKicked', ({
            value
        }) => {
            if (value) {
                this.audioManager.play(this.model.sounds.kicked);
            }
        });

        reactiveModel.onPropChange('isThrown', ({
            value
        }) => {
            if (value) {
                reactiveModel.setPropValue('skin', this.model.skins.thrown);
            } else {
                reactiveModel.setPropValue('skin', this.model.skins.default);
            }
        });

        reactiveModel.onPropChange('isThrowing', ({
            value
        }) => {
            if (value) {
                reactiveModel.setPropValue('skin', this.model.skins.throwing);
                this.audioManager.play(this.model.sounds.kicking);
            } else {
                reactiveModel.setPropValue('skin', this.model.skins.default);
            }
        });
    }

    setParent(parentView) {
        this.parent = parentView;
    }

    rectToCells({
        xOffset,
        width,
        height
    }) {
        let points = [];
        for (let row = 0; row < height; row++) {
            for (let col = xOffset; col < (width + xOffset); col++) {
                points.push({
                    x: col,
                    y: row
                });
            }
        }
        return points;
    }

    getPoints() {
        return this.points;
    }

    setPoints(points) {
        this.points = points;
        this.render();
    }

    render() {

        const xPoint = Math.min(...this.points.map(item => item.x));
        const left = xPoint * this.pointSize;
        const yPoint = Math.max(...this.points.map(item => item.y));

        const parentPoints = this.parent.getPoints();
        const yParentPoint = Math.max(...parentPoints.map(item => item.y));

        const topDiff = yParentPoint - yPoint;

        const top = (topDiff * this.pointSize);

        const output = `
            <img class="user${this.model.isDirectedRight ? '' : ' user--directed-left'}" src="${this.model.skin}">
            <img class="user-kicked" 
                style="display: ${this.model.isKicked ? "inline" : "none"};
                ${this.model.isDirectedRight ? "right: 40%" : "left: 40%"}"
                src="${this.model.imgs.kicked}">
        `;

        const container = document.getElementById(this.containerId);
        container.innerHTML = output;
        container.style.left = `${left}px`;
        container.style.top = `${top}px`;
        container.style.width = `${this.width * this.pointSize}px`;
        container.style.height = `${this.height * this.pointSize}px`;
    }
}


class GameView {

    points = [];
    onMoveListeners = [];
    onInteractionListeners = [];

    constructor({
        containerId,
        bgImage,
        width,
        height,
        pointSize,
        childViews
    }) {
        this.containerId = containerId;
        this.bgImage = bgImage;
        this.width = width;
        this.height = height;
        this.pointSize = pointSize;
        this.childViews = childViews;
        this.points = this.rectToCells({
            width,
            height
        });
        childViews.forEach(view => view.setParent(this));
    }

    addChildView({
        view
    }) {
        view.setParent(this);
        this.childViews.push(view);
        view.render();
    }

    removeChildView({
        view,
        element
    }) {
        const indx = this.childViews.indexOf(view);
        if (indx === -1) {
            return;
        }
        this.childViews.splice(indx, 1);
        if (element) {
            element.remove();
            return;
        }
        const el = document.getElementById(view.containerId);
        el.remove();
    }

    // requestFullScreen() {
    //     const el = document.getElementById(this.containerId);
    //     if (el) {
    //         el.requestFullscreen();
    //     }
    // }

    render() {
        const element = document.getElementById(this.containerId);

        let rows = [];
        for (let row = this.height - 1; row >= 0; row--) {
            let rowStr = `<div class="row">`;
            const cols = [];
            for (let col = 0; col < this.width; col++) {
                cols.push(`<div class="cell" style="width: ${this.pointSize}px; height: ${this.pointSize}px;"></div>`);
            }
            let colsStr = cols.join('');
            rowStr += colsStr;
            rowStr += '</div>';
            rows.push(rowStr);
        }
        const rowsStr = rows.join('');
        const wrapper = `
        <div id="game-wrapper" class="game-wrapper" style="width: ${this.width * this.pointSize}px; height: ${this.height * this.pointSize}px; background-image: url(${this.bgImage})">
            <div id="score">
                
            </div>
            <div class="cell-wrapper" style="width: ${this.width * this.pointSize}px; height: ${this.height * this.pointSize}px">
                ${rowsStr}
            </div>
            <div class="scene-object" id="user1"></div>
            <div class="scene-object" id="user2"></div>
            <div class="scene-object" id="user-character-container">
            </div>
            <audio class="sound-object" id="user1-sound"></audio>
            <audio class="sound-object" id="user2-sound"></audio>
            <audio class="sound-object" id="audio-theme"></audio>
            <div class="scene-object" id="fire-object-container"></div>
            <div class="scene-object" id="game-over"></div>
        </div>
            `;

        element.innerHTML = wrapper;
        this.childViews.forEach(item => item.render());
    }

    rectToCells({
        width,
        height
    }) {
        let points = [];
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                points.push({
                    x: col,
                    y: row
                });
            }
        }
        return points;
    }

    getPoints() {
        return this.points;
    }

    setPoints(points) {
        this.points = points;
    }

    subscribeOnMove(cb) {
        const includes = this.onMoveListeners.includes(cb);
        if (!includes) {
            this.onMoveListeners.push(cb);
        }
        return () => {
            const indx = this.onMoveListeners.indexOf(cb);
            if (indx >= 0) {
                this.onMoveListeners.splice(indx, 1);
            }
        };
    }

    notifyOnMove({
        view
    }) {
        this.onMoveListeners.forEach(cb => cb({
            view
        }));
    }

    getIntersectedViewByPoints(nextViewPoints) {
        return this.childViews
            .find(
                item => item.getPoints()
                    .some(owp => nextViewPoints.some(p => p.x === owp.x && p.y === owp.y))
            );
    }

    getIntersectedView({
        view,
        nextViewPoints
    }) {
        const otherViews = this.childViews
            .filter(item => item !== view);
        return otherViews
            .find(
                item => item.getPoints()
                    .some(owp => nextViewPoints.some(p => p.x === owp.x && p.y === owp.y))
            );
    }

    isOutOfView(points) {
        const maxX = this.width - 1;
        const maxY = this.height - 1;
        return points.some(p => p.x < 0 || p.x > maxX || p.y < 0 || p.y > maxY);
    }

    canMove({
        view,
        nextViewPoints
    }) {
        const outOrIntersects = nextViewPoints
            .some(item => this.isOutOfView([{
                x: item.x,
                y: item.y
            }]) ||
                this.getIntersectedView({
                    view,
                    nextViewPoints
                })
            );
        return !outOrIntersects;
    }

    moveToPoints({
        view,
        points
    }) {
        view.setPoints(points);
        this.notifyOnMove({
            view
        });
    }

    subscribeOnInteraction(cb) {
        const includes = this.onInteractionListeners.includes(cb);
        if (!includes) {
            this.onInteractionListeners.push(cb);
        }
        return () => {
            const indx = this.onInteractionListeners.indexOf(cb);
            if (indx >= 0) {
                this.onInteractionListeners.splice(indx, 1);
            }
        };
    }

    notifyOnInteraction({
        source,
        target,
        interactionType
    }) {
        this.onInteractionListeners.forEach(cb => cb({
            source,
            target,
            interactionType
        }));
    }

}

class GameActionQueue {

    actions = [];

    constructor({
        timeout
    }) {
        this.timeout = timeout;
    }

    start() {
        this.interval = setInterval(() => {
            const act = this.actions.shift();
            if (typeof act === 'function') {
                act();
            }
        }, this.timeout);
    }

    stop() {
        clearInterval(this.interval);
    }

    add(cb) {
        this.actions.push(cb);
    }
}

function makeReactive({
    model
}) {
    const subs = [];
    const anyProp = '__anyProp__';

    function getSubIndex(prop, cb) {
        return subs
            .findIndex(item =>
                item.prop === prop && item.cb === cb);
    }

    function getSub(prop, cb) {
        const indx = getSubIndex(prop, cb);
        if (indx !== -1) {
            return subs[indx];
        }
    }

    function onPropChange(prop, cb) {
        const sub = getSub(prop, cb);
        if (!sub) {
            subs.push({
                prop,
                cb
            });
        }
        return () => {
            const indx = getSubIndex(prop, cb);
            subs.splice(indx, 1);
        };
    }

    function notifyPropChange(prop) {
        subs
            .filter(item => item.prop === prop)
            .forEach(item => {
                const prevValue = model[prop];
                const value = model[prop];
                return item.cb({
                    prop,
                    value,
                    prevValue,
                    model
                });
            });
    }

    function setPropValue(prop, value) {
        model[prop] = value;
        notifyPropChange(prop);
        notifyChange();
    }

    function getPropValue(prop) {
        return model[prop];
    }

    function unSubAll() {
        subs.splice(0, subs.length);
    }

    function onChange(cb) {
        return onPropChange(anyProp, cb);
    }

    function notifyChange() {
        subs
            .filter(item => item.prop === anyProp)
            .forEach(item => {
                return item.cb({
                    model
                });
            });
    }

    function getModel() {
        return model;
    }

    return {
        onPropChange,
        setPropValue,
        getPropValue,
        onChange,
        unSubAll,
        getModel,
    };
}

class EventBus {
    subs = {};

    onEvent(eventName, cb) {
        this.subs[eventName] = this.subs[eventName] || [];
        const listener = this.subs[eventName].find(item => item === cb);
        if (!listener) {
            this.subs[eventName].push(cb);
        }
        return () => {
            const indx = this.subs[eventName].find(item => item === cb);
            if (indx !== -1) {
                this.subs[eventName].splice(indx, 1);
            }
        };
    }

    dispatchEvent(eventName, data) {
        const listeners = this.subs[eventName];
        if (!Array.isArray(listeners)) {
            return;
        }
        listeners.forEach(cb => cb(data));
    }

    unSubAll() {
        this.subs = {};
    }

}

class KeyboardListener {

    onPressKeys(keyCodes, cb) {
        const listener = ({
            code
        }) => {
            if (keyCodes.includes(code)) {
                cb({
                    code
                });
            }
        };
        window.document.addEventListener('keyup', listener);
        return () => {
            window.document.removeEventListener('keyup', listener);
        };
    }

}

class Character {

    offset = 10;
    isDirectedRight = false;

    constructor({
        name,
        canvasWidth,
        height,
        heightToWidth,
        fireImage
    }) {
        this.name = name;
        this.canvasWidth = canvasWidth;
        this.height = height;
        this.width = Math.floor(height / heightToWidth);
        this.fireImage = fireImage;
    }

    getOffset() {
        if (this.isDirectedRight) {
            return this.offset;
        }
        return this.canvasWidth - this.width - this.offset;
    }

    getDisplayName() {
        return this.name.charAt(0).toUpperCase() + this.name.slice(1);
    }
}

class AudioManager {

    constructor({
        containerId
    }) {
        this.containerId = containerId;
    }

    play(soundUrl, {
        loop,
        volume
    } = {
            loop: false,
            volume: 1
        }) {
        const el = document.getElementById(this.containerId);
        if (el) {
            el.src = soundUrl;
            el.loop = loop;
            el.volume = volume;
            el.play();
        }
    }
}

class CommandExecutor {
    commands = [];

    async storeAndExecute(command) {
        const result = await command.execute();
        this.commands.push(command);
        return result;
    }
}


class CommandMoveOneTime {

    constructor({
        view,
        isRight,
        isUp,
        stepTime,
    }) {
        this.view = view;
        this.isRight = isRight;
        this.isUp = isUp;
        this.stepTime = stepTime;
    }

    async execute() {
        const movement = new Movement({
            view: this.view,
            stepTime: this.stepTime,
            stepsNumber: 1,
            getStepDefinition: ({ step }) => {
                const xDef = typeof this.isRight === 'undefined'
                    ? '='
                    : this.isRight
                        ? '+' : '-';
                const yDef = typeof this.isUp === 'undefined'
                    ? '='
                    : this.isUp
                        ? '+' : '-';
                return {
                    x: xDef,
                    y: yDef,
                };
            },
            onWillBeOutOfView: () => {
                movement.stop();
                return false;
            },
            onWillIntersect: () => {
                movement.stop();
                return false;
            },
        });
        await movement.move();
    }
}

class CommandMoveUp {

    constructor({
        view,
        stepTime,
        stepsNumber,
        allowIntersection,
        allowOutOfView,
    }) {
        this.view = view;
        this.stepTime = stepTime;
        this.stepsNumber = stepsNumber;
        this.allowIntersection = typeof allowIntersection !== 'undefined' ? allowIntersection : false;
        this.allowOutOfView = typeof allowOutOfView !== 'undefined' ? allowOutOfView : false;;
    }

    async execute() {
        const movementUp = new Movement({
            view: this.view,
            stepTime: this.stepTime,
            stepsNumber: this.stepsNumber,
            getStepDefinition: ({ step }) => {
                return {
                    x: '=',
                    y: '+',
                };
            },
            onWillBeOutOfView: () => {
                if (this.allowOutOfView) {
                    return true;
                }
                movementUp.stop();
                return false;
            },
            onWillIntersect: () => {
                if (this.allowIntersection) {
                    return true;
                }
                movementUp.stop();
                return false;
            },

        });
        await movementUp.move();
    }
}

class CommandMoveDown {

    constructor({
        view,
        stepTime,
        stepsNumber,
        allowIntersection,
        allowOutOfView,
        onStarted,
    }) {
        this.view = view;
        this.stepTime = stepTime;
        this.stepsNumber = stepsNumber;
        this.allowIntersection = typeof allowIntersection !== 'undefined' ? allowIntersection : false;
        this.allowOutOfView = typeof allowOutOfView !== 'undefined' ? allowOutOfView : false;
        this.onStarted = onStarted ? onStarted : () => true;
    }

    async execute() {
        const movement = new Movement({
            view: this.view,
            stepTime: this.stepTime,
            stepsNumber: this.stepsNumber,
            getStepDefinition: ({ step }) => {
                return {
                    x: '=',
                    y: '-',
                };
            },
            onStarted: () => {
                this.onStarted();
            },
            onWillBeOutOfView: () => {
                if (this.allowOutOfView) {
                    return true;
                }
                movement.stop();
                return false;
            },
            onWillIntersect: () => {
                if (this.allowIntersection) {
                    return true;
                }
                movement.stop();
                return false;
            },

        });
        return await movement.move();
    }
}
class CommandUserJump {

    constructor({
        view,
        commandExecutor,
    }) {
        this.view = view;
        this.commandExecutor = commandExecutor;
    }

    async execute() {
        if (this.view.model.isJumping || this.view.model.isLanding) {
            return;
        }
        this.view.reactiveModel.setPropValue('isJumping', true);
        await this.commandExecutor.storeAndExecute(
            new CommandMoveUp({
                view: this.view,
                stepTime: this.view.jumpStepTime,
                stepsNumber: this.view.jumpHeight,
                allowIntersection: false,
                allowOutOfView: false
            })
        );
        this.view.reactiveModel.setPropValue('isJumping', false);

        await this.commandExecutor.storeAndExecute(
            new CommandMoveDown({
                view: this.view,
                stepTime: this.view.jumpStepTime,
                stepsNumber: 9999,
                allowIntersection: false,
                allowOutOfView: false,
                onStarted: () => this.view.reactiveModel.setPropValue('isLanding', true)
            })
        );
        this.view.reactiveModel.setPropValue('isLanding', false);
        // this.view.reactiveModel.setPropValue('isLanding', false);
    }
}

class CommandTryUserLand {

    constructor({
        view,
        commandExecutor,
    }) {
        this.view = view;
        this.commandExecutor = commandExecutor;
    }

    async execute() {
        if (this.view.model.isJumping || this.view.model.isLanding || this.view.model.isThrown) {
            return;
        }

        await this.commandExecutor.storeAndExecute(
            new CommandMoveDown({
                view: this.view,
                stepTime: this.view.jumpStepTime,
                stepsNumber: 9999,
                allowIntersection: false,
                allowOutOfView: false,
                onStarted: () => this.view.reactiveModel.setPropValue('isLanding', true)
            })
        );
        if (this.view.model.isLanding) {
            this.view.reactiveModel.setPropValue('isLanding', false);
        }
    }
}

class CommandLand {

    constructor({
        view
    }) {
        this.view = view;
    }

    async execute() {
        if (this.view.model.isJumping || this.view.model.isLanding) {
            return;
        }
        if (this.view.parent.canMoveDown({
            view: this.view
        })) {
            this.view.reactiveModel.setPropValue('isLanding', true);
        }
        const steps = Array.from(Array(999999).keys());
        for await (const _ of steps) {
            const shouldProceed = await new Promise((resolve) => {
                setTimeout(() => {
                    if (this.view.parent.canMoveDown({
                        view: this.view
                    })) {
                        this.view.parent.moveDown({
                            view: this.view
                        });
                        return resolve(true);
                    } else {
                        return resolve(false);
                    }
                }, this.view.jumpStepTime);
            });
            if (!shouldProceed) {
                break;
            }
        }
        this.view.reactiveModel.setPropValue('isLanding', false);
    }
}


class CommandHit {

    constructor({
        sourceView,
        targetView,
    }) {
        this.sourceView = sourceView;
        this.targetView = targetView;
    }

    async execute() {
        this.targetView.reactiveModel.setPropValue('isKicked', true);
        this.targetView.parent.notifyOnInteraction({
            source: this.sourceView.reactiveModel,
            target: this.targetView.reactiveModel,
            interactionType: INTERACTION_TYPE.Kicked
        });
        setTimeout(() => {
            this.targetView.reactiveModel.setPropValue('isKicked', false);
        }, 1000);
    }
}

class CommandKick {

    constructor({
        view,
        commandExecutor,
    }) {
        this.view = view;
        this.commandExecutor = commandExecutor;
    }

    async execute() {
        this.view.reactiveModel.setPropValue('isKicking', true);
        const interactionDuration = 1000;
        const isDirectedRight = this.view.model.isDirectedRight;
        const movement = new Movement({
            view: this.view,
            getStepDefinition: ({ step }) => {
                return {
                    x: isDirectedRight ? '+' : '-',
                    y: '=',
                };
            },
            onWillIntersect: ({ view: intersectedView }) => {
                if (intersectedView instanceof UserView && intersectedView !== this.view) {
                    movement.stop();
                    this.commandExecutor.storeAndExecute(
                        new CommandHit({
                            sourceView: this.view,
                            targetView: intersectedView,
                        })
                    );
                    return false;
                }
                return true;
            },
        });
        await movement.simulate();
        setTimeout(() => {
            this.view.reactiveModel.setPropValue('isKicking', false);
        }, interactionDuration);
    }
}

class CommandFire {

    constructor({
        view,
        pointSize,
        commandExecutor,
        fireStepTime
    }) {
        this.view = view;
        this.pointSize = pointSize;
        this.commandExecutor = commandExecutor;
        this.fireStepTime = fireStepTime;
    }

    async execute() {
        // if (this.view.model.isJumping || this.view.model.isLanding) {
        //     return;
        // }
        const points = this.view.getPoints();
        const minY = Math.min(...points.map(item => item.y));
        const yOffset = minY + 2;
        let xOffset = -1;
        if (this.view.model.isDirectedRight) {
            const maxX = Math.max(...points.map(item => item.x));
            xOffset = maxX;
        } else {
            const minX = Math.min(...points.map(item => item.x));
            xOffset = minX;
        }

        const rFire = makeReactive({
            model: new Fire()
        });

        const fireView = new FireView({
            containerId: 'game-wrapper',
            reactiveModel: rFire,
            width: 1,
            height: 1,
            xOffset,
            yOffset,
            pointSize: this.pointSize,
            image: this.view.model.imgs.fire,
            userView: this.view
        });
        this.view.parent.addChildView({
            view: fireView
        });
        this.view.audioManager.play('./assets/fire/fire.m4a');

        const isDirectedRight = this.view.model.isDirectedRight;

        const movement = new Movement({
            view: fireView,
            stepTime: this.fireStepTime,
            stepsNumber: 9999,
            getStepDefinition: ({ step }) => {
                return {
                    x: isDirectedRight ? '+' : '-',
                    y: '=',
                };
            },
            onWillBeOutOfView: () => {
                movement.stop();
                return false;
            },
            onIntesect: ({ view: intersectedView }) => {
                if (intersectedView instanceof UserView && intersectedView !== this.view) {
                    movement.stop();
                    this.commandExecutor.storeAndExecute(
                        new CommandHit({
                            sourceView: this.view,
                            targetView: intersectedView,
                        })
                    );
                    return false;
                }
                return true;
            }
        });
        await movement.move();
        fireView.destroy();
    }
}


class CommandThrow {

    constructor({
        view,
        pointSize,
        commandExecutor,
        stepTime
    }) {
        this.view = view;
        this.pointSize = pointSize;
        this.commandExecutor = commandExecutor;
        this.stepTime = stepTime;
    }

    async execute() {
        if (!this._canThrowOrBeThrown({ view: this.view })) {
            return;
        }
        const isDirectedRight = this.view.model.isDirectedRight;
        const movement = new Movement({
            view: this.view,
            stepTime: 0,
            stepsNumber: 0,
            getStepDefinition: ({ step }) => {
                return {
                    x: isDirectedRight ? '+' : '-',
                    y: '=',
                };
            },
            onWillIntersect: ({ view: intersectedView }) => {
                if (intersectedView instanceof UserView && intersectedView !== this.view) {
                    movement.stop();
                    if (!this._canThrowOrBeThrown({ view: intersectedView })) {
                        return false;
                    }
                    const stepsNumber = 20;
                    const movement2 = new Movement({
                        view: intersectedView,
                        stepTime: 50,
                        stepsNumber,
                        getStepDefinition: ({ step }) => {
                            if ((step + 1) <= stepsNumber / 2) {
                                return {
                                    x: '=',
                                    y: '+',
                                }
                            }
                            if ((step + 1) > stepsNumber / 2) {
                                return {
                                    x: '=',
                                    y: '-',
                                }
                            }
                        },
                        onStarted: () => {
                            this.view.reactiveModel.setPropValue('isThrowing', true);
                            intersectedView.reactiveModel.setPropValue('isThrown', true);
                        },
                        onWillIntersect: () => {
                            movement.stop();
                        },
                        onStopped: () => {
                            this.commandExecutor.storeAndExecute(
                                new CommandHit({
                                    sourceView: this.view,
                                    targetView: intersectedView,
                                })
                            );
                            setTimeout(() => {
                                this.view.reactiveModel.setPropValue('isThrowing', false);
                                intersectedView.reactiveModel.setPropValue('isThrown', false);
                            }, 500);
                        },
                    });
                    movement2.move();

                    return false;
                }
                return true;
            },
        });
        await movement.simulate();

    }

    _canThrowOrBeThrown({ view }) {
        if (view.model.isJumping || view.model.isLanding
            || view.model.isThrowing || view.model.isThrown) {
            return false;
        }
        return true;
    }
}


class JoyStick {

    _gamepadIndex = -1;

    _buttonMap = {
        0: JOYSTICK_BUTTON_NAMES.One,
        1: JOYSTICK_BUTTON_NAMES.Two,
        2: JOYSTICK_BUTTON_NAMES.Three,
        3: JOYSTICK_BUTTON_NAMES.Four,
    };

    _onBtnListeners = {
        [JOYSTICK_BUTTON_NAMES.One]: [],
        [JOYSTICK_BUTTON_NAMES.Two]: [],
        [JOYSTICK_BUTTON_NAMES.Three]: [],
        [JOYSTICK_BUTTON_NAMES.Four]: [],
        [JOYSTICK_BUTTON_NAMES.Right]: [],
        [JOYSTICK_BUTTON_NAMES.Left]: [],
        [JOYSTICK_BUTTON_NAMES.Up]: [],
        [JOYSTICK_BUTTON_NAMES.Down]: []
    };

    constructor({ gamepadIndex }) {
        this._gamepadIndex = gamepadIndex;
        // this._checkPressedButtonsThrottled = throttle(() => this._checkPressedButtons(), this.throttleMs);
        this.handleEvents();
    }

    subscribeOnButtonClick(btn, cb) {
        const includes = this._onBtnListeners[btn].includes(cb);
        if (!includes) {
            this._onBtnListeners[btn].push(cb);
        }
        return () => {
            const indx = this._onBtnListeners[btn].indexOf(cb);
            if (indx >= 0) {
                this._onBtnListeners[btn].splice(indx, 1);
            }
        };
    }

    notifyOnButtonClicked(btn) {
        this._onBtnListeners[btn].forEach(cb => cb());
    }

    async handleEvents() {
        await this._setPamepad();
        this._listenForClickEvents();
    }

    _setPamepad() {
        return new Promise((resolve) => {
            window.addEventListener("gamepadconnected", (e) => {
                if (e.gamepad.index !== this._gamepadIndex) {
                    return;
                }
                resolve();
            });
        });
    }

    _listenForClickEvents() {
        // this._checkPressedButtonsThrottled();
        this._checkPressedButtons();
        requestAnimationFrame(() => this._listenForClickEvents());
    }

    _checkPressedButtons() {
        const gamepad = navigator.getGamepads()[this._gamepadIndex];
        gamepad.buttons.forEach((button, indx) => {
            const name = this._buttonMap[indx];
            if (typeof name === 'string') {
                if (button.pressed) {
                    this.notifyOnButtonClicked(name);
                }
            }
        });

        const isRightMove = gamepad.axes[0] === 1;
        if (isRightMove) {
            this.notifyOnButtonClicked(JOYSTICK_BUTTON_NAMES.Right);
        }
        const isLeftMove = gamepad.axes[0] === -1;
        if (isLeftMove) {
            this.notifyOnButtonClicked(JOYSTICK_BUTTON_NAMES.Left);
        }
        const isUpMove = gamepad.axes[1] === -1;
        if (isUpMove) {
            this.notifyOnButtonClicked(JOYSTICK_BUTTON_NAMES.Up);
        }
        const isDownMove = gamepad.axes[1] === 1;
        if (isDownMove) {
            this.notifyOnButtonClicked(JOYSTICK_BUTTON_NAMES.Down);
        }
    }

}

class CacheManager {

    constructor() {}

    async cacheAssets({ folderNames }) {
        
        const getAssets = name => ([
            `./assets/characters/${name}/default.png`,
            `./assets/characters/${name}/kicking.png`,
            `./assets/characters/${name}/throwing.png`,
            `./assets/characters/${name}/hitByThrowing.png`
        ]);

        const commonUrls = ['./assets/kicked.png'];

        const urls = [...commonUrls];
        folderNames.forEach(name => {
            urls.push(...getAssets(name));
        });
       
        for await (const url of urls) {
            await fetch(url);
        }
    }
}

class Game {

    unSubs = [];

    constructor({
        canvasWidth,
        userJumpHeight,
        userJumpStepTime,
        fireStepTime,
        debounceMs,
        throttleFireMs,
        throttleKickMs,
        throttleThrowMs,
        joyStickThrotleMoveMs,
    }) {

        this.canvasWidth = canvasWidth;
        this.userJumpHeight = userJumpHeight;
        this.userJumpStepTime = userJumpStepTime;
        this.fireStepTime = fireStepTime;
        this.debounceMs = debounceMs;
        this.throttleFireMs = throttleFireMs;
        this.throttleKickMs = throttleKickMs;
        this.throttleThrowMs = throttleThrowMs;
        this.joyStickThrotleMoveMs = joyStickThrotleMoveMs;

        this.selectUserCharacters()
            .then(data => this.startGame(data));

    }

    selectUserCharacters() {
        return new Promise((resolve) => {
            const characters = [
                new Character({
                    name: 'zhenia',
                    canvasWidth: this.canvasWidth,
                    height: 6,
                    heightToWidth: 2,
                    fireImage: 'fire-banana.png'
                }),
                new Character({
                    name: 'dino',
                    canvasWidth: this.canvasWidth,
                    height: 8,
                    heightToWidth: 3 / 2,
                    fireImage: 'fire-strawberry.png'
                }),
                new Character({
                    name: 'kurka',
                    canvasWidth: this.canvasWidth,
                    height: 7,
                    heightToWidth: 1,
                    fireImage: 'fire-tomato.gif'
                }),
                new Character({
                    name: 'mario',
                    canvasWidth: this.canvasWidth,
                    height: 4,
                    heightToWidth: 3 / 2,
                    fireImage: 'fire-tomato.gif'
                }),
                new Character({
                    name: 'bowser',
                    canvasWidth: this.canvasWidth,
                    height: 7,
                    heightToWidth: 1,
                    fireImage: 'fire-but.png'
                }),
                new Character({
                    name: 'ptero',
                    canvasWidth: this.canvasWidth,
                    height: 5,
                    heightToWidth: 1 / 2,
                    fireImage: 'fire-strawberry.png'
                }),
                new Character({
                    name: 'sonic',
                    canvasWidth: this.canvasWidth,
                    height: 5,
                    heightToWidth: 3 / 2,
                    fireImage: 'fire-ring.png'
                }),
                new Character({
                    name: 'luigi',
                    canvasWidth: this.canvasWidth,
                    height: 5,
                    heightToWidth: 3 / 2,
                    fireImage: 'fire-but.png'
                }),
                new Character({
                    name: 'knuckles',
                    canvasWidth: this.canvasWidth,
                    height: 5,
                    heightToWidth: 3 / 2,
                    fireImage: 'fire-ring.png'
                }),
                new Character({
                    name: 'tails',
                    canvasWidth: this.canvasWidth,
                    height: 5,
                    heightToWidth: 3 / 2,
                    fireImage: 'fire-ring.png'
                }),
                new Character({
                    name: 'mama',
                    canvasWidth: this.canvasWidth,
                    height: 8,
                    heightToWidth: 2,
                    fireImage: 'fire-but.png'
                }),
            ];

            const characterSelectorView = new CharacterSelectorView({
                containerId: 'character-selector',
                characters
            });
            characterSelectorView.subscribeCharactersSelected((data) => {
                characterSelectorView.destroy();
                resolve(data);
            });
            characterSelectorView.render();
        });
    }

    async startGame({
        user1Character,
        user2Character
    }) {

        const cacheManager = new CacheManager();
        await cacheManager.cacheAssets({
            folderNames: [
                user1Character.name,
                user2Character.name
            ]
        });

        await document.getElementById('game')
            .requestFullscreen();

        const body = document.body;

        this.pointSize = Math.floor(parseInt(body.scrollWidth) / this.canvasWidth);
        this.canvasHeight = Math.floor(parseInt(window.innerHeight) / this.pointSize);
        this.canvasWidth = Math.floor(parseInt(body.scrollWidth) / this.pointSize);

        this.eventBus = new EventBus();
        this.commandExecutor = new CommandExecutor();

        user1Character.isDirectedRight = true;
        user2Character.isDirectedRight = false;

        const rUser1 = makeReactive({
            model: new User({
                name: user1Character.getDisplayName(),
                character: user1Character.name,
                isComp: false,
                isDirectedRight: true,
                fireImage: user1Character.fireImage
            })
        });

        const user1View = new UserView({
            containerId: 'user1',
            audioManager: new AudioManager({
                containerId: 'user1-sound'
            }),
            reactiveModel: rUser1,
            width: user1Character.width,
            height: user1Character.height,
            xOffset: user1Character.getOffset(),
            pointSize: this.pointSize,
            jumpHeight: this.userJumpHeight,
            jumpStepTime: this.userJumpStepTime,
        });
        this.user1View = user1View;

        const rUser2 = makeReactive({
            model: new User({
                name: user2Character.getDisplayName(),
                character: user2Character.name,
                isComp: false,
                isDirectedRight: false,
                fireImage: user2Character.fireImage
            })
        });

        const user2View = new UserView({
            containerId: 'user2',
            audioManager: new AudioManager({
                containerId: 'user2-sound'
            }),
            reactiveModel: rUser2,
            width: user2Character.width,
            height: user2Character.height,
            xOffset: user2Character.getOffset(),
            pointSize: this.pointSize,
            jumpHeight: this.userJumpHeight,
            jumpStepTime: this.jumpStepTime,
            jumpStepTime: this.userJumpStepTime
        });
        this.user2View = user2View;

        const scoreView = new ScoreView({
            containerId: 'score',
            rUser1,
            rUser2
        });
        this.scoreView = scoreView;

        const gameOverView = new GameOverView({
            containerId: 'game-over',
            xOffset: this.canvasWidth / 2 - 5,
            yOffset: this.canvasHeight / 2 - 5,
            pointSize: this.pointSize
        });
        this.gameOverView = gameOverView;

        const gameView = new GameView({
            containerId: 'game',
            bgImage: this.getBgImage(),
            width: this.canvasWidth,
            height: this.canvasHeight,
            pointSize: this.pointSize,
            childViews: [
                user1View,
                user2View,
                scoreView,
                gameOverView
            ]
        });
        this.gameView = gameView;
        gameView.render();

        this._initAudioTheme();
        this._eventListeners();
        this._initKeyboard();
        this._initJoySticks();
    }

    _eventListeners() {

        const { commandExecutor, gameView, gameOverView } = this;

        this.unSubs.push(
            gameView.subscribeOnInteraction(({
                source,
                target,
                interactionType
            }) => {
                switch (interactionType) {
                    case INTERACTION_TYPE.Kicked:
                        this.eventBus.dispatchEvent(GAME_EVENTS.UserKicked, {
                            source,
                            target
                        });
                        break;
                    default:
                        break;
                }
            })
        );

        this.unSubs.push(
            gameView.subscribeOnMove(({
                view
            }) => {
                const userViews = gameView.childViews.filter(v => v instanceof UserView);
                userViews.forEach(userView => {
                    commandExecutor.storeAndExecute(
                        new CommandTryUserLand({
                            view: userView,
                            commandExecutor: commandExecutor
                        })
                    );

                    const otherUserViewPoints = [];
                    userView.parent.childViews
                        .filter(item => item instanceof UserView && item !== userView)
                        .forEach(item => {
                            otherUserViewPoints.push(...item.getPoints())
                        })

                    const otherUserMinX = Math.min(...otherUserViewPoints.map(item => item.x));
                    const ownMinX = Math.min(...userView.points.map(item => item.x));

                    if (userView.model.isDirectedRight && ownMinX > otherUserMinX) {
                        userView.reactiveModel.setPropValue('isDirectedRight', false);
                    }

                    if (!userView.model.isDirectedRight && ownMinX < otherUserMinX) {
                        userView.reactiveModel.setPropValue('isDirectedRight', true);
                    }
                });
            })
        );


        this.eventBus.onEvent(GAME_EVENTS.UserMoveRight, ({ source }) => {
            commandExecutor.storeAndExecute(
                new CommandMoveOneTime({
                    view: source,
                    isRight: true,
                    stepTime: 1
                })
            );
        });

        this.eventBus.onEvent(GAME_EVENTS.UserMoveLeft, ({ source }) => {
            commandExecutor.storeAndExecute(
                new CommandMoveOneTime({
                    view: source,
                    isRight: false,
                    stepTime: 1
                })
            );
        });


        this.eventBus.onEvent(GAME_EVENTS.UserKick, async ({ source }) => {
            await commandExecutor.storeAndExecute(
                new CommandKick({
                    view: source,
                    commandExecutor
                })
            );
        });

        this.eventBus.onEvent(GAME_EVENTS.UserJump, async ({ source }) => {
            await commandExecutor.storeAndExecute(
                new CommandUserJump({
                    view: source,
                    commandExecutor
                })
            );
        });

        this.eventBus.onEvent(GAME_EVENTS.UserFire, ({ source }) => {
            commandExecutor.storeAndExecute(
                new CommandFire({
                    view: source,
                    pointSize: this.pointSize,
                    commandExecutor,
                    fireStepTime: this.fireStepTime
                })
            );
        });

        this.eventBus.onEvent(GAME_EVENTS.UserThrow, ({ source }) => {
            commandExecutor.storeAndExecute(
                new CommandThrow({
                    view: source,
                    pointSize: this.pointSize,
                    commandExecutor,
                    stepTime: this.fireStepTime
                })
            );
        });

        this.unSubs.push(
            this.eventBus.onEvent(GAME_EVENTS.UserKicked, ({
                source,
                target
            }) => {
                let nextHealth = target.getPropValue('health') - 1;
                nextHealth = nextHealth >= 0 ? nextHealth : 0;
                target.setPropValue('health', nextHealth);
                setTimeout(() => {
                    if (nextHealth === 0) {
                        gameOverView.setText(`${source.getModel().name} won!`);
                        gameOverView.setImage(`${source.getModel().skins.kicking}`);
                        gameOverView.show();
                        this.unSubAll();
                    }
                }, 50);
            })
        );

    }

    _initKeyboard() {
        this.keyboardListener = new KeyboardListener();

        this.unSubs.push(
            this.keyboardListener.onPressKeys([KEY_CODES.User1MoveRight, KEY_CODES.User2MoveRight], ({
                code
            }) => {
                const view = code === KEY_CODES.User1MoveRight ?
                    this.user1View :
                    this.user2View;
                this.eventBus.dispatchEvent(GAME_EVENTS.UserMoveRight, { source: view });
            })
        );

        this.unSubs.push(
            this.keyboardListener.onPressKeys([KEY_CODES.User1MoveLeft, KEY_CODES.User2MoveLeft], ({
                code
            }) => {
                const view = code === KEY_CODES.User1MoveLeft ?
                    this.user1View :
                    this.user2View;
                this.eventBus.dispatchEvent(GAME_EVENTS.UserMoveLeft, { source: view });
            })
        );

        this.unSubs.push(
            this.keyboardListener.onPressKeys([KEY_CODES.User1Jump, KEY_CODES.User2Jump], async ({
                code
            }) => {
                const view = code === KEY_CODES.User1Jump ?
                    this.user1View :
                    this.user2View;
                this.eventBus.dispatchEvent(GAME_EVENTS.UserJump, { source: view });
            })
        );

        this.unSubs.push(
            this.keyboardListener.onPressKeys([KEY_CODES.User1Kick], throttle(async () => {
                this.eventBus.dispatchEvent(GAME_EVENTS.UserKick, { source: this.user1View });
            }, this.throttleKickMs)
            )
        );

        this.unSubs.push(
            this.keyboardListener.onPressKeys([KEY_CODES.User2Kick], throttle(async () => {
                this.eventBus.dispatchEvent(GAME_EVENTS.UserKick, { source: this.user2View });
            }, this.throttleKickMs)
            )
        );

        this.unSubs.push(
            this.keyboardListener.onPressKeys([KEY_CODES.User1Fire], throttle(() => {
                this.eventBus.dispatchEvent(GAME_EVENTS.UserFire, { source: this.user1View });
            }, this.throttleFireMs))
        );

        this.unSubs.push(
            this.keyboardListener.onPressKeys([KEY_CODES.User2Fire], throttle(() => {
                this.eventBus.dispatchEvent(GAME_EVENTS.UserFire, { source: this.user2View });
            }, this.throttleFireMs))
        );

        this.unSubs.push(
            this.keyboardListener.onPressKeys([KEY_CODES.User1Throw], throttle(() => {
                this.eventBus.dispatchEvent(GAME_EVENTS.UserThrow, { source: this.user1View });
            }, this.throttleThrowMs))
        );

        this.unSubs.push(
            this.keyboardListener.onPressKeys([KEY_CODES.User2Throw], throttle(() => {
                this.eventBus.dispatchEvent(GAME_EVENTS.UserThrow, { source: this.user2View });
            }, this.throttleThrowMs))
        );
    }

    _initJoySticks() {

        this.joyStick1 = new JoyStick({ gamepadIndex: 0 });
        this.joyStick2 = new JoyStick({ gamepadIndex: 1 });

        [this.joyStick1, this.joyStick2].forEach(joyStick => {

            this.unSubs.push(
                joyStick.subscribeOnButtonClick(JOYSTICK_KEY_CODES.UserMoveRight, throttle(() => {
                    const isUser1 = joyStick === this.joyStick1;
                    const view = isUser1 ?
                        this.user1View :
                        this.user2View;
                    this.eventBus.dispatchEvent(GAME_EVENTS.UserMoveRight, { source: view });
                }, this.joyStickThrotleMoveMs))
            );

            this.unSubs.push(
                joyStick.subscribeOnButtonClick(JOYSTICK_KEY_CODES.UserMoveLeft, throttle(() => {
                    const isUser1 = joyStick === this.joyStick1;
                    const view = isUser1 ?
                        this.user1View :
                        this.user2View;
                    this.eventBus.dispatchEvent(GAME_EVENTS.UserMoveLeft, { source: view });
                }, this.joyStickThrotleMoveMs))
            );

            this.unSubs.push(
                joyStick.subscribeOnButtonClick(JOYSTICK_KEY_CODES.UserJump, throttle(() => {
                    const isUser1 = joyStick === this.joyStick1;
                    const view = isUser1 ?
                        this.user1View :
                        this.user2View;
                    this.eventBus.dispatchEvent(GAME_EVENTS.UserJump, { source: view });
                }, this.joyStickThrotleMoveMs))
            );

            this.unSubs.push(
                joyStick.subscribeOnButtonClick(JOYSTICK_KEY_CODES.UserKick, throttle(async () => {
                    const isUser1 = joyStick === this.joyStick1;
                    const view = isUser1
                        ? this.user1View
                        : this.user2View;
                    this.eventBus.dispatchEvent(GAME_EVENTS.UserKick, { source: view });
                }, this.throttleKickMs)
                )
            );

            this.unSubs.push(
                joyStick.subscribeOnButtonClick(JOYSTICK_KEY_CODES.UserFire, throttle(() => {
                    const isUser1 = joyStick === this.joyStick1;
                    const view = isUser1 ?
                        this.user1View :
                        this.user2View;
                    this.eventBus.dispatchEvent(GAME_EVENTS.UserFire, { source: view });
                }, this.throttleFireMs))
            );

            this.unSubs.push(
                joyStick.subscribeOnButtonClick(JOYSTICK_KEY_CODES.UserThrow, throttle(() => {
                    const isUser1 = joyStick === this.joyStick1;
                    const view = isUser1 ?
                        this.user1View :
                        this.user2View;
                    this.eventBus.dispatchEvent(GAME_EVENTS.UserThrow, { source: view });
                }, this.throttleThrowMs))
            );


        });


    }

    _initAudioTheme() {
        const mainThemeAudioManager = new AudioManager({
            containerId: 'audio-theme'
        });
        const audioThemeNumber = 13;
        const randomAudioIndx = Math.floor(Math.random() * audioThemeNumber);
        const audioTheme = `./assets/audio-themes/${randomAudioIndx + 1}.mp3`;
        mainThemeAudioManager.play(audioTheme, {
            loop: true,
            volume: 0.5
        });
    }

    getBgImage() {
        const bgImageNumber = 14;
        const randomImageIndx = Math.floor(Math.random() * bgImageNumber);
        return `./assets/scenes/${randomImageIndx + 1}.jpg`;
    }

    unSubAll() {
        this.unSubs.forEach(cb => cb());
    }
}

const game = new Game({
    canvasWidth: 40,
    userJumpHeight: 10,
    userJumpStepTime: 100,
    fireStepTime: 150,
    debounceMs: 5,
    throttleFireMs: 2000,
    throttleKickMs: 1000,
    throttleThrowMs: 100,
    joyStickThrotleMoveMs: 100,
});